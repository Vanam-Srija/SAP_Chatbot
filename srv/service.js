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

  // Normalize strings for matching (e.g. camelCase -> "camel case", lower case)
  function normalizeString(str) {
    if (!str) return "";
    return str
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2") // camelCase to spaced
      .replace(/_/g, " ")                      // underscores to spaces
      .toLowerCase()
      .trim();
  }
  
   // Parse your /Date(1577833200000)/ format into JS Date object
   function parseJsonDate(jsonDateStr) {
    if (!jsonDateStr) return null;
    const match = jsonDateStr.match(/\/Date\((\d+)\)\//);
    if (match && match[1]) {
      return new Date(parseInt(match[1], 10));
    }
    return null;
  }

  // Format values for output (dates, amounts, status + descriptions)
  function formatValue(field, value, fullRecord) {
    if (value == null) return "N/A";
 
    if (field === "CreatedAt" || field === "ChangedAt") {
      const dateObj = parseJsonDate(value);
      if (dateObj) return dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
    }
 
    if (["GrossAmount", "NetAmount", "TaxAmount"].includes(field)) {
      const num = parseFloat(value);
      if (!isNaN(num)) return num.toFixed(2);
    }
 
    // For status fields, append description if available
    if (field.endsWith("Status")) {
      const descField = field + "Description";
      if (descField in fullRecord) {
        return `${value} (${fullRecord[descField]})`;
      }
    }
 
    return value;
  }
 
   // Extract relevant fields the user asked for based on question text and sample record
   function extractRequestedFieldsFromQuestion2(question, sampleRecord) {
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
 
  // Extract Sales Order ID from question (assumes 10-digit starting with 0)
  function extractSalesOrderId(question) {
    const match = question.match(/\b0\d{9}\b/);
    return match ? match[0] : null;
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
 
    //  Step 3: Try to find field + value pattern from input filtering functionality
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

  this.on('chatbot', async (req) => {
    const input = req.data?.input?.trim?.();
    if (!input) return req.error(400, "Input question is empty.");
 
    await fetchSalesOrdersOnce();
    await buildVectorStoreOnce();
 
    if (!salesOrders.length) {
      return req.error(500, "No sales order data available from backend.");
    }
 
    const lowerInput = input.toLowerCase();
    const sampleOrder = salesOrders[0];
 
    const normalizedFieldMap = Object.keys(sampleOrder).reduce((acc, key) => {
      const normalized = normalizeFieldName(key);
      acc[normalized] = key;
      return acc;
    }, {});
    const requestedFields = extractRequestedFieldsFromQuestion(input, sampleOrder);
 
    // 🔎 Try to detect aggregate queries
    const aggregateMap = {
      sum: 'sum',
      total: 'sum',
      count: 'count',
      number: 'count',
      max: 'max',
      highest: 'max',
      min: 'min',
      lowest: 'min',
      average: 'avg',
      avg: 'avg',
      mean: 'avg'
    };
    let aggregateType = null;
    for (const [key, type] of Object.entries(aggregateMap)) {
      if (lowerInput.includes(key)) {
        aggregateType = type;
        break;
      }
    }

    const amountFields = {
      'gross amount': 'GrossAmount',
      'net amount': 'NetAmount',
      'tax amount': 'TaxAmount'
    };
 
    if (aggregateType) {
      const matchedField = Object.entries(amountFields).find(([label]) =>
        lowerInput.includes(label)
      );

      if (matchedField) {
        const field = matchedField[1];
        const validValues = salesOrders
          .filter(o => !isNaN(parseFloat(o[field])))
          .map(o => ({ id: o.SalesOrderID, value: parseFloat(o[field]) }));
   
        let aggregateValue = null;
        if (aggregateType === 'sum') {
          aggregateValue = validValues.reduce((sum, o) => sum + o.value, 0);
          return req.reply(`Total ${field} across all sales orders is ${aggregateValue.toFixed(2)}.`
          );
        }
        else if (aggregateType === 'count') {
          // Check if user meant "number of sales orders" in general
          if (lowerInput.includes('sales order')) {
            aggregateValue = salesOrders.length;
            return req.reply(`There are ${aggregateValue} sales orders in total.`);
          }
       
          aggregateValue = validValues.length;
          return req.reply(`There are ${aggregateValue} sales orders with valid ${field}.`);
        }
        else if (['max', 'min'].includes(aggregateType)) {
          aggregateValue = Math[aggregateType](...validValues.map(o => o.value));
          const matchingOrders = validValues.filter(o => o.value === aggregateValue).map(o => o.id);
   
          return req.reply(
         
          `The ${aggregateType === 'max' ? 'highest' : 'lowest'} ${field} among all sales orders is ${aggregateValue.toFixed(2)}, found in Sales Order(s): ${matchingOrders.join(', ')}.`
          );
        }
        else if (aggregateType === 'avg') {
          aggregateValue = validValues.reduce((sum, o) => sum + o.value, 0) / validValues.length;
          return req.reply( `Average ${field} across all sales orders is ${aggregateValue.toFixed(2)}.`
        );
      }
    }
  }

   // ➕ Handle distinct count: e.g., unique customers
   if (lowerInput.includes('unique') || lowerInput.includes('distinct')) {
    if (lowerInput.includes('customer')) {
      const uniqueCustomerNames = [
        ...new Set(salesOrders.map(o => o.CustomerName?.trim()).filter(Boolean))
      ];
      return req.reply({
        type: 'distinct',
        field: 'CustomerName',
        value: uniqueCustomerNames.length,
        results: uniqueCustomerNames,
        message: `There are ${uniqueCustomerNames.length} unique customer names.`,
      });
    }
  }

  // 🔍 Find Sales Order IDs
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
        // pick requested fields only, or full order if none requested
        const filteredResult = requestedFields.length
          ? Object.fromEntries(requestedFields.map(f => [f, order[f]]))
          : order;
 
        // add SalesOrderID in each result explicitly for clarity
        filteredResult.SalesOrderID = id;
 
        results.push(filteredResult);
      }
    }
 
    if (!results.length) {
      return req.reply({
        success: false,
        message: `No matching Sales Orders found for provided IDs.`
      });
    }
 
    // Return count and array of results for all matched sales orders
    return req.reply({
      count: results.length,
      results
    });
  }
 
 
  // 🔍 Field = value detection
  let detectedField = null;
  let detectedValue = null;

  for (const [normalizedField, originalField] of Object.entries(normalizedFieldMap)) {
    if (lowerInput.includes(normalizedField)) {
      const descField = Object.keys(sampleOrder).find(f => f.toLowerCase() === `${originalField.toLowerCase()}description`);
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
 
    // Only return filtered fields, or SalesOrderID by default
   //  Always include SalesOrderID, plus any requested fields
    const response = filtered.map(order => {
      const entry = { SalesOrderID: order.SalesOrderID };
      // add any other fields the user explicitly asked for
      for (const f of requestedFields) {
        // avoid overwriting SalesOrderID if they asked for it twice
        if (f !== 'SalesOrderID') {
          entry[f] = order[f];
        }
      }
      return entry;
    });
 
    return req.reply({
      count: response.length,
      results: response
    });
  }

  //  Fallback: Vector similarity
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