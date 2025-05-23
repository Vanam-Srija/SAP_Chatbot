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
          body: JSON.stringify({ input: question })
        });
   
        const result = await res.json();
        console.log("Response from backend:", result);
   
        // Extract 'value' and then get 'count' and 'results'
        const valueArray = Array.isArray(result.value) ? result.value : [];
   
        if (!valueArray.length || !Array.isArray(valueArray[0].results)) {
          oResponse.setValue("No results found.");
          return;
        }
   
        const count = valueArray[0].count || 0;
        const responseList = valueArray[0].results;
   
        //  Format each result entry
        const formattedResponses = responseList.map(order => {
          return Object.entries(order)
            .map(([key, val]) => `${key}: ${val}`)
            .join("\n");
        });
        const fullResponse =
          `Count: ${count}\n\n` +
          formattedResponses.join("\n\n-------------------------\n\n");
   
        oResponse.setValue(fullResponse);
   
      } catch (err) {
        console.error("Exception occurred while calling chatbot service:", err);
        oResponse.setValue("Exception occurred: " + err.message);
      }
    }
   
   
  });
});
 
 
 