sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter",
	"sap/m/library",
	'sap/m/MessageToast',
	'sap/m/Dialog',
	'sap/m/Button',
	'sap/m/MessagePopover',
	'sap/m/MessagePopoverItem',
	"sap/ui/core/ValueState",
	"sap/m/MessageBox",
	"zwx/sm/charm/wp/successfullytested/utils/dateUtils"
], function (BaseController, JSONModel, formatter, mobileLibrary, MessageToast, Dialog, Button,MessagePopover,MessagePopoverItem,ValueState,MessageBox,DateUtils) {
	"use strict";

	// shortcut for sap.m.URLHelper
	var URLHelper = mobileLibrary.URLHelper;

	return BaseController.extend("zwx.sm.charm.wp.successfullytested.controller.Detail", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit : function () {
			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var oViewModel = new JSONModel({
				busy : false,
				delay : 0,
				title: this.getResourceBundle().getText("detailTitle"),
			});
			this.initViewComponents();
			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
			this.setModel(oViewModel, "detailView");
			this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));
		},
		
		initViewComponents : function(){
			var oView = this.getView();
			oView.attachmentCollection = this.byId("fileupload");
		    oView.attachmentfltr = this.byId("attachmentFilter");
		    oView.trfltr = this.byId("trFilter");
			oView.textList = this.byId("textList");
			oView.scopeTable = this.byId("scopeTable");
			oView.effertTable = this.byId("effertTable");
		},
		

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Event handler when the share by E-Mail button has been clicked
		 * @public
		 */
		onSendEmailPress : function () {
			var oViewModel = this.getModel("detailView");

			URLHelper.triggerEmail(
				null,
				oViewModel.getProperty("/shareSendEmailSubject"),
				oViewModel.getProperty("/shareSendEmailMessage")
			);
		},



		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched : function (oEvent) {
			var sObjectId =  oEvent.getParameter("arguments").objectId;
			var sGUID =  oEvent.getParameter("arguments").guid;
			
			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");

			this.getModel().metadataLoaded().then( function() {
				var sObjectPath = this.getModel().createKey("WorkPackageSet", {
					ObjectId :  sObjectId,
					GUID : sGUID
				});
				this._bindView("/" + sObjectPath);
			}.bind(this));
		},

		/**
		 * Binds the view to the object path. Makes sure that detail view displays
		 * a busy indicator while data for the corresponding element binding is loaded.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound to the view.
		 * @private
		 */
		_bindView : function (sObjectPath) {
			// Set busy indicator during view binding
			var oViewModel = this.getModel("detailView");
			var oView = this.getView();
			oView.taskListItemPath = "/TaskListItemSet";
			oView.attachmentPath = sObjectPath + "/AttachmentSet";
			oView.actionsPath = sObjectPath + "/ActionSet";

			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			oViewModel.setProperty("/busy", false);
			this.initActionSheet(oView);
			this.getView().bindElement({
				path : sObjectPath,
				events: {
					change : this._onBindingChange.bind(this),
					dataRequested : function () {
						oViewModel.setProperty("/busy", true);
					},
					dataReceived: function () {
						oViewModel.setProperty("/busy", false);
					}
				}
			});
			this.initActionSheet(oView);
			
		},
		
		initActionSheet : function(oView){
			var that = this;
			var actionSheet = that.byId("actionSheet");
			oView.getModel().read(oView.actionsPath, {
				success: function (oData, oResponse) {
					console.log(oData.results.length);
					$.each(oData.results, function(i, item) {
						actionSheet.addButton(new Button({
			                text : item.ActionName,
			                press: that.onPressAccept.bind(that)
			          }))
					});
				},error: function (oError) {

				}
		    });
		},
		
		initTextList: function (oView){
			var that = this;
			this.jsonModelTexts = new JSONModel();
			
			that.TextsSet = new JSONModel([{
	        	"name": "FB R2D OST_SA_47",
	        	"text": "text 1",
	        	"description": "description of change: 14.04.2020"
	        },

	        {
	        	"name": "FB R2D OST_SA_84",
	        	"text": "text 2",
	        	"description": "description of change: 14.04.2020"
	        }]);
			
		    that.jsonModelTexts.setData({
		    	TextsSet: that.TextsSet.getData()
		    });
		    
		    that.oView.textList.setModel(that.jsonModelTexts);
			var textValueModel = new JSONModel({
				value: ""
			});
			that.oView.setModel(textValueModel, "textValue");
		   
		},

		readItems: function (oView) {
			var that = this;
			var fnSuccess = function (oResponse) {
		        that.oTaskListItemSet = oResponse.results;
		        that.oView.trfltr.setCount(oResponse.results.length);
		    };
		    
		    var fnError = function (oResponse) {
		    };
		    
			this.getOwnerComponent().getModel().read(oView.taskListItemPath, {
		    	success: fnSuccess,
		    	error: fnError
		    });
			
		},
		
		readTr: function (oView) {
			var that = this;
			var fnSuccess = function (oResponse) {
		        that.oTaskListItemSet = oResponse.results;
//		        that.oView.trfltr.setCount(oResponse.results.length);
		    };
		    
		    var fnError = function (oResponse) {
		    };
		    
			this.getOwnerComponent().getModel().read(oView.taskListItemPath, {
		    	success: fnSuccess,
		    	error: fnError
		    });
			
		},
		
		readAttachments: function (oView) {
			var that = this;
		    if (this.getView().attachmentCollection.getUploadEnabled()) {
		    	oView.attachmentCollection.setUploadUrl(oView.getModel().sServiceUrl + oView.attachmentPath);
		    }
		    
			this.jsonModelAttachments = new JSONModel();
		    oView.attachmentCollection.setModel(this.jsonModelAttachments);
		      
		    //Clear all attachments first
		    oView.attachmentCollection.removeAllItems();
		    oView.attachmentCollection.aItems = [];
		    
		    oView.getModel().read(oView.attachmentPath, {
		    	success: fnSuccess,
		    	error: fnError
		    });
		    
		    var fnSuccess = function (oResponse) {
		        that.oView.attachmentCollection.setBusy(false);
		        that.oAttachmentSet = oResponse.results;
		        that.setAttachments(that, that.oAttachmentSet);
		    };
		    
		    var fnError = function (oResponse) {
		        that.oView.attachmentCollection.setBusy(false);
		    };

		    oView.attachmentCollection.setBusy(true);
		    that.setAttachments(that, that.oAttachmentSet.getData());
		    that.oView.attachmentCollection.setBusy(false);
		    
		},
		
		setAttachments: function (controller, AttachmentSet) {
			$.each(AttachmentSet, function (index, value) {
		        AttachmentSet[index].url = value.url;
		        AttachmentSet[index].documentId = "refGuid=guid'" + value.refGuid + "',loioId='" + value.loioId + "',phioId='" + value.phioId +"'";
		        var oFile = value;
		        if (this.extHookUploadCollectionItemData) { // check whether any extension has implemented the hook...
		          this.extHookUploadCollectionItemData(oFile); // ...and call it
		        }
		      });

		      controller.jsonModelAttachments.setData({
		        AttachmentSet: AttachmentSet
		      });

		      controller.oView.attachmentfltr.setCount(AttachmentSet.length);
		    },

		 _onBindingChange : function () {
			var oView = this.getView(),
				oElementBinding = oView.getElementBinding();

			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				this.getRouter().getTargets().display("detailObjectNotFound");
				// if object could not be found, the selection in the master list
				// does not make sense anymore.
				this.getOwnerComponent().oListSelector.clearMasterListSelection();
				return;
			}

			var sPath = oElementBinding.getPath(),
				oResourceBundle = this.getResourceBundle(),
				oObject = oView.getModel().getObject(sPath),
				sObjectId = oObject.ObjectId,
				sObjectDescription = oObject.Description,
				oViewModel = this.getModel("detailView");

			this.getOwnerComponent().oListSelector.selectAListItem(sPath);

			oViewModel.setProperty("/shareSendEmailSubject",
				oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId]));
			oViewModel.setProperty("/shareSendEmailMessage",
				oResourceBundle.getText("shareSendEmailObjectMessage", [sObjectDescription, sObjectId, location.href]));
		},

		_onMetadataLoaded : function () {
			// Store original busy indicator delay for the detail view
			var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
				oViewModel = this.getModel("detailView");

			// Make sure busy indicator is displayed immediately when
			// detail view is displayed for the first time
			oViewModel.setProperty("/delay", 0);

			// Binding the view will set it to not busy - so the view is always busy if it is not bound
			oViewModel.setProperty("/busy", true);
			// Restore original busy indicator delay for the detail view
			oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
		},

		/**
		 * Set the full screen mode to false and navigate to master page
		 */
		onCloseDetailPress: function () {
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
			// No item should be selected on master after detail page is closed
			this.getOwnerComponent().oListSelector.clearMasterListSelection();
			this.getRouter().navTo("master");
		},

		/**
		 * Toggle between full and non full screen mode.
		 */
		toggleFullScreen: function () {
			var bFullScreen = this.getModel("appView").getProperty("/actionButtonsInfo/midColumn/fullScreen");
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", !bFullScreen);
			if (!bFullScreen) {
				// store current layout and go full screen
				this.getModel("appView").setProperty("/previousLayout", this.getModel("appView").getProperty("/layout"));
				this.getModel("appView").setProperty("/layout", "MidColumnFullScreen");
			} else {
				// reset to previous layout
				this.getModel("appView").setProperty("/layout",  this.getModel("appView").getProperty("/previousLayout"));
			}
		},
		
		
		// Attachment upload
		/**
		 * Add Token on http head
		 */
		onChange: function (oEvent) {
			var oModel = this.getModel();
		      var oUploadCollection = oEvent.getSource();
		
		      var token = this.sToken || oModel.getSecurityToken();
		
		      // If filename exceeds 40 characters, trim it
		      var filename = oEvent.getParameter("mParameters").files[0].name;
		      if (filename.length > 40) {
		        var aFilenameParts = filename.split(".");
		        if (aFilenameParts.length === 1) {
		          filename = filename.substring(0, 40);
		        } else {
		          var filenameExtension = aFilenameParts[aFilenameParts.length - 1];
		          aFilenameParts = aFilenameParts.slice(0, aFilenameParts.length - 1);
		          var remainingCharacters = 39 - filenameExtension.length;
		          filename = aFilenameParts.join(".").substring(0, remainingCharacters) + "." + filenameExtension;
		        }
		      }
		      /* eslint-disable JS_ODATA_MANUAL_TOKEN */
		      // Header Token
		      var oCustomerHeaderToken = new sap.m.UploadCollectionParameter({
		        name: "x-csrf-token",
		        value: token
		      });
		      /* eslint-enable JS_ODATA_MANUAL_TOKEN */
		      oUploadCollection.addHeaderParameter(oCustomerHeaderToken);
		
		      // Header Content-Disposition
		      var oCustomerHeaderContentDisp = new sap.m.UploadCollectionParameter({
		        name: "content-disposition",
		        value: "inline; filename=\"" + encodeURIComponent(filename) + "\""
		      });
		      oUploadCollection.addHeaderParameter(oCustomerHeaderContentDisp);
		    },
		    
		onButtonPress: function(oEvent) {
			var oButton = oEvent.getSource();
			this.byId("actionSheet").openBy(oButton);
		},

			
		onPressAccept: function(oEvent) {
			var that = this;
			
			var oContext = oEvent.getSource().getBindingContext();
			var sCurrentPath = oContext.getPath();
			var status = oEvent.getSource().getText();
			var oModel = that.getView().getModel();
			oModel.setProperty(sCurrentPath + "/Status", status);
			MessageToast.show(status);
		},
		      
		onAddText : function(oEvent){
			var that = this;
			if (!this._selectNotificationDialog) {
				this._selectNotificationDialog = sap.ui.xmlfragment(
						"zwx.sm.charm.wp.successfullytested.view.NotificationDialog", this);
				this.getView().addDependent(this._selectNotificationDialog);
			}
//			this.getView().setModel(new JSONModel(obj), "NotificationListSet");
			this._selectNotificationDialog.open();
		},
		      
		handleNotificationSelect: function(oEvent){
			var sPath  = this.getView().getElementBinding().getPath();
			console.log(sPath);
//			this.createNewText(sPath);
			var fullName = this.getOwnerComponent().getModel("userInfo").getData().fullName;
			console.log(fullName);
			var currentDate = DateUtils.dateFormat("dd.mm.YYYY", new Date());
			var textValue = this.oView.getModel("textValue").getData().value;
			var newText =  {
				name: fullName,
		        text: textValue,
		        description: "description of change: "+ currentDate
			}
			
			
			var TextsSet = this.getView().textList.getModel().getData().TextsSet;
			TextsSet.push(newText);
		    this.jsonModelTexts.setData({
		    	TextsSet: TextsSet
		    });
			this._selectNotificationDialog.close();
			sap.ui.getCore().byId('textAreaWithBinding').setValue(""); 
		},
		
		createNewText: function(sPath){
			var fullName = this.getOwnerComponent().getModel("userInfo").getData().fullName;
			console.log(fullName);
			var textValue = this.oView.getModel("textValue").getData().value;
			
			var currentDate = DateUtils.dateFormat("dd.mm.YYYY", new Date());
			var newText =  {
				"name": fullName,
		        "text": textValue,
		        "description": "description of change: "+ currentDate
			}
			var oModel = this.getView().getModel();
			oModel.create("/TextsSet", newText, {
				success: function (odata, Response) {
					if (odata !== "" || odata !== undefined) {
						MessageBox.success("Created successfully.");
					} else {
						MessageBox.error("New entry not created.");
					}
				},
				error: function (cc, vv) {

				}
			});
		},
		
		handleNotificationCancelDialog : function() {
			this.getView().getModel().resetChanges();
			this._selectNotificationDialog.close();
		},
				
		onMessagesButtonPress: function(oEvent) {
			var oMessagesButton = oEvent.getSource();

			if (!this._messagePopover) {
				this._messagePopover = new MessagePopover({
					items: {
						path: "message>/",
						template: new MessagePopoverItem({
							description: "{message>description}",
							type: "{message>type}",
							title: "{message>message}"
						})
					}
				});
				oMessagesButton.addDependent(this._messagePopover);
			}
			this._messagePopover.toggle(oMessagesButton);
		},
				
				
		validateNote : function(oEvent){
			var oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
			var sValue = oEvent.getParameter("value");
			var oSource = oEvent.getSource();
			if( sValue && sValue.trim().length > 0 ) {
				oSource.setValueState(ValueState.Success);
				oSource.setValueStateText(null);
			} else {
				oSource.setValueState(ValueState.Error);
				var sPath  = this.getView().getElementBinding().getPath();
				var oObject = this.getView().getModel().getObject(sPath);
				console.log(oObject.POP);
				oSource.setValueStateText(oResourceBundle.getText("ERROR_EMPTY_NOTE"));
			}
		},
				
		onSaveButtonPress: function(oEvent) {
			var that = this;
			var oModel = this.getView().getModel();
			var oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
			var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
			if( oModel.hasPendingChanges() ) {
				that.oView.setBusy(true);
				oModel.submitChanges({
					success: function(oData) {
						MessageBox.success(oResourceBundle.getText("SAVE_WORKPACKAGE_SSUCCESS"), {styleClass: bCompact ? "sapUiSizeCompact" : ""});
						that.getView().setBusy(false);
					},
					error: function(oError) {
						MessageBox.error(oResourceBundle.getText("SAVE_WORKPACKAGES_ERROR"), {styleClass: bCompact ? "sapUiSizeCompact" : ""});
						that.getView().setBusy(false);
					}
				});
			} else {
				MessageBox.success(oResourceBundle.getText("SAVE_WORKPACKAGES_NOCHANGES"), {styleClass: bCompact ? "sapUiSizeCompact" : ""});
				that.oView.setBusy(false);
			}
		},
	});

});