using { EPM_REF_APPS_PROD_MAN_SRV as external } from './external/EPM_REF_APPS_PROD_MAN_SRV';
 
service main {
    entity Suppliers as projection on external.Suppliers;
}