const cds = require('@sap/cds');
const path = require('path');
const fs = require('fs');
const storePath = path.resolve(__dirname, 'salesorder-faiss-index');
const { HuggingFaceTransformersEmbeddings } = require('@langchain/community/embeddings/huggingface_transformers');
const { FaissStore } = require('@langchain/community/vectorstores/faiss');
 
module.exports = cds.service.impl(async function () {
  const gwsample = await cds.connect.to('GWSAMPLE_BASIC');
 
  const embeddings = new HuggingFaceTransformersEmbeddings({
    modelName: 'Xenova/all-MiniLM-L6-v2',
    modelOptions: { dtype: 'float32' }
  });
 
  let salesOrders = [];
  let vectorStore = null;
 
  async function fetchSalesOrdersOnce() {
    if (!salesOrders.length) {
      salesOrders = await gwsample.run(SELECT.from('GWSAMPLE_BASIC.SalesOrderSet'));
    }
    return salesOrders;
  }
 
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
 
  this.on('askBot', async (req) => {
    const input = req.data?.input?.trim?.();
    if (!input) return req.error(400, "Input question is empty.");
 
    await fetchSalesOrdersOnce();
    await buildVectorStoreOnce();
 
    if (!salesOrders.length) {
      return req.error(500, "No sales order data available from backend.");
    }
 
    const lowerInput = input.toLowerCase();
    const sampleOrder = salesOrders[0];
 
    // Normalize field names for flexible matching
    const normalizedFieldMap = Object.keys(sampleOrder).reduce((acc, key) => {
      const normalized = normalizeFieldName(key); // E.g., "customer id"
      acc[normalized] = key;
      return acc;
    }, {});
 
    // 1. Extract requested fields to show
    const requestedFields = extractRequestedFieldsFromQuestion(input, sampleOrder);
 
    // 2. Enhanced logic: extract multiple SalesOrderIDs from "sales order" phrases
    let salesOrderIdMatches = [];
 
    const salesOrderPhraseMatch = input.match(/sales order\s+([0-9,\sand]+)/i);
    if (salesOrderPhraseMatch) {
      const rawIds = salesOrderPhraseMatch[1];
      salesOrderIdMatches = rawIds.match(/\b0\d{9}\b/g) || [];
    }
 
    if (salesOrderIdMatches.length === 0) {
      salesOrderIdMatches = input.match(/\b0\d{9}\b/g) || [];
    }
 
    if (salesOrderIdMatches.length > 0) {
      const results = [];
 
      for (const id of salesOrderIdMatches) {
        const order = salesOrders.find(o => o.SalesOrderID === id);
        if (order) {
          results.push(
            requestedFields.length
              ? Object.fromEntries(requestedFields.map(f => [f, order[f]]))
              : order
          );
        }
      }
 
      if (!results.length) {
        return req.reply({
          success: false,
          message: `No matching Sales Orders found for provided IDs.`
        });
      }
 
      return req.reply({
        count: results.length,
        results
      });
    }
 
    //  Step 2: Try to find field + value pattern from input
    let detectedField = null;
    let detectedValue = null;
 
    for (const [normalizedField, originalField] of Object.entries(normalizedFieldMap)) {
      if (lowerInput.includes(normalizedField)) {
        const descField = Object.keys(salesOrders[0]).find(f => f.toLowerCase() === `${originalField.toLowerCase()}description`);
        detectedField = descField || originalField;
 
        const regex = new RegExp(`${normalizedField}\\s*(is|=|as)?\\s*([\\w-]+)`, 'i');
        const match = input.match(regex);
        if (match && match[2]) {
          detectedValue = match[2].toLowerCase();
        }
        break;
      }
    }
 
    if (detectedField && detectedValue) {
      const filtered = salesOrders.filter(order => {
        const fieldVal = order[detectedField];
        return typeof fieldVal === 'string' && fieldVal.toLowerCase().includes(detectedValue);
      });
 
      if (!filtered.length) {
        return req.reply({
          success: false,
          message: `No sales orders found where "${detectedField}" equals "${detectedValue}".`
        });
      }
 
      return req.reply({
        count: filtered.length,
        results: filtered
      });
    }
 
    // ✅ 3. Fallback to vector similarity
    const vectorResults = await vectorStore.similaritySearch(input, 10);
    const fallbackResults = vectorResults.map(match => {
      return requestedFields.length
        ? Object.fromEntries(requestedFields.map(f => [f, match.metadata[f]]))
        : match.metadata;
    });
 
    return req.reply({
      count: fallbackResults.length,
      results: fallbackResults
    });
  });
 
});
 
 