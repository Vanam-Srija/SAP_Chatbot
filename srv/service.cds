using { GWSAMPLE_BASIC as external } from './external/GWSAMPLE_BASIC';

service main {
  //@readonly
  action askBot(input:String) returns array of SalesOrderSet;
  entity SalesOrderSet as projection on external.SalesOrderSet;
  entity SalesOrderLineItemSet as projection on external.SalesOrderLineItemSet;
  entity ProductSet as projection on external.ProductSet;
  entity BusinessPartnerSet as projection on external.BusinessPartnerSet;
  action fetchPartnerWithOrders(partnerId: String) returns BusinessPartnerSet;
  action fetchCurrencyCodes() returns array of String;
  
}
