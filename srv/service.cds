using { EPM_REF_APPS_PROD_MAN_SRV as external } from './external/EPM_REF_APPS_PROD_MAN_SRV';

service main {
  //@readonly
  action askBot(input:String) returns array of Products;
  entity Products as projection on external.Products;
  entity Suppliers as projection on external.Suppliers;
}
type SupplierDetails {
  Id                  : String;
  Name                : String;
  Phone               : String;
  Email               : String;
  WebAddress          : String;
  FormattedAddress    : String;
  FormattedContactName: String;
  ContactPhone1       : String;
  ContactPhone2       : String;
  ContactEmail        : String;
}

type ProductWithSupplier {
  Id              : String;
  Name            : String;
  Description     : String;
  Price           : Decimal;
  CurrencyCode    : String;
  ImageUrl        : String;
  SupplierId      : String;
  Supplier        : SupplierDetails;

  StockQuantity   : Integer;
  SubCategoryId   : String;
  SubCategoryName : String;
  MainCategoryId  : String;
  MainCategoryName: String;
  LastModified    : String;
  DimensionHeight : String;
  DimensionWidth  : String;
  DimensionDepth  : String;
  DimensionUnit   : String;
  QuantityUnit    : String;
  MeasureUnit     : String;
  AverageRating   : Decimal;
  RatingCount     : Integer;
  WeightMeasure   : String;
  WeightUnit      : String;
}

