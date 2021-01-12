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
	"sap/m/ObjectListItem",
	"sap/m/ObjectAttribute",
	"zwx/sm/charm/wp/successfullytested/utils/dateUtils",
], function (BaseController, JSONModel, formatter, mobileLibrary, MessageToast, Dialog,
	Button, MessagePopover, MessagePopoverItem, ValueState, MessageBox, ObjectListItem, ObjectAttribute, DateUtils) {
	"use strict";

	// shortcut for sap.m.URLHelper
	var URLHelper = mobileLibrary.URLHelper;

	return BaseController.extend("zwx.sm.charm.wp.successfullytested.controller.Detail", {
		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit: function () {
			var oViewModel = new JSONModel({
				busy: false,
				delay: 0,
				title: this.getResourceBundle().getText("detailTitle"),
			});
			this.initViewComponents();
			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
			this.setModel(oViewModel, "detailView");
			this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));
		},

		initViewComponents: function () {
			var oView = this.getView();
			oView.textList = this.byId("textList");
			this.initNewTexts();
		},

		initNewTexts: function () {
			var oView = this.getView();
			var textValueModel = new JSONModel({
				value: ""
			})	
			var addNewTextButtonModel = new JSONModel({
				enabled: true
			})
			oView.setModel(textValueModel, "textValue");
			oView.setModel(addNewTextButtonModel, "addNewTextButton");
		},

		resetAddNewTextButton: function () {
			this.oView.getModel("addNewTextButton").getData().enabled = true;
			this.oView.getModel("addNewTextButton").refresh(true);
		},

		_onObjectMatched: function (oEvent) {
			this.sGUID = oEvent.getParameter("arguments").guid;
			var sObjectPath = "WorkPackageSet(guid'" + this.sGUID + "')";
			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
			this.getModel().metadataLoaded().then(function () {
				this._bindView("/" + sObjectPath);
			}.bind(this));
			this.resetAddNewTextButton();
		},

		_bindView: function (sObjectPath) {
			// Set busy indicator during view binding
			var oViewModel = this.getModel("detailView");
			var oView = this.getView();
			oView.taskListItemPath = "/TaskListItemSet";
			oView.attachmentPath = sObjectPath + "/AttachmentSet";
			oView.actionsPath = sObjectPath + "/ActionSet";
			oView.textSetPath = sObjectPath + "/TextSet";

			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			oViewModel.setProperty("/busy", false);
			this.initActionSheet(oView);
			this.getView().bindElement({
				path: sObjectPath,
				parameters: {
					expand: 'ActionSet,AttachmentSet,ScopeSet,EffortSet,TextSet'
				},
				events: {
					change: this._onBindingChange.bind(this),
					dataRequested: function () {
						oViewModel.setProperty("/busy", true);
					},
					dataReceived: function () {
						//this._onBindingChange.bind(this)
						oViewModel.setProperty("/busy", false);
					}.bind(this)
				}
			});


		},

		_onBindingChange: function () {
			var oView = this.getView(),
				oElementBinding = oView.getElementBinding();
			var oResourceBundle = this.getView().getModel("i18n").getResourceBundle();

			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				// this.getRouter().getTargets().display("detailObjectNotFound");
				// if object could not be found, the selection in the master list
				// does not make sense anymore.
				this.getOwnerComponent().oListSelector.clearMasterListSelection();
				this.getRouter().navTo("master");
				MessageToast.show(oResourceBundle.getText("objectIsNotAvailable", [this.sGUID]));	
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

		initActionSheet: function (oView) {
			this.resetActionSheet();
			var that = this;
			var actionModel = new JSONModel();
			this.setModel(actionModel, "actionModel");
			var actionSheet = that.byId("actionSheet");
			oView.getModel().read(oView.actionsPath, {
				success: function (oData, oResponse) {
					$.each(oData.results, function (i, item) {
						actionSheet.addButton(new Button({
							text: item.ActionName,
							press: that.onPressAccept.bind(that)
						}))
					});
					actionModel.setData(oData.results);
				}, error: function (oError) { }
			});
		},

		resetActionSheet: function () {
			var actionSheet = this.byId("actionSheet");
			actionSheet.removeAllButtons();
		},

		_onMetadataLoaded: function () {
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
				this.getModel("appView").setProperty("/layout", this.getModel("appView").getProperty("/previousLayout"));
			}
		},

		onButtonPress: function (oEvent) {
			var oButton = oEvent.getSource();
			this.byId("actionSheet").openBy(oButton);
		},


		onPressAccept: function (oEvent) {
			var that = this;
			var sCurrentPath = oEvent.getSource().getBindingContext().getPath();
			var oModel = that.getView().getModel();
			var oViewModel = this.getModel("detailView");
			//oModel.setProperty(sCurrentPath + "/Status", status);
			MessageToast.show(oEvent.getSource().getText());
			var actionModel = this.getModel("actionModel");
			var actionGUID, actionID;

			$.each(actionModel.getData(), function (i, item) {
				if (item.ActionName === oEvent.getSource().getText()) {
					actionGUID = item.ActionGUID;
					actionID = item.ActionID
				}
			});

			oViewModel.setProperty("/busy", true);
			oModel.callFunction("/nextStatus", {
				method: 'GET',
				urlParameters: {
					GUID: this.sGUID,
					ActionID: actionID,
					comment: ""
				},
				success: function (oData, oResponse) {
					var messageType = oResponse.data.nextStatus.Type;
					var messageText = oResponse.data.nextStatus.Message;
					if(messageType === "E"){
						MessageBox.error(messageText);
					}else{
						MessageBox.success(messageText);
						oModel.refresh(true);
						this.onCloseDetailPress();
					}					
					this.getView().getElementBinding().refresh(true);
					oViewModel.setProperty("/busy", false);
				}.bind(this),
				error: function (oError, oResponse) {
					oViewModel.setProperty("/busy", false);
				}
			});
		},

		onNavBack: function () {
			// eslint-disable-next-line sap-no-history-manipulation
			history.go(-1);
		},

		onAddText: function (oEvent) {
			var that = this;
			if (!this._selectNotificationDialog) {
				this._selectNotificationDialog = sap.ui.xmlfragment(
					"zwx.sm.charm.wp.successfullytested.view.NotificationDialog", this);
				this.getView().addDependent(this._selectNotificationDialog);
			}
			this._selectNotificationDialog.open();
		},

		handleNotificationSelect: function (oEvent) {
			var oView = this.getView();
			var sPath = oView.getElementBinding().getPath();
			var fullName = this.getOwnerComponent().getModel("userInfo").getData().fullName;
			var currentDate = DateUtils.dateFormat("dd.mm.YYYY", new Date());
			var textValue = this.oView.getModel("textValue").getData().value;
			var tdidTxt = "Description of Change:";
			var newText = {
				TdfuserText: fullName,
				TextString: textValue,
				DateTimeText: currentDate,
				TdidTxt: tdidTxt,
				refGUID: this.sGUID,
				Tdid: "CR01"
			}

			this.oView.setModel(newText, "newText");
			this.oView.getModel("addNewTextButton").getData().enabled = false;
			this.oView.getModel("addNewTextButton").refresh(true);
			this.oView.getModel("textValue").getData().value="";
			this.oView.getModel("textValue").refresh(true);
			var objectListItem = new ObjectListItem({
				title: fullName,
				attributes: [
					new ObjectAttribute({ text: textValue }),
					new ObjectAttribute({ text: tdidTxt + currentDate })
				]
			});
			this.listItem = objectListItem;
			oView.textList.addItem(objectListItem);
			this._selectNotificationDialog.close();
			sap.ui.getCore().byId('textAreaWithBinding').setValue("");
		},

		createNewText: function () {
			var oView = this.getView();
			var oModel = oView.getModel();
			var oResourceBundle = oView.getModel("i18n").getResourceBundle();
			var newTextObj = this.oView.getModel("newText");
			oModel.create("/TextSet", newTextObj, {
				success: function (oData, Response) {
					if (oData !== "" || oData !== undefined) {
						MessageBox.success("Created successfully.");
						oView.textList.removeItem(this.listItem);
					} else {
						MessageBox.error("New entry not created.");
					}
					oModel.refresh(true);
					this.resetAddNewTextButton();
					this.getView().setBusy(false);
				}.bind(this),
				error: function (oError) {
					MessageBox.error("New entry not created.");
					this.getView().setBusy(false);
				}.bind(this)
			});
		},

		onSaveButtonPress: function (oEvent) {
			this.getView().setBusy(true);
			this.createNewText();
		},

		handleNotificationCancelDialog: function () {
			this.getView().getModel().resetChanges();
			this._selectNotificationDialog.close();
		},

		onMessagesButtonPress: function (oEvent) {
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


		validateNote: function (oEvent) {
			var oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
			var sValue = oEvent.getParameter("value");
			var oSource = oEvent.getSource();
			if (sValue && sValue.trim().length > 0) {
				oSource.setValueState(ValueState.Success);
				oSource.setValueStateText(null);
			} else {
				oSource.setValueState(ValueState.Error);
				var sPath = this.getView().getElementBinding().getPath();
				var oObject = this.getView().getModel().getObject(sPath);
				oSource.setValueStateText(oResourceBundle.getText("ERROR_EMPTY_NOTE"));
			}
		}
	});

});