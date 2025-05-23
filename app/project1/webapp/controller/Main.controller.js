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
    
      const callAction = async (actionName) => {
        const res = await fetch(`/odata/v4/main/${actionName}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: question })
        });
        if (!res.ok) throw new Error(`${actionName} failed`);
        return await res.json();
      };
    
      const formatResponse = (result) => {
        console.log("formatResponse input:", result);
    
        if (!result || !Array.isArray(result.value) || result.value.length === 0) {
          console.warn("formatResponse: Empty or invalid result.value");
          return null;
        }
    
        const val = result.value[0];
    
        // If there's an explicit 'success' property and it's false => return null for fallback
        if (val.hasOwnProperty('success') && val.success === false) {
          console.warn("formatResponse: success is false, returning null to fallback");
          return null;
        }
    
        // If success is true, try to format meaningful data
        if (val.hasOwnProperty('success') && val.success === true) {
          if (val.topCustomers) {
            return val.topCustomers.map(tc =>
              `${tc.customer} - Orders: ${tc.orderCount}, Total: $${tc.totalNetValue}`
            ).join("\n");
          }
          if (val.repeatCustomers) {
            return val.repeatCustomers.map(rc =>
              `${rc.customer} - Orders: ${rc.orderCount}`
            ).join("\n");
          }
          return val.message || "No message available";
        }
    
        // If no success property, try askBot style results array
        if (val.results && Array.isArray(val.results) && val.results.length > 0) {
          return val.results.map(order =>
            Object.entries(order).map(([k, v]) => `${k}: ${v}`).join("\n")
          ).join("\n\n-------------------------\n\n");
        }
    
        // As a last fallback, if val is a string or has a reply property array, handle here
        if (typeof val === "string") {
          return val;
        }
    
        if (Array.isArray(result.value) && "reply" in result.value[0]) {
          return result.value.map(r => r.reply).join("\n\n-------------------------\n\n");
        }
    
        // No recognizable format found
        console.warn("formatResponse: no recognizable data format");
        return null;
      };
    
      try {
        // First try askBot
        let result = await callAction("askBot");
        console.log("askBot response:", result);
        let formatted = formatResponse(result);
    
        // If askBot failed or returned no useful data, fallback to chatbot
        if (!formatted) {
          console.log("askBot response invalid, trying chatbot fallback");
          result = await callAction("chatbot");
          console.log("chatbot response:", result);
          formatted = formatResponse(result);
        }
    
        oResponse.setValue(formatted || "No results found.");
      } catch (err) {
        console.error("Exception in onSend:", err);
        oResponse.setValue("Unexpected error occurred: " + err.message);
      }
    }
    

  });
});
