using { EPM_REF_APPS_PROD_MAN_SRV as external } from './external/EPM_REF_APPS_PROD_MAN_SRV';

service main {
  //@readonly
  action askBot(input:String) returns array of Products;
  entity Products as projection on external.Products;
}