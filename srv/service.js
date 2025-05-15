const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {
  const epm = await cds.connect.to('EPM_REF_APPS_PROD_MAN_SRV');

  this.on('GetProductsWithSuppliers', async () => {
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
    return products.map(p => ({
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
  });
});
