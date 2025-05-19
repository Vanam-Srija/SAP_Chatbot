const cds = require('@sap/cds');
const {HuggingFaceTransformersEmbeddings} = require('@langchain/community/embeddings/huggingface_transformers')
const { FaissStore } = require("@langchain/community/vectorstores/faiss");

module.exports = cds.service.impl(async function () {
  const epm = await cds.connect.to('EPM_REF_APPS_PROD_MAN_SRV');
  
  const embeddings = new HuggingFaceTransformersEmbeddings({
    modelName: "Xenova/all-MiniLM-L6-v2",
  });
  let vectorStore;

  this.on('GetProductsWithSuppliers', async (req) => {
    const question = req.data.input;
    // Fetch all products with all required fields
    const products = await epm.run(
      SELECT.from('Products').columns(
        'Id',
        'Name',
        'Description',
        'Price',
        'CurrencyCode',
        'ImageUrl',
        'SupplierId',
        'StockQuantity',
        'SubCategoryId',
        'SubCategoryName',
        'MainCategoryId',
        'MainCategoryName',
        'LastModified',
        'DimensionHeight',
        'DimensionWidth',
        'DimensionDepth',
        'DimensionUnit',
        'QuantityUnit',
        'MeasureUnit',
        'AverageRating',
        'RatingCount',
        'WeightMeasure',
        'WeightUnit'
      )
    );

    // Fetch all suppliers
    const suppliers = await epm.run(
      SELECT.from('Suppliers').columns(
        'Id',
        'Name',
        'Phone',
        'Email',
        'WebAddress',
        'FormattedAddress',
        'FormattedContactName',
        'ContactPhone1',
        'ContactPhone2',
        'ContactEmail'
      )
    );

    const supplierMap = new Map(suppliers.map(s => [s.Id, s]));

    // Map products with supplier details embedded
    products.map(p => ({
      Id              : p.Id,
      Name            : p.Name,
      Description     : p.Description,
      Price           : p.Price,
      CurrencyCode    : p.CurrencyCode,
      ImageUrl        : p.ImageUrl,
      SupplierId      : p.SupplierId,
      StockQuantity   : p.StockQuantity,
      SubCategoryId   : p.SubCategoryId,
      SubCategoryName : p.SubCategoryName,
      MainCategoryId  : p.MainCategoryId,
      MainCategoryName: p.MainCategoryName,
      LastModified    : p.LastModified,
      DimensionHeight : p.DimensionHeight,
      DimensionWidth  : p.DimensionWidth,
      DimensionDepth  : p.DimensionDepth,
      DimensionUnit   : p.DimensionUnit,
      QuantityUnit    : p.QuantityUnit,
      MeasureUnit     : p.MeasureUnit,
      AverageRating   : p.AverageRating,
      RatingCount     : p.RatingCount,
      WeightMeasure   : p.WeightMeasure,
      WeightUnit      : p.WeightUnit,
      Supplier        : supplierMap.get(p.SupplierId) || {}
    }));

    if (!vectorStore) {
      const docs = products.map((u) => ({
        ...u,
        pageContent: u.Description,  // FIXED
        metadata: {
          id: u.Id,                 // FIXED
          name: u.Name
        }
      }));
      vectorStore = await FaissStore.fromTexts(
        // // docs,
        docs.map(d => d.pageContent),
        docs.map(d => d.metadata),
        // products,
        embeddings
      );
    }
    const results = await vectorStore.similaritySearch(question, 2);
    
      return results.map(res => ({
        name: res.metadata.name,
        description: res.pageContent
      }));
  });
 
});
