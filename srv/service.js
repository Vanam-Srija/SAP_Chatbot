const cds = require('@sap/cds');
const { HuggingFaceTransformersEmbeddings } = require('@langchain/community/embeddings/huggingface_transformers');
const { FaissStore } = require('@langchain/community/vectorstores/faiss');

module.exports = cds.service.impl(async function () {
  const epm = await cds.connect.to('EPM_REF_APPS_PROD_MAN_SRV');

  // Load local embedding model
  const embeddings = new HuggingFaceTransformersEmbeddings({
    modelName: 'Xenova/all-MiniLM-L6-v2'
  });

  let vectorStore;

  // Fetch product and supplier data from OData
  const products = await epm.run(SELECT.from('Products'));
  const suppliers = await epm.run(SELECT.from('Suppliers'));

  const supplierMap = new Map(suppliers.map(s => [s.Id, s]));

  // Merge product with supplier info
  const enrichedProducts = products.map(p => ({
    ...p,
    SupplierName: supplierMap.get(p.SupplierId)?.Name || ''
  }));

  // Build vector store if not already done
  if (!vectorStore) {
    const docs = enrichedProducts.map(p => ({
      pageContent: p.Description || '',
      metadata: {
        ...p,
        SupplierName: supplierMap.get(p.SupplierId)?.Name || ''
      }
    }));

    vectorStore = await FaissStore.fromTexts(
      docs.map(d => d.pageContent),
      docs.map(d => d.metadata),
      embeddings
    );
  }

  // Helper: Normalize field name for matching
  function normalizeFieldName(field) {
    return field.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  }

  // Helper: Match user question to available fields dynamically
  function extractRequestedFieldsFromQuestion(question, sampleProduct) {
    const normalizedFields = Object.keys(sampleProduct).map(key => ({
      original: key,
      normalized: normalizeFieldName(key)
    }));

    const lowerQuestion = question.toLowerCase();
    const matchedFields = [];

    for (const field of normalizedFields) {
      if (lowerQuestion.includes(field.normalized)) {
        matchedFields.push(field.original);
      }
    }

    return [...new Set(matchedFields)];
  }

  // Define custom askBot action
  this.on('askBot', async (req) => {
    const input = req.data?.input?.trim?.();
    if (!input) return req.error(400, "Input question is empty.");

    const productIdMatch = input.match(/\b[A-Z]{2,}-\d{3,4}\b/); // e.g., HT-1000
    const requestedFields = extractRequestedFieldsFromQuestion(input, products[0]);

    if (!requestedFields.length) {
      return req.error(400, "No relevant fields found in the question.");
    }

    if (productIdMatch) {
      const productId = productIdMatch[0];
      const product = enrichedProducts.find(p => p.Id?.toLowerCase() === productId.toLowerCase());

      if (!product) return req.error(404, `Product with ID ${productId} not found.`);

      const result = {};
      for (const field of requestedFields) {
        if (field in product) {
          result[field] = product[field];
        }
      }

      // Always include Id in result
      result["Id"] = product.Id;
      return [result];
    }

    // Fallback to semantic similarity
    const results = await vectorStore.similaritySearch(input, 1);
    const bestMatch = results?.[0];

    if (!bestMatch) {
      return req.error(404, "No relevant product found.");
    }

    const result = {};
    for (const field of requestedFields) {
      if (field in bestMatch.metadata) {
        result[field] = bestMatch.metadata[field];
      }
    }

    // Always include Id in semantic fallback
    result["Id"] = bestMatch.metadata.Id;

    return [result];
  });
});
