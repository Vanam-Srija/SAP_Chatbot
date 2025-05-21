sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/chatbot/project1/model/models"
], (UIComponent, models) => {
    "use strict";

    return UIComponent.extend("sap.chatbot.project1.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // enable routing
            this.getRouter().initialize();
        },
        getmychatbot: function() {
            // Check if the chatbot script is already present
            if (!document.getElementById("srija")) {
                var oNewElement = document.createElement("script");
       
                // Set a unique ID so we don't add it again
                oNewElement.setAttribute("id", "srija");
       
                // SAP Conversational AI Webchat script source
                oNewElement.setAttribute("src", "https://cdn.cai.tools.sap/webchat/webchat.js");
 
                // Append the script to the document body
                document.body.appendChild(oNewElement);
       
                // Optional: Set channel ID if required (leave blank if not used)
                oNewElement.setAttribute("channelId", "f5d599e3-a5ba-419e-9c99-05650b7180de");
       
                // Set the bot token
                oNewElement.setAttribute("token", "e7a9d07472b43b8665d0541c2ed19c03");
       
            }
        }
    });
});