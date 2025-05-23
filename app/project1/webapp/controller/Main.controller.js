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
        const json = await res.json();
        return json;
      };

      const formatResponse = (result) => {
        // If result is a plain string, return it directly
        if (typeof result === "string") {
          return result;
        }

        // If result.value is not an array, return null
        if (!result || !Array.isArray(result.value)) {
          return null;
        }

        const valueArray = result.value;

        if (!valueArray.length) return null;

        // If first element is string, join all with separators
        if (typeof valueArray[0] === "string") {
          return valueArray.join("\n\n-------------------------\n\n");
        }

        // Check if it's a chatbot response with a "reply" property
        if ("reply" in valueArray[0]) {
          return valueArray.map(entry => entry.reply).join("\n\n-------------------------\n\n");
        }

        // Otherwise, assume askBot format with results array
        if (!Array.isArray(valueArray[0].results)) {
          return null;
        }

        const count = valueArray[0].count || 0;
        const responseList = valueArray[0].results;

        const formattedResponses = responseList.map(order =>
          Object.entries(order)
            .map(([key, val]) => `${key}: ${val}`)
            .join("\n")
        );

        return (
          `Count: ${count}\n\n` +
          formattedResponses.join("\n\n-------------------------\n\n")
        );
      };

      try {
        let result;
        let formatted = null;

        try {
          result = await callAction("askBot");
          console.log("askBot response:", result);
          formatted = formatResponse(result);
        } catch (askErr) {
          console.warn("askBot failed:", askErr);
        }

        // If askBot returned nothing useful or threw an error, try chatbot
        if (!formatted) {
          try {
            result = await callAction("chatbot");
            console.log("chatbot response:", result);
            formatted = formatResponse(result);
          } catch (chatbotErr) {
            console.error("chatbot failed:", chatbotErr);
            oResponse.setValue("Both services failed. Please try again later.");
            return;
          }
        }
        oResponse.setValue(formatted || "No results found.");
      } catch (err) {
        console.error("Exception in onSend:", err);
        oResponse.setValue("Unexpected error occurred: " + err.message);
      }
    }

  });
});
