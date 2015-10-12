myFunc([
	"test/worklistvariant/controller/BaseController",
	"ui/model/json/JSONModel",
	"test/worklistvariant/model/formatter",
	"test/worklistvariant/model/ODataHandler",
	"test/worklistvariant/model/MessageHandler"
], function(BaseController, JSONModel, formatter, ODataHandler, MessageHandler) {
	"use strict";

	return BaseController.extend("test.worklistvariant.controller.NewDetail", {
		formatter: formatter,
		onInit: function() {
			this.setModel(this.createModel(), "create");
			this.setModel(this.createModel(), "selectionFields");
			this.getView().addEventDelegate({ // beforeFirstShow doesn't work
				onBeforeShow: jQuery.proxy(this._onBeforeShow, this)
			});
		},

		_onBeforeShow: function() {
			this._reset();
		},

		onCancelPress: function() {
			var fnOnConfirm = function(){
				BaseController.prototype.onNavBack.apply(this, arguments);
			};
			this.showDataLossConfirmationDialog(fnOnConfirm);
		},

		_reset: function() {
			this._resetModels();
			this._resetFields();
		},

		_resetModels: function() {
			this.getModel("create").setData({
				WorkListType: "",
				Id: "",
				Description: ""
			});
			this.getModel("selectionFields").setData({});
		},

		_resetFields: function() {
			this.byId("sWorklistType").setValue("");
			this._resetInputFields();
		},

		onSavePress: function() {
			var oModel = this.getView().getModel(),
				oNewWorklistVariant = this.getView().getModel("create").oData,
				bMissingWLType = false,
				bMissingId = false,
				bMissingDescription = false;

			bMissingWLType = this._checkWorklistTypeEmpty(oNewWorklistVariant.WorkListType);
			bMissingId = this._checkWorklistVariantNameEmpty(oNewWorklistVariant.Id);
			bMissingDescription = this._checkWorklistVariantDescriptionEmpty(oNewWorklistVariant.Description);

			if (!bMissingWLType && !bMissingId && !bMissingDescription) {
				ODataHandler.createWorkListVariant(oModel, oNewWorklistVariant, jQuery.proxy(this._saveSuccessHandler, this));
			}
		},

		_setValueStateForInputField: function(oInput, sValueState, sValueText) {
			oInput.setValueState(sValueState);
			oInput.setValueStateText(sValueText);
		},

		_checkWorklistTypeEmpty: function(sWorklistType) {
			var bWorklistTypeEmpty = false,
				oInput = this.getView().byId("sWorklistType");
			if (sWorklistType === "") {
				this._setValueStateForInputField(oInput, ui.core.ValueState.Error, this.getResourceBundle().getText(
					"TOOLTIP_VALUE_STATE_ERROR_EMPTY"));
				bWorklistTypeEmpty = true;
			} else {
				this._setValueStateForInputField(oInput, ui.core.ValueState.None, "");
			}
			return bWorklistTypeEmpty;
		},
		_resetInputFields: function() {
			var oInputWLType = this.getView().byId("sWorklistType"),
				oInputId = this.getView().byId("sInputId"),
				oInputDesc = this.getView().byId("sInputDescription");

			this._setValueStateForInputField(oInputWLType, ui.core.ValueState.None, "");
			this._setValueStateForInputField(oInputId, ui.core.ValueState.None, "");
			this._setValueStateForInputField(oInputDesc, ui.core.ValueState.None, "");
		},
		_checkWorklistVariantNameEmpty: function(sName) {
			var bNameEmpty = false,
				oInput = this.getView().byId("sInputId");
			if (sName === "") {
				this._setValueStateForInputField(oInput, ui.core.ValueState.Error, this.getResourceBundle().getText(
					"TOOLTIP_VALUE_STATE_ERROR_EMPTY"));
				bNameEmpty = true;
			}else {
				this._setValueStateForInputField(oInput, ui.core.ValueState.None, "");
			}
			return bNameEmpty;
		},

		_checkWorklistVariantDescriptionEmpty: function(sDescription) {
			var bDescriptionEmpty = false,
				oInput = this.getView().byId("sInputDescription");
			if (sDescription === "") {
				this._setValueStateForInputField(oInput, ui.core.ValueState.Error, this.getResourceBundle().getText(
					"TOOLTIP_VALUE_STATE_ERROR_EMPTY"));
				bDescriptionEmpty = true;
			} else {
				this._setValueStateForInputField(oInput, ui.core.ValueState.None, "");
			}
			return bDescriptionEmpty;
		},

		_saveSuccessHandler: function(oData) {
			MessageHandler.showSuccessMessage(this.getResourceBundle().getText("WORKLIST_VARIANT_SUCCESS_CREATED", [oData.Description]));
			var sObjectId = oData.Key;
			this.getRouter().navTo("object", {
				objectId: sObjectId
			}, true);
		},

		_getCreateModel: function() {
			var oModel = new ui.model.json.JSONModel();
			oModel.setDefaultBindingMode(ui.model.BindingMode.TwoWay);
			oModel.setSizeLimit(2147483646);
			return oModel;
		},

		onWorklistTypeSelected: function() {
			this._setDateAttributeForWorklistType();
			this._setValueStateForInputField(this.getView().byId("sWorklistType"), ui.core.ValueState.None, "");
		},

		onVariantNameChanged: function(oEvent) {
			oEvent.getSource().setValue(oEvent.getSource().getValue().toUpperCase().replace(/[^a-z0-9_-]/gi, ""));
		},

		_setDateAttributeForWorklistType: function() {
			var oSelectedWorklistType = this.byId("sWorklistType").getSelectedItem(),
				sPath,
				oODataWorklistType = {},
				fnSuccess,
				that = this;

			if (!oSelectedWorklistType) {
				oSelectedWorklistType = this.byId("sWorklistType").getItems()[0];
			}
			sPath = oSelectedWorklistType.getBindingContext().sPath;
			oODataWorklistType = this.getView().getModel().getProperty(sPath);
			fnSuccess = function(oData) {
				that.getModel("selectionFields").setData(oData);
			};
			ODataHandler.getWorkListTypeSelectionFields(this.getModel(), oODataWorklistType.Id, fnSuccess);
		}

	});

});
