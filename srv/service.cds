using { GWSAMPLE_BASIC as external } from './external/GWSAMPLE_BASIC';

service main {
  //@readonly
  action askBot(input:String) returns array of SalesOrderSet;
  entity SalesOrderSet as projection on external.SalesOrderSet;
}