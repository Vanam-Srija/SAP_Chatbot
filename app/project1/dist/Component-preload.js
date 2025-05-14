//@ui5-bundle sap/chatbot/project1/Component-preload.js
sap.ui.require.preload({
	"sap/chatbot/project1/Component.js":function(){
sap.ui.define(["sap/ui/core/UIComponent","sap/chatbot/project1/model/models"],(t,e)=>{"use strict";return t.extend("sap.chatbot.project1.Component",{metadata:{manifest:"json",interfaces:["sap.ui.core.IAsyncContentCreation"]},init(){t.prototype.init.apply(this,arguments);this.setModel(e.createDeviceModel(),"device");this.getRouter().initialize();this.getmychatbot()},getmychatbot:function(){if(!document.getElementById("srija")){var t=document.createElement("script");t.setAttribute("id","srija");t.setAttribute("src","https://cdn.cai.tools.sap/webchat/webchat.js");document.body.appendChild(t);t.setAttribute("channelId","f5d599e3-a5ba-419e-9c99-05650b7180de");t.setAttribute("token","e7a9d07472b43b8665d0541c2ed19c03")}}})});
},
	"sap/chatbot/project1/controller/App.controller.js":function(){
sap.ui.define(["sap/ui/core/mvc/Controller"],e=>{"use strict";return e.extend("sap.chatbot.project1.controller.App",{onInit(){}})});
},
	"sap/chatbot/project1/controller/Main.controller.js":function(){
sap.ui.define(["sap/ui/core/mvc/Controller"],e=>{"use strict";return e.extend("sap.chatbot.project1.controller.Main",{onInit(){}})});
},
	"sap/chatbot/project1/i18n/i18n.properties":'# This is the resource bundle for sap.chatbot.project1\n\n#Texts for manifest.json\n\n#XTIT: Application name\nappTitle=App Title\n\n#YDES: Application description\nappDescription=An SAP Fiori application.\n#XTIT: Main view title\ntitle=App Title',
	"sap/chatbot/project1/manifest.json":'{"_version":"1.65.0","sap.app":{"id":"sap.chatbot.project1","type":"application","i18n":"i18n/i18n.properties","applicationVersion":{"version":"0.0.1"},"title":"{{appTitle}}","description":"{{appDescription}}","resources":"resources.json","sourceTemplate":{"id":"@sap/generator-fiori:basic","version":"1.17.4","toolsId":"cf05fa6a-4223-4d1b-99d7-62ed6d291f72"},"dataSources":{"mainService":{"uri":"odata/v4/main/","type":"OData","settings":{"annotations":[],"odataVersion":"4.0"}}}},"sap.ui":{"technology":"UI5","icons":{"icon":"","favIcon":"","phone":"","phone@2":"","tablet":"","tablet@2":""},"deviceTypes":{"desktop":true,"tablet":true,"phone":true}},"sap.ui5":{"flexEnabled":true,"dependencies":{"minUI5Version":"1.135.0","libs":{"sap.m":{},"sap.ui.core":{}}},"contentDensities":{"compact":true,"cozy":true},"models":{"i18n":{"type":"sap.ui.model.resource.ResourceModel","settings":{"bundleName":"sap.chatbot.project1.i18n.i18n"}},"":{"dataSource":"mainService","preload":true,"settings":{"operationMode":"Server","autoExpandSelect":true,"earlyRequests":true}}},"resources":{"css":[{"uri":"css/style.css"}]},"routing":{"config":{"routerClass":"sap.m.routing.Router","controlAggregation":"pages","controlId":"app","transition":"slide","type":"View","viewType":"XML","path":"sap.chatbot.project1.view","async":true,"viewPath":"sap.chatbot.project1.view"},"routes":[{"name":"RouteMain","pattern":":?query:","target":["TargetMain"]}],"targets":{"TargetMain":{"id":"Main","name":"Main"}}},"rootView":{"viewName":"sap.chatbot.project1.view.App","type":"XML","id":"App","async":true}}}',
	"sap/chatbot/project1/model/models.js":function(){
sap.ui.define(["sap/ui/model/json/JSONModel","sap/ui/Device"],function(e,n){"use strict";return{createDeviceModel:function(){var i=new e(n);i.setDefaultBindingMode("OneWay");return i}}});
},
	"sap/chatbot/project1/view/App.view.xml":'<mvc:View controllerName="sap.chatbot.project1.controller.App"\n    displayBlock="true"\n    xmlns:mvc="sap.ui.core.mvc"\n    xmlns="sap.m"><App id="app"></App></mvc:View>',
	"sap/chatbot/project1/view/Main.view.xml":'<mvc:View controllerName="sap.chatbot.project1.controller.Main"\n    xmlns:mvc="sap.ui.core.mvc"\n    xmlns="sap.m"><Page id="page" title="{i18n>title}"></Page></mvc:View>'
});
//# sourceMappingURL=Component-preload.js.map
