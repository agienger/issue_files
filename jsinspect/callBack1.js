myFunc([
	"test/worklistvariant/controller/BaseController",
	"ui/model/json/JSONModel",
	"test/worklistvariant/model/formatter",
	"test/worklistvariant/model/ODataHandler",
	"test/worklistvariant/model/MessageHandler"
], function(BaseController, JSONModel, formatter, ODataHandler, MessageHandler) {
	"use strict";

	return BaseController.extend("sap.grc.acs.fraud.worklistvariant.controller.Detail", {
		formatter: formatter,

		onInit: function() {
			var oViewModel = new JSONModel({
					busy: false,
					delay: 0
				}),
				oActionsModel = new JSONModel({
					isEditEnable: true,
					isCancelEnable: false,
					isSaveEnable: false
				});

			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);

			this.setModel(oViewModel, "detailView");
			this.setModel(oActionsModel, "actions");
			this.setModel(this.createModel(), "selectionFields");
			this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));
			this._showFormFragment("DisplayDetail");
		},


		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 *
		 * @function
		 * @param {ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched: function(oEvent) {
			var sObjectPath = "/WorklistVariants(guid'" + oEvent.getParameter("arguments").objectId + "')";
			var that = this,
				fnOnConfirm;
			var bIsEdit = this.getModel("actions").getProperty("/isCancelEnable");
			if (bIsEdit === true) {
				// reset selection in master list and show data loss popup
				this.getOwnerComponent().oListSelector.selectAListItem(this.getView().getBindingContext().getPath());
				fnOnConfirm = function() {
					that._toggleButtonsAndView(false);
					that._navigateToMatchedObject(sObjectPath);
				};
				this.showDataLossConfirmationDialog(fnOnConfirm);
			} else {
				this._navigateToMatchedObject(sObjectPath);
			}
		},

		_navigateToMatchedObject: function(sObjectPath) {
			var oWorklistVariant = this.getModel().getProperty(sObjectPath);
			var that = this,
				sWorklistType, fnSuccess;

			if (!oWorklistVariant) {
				this.getModel().read(sObjectPath, {
					success: function() {
						that._navigateToMatchedObject(sObjectPath);
					},
					error: function() {
						that.getRouter().getTargets().display("detailObjectNotFound");
					}
				});
				return;
			}

			sWorklistType = oWorklistVariant.WorkListType;
			fnSuccess = function(oData) {
				that.getModel("selectionFields").setData(oData);
			};
			ODataHandler.getWorkListTypeSelectionFields(this.getModel(), sWorklistType, fnSuccess);
			this._bindView(sObjectPath);
		},

		/**
		 * Binds the view to the object path. Makes sure that detail view displays
		 * a busy indicator while data for the corresponding element binding is loaded.
		 *
		 * @function
		 * @param {string} sObjectPath path to the object to be bound to the view.
		 * @private
		 */
		_bindView: function(sObjectPath) {
			var oViewModel = this.getModel("detailView");

			oViewModel.setProperty("/busy", false);

			this.getView().bindElement({
				path: sObjectPath,
				events: {
					change: this._onBindingChange.bind(this),
					dataRequested: function() {
						oViewModel.setProperty("/busy", true);
					},
					dataReceived: function() {
						oViewModel.setProperty("/busy", false);
					}
				}
			});
		},

		_onBindingChange: function() {
			var oView = this.getView(),
				oElementBinding = oView.getElementBinding();

			if (!oElementBinding.getBoundContext()) {
				this.getRouter().getTargets().display("detailObjectNotFound");
				this.getOwnerComponent().oListSelector.clearMasterListSelection();
				return;
			}

			var sPath = oElementBinding.getPath();
			this.getOwnerComponent().oListSelector.selectAListItem(sPath);
		},

		_onMetadataLoaded: function() {
			// Store original busy indicator delay for the detail view
			var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
				oViewModel = this.getModel("detailView");
			oViewModel.setProperty("/delay", 0);

			// Binding the view will set it to not busy - so the view is always busy if it is not bound
			oViewModel.setProperty("/busy", true);
			// Restore original busy indicator delay for the detail view
			oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
		},

		_showFormFragment: function(sFragmentName) {
			var oDetailPage = this.getView().byId("detailPage");
			if (sFragmentName === "DisplayDetail") {
				oDetailPage.setTitle(this.getResourceBundle().getText("detailTitle"));
			} else if (sFragmentName === "EditDetail") {
				oDetailPage.setTitle(this.getResourceBundle().getText("editDetailTitle"));
			}
			oDetailPage.removeAllContent();
			oDetailPage.insertContent(this._getFormFragment(sFragmentName));
		},

		_getFormFragment: function(sFragmentName) {
			if (this._formFragment) {
				this._formFragment.destroy();
			}
			this._formFragment = ui.xmlfragment("sap.grc.acs.fraud.worklistvariant.view." + sFragmentName, this);
			return this._formFragment;
		},

		onEditPress: function() {
			this._toggleButtonsAndView(true);
		},

		onCancelPress: function() {
			var that = this;
			var fnOnConfirm = function(){
				that._toggleButtonsAndView(false);	
			};
			this.showDataLossConfirmationDialog(fnOnConfirm);
		},

		onSavePress: function() {
			var oModel = this.getView().getModel(),
				oNewWorklistVariant = this.getView().getBindingContext().getObject(),
				sPath = this.getView().getBindingContext().getPath(),

				oPropertiesForm = this.getView().byId("detailPage").getContent()[0].getContent()[0],
				oInput = oPropertiesForm.getContent()[oPropertiesForm.getContent().length - 3],
				sDescription = "",
				that = this,
				fnSuccess;

			fnSuccess = function() {
				MessageHandler.showSuccessMessage(that.getResourceBundle().getText("WORKLIST_VARIANT_SUCCESS_UPDATED", [oNewWorklistVariant.Description]));
				var sObjectId = oNewWorklistVariant.Key;
				that.getRouter().navTo("object", {
					objectId: sObjectId
				}, true);
				that._toggleButtonsAndView(false);

			};
			sDescription = oPropertiesForm.getContent()[oPropertiesForm.getContent().length - 3].getValue();
			if (sDescription === "") {
				oInput.setValueState(ui.core.ValueState.Error);
				oInput.setValueStateText(this.getResourceBundle().getText("TOOLTIP_VALUE_STATE_ERROR_EMPTY"));
			} else {
				oInput.setValueState(ui.core.ValueState.None);
				oInput.setValueStateText("");
				oNewWorklistVariant.Description = sDescription;
				ODataHandler.updateWorkListVariant(oModel, sPath, oNewWorklistVariant, fnSuccess);
			}
		},
		_resetInputFields: function() {
			var oPropertiesForm = this.getView().byId("detailPage").getContent()[0].getContent()[0],
				oInput = oPropertiesForm.getContent()[oPropertiesForm.getContent().length - 3];

			oInput.setValueState(ui.core.ValueState.None);
			oInput.setValueStateText("");
		},
		_onBeforeShow: function() {
			this._resetInputFields();
		},
		onDeletePress: function() {
			var oModel = this.getView().getModel(),
				oWorklistVariant = this.getView().getBindingContext().getObject(),
				sPath = this.getView().getBindingContext().getPath(),
				fnSuccess, fnOnConfirm, that = this;

			fnOnConfirm = function() {
				fnSuccess = function() {
					MessageHandler.showSuccessMessage(that.getResourceBundle().getText("WORKLIST_VARIANT_SUCCESS_DELETED", [oWorklistVariant.Description]));
					that.getView().unbindContext();
					that.getRouter().navTo("master", {}, true);
				};
				ODataHandler.deleteWorklistVariant(oModel, sPath, oWorklistVariant, fnSuccess);
			};
			this.showDeleteConfirmationDialog(fnOnConfirm, oWorklistVariant.Id);
		},

		showDeleteConfirmationDialog: function(fnOnClose, sVariantId) {
			var oBundle = this.getResourceBundle();
			var that = this;
			var sMessage = oBundle.getText("MESSAGE_DELETE_VARIANT", sVariantId);
			var dialog = new sap.m.Dialog({
				title: oBundle.getText("TITLE_DELETE_VARIANT"),
				type: "Message",
				content: new sap.m.Text({
					text: sMessage
				}),
				beginButton: new sap.m.Button({
					id: this.createId("confirmDelete"),
					text: oBundle.getText("DELETE_VARIANT"),
					press: function() {
						jQuery.proxy(fnOnClose, that)();
						dialog.close();
					}
				}),
				endButton: new sap.m.Button({
					text: oBundle.getText("CANCEL"),
					press: function() {
						dialog.close();
					}
				}),
				afterClose: function() {
					dialog.destroy();
				}
			});
			dialog.open();
		},

		_toggleButtonsAndView: function(bEdit) {
			var oView = this.getView();
			oView.getModel("actions").setProperty("/isEditEnable", !bEdit);
			oView.getModel("actions").setProperty("/isSaveEnable", bEdit);
			oView.getModel("actions").setProperty("/isCancelEnable", bEdit);

			this._showFormFragment(bEdit ? "EditDetail" : "DisplayDetail");
		}
	});

});
