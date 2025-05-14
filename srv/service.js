const cds = require('@sap/cds');
 
module.exports = cds.server;
module.exports=cds.service.impl(async function(){
   
    const product_api = await cds.connect.to('EPM_REF_APPS_PROD_MAN_SRV');
    const { Suppliers } =this.entities;
 
    // Reading Material No. data fetched from S4H
    this.on("READ", Suppliers ,(req)=>{
        req.query.SELECT.count = false;
        return product_api.run(req.query);
    });
})