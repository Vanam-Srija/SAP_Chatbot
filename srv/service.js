const cds = require('@sap/cds');
const path = require('path');
const fs = require('fs');
const storePath = path.resolve(__dirname, 'salesorder-faiss-index');
const { HuggingFaceTransformersEmbeddings } = require('@langchain/community/embeddings/huggingface_transformers');
const { FaissStore } = require('@langchain/community/vectorstores/faiss');

module.exports = cds.service.impl(async function () {
  const gwsample = await cds.connect.to('GWSAMPLE_BASIC');

  // Load the local embedding model only once
  const embeddings = new HuggingFaceTransformersEmbeddings({
    modelName: 'Xenova/all-MiniLM-L6-v2',
    modelOptions: { dtype: 'float32' }
  });
  

  let salesOrders = [];
  let vectorStore = null;

  async function fetchSalesOrdersOnce() {
    if (!salesOrders.length) {
      salesOrders = await gwsample.run(SELECT.from('GWSAMPLE_BASIC.SalesOrderSet'));
      console.log("Fetched Sales Orders:", salesOrders.length);
    }
    return salesOrders;
  }

  //  Helper to build vector store once
  async function buildVectorStoreOnce() {
    if (vectorStore) return vectorStore;
  
    if (fs.existsSync(storePath)) {
      vectorStore = await FaissStore.load(storePath, embeddings);
    } else {
      const docs = salesOrders.map(o => ({
        pageContent: o.Note || o.LifecycleStatusDescription || '',
        metadata: { ...o }
      }));
  
      vectorStore = await FaissStore.fromTexts(
        docs.map(d => d.pageContent),
        docs.map(d => d.metadata),
        embeddings
      );
      await vectorStore.save(storePath);
      console.log("FAISS vector store saved.");
    }
  
    return vectorStore;
  }
  

  // Normalize field names like LifecycleStatusDescription → lifecycle status description
  function normalizeFieldName(field) {
    return field.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  }

  function extractRequestedFieldsFromQuestion(question, sampleRecord) {
    if (!sampleRecord) return [];

    const normalizedFields = Object.keys(sampleRecord).map(key => ({
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

  // Main chatbot handler
  this.on('askBot', async (req) => {
    const input = req.data?.input?.trim?.();
    if (!input) return req.error(400, "Input question is empty.");

    await fetchSalesOrdersOnce();
    await buildVectorStoreOnce();

    if (!salesOrders.length) {
      return req.error(500, "No sales order data available from backend.");
    }

    const salesOrderIdMatch = input.match(/\b\d{9,10}\b/); // Match ID like 0500000000
    const requestedFields = extractRequestedFieldsFromQuestion(input, salesOrders[0]);

    if (!requestedFields.length) {
      return req.reply({
        success: false,
        message: "No relevant fields found in the question."
      });
    }

    // If ID is mentioned directly, find it
    if (salesOrderIdMatch) {
      const id = salesOrderIdMatch[0];
      const order = salesOrders.find(o => o.SalesOrderID === id);

      if (!order) {
        return req.reply({
          success: false,
          message: `Sales Order with ID ${id} not found.`
        });
      }

      const result = {};
      for (const field of requestedFields) {
        if (field in order) {
          result[field] = order[field];
        }
      }

      result["SalesOrderID"] = order.SalesOrderID;
      return [result];
    }

    // Otherwise do semantic similarity match
    const results = await vectorStore.similaritySearch(input, 1);
    const bestMatch = results?.[0];

    if (!bestMatch) {
      return req.reply({
        success: false,
        message: "No relevant sales order found."
      });
    }

    const result = {};
    for (const field of requestedFields) {
      if (field in bestMatch.metadata) {
        result[field] = bestMatch.metadata[field];
      }
    }

    result["SalesOrderID"] = bestMatch.metadata.SalesOrderID;
    return [result];
  });

});
