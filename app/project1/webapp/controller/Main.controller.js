sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/Text",
    "sap/m/MessageToast",
    "sap/m/VBox"
  ], function (Controller, Text, MessageToast, VBox) {
    "use strict";
  
    return Controller.extend("sap.chatbot.project1.controller.Main", {
      onInit: function () {},
  
      onSend: async function () {
        console.log("MainController: onSend triggered");
      
        const oInput = this.byId("chatInput");
        const oResponse = this.byId("chatResponse");
        const question = oInput.getValue().trim();
        if (!question) {
          MessageToast.show("Please enter a question.");
          return;
        }
      
        try {
          const res = await fetch("/odata/v4/main/askBot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ input: question }) // ✅ correct key
          });
      
          const result = await res.json();
          console.log("Response from backend:", result);
      
          if (!res.ok) {
            const errorMsg = result?.error?.message || "Failed to get response";
            oResponse.setValue(`Error: ${errorMsg}`);
            return;
          }
      
          const productList = result?.value;
          const product = productList?.[0];
      
          if (!product || typeof product !== "object") {
            oResponse.setValue("No product information found.");
            return;
          }
      
          const responseText = Object.entries(product)
            .map(([key, val]) => `${key}: ${val}`)
            .join("\n");
      
          oResponse.setValue(responseText);
      
        } catch (err) {
          console.error("Exception occurred while calling chatbot service:", err);
          oResponse.setValue("Exception occurred: " + err.message);
        }
      }
      
      
    });
  });
  