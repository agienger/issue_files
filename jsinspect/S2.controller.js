jQuery.sap.require("sap.ca.scfld.md.controller.ScfldMasterController");
jQuery.sap.require("cross.fnd.fiori.inbox.util.MultiSelect");
jQuery.sap.require("cross.fnd.fiori.inbox.util.Forward");
jQuery.sap.require("cross.fnd.fiori.inbox.util.SupportInfo");
jQuery.sap.require("cross.fnd.fiori.inbox.util.Resubmit");
jQuery.sap.require("cross.fnd.fiori.inbox.util.TaskStatusFilterProvider");
jQuery.sap.require("cross.fnd.fiori.inbox.util.InboxFilterContributor");
jQuery.sap.require("cross.fnd.fiori.inbox.util.OutboxFilterContributor");
jQuery.sap.require("cross.fnd.fiori.inbox.util.ConfirmationDialogManager");
jQuery.sap.require("cross.fnd.fiori.inbox.util.Substitution");

sap.ca.scfld.md.controller.ScfldMasterController.extend("cross.fnd.fiori.inbox.view.S2", {

	//	Controller Hook method definitions

	//	This hook method can be used to modify the list of properties
	//	that are used for filtering of the S2 list items.
	//	It is called when the application starts and the S2 list screen is displayed.
	extHookChangeFilterItems: null,

	//  This hook method can be used to modify the list of properties
	//  that are used for sorting the S2 list items.
	//  It is called when the application starts and the S2 list screen is displayed.
	extHookChangeSortConfig: null,

	//  This hook method can be used to modify the list of properties
	//  that are used for grouping the S2 list items.
	//  It is called when the application starts and the S2 list screen is displayed.
	extHookChangeGroupConfig: null,

	//	This hook method can be used to replace the standard filter by a custom one based on the filterKey
	//	It is called when a filter option is selected on the UI.
	extHookGetCustomFilter: null,
	
	//	This hook method can be used to add and change buttons for the list view footer in mass approval mode
	//	It is called before the list of buttons are created in the footer
	extHookChangeMassApprovalButtons: null,
	
	//	This hook method can be used to add additional properties to the subset of the Properties of the workitem
	//	that the response from the OData service should return
	//	It is called before the bindAggrigation "Items" of the master list
	extHookGetPropertiesToSelect: null,
	
	//Filter constants
	_FILTER_CATEGORY_PRIORITY: "Priority",
	_FILTER_PRIORITY_VERY_HIGH: "VERY_HIGH",
	_FILTER_PRIORITY_HIGH: "HIGH",
	_FILTER_PRIORITY_MEDIUM: "MEDIUM",
	_FILTER_PRIORITY_LOW: "LOW",
	
	_FILTER_CATEGORY_COMPLETION_DEADLINE: "CompletionDeadLine",
	_FILTER_EXPIRY_DATE_OVERDUE: "Overdue",
	_FILTER_EXPIRY_DATE_DUE_IN_7_DAYS: "DueIn7days",
	_FILTER_EXPIRY_DATE_DUE_IN_30_DAYS: "DueIn30days",
	_FILTER_EXPIRY_DATE_ALL: "All",
	
	_FILTER_CATEGORY_TASK_DEFINITION_ID: "TaskDefinitionID",
	_FILTER_CATEGORY_SUBSTITUTED_USER: "SubstitutedUser",

	_SORT_CREATEDON: "CreatedOn",
	_SORT_CREATEDONREVERSE: "CreatedOnReverse",
	_SORT_CREATEDBYNAME: "CreatedByName",
	_SORT_PRIORITY: "Priority",
	_SORT_PRIORITY_NUMBER: "PriorityNumber",
	_SORT_TASKTITLE: "TaskTitle",
	_SORT_COMPLETIONDEADLINE: "CompletionDeadLine",
	_SORT_SAPORIGIN: "SAP__Origin",
	_SORT_INSTANCEID: "InstanceID",
	_SORT_TASKDEFINITIONID: "TaskDefinitionID",
	_SORT_TASKDEFINITIONNAME: "TaskDefinitionName",
	_SORT_STATUS: "Status",
	_SORT_CREATEDBY: "CreatedBy",
	_SORT_PROCESSOR: "Processor",
	_SORT_STARTDEADLINE: "StartDeadLine",
	_SORT_EXPIRYDATE: "ExpiryDate",
	_SORT_ISESCALATED: "IsEscalated",
	_SORT_HASCOMMENTS: "HasComments",
	_SORT_HASATTACHMENTS: "HasAttachments",
	_SORT_HASPOTENTIALOWNERS: "HasPotentialOwners",
	_SORT_CONTEXTSERVICEURL: "ContextServiceURL",

	_CUSTOM_NUMBER_LABEL: "CustomNumberLabel",
	_CUSTOM_NUMBER_VALUE: "CustomNumberValue",
	_CUSTOM_NUMBER_UNIT_LABEL: "CustomNumberUnitLabel",
	_CUSTOM_NUMBER_UNIT_VALUE: "CustomNumberUnitValue",
	_CUSTOM_OBJECT_ATTRIBUTE_LABEL: "CustomObjectAttributeLabel",
	_CUSTOM_OBJECT_ATTRIBUTE_VALUE: "CustomObjectAttributeValue",

	_GROUP_SUPPORTSRELEASE: "SupportsRelease",
	// Grouped by status ordering (ascending) and i18n keys for group headers: (FIXME)
	_GROUP_STATUS_ORDER: [{
		Status: "READY",
		TextKey: "group.status.ready"
	}, {
		Status: "IN_PROGRESS",
		TextKey: "group.status.in_progress"
	}, {
		Status: "RESERVED",
		TextKey: "group.status.reserved"
	}, {
		Status: "EXECUTED",
		TextKey: "group.status.executed"
	}, {
		Status: "FOR_RESUBMISSION",
		TextKey: "group.status.suspended"
	}, {
		Status: "COMPLETED",
		TextKey: "group.status.completed"
	}],

	//	_PRIO_MAPPING: {
	//		"VERY_HIGH": 0,
	//		"HIGH": 1,
	//		"MEDIUM": 2,
	//		"LOW": 3
	//	},
	//	_PRIO_UNKNOWN: 100,

	aItemContextPathsToSelect: [],

	complexFilter: {
		Priority: [],
		CompletionDeadLine: [],
		TaskDefinitionID: [],
		SubstitutedUser: [],
		Status: [],
		CreatedOn: [],
		CustomNumberValue: [],
		CustomNumberUnitValue: [],
		CustomObjectAttributeValue: []

	},
	sSearchPattern_Support: "",
	sFilterKey_Support: "",
	sSortKey_Support: "",
	sGroupkey_Support: "",
	oConfirmationDialogManager: cross.fnd.fiori.inbox.util.ConfirmationDialogManager,

	bHideHeaderFooterOptions: null,
	
	aSelectProperties: ["SAP__Origin","InstanceID","TaskDefinitionID","TaskTitle","SupportsRelease","CreatedByName","CreatedBy",
							"CompletionDeadLine","SubstitutedUserName","Priority","HasComments","HasAttachments",
								"TaskSupports", "TaskDefinitionName", "Status", "PriorityNumber", "CreatedOn"],
	
	aSelectPropertiesOutbox: ["CompletedOn","ResumeOn"],
	
	onInit: function() {

		//In S2.view, we have the ObjectListItem added as a template declaratively. This creates an item in the list already.
		//Due to changes in the UI5 binding framework, if the item is not removed, we do not see the first task in the list.
		//There is an extension point provided for the ObjectListItem. To keep that intact and get around the removeItem() call we could try the following
		// Check if we can only provide an extension point under the items node in the S2.view.xml, remove the ObjectListItem from the view, 
		//handle the template binding completely in the controller. We need to check if this approach provides the desired behavior without breaking the extension.
		if (this.getList().getItems().length > 0) {
			this.getList().removeItem(0);
		}

		// execute the onInit for the base class BaseDetailController
		sap.ca.scfld.md.controller.ScfldMasterController.prototype.onInit.call(this);

		sap.ca.scfld.md.app.Application.getImpl().getComponent()
			.getEventBus().subscribe("cross.fnd.fiori.inbox", "multiselect", this.onMultiSelectEvent, this);

		sap.ca.scfld.md.app.Application.getImpl().getComponent()
			.getEventBus().subscribe("cross.fnd.fiori.inbox", "open_supportinfo", this.onSupportInfoOpenEvent, this);

		this.iTotalFilteredItems = 0; // to keep track of number of filtered items
		// create the data manager reference
		var oComponent = sap.ca.scfld.md.app.Application.getImpl().getComponent();
		this.sResubmitUniqueId = this.createId() + "DLG_RESUBMIT";
		this.oDataManager = oComponent.getDataManager();
		var oOriginalModel = undefined;
		if (!this.oDataManager) {
			jQuery.sap.require("cross.fnd.fiori.inbox.util.DataManager");
			oOriginalModel = this.getView().getModel();
			this.oDataManager = new cross.fnd.fiori.inbox.util.DataManager(oOriginalModel, this);
			oComponent.setDataManager(this.oDataManager);
		}
		this.oDataManager.oListView = this.getView();
		cross.fnd.fiori.inbox.oDataReadExtension.overrideRead(this.getView().getModel());
		this.overrideMHFHelperSetMasterTitle();
		this.overrideMHFHelperFooterHandling();

		this.getView().getModel().attachRequestSent(jQuery.proxy(this.handleMasterRequestSent, this));
		this.getView().getModel().attachRequestCompleted(jQuery.proxy(this.handleMasterRequestCompleted, this));
		this.getView().getModel().attachRequestFailed(jQuery.proxy(this.handleRequestFailed, this));

		this.getView().getModel().attachMetadataFailed(jQuery.proxy(this.handleMetadataFailed, this));

		this.getView().getModel().setSizeLimit(this.oDataManager.getListSize());

		this.oRouter.attachRouteMatched(function(oEvent) {
			if (oEvent.getParameter("name") === "master") {
				if (this.bIsMasterInited) {
					if (sap.ui.Device.system.phone) {
						//Remove the list selection in case of a phone
						var oList = this.getList();
						oList.removeSelections(true);
						this.sBindingContextPath = null;
					}
					return; //skip the rest because it is a back navigation
				}

				var controller = this;

				this.oDataManager.attachItemRemoved($.proxy(this._handleItemRemoved, this));

				this.sInfoHeaderGroupString = null;
				this.sInfoHeaderFilterString = null;

				// S2 list sort is supported only in non-multiorigin mode.
				this.bDisplaySortOption = false;

				// S2 list default sort key (see handleSort).
				this.sDefaultSortKey = this._SORT_CREATEDON;

				// S2 list current sort key and visible sort options.
				this.sSortKey = null;
				this.aVisibleSortItems = [];

				var fnIsBackendDefaultSortKeyEqualsTo = function(sKey) {
					return (function() {
						return controller.sBackendDefaultSortKey === sKey;
					});
				};

				// S2 list sorter configuration (list of available sort options).
				this.oSortConfig = {};
				this.oSortConfig[this._SORT_CREATEDON] = {
					text: "{i18n>sort.createdOn}",
					descending: true,
					getVisible: fnIsBackendDefaultSortKeyEqualsTo(this._SORT_CREATEDON)
				};
				this.oSortConfig[this._SORT_CREATEDONREVERSE] = {
					text: "{i18n>sort.createdOnReverse}",
					getVisible: fnIsBackendDefaultSortKeyEqualsTo(this._SORT_CREATEDONREVERSE)
				};
				this.oSortConfig[this._SORT_CREATEDBYNAME] = {
					text: "{i18n>sort.createdByName}"
				};
				this.oSortConfig[this._SORT_PRIORITY] = {
					text: "{i18n>sort.priority}",
					descending: true
				};
				this.oSortConfig[this._SORT_TASKTITLE] = {
					text: "{i18n>sort.taskTitle}"
				};
				this.oSortConfig[this._SORT_COMPLETIONDEADLINE] = {
					text: "{i18n>sort.completionDeadLine}"
				};
				this.oSortConfig[this._SORT_SAPORIGIN] = {
					text: "{i18n>sort.sapOrigin}",
					getVisible: fnIsBackendDefaultSortKeyEqualsTo(this._SORT_SAPORIGIN)
				};
				this.oSortConfig[this._SORT_INSTANCEID] = {
					text: "{i18n>sort.instanceID}",
					getVisible: fnIsBackendDefaultSortKeyEqualsTo(this._SORT_INSTANCEID)
				};
				this.oSortConfig[this._SORT_TASKDEFINITIONID] = {
					text: "{i18n>sort.taskDefinitionID}",
					getVisible: fnIsBackendDefaultSortKeyEqualsTo(this._SORT_TASKDEFINITIONID)
				};
				this.oSortConfig[this._SORT_TASKDEFINITIONNAME] = {
					text: "{i18n>sort.taskDefinitionName}",
					getVisible: fnIsBackendDefaultSortKeyEqualsTo(this._SORT_TASKDEFINITIONNAME)
				};
				this.oSortConfig[this._SORT_STATUS] = {
					text: "{i18n>sort.status}",
					getVisible: fnIsBackendDefaultSortKeyEqualsTo(this._SORT_STATUS)
				};
				this.oSortConfig[this._SORT_CREATEDBY] = {
					text: "{i18n>sort.createdBy}",
					getVisible: fnIsBackendDefaultSortKeyEqualsTo(this._SORT_CREATEDBY)
				};
				this.oSortConfig[this._SORT_PROCESSOR] = {
					text: "{i18n>sort.processor}",
					getVisible: fnIsBackendDefaultSortKeyEqualsTo(this._SORT_PROCESSOR)
				};
				this.oSortConfig[this._SORT_STARTDEADLINE] = {
					text: "{i18n>sort.startDeadLine}",
					getVisible: fnIsBackendDefaultSortKeyEqualsTo(this._SORT_STARTDEADLINE)
				};
				this.oSortConfig[this._SORT_EXPIRYDATE] = {
					text: "{i18n>sort.expiryDate}",
					getVisible: fnIsBackendDefaultSortKeyEqualsTo(this._SORT_EXPIRYDATE)
				};
				this.oSortConfig[this._SORT_ISESCALATED] = {
					text: "{i18n>sort.isEscalated}",
					descending: true,
					getVisible: fnIsBackendDefaultSortKeyEqualsTo(this._SORT_ISESCALATED)
				};
				this.oSortConfig[this._SORT_HASCOMMENTS] = {
					text: "{i18n>sort.hasComments}",
					descending: true,
					getVisible: fnIsBackendDefaultSortKeyEqualsTo(this._SORT_HASCOMMENTS)
				};
				this.oSortConfig[this._SORT_HASATTACHMENTS] = {
					text: "{i18n>sort.hasAttachments}",
					descending: true,
					getVisible: fnIsBackendDefaultSortKeyEqualsTo(this._SORT_HASATTACHMENTS)
				};
				this.oSortConfig[this._SORT_HASPOTENTIALOWNERS] = {
					text: "{i18n>sort.hasPotentialOwners}",
					getVisible: fnIsBackendDefaultSortKeyEqualsTo(this._SORT_HASPOTENTIALOWNERS)
				};
				this.oSortConfig[this._SORT_CONTEXTSERVICEURL] = {
					text: "{i18n>sort.contextServiceURL}",
					getVisible: fnIsBackendDefaultSortKeyEqualsTo(this._SORT_CONTEXTSERVICEURL)
				};

				this.oSortConfig[this._CUSTOM_NUMBER_VALUE] = {
					text: this._CUSTOM_NUMBER_LABEL,
					getVisible: function() {
						var aListItems = controller.getList().getItems();
						var aCustomNumbers = controller._populateAllUniqueCustomAttributes(controller._CUSTOM_NUMBER_VALUE);
						return controller._areItemsUniqueByTaskType() && aCustomNumbers.length != 0 && aCustomNumbers.length < aListItems.length / 2;
					}
				};

				this.oSortConfig[this._CUSTOM_NUMBER_UNIT_VALUE] = {
					text: this._CUSTOM_NUMBER_UNIT_LABEL,
					getVisible: function() {
						var aListItems = controller.getList().getItems();
						var aCustomNumberUnits = controller._populateAllUniqueCustomAttributes(controller._CUSTOM_NUMBER_UNIT_VALUE);
						return controller._areItemsUniqueByTaskType() && aCustomNumberUnits.length != 0 && aCustomNumberUnits.length < aListItems.length /
							2;
					}
				};

				this.oSortConfig[this._CUSTOM_OBJECT_ATTRIBUTE_VALUE] = {
					text: this._CUSTOM_OBJECT_ATTRIBUTE_LABEL,
					getVisible: function() {
						var aListItems = controller.getList().getItems();
						var aCustomObjectAttributes = controller._populateAllUniqueCustomAttributes(controller._CUSTOM_OBJECT_ATTRIBUTE_VALUE);
						return controller._areItemsUniqueByTaskType() && aCustomObjectAttributes.length != 0 && aCustomObjectAttributes.length < aListItems
							.length / 2;
					}
				};

				/**
				 * @ControllerHook Change sort configuration
				 * This hook method can be used to modify the list of properties
				 * that are used for sorting the S2 list items.
				 * It is called when the application starts and the S2 list screen is displayed.
				 * @callback cross.fnd.fiori.inbox.view.S2~extHookChangeSortConfig
				 * @param {object} oSortConfig
				 * @return {void}
				 */
				if (this.extHookChangeSortConfig) {
					this.extHookChangeSortConfig(this.oSortConfig);
				}

				// S2 list current group item and descending flag.

				this.oGroupConfigItem = null;
				this.bGroupDescending = false;

				// S2 list group configuration (list of available group options).

				this.aGroupConfig = [];
				this.aGroupConfig.push({
					key: this._SORT_PRIORITY,
					textKey: "group.priority",
					formatter: function(oContext) {
						var sOrigin = oContext.getProperty(controller._SORT_SAPORIGIN);
						var sPrio = oContext.getProperty(controller._SORT_PRIORITY);
						return cross.fnd.fiori.inbox.Conversions.formatterPriority.call(controller.getView(), sOrigin, sPrio);
					}
				});
				//grouping Task Types based on TaskDefintionName
				this.aGroupConfig.push({
					key: this._SORT_TASKDEFINITIONNAME,
					textKey: "group.taskType",
					formatter: function(oContext) {

						var sTaskTitle = oContext.getProperty(controller._SORT_TASKDEFINITIONNAME);
						return sTaskTitle;
					}
				});
				this.aGroupConfig.push({
					key: this._SORT_STATUS,
					textKey: "group.status",
					formatter: function(oContext) {
						var i18nBundle = controller.getView().getModel("i18n").getResourceBundle();
						var sStatus = oContext.getProperty(controller._SORT_STATUS);
						var sTextKey;

						for (var i = 0; i < controller._GROUP_STATUS_ORDER.length; i++) {
							var oGroupOrder = controller._GROUP_STATUS_ORDER[i];

							if (oGroupOrder.Status == sStatus) {
								sTextKey = oGroupOrder.TextKey;
								break;
							}
						}

						return i18nBundle.getText(sTextKey);
					}
				});
				this.aGroupConfig.push({
					key: this._GROUP_SUPPORTSRELEASE,
					textKey: "group.reservation",
					formatter: function(oContext) {
						var i18nBundle = controller.getView().getModel("i18n").getResourceBundle();
						var sKey = oContext.getProperty(controller._GROUP_SUPPORTSRELEASE) ? "group.reservation.reserved" :
							"group.reservation.notReserved";
						return i18nBundle.getText(sKey);
					}
				});

				/**
				 * @ControllerHook Change grouping configuration
				 * This hook method can be used to modify the list of properties
				 * that are used for grouping the S2 list items.
				 * It is called when the application starts and the S2 list screen is displayed.
				 * @callback cross.fnd.fiori.inbox.view.S2~extHookChangeGroupConfig
				 * @param {object} aGroupConfig
				 * @return {void}
				 */
				if (this.extHookChangeGroupConfig)
					this.extHookChangeGroupConfig(this.aGroupConfig);

				this.bDisplayMultiSelectButton = false;
				this.clearDecisionButtons();

				this.oSubHeader = this.getPage().getSubHeader();

				if (oOriginalModel) {
					if (!this.oDataManager.oModel.getServiceMetadata()) {
						//Execution can only continue - e.g.: metadata fetch success in scaffolding
						this.oDataManager.oModel.attachMetadataLoaded(jQuery.proxy(function() {
							this.loadInitialAppData();
						}, this));
					} else {
						this.loadInitialAppData();
					}
				}

				this.bIsMasterInited = true;
			} else if (oEvent.getParameter("name") === "detail") {
				//store the path for the deep link scenario
				this.sBindingContextPath = this.getBindingContextPathFor(oEvent.getParameter("arguments"));
			}
		}, this);

		//FIXME: when SettingsButton error is fixed (ushell.resources is not undefined)
		this.iRequestCountStart++;

		this.aTaskTypeFilterItemsOrigins = [];
	},

	_areItemsUniqueByTaskType: function() {
		var aListItems = this.getList().getItems();
		if (!aListItems || aListItems.length === 0) {
			return false;
		}

		var index = 0;
		var oBindingContext = aListItems[index].getBindingContext();
		if (!oBindingContext) {
			if (aListItems.length === 1) {
				return false;
			}
			index += 1;
			oBindingContext = aListItems[index].getBindingContext();
		}
		var oBindingContext2;
		var i, imax;
		for (i = index + 1, imax = aListItems.length; i < imax; i++) {
			oBindingContext2 = aListItems[i].getBindingContext();
			// Shown if there is at least one due date.
			if (oBindingContext2 && oBindingContext2.getProperty("TaskDefinitionID") != oBindingContext.getProperty("TaskDefinitionID")) {
				return false;
			}
		}
		return true;
	},

	_handleItemRemoved: function(oEvent) {
		if (!sap.ui.Device.system.phone) {
			//To make the detail screen refreshed (action buttons, etc.)
			var oListItem = this.getList().getSelectedItem();
			var oParameters = this.getDetailNavigationParameters(oListItem);
			oParameters.InstanceID += ":";

			this.oRouter.navTo(this.getDetailRouteName(), oParameters, true);
		}
	},

	handleRequestFailed: function(oEvent) {
		var oList = this.getList();
		var sNoDataText = this.oApplicationFacade.getUiLibResourceModel().getText("NO_ITEMS_AVAILABLE");
		oList.setNoDataText(sNoDataText);
	},

	handleMasterRequestSent: function(oEvent) {
		//Clear the decision options when list data is loaded - refresh
		// TODO now with odata v2 model, RequestSent event gets triggered every time. Need to fix this.
		this.oDataManager.clearDecisionOptionsCache();
	},

	handleMasterRequestCompleted: function(oEvent) {
		var oModel = this.getView().getModel();

		if (!oModel.bDataChangeProcessingRequired) {
			return;
		}

		oModel.bDataChangeProcessingRequired = false;

		// return in case of error
		var responseCode = oEvent.getParameter("response").statusCode;
		if (responseCode && !(responseCode >= "200" && responseCode < "300")) {
			return;
		}

		var oList = this.getList();
		if (this.bDisplaySortOption) {
			this.displayVisibleSortItems();
		}

		if (oModel.bMassActionActive) {
			this._handleMultiSelectProcessing();
			oModel.bMassActionActive = false;
		}

		if (this.isMultiSelectActive()) {
			return;
		}

		/* TODO this code has been commented for now, as its creating problems in mobile devices
	    		Need to check the exact impact
	    		
	    	if (sap.ui.Device.system.phone) {
				return;
			}*/

		/* If there are no tasks, return
		 * Navigation to empty view will be done in the updateFinished event handler of the list
		 * */
		if (oModel.aTaskCollectionData && oModel.aTaskCollectionData.length == 0) {
			return;
		}

		var oS2List = this.getView().byId("list");
		var iItemIndexToSelect = -1;

		;

		if (!this.selectIteminListforDeepLink()) {
			// select a task after action
			var bItemFound = false;
			var sContextFound = "";
			var oLastItemContextPath = "";

			// iterate through task collections returned by the service call, to figure which task to select
			for (var sCtxPathKey in this.aItemContextPathsToSelect) {

				var sCtxPath = this.aItemContextPathsToSelect[sCtxPathKey];

				// search for the item having context as sCtxPath in the updated data
				for (var iListKey in oModel.aTaskCollectionData) {
					var sCurrentContext = new sap.ui.model.Context(this.oModel, "/TaskCollection(SAP__Origin='" + oModel.aTaskCollectionData[iListKey].SAP__Origin +
						"',InstanceID='" + oModel.aTaskCollectionData[iListKey].InstanceID + "')");
					if (sCurrentContext == sCtxPath) {
						// item found in the latest data
						iItemIndexToSelect = iListKey;
						bItemFound = true;
						sContextFound = sCurrentContext;
						break;
					}
				}

				var oLastItem = oModel.aTaskCollectionData[oModel.aTaskCollectionData.length - 1];
				oLastItemContextPath = new sap.ui.model.Context(this.oModel, "/TaskCollection(SAP__Origin='" + oLastItem.SAP__Origin +
					"',InstanceID='" + oLastItem.InstanceID + "')");

				if (bItemFound) {

					/* if item is found in the model but list is empty, return
					 * Navigation to empty view will be done in the updateFinished event handler of the list
					 * */
					if (oS2List.getItems().length == 0) {
						return;
					}

					for (var iKey in oS2List.getItems()) {
						if (oS2List.getItems()[iKey].getBindingContextPath() == sContextFound) {
							this.setListItem(oS2List.getItems()[iKey]);
							this.aItemContextPathsToSelect = [];
							break;
						}
					}
				}
			}
			if (!bItemFound) {
				//In case of last item processing: select the new last item instead of the first one
				if (this.aItemContextPathsToSelect.length == 2 && this.aItemContextPathsToSelect[0] === this.aItemContextPathsToSelect[1]) {
					for (var iKey in oS2List.getItems()) {
						if (oS2List.getItems()[iKey].getBindingContextPath() == oLastItemContextPath) {
							this.setListItem(oS2List.getItems()[iKey]);
							this.aItemContextPathsToSelect = [];
						}
					}
				}

				//Deep link scenario handling
				else {
					//this._selectItemByCtxtPath();
					this.selectIteminListforDeepLink();
				}
			}

		}

	},

	selectIteminListforDeepLink: function() {
		if (this.aItemContextPathsToSelect.length == 0 && this.getList().getItems().length > 0) {
			//Deep link scenario handling
			this._selectItemByCtxtPath();
			return true;
		}
		return false;
	},

	_handleMultiSelectProcessing: function() {
		if (this.isMultiSelectActive()) {
			var aTaskCollectionData = this.getView().getModel().aTaskCollectionData;
			var oList = this.getList();
			if (aTaskCollectionData.length !== 0) {
				for (var i = 0; i < aTaskCollectionData.length; i++) {
					var oFirstTask = aTaskCollectionData[i];
					var sSAP__Origin = oFirstTask.SAP__Origin;
					var sInstanceID = oFirstTask.InstanceID;
					this.downloadDecisionOptions(sSAP__Origin, sInstanceID);
					break;
				}
			} else {
				this.setMultiSelectButtonActive(true);
			}
			// In case of multiselect we stay on the multiselect summary screen
			return;

		}

	},

	_selectItemByCtxtPath: function() {
		if (this.sBindingContextPath) {
			var oItem = this.findItemByContextPath(this.sBindingContextPath);

			//refresh task issue fix
			var bItemExists = (this.getView().getModel().getProperty(this.sBindingContextPath)) ? true : false;
			if (oItem && jQuery.isEmptyObject(oItem.getBindingContext())) {
				var sContext = new sap.ui.model.Context(this.getView().getModel(), this.sBindingContextPath);
				oItem.setBindingContext(sContext);
			}

			if (oItem && bItemExists) {
				this.setListItem(oItem);
				return true;
			}
		}

	},

	findNextVisibleItem: function(sOrigin, sInstanceId) {
		var sContextPath = new sap.ui.model.Context(this.oModel, "/TaskCollection(SAP__Origin='" + sOrigin + "',InstanceID='" + sInstanceId +
			"')");
		var oS2List = this.getView().byId("list");
		var iItemIndex = -1;
		var iItemIndexToSelect = -1;
		this.aItemContextPathsToSelect = [];
		for (var iListKey in oS2List.getItems()) {
			var sCurrentContextPath = oS2List.getItems()[iListKey].getBindingContextPath();
			if (sCurrentContextPath == sContextPath) {
				iItemIndex = iListKey;
				var sActualItemContextPath = oS2List.getItems()[iItemIndex].getBindingContextPath();
				//add the actual/processed item ctx path to the array.
				this.aItemContextPathsToSelect.push(sActualItemContextPath);
			}
			if ((oS2List.getItems()[iListKey].getVisible()) && ((iItemIndexToSelect <= iItemIndex) || (iItemIndex == -1))) {
				iItemIndexToSelect = iListKey;
			}
		}
		if ((iItemIndexToSelect == -1) && (oS2List.getItems().length > 0)) {
			iItemIndexToSelect = 0;
		}
		if (iItemIndexToSelect >= 0) {
			//add the ctx path of the first item or the next one to the actual item to the array.
			this.aItemContextPathsToSelect.push(oS2List.getItems()[iItemIndexToSelect].getBindingContextPath());
		}
	},

	overrideMHFHelperSetMasterTitle: function() {
		// redefinition of setMasterTitle to be able to change the ;title of the screen dynamically
		// FIXME: public API would be needed form scaffolding 
		var that = this;
		sap.ca.scfld.md.app.Application.getImpl().oMHFHelper.setMasterTitle = function(oController, iCount) {
			if (!oController._oControlStore.oMasterTitle) {
				return;
			}

			var oComponent = sap.ca.scfld.md.app.Application.getImpl().getComponent();
			this.oDataManager = oComponent.getDataManager();

			if (!this.oDataManager) {
				return;
			}

			//Scaffolding determines the count based on the length of the model binding
			if (that._oControlStore.oMasterSearchField.getValue().length == 0) {
				//Local filter of the list is not triggered, if it is triggered, the list is still in before filter state.
				var oList = that.getList();
				//No data item must not be counted - check the first item based on its ID
				if (oList && oList.getItems()) {
					if (oList.getItems().length == 1 && oList.getItems()[0].getId().indexOf("MAIN_LIST_ITEM") < 0) {
						iCount = 0;
					} else {
						var aItems = oList.getItems();
						iCount = 0;
						for (var i = 0; i < aItems.length; i++) {
							if (!(aItems[i] instanceof sap.m.GroupHeaderListItem))
								iCount++;
						}
					}
				}
			}

			if (!this.oDataManager.getScenarioConfig() || !this.oDataManager.getScenarioConfig().DisplayName) {
				var oBundle = this.oApplicationImplementation.AppI18nModel.getResourceBundle();
				this.sTitle = oBundle.getText(oController._oHeaderFooterOptions.sI18NMasterTitle, [iCount]);
			} else {
				this.sTitle = this.oDataManager.getScenarioConfig().DisplayName + " (" + iCount + ")";
			}

			oController._oControlStore.oMasterTitle.setText(this.sTitle);
		};
	},

	overrideMHFHelperFooterHandling: function() {
		// FIXME: Override footer handling to provide positive/negative buttons on S2 footer.

		var oMHFHelper = sap.ca.scfld.md.app.Application.getImpl().oMHFHelper;
		var that = this;

		var fOriginalDefineFooterRight = oMHFHelper.defineFooterRight;

		oMHFHelper.defineFooterRight = function(oController) {
			var iFooterRightCount = this.getFooterRightCount(oController);

			if (oController._oHeaderFooterOptions.oPositiveAction) {
				var oBtnMeta = {};
				jQuery.extend(oBtnMeta, oController._oHeaderFooterOptions.oPositiveAction);
				oBtnMeta.style = sap.m.ButtonType.Accept;
				oController._oControlStore.oButtonListHelper.ensureButton(oBtnMeta, "b", iFooterRightCount);
			}

			if (oController._oHeaderFooterOptions.oNegativeAction) {
				var oBtnMeta = {};
				jQuery.extend(oBtnMeta, oController._oHeaderFooterOptions.oNegativeAction);
				oBtnMeta.style = sap.m.ButtonType.Reject;
				oController._oControlStore.oButtonListHelper.ensureButton(oBtnMeta, "b", iFooterRightCount);
			}

			fOriginalDefineFooterRight.call(this, oController);
		};

		var fOriginalGetFooterRightCount = oMHFHelper.getFooterRightCount;

		oMHFHelper.getFooterRightCount = function(oController) {
			var iCount;

			if (that.isMultiSelectActive()) {
				// In multi-select mode:
				// - A maximum of two buttons are displayed with text.
				// - If there are more than 2 actions, the rest of the actions are displayed behind the action button.
				iCount = 2;
			} else {
				iCount = fOriginalGetFooterRightCount.call(this, oController);
			}

			return iCount;
		};
	},

	applySearchPatternToListItem: function(oItem, sFilterPattern) {
		// check UI elements(status, task tile)
		this.sSearchPattern_Support = sFilterPattern;
		//cross.fnd.fiori.inbox.util.SupportInfo.setSearchPattern(sFilterPattern);		
		if ((oItem.getIntro() && oItem.getIntro().toLowerCase().indexOf(sFilterPattern) != -1) || (oItem.getTitle() && oItem.getTitle().toLowerCase()
			.indexOf(sFilterPattern) != -1) || (oItem.getNumber() && oItem.getNumber().toLowerCase().indexOf(sFilterPattern) != -1) || (oItem.getNumberUnit() &&
			oItem.getNumberUnit().toLowerCase().indexOf(sFilterPattern) != -1) || (oItem.getFirstStatus() && oItem.getFirstStatus().getText().toLowerCase()
			.indexOf(sFilterPattern) != -1) || (oItem.getSecondStatus() && oItem.getSecondStatus().getText().toLowerCase().indexOf(sFilterPattern) !=
			-1)) {
			return true;
		}
		// last source is attribute array (creator user name)
		var aAttributes = oItem.getAttributes();
		for (var j = 0; j < aAttributes.length; j++) {
			if (aAttributes[j].getText().toLowerCase().indexOf(sFilterPattern) != -1) {
				return true;
			}
		}
		return false;
	},
	createSubstitutesUserFilterOption: function() {
		var i18nBundle= this.getView().getModel("i18n").getResourceBundle();
	  	var substitutedUserFilterCategory = this.createSubstitutedUserFilterCategory(i18nBundle);
	  	this.getSubstitutedUsers(substitutedUserFilterCategory);
	  	if(this.oSubstitutedUserFilterKeys) {
	  		this.resetSubstitutedUserFilterCategoryCount(Object.keys(this.oSubstitutedUserFilterKeys).length);
	  	 }
	  	this.aFilterItems = cross.fnd.fiori.inbox.util.InboxFilterContributor.getAllFilters(i18nBundle,this.complexFilter);
	  	this.aFilterItems.push(substitutedUserFilterCategory);
	},

	getHeaderFooterOptions: function() {
		var that = this;
		var oHeaderFooterOptions = {
			sI18NMasterTitle: "MASTER_TITLE"
		};
		// do not display any header footer option if flag bHideHeaderFooterOptions is enabled
		if (this.bHideHeaderFooterOptions) {
			return {};
		}
		
		if (!this.isMultiSelectActive()) {
			oHeaderFooterOptions.oFilterOptions = {
					onFilterPressed: jQuery.proxy(function () {
						 if (!that.oDataManager.bOutbox){
							that.createSubstitutesUserFilterOption();
						 }
				    	 that.onShowFilter();
							
					  }, that)
			};

			if (this.bDisplaySortOption) {
				oHeaderFooterOptions.oSortOptions = {
					aSortItems: this.aVisibleSortItems,
					sSelectedItemKey: this.sSortKey,
					onSortSelected: jQuery.proxy(that.handleSort, that)
				};
				oHeaderFooterOptions.oGroupOptions = {
					onGroupPressed: jQuery.proxy(that.onShowGroup, that)
				};
			}
		}

		if(!this.oDataManager.bOutbox){
			oHeaderFooterOptions.oEditBtn = {
					onBtnPressed: jQuery.proxy(function() {
						if (!this.isMultiSelectActive()) {
							// Turn on multi-select.
							
							this.prepareMultiSelect();
						} else {
							// Turn off multi-select.
							this.dismissMultiSelect();
						}
					}, that),
					bDisabled: !this.bDisplayMultiSelectButton
			};
		}
		
		if (this.oMultiSelectActions) {
			oHeaderFooterOptions.oPositiveAction = this.oMultiSelectActions.positiveAction;
			oHeaderFooterOptions.oNegativeAction = this.oMultiSelectActions.negativeAction;
			oHeaderFooterOptions.buttonList = this.oMultiSelectActions.additionalActions;
		}
		
		return oHeaderFooterOptions;
	},

	_findFilterKey: function(sFilterKey) {
		for (var firstLevelFilter in this.complexFilter) {
			var filterKeys = this.complexFilter[firstLevelFilter];
			for (var i = 0; i < filterKeys.length; i++) {
				if (filterKeys[i] === sFilterKey) {
					return true;
				}
			}
		}
		return false;
	},

	_resetFilterState: function() {
		this.complexFilterBackup = this.complexFilter;
		this.complexFilter = {
			Priority: [],
			CompletionDeadLine: [],
			TaskDefinitionID: [],
			Status: [],
			CreatedOn: [],
			CustomNumberValue: [],
			CustomNumberUnitValue: [],
			CustomObjectAttributeValue: [],
			SubstitutedUser: []
		};
	},

	_saveFilterState: function(oFilterKeys) {
		this._resetFilterState();
		for (var key in oFilterKeys) {
			var filterKeyParts = key.split(":");
			//if there is a custom filter property, make on with the same name 
			if (!this.complexFilter[filterKeyParts[0]]) {
				this.complexFilter[filterKeyParts[0]] = [];
			}
			this.complexFilter[filterKeyParts[0]].push(key);
		}
	},

	/**
	 *
	 * @param sText - label text of the filter category
	 * @param bMultiSelect - optional, default: true
	 * @returns {sap.m.ViewSettingsFilterItem}
	 */
	_createFilterCategory: function(sText, bMultiSelect) {
		var isMultiSelect = true;
		if (arguments.length == 2) {
			isMultiSelect = bMultiSelect;
		}
		return new sap.m.ViewSettingsFilterItem({
			text: sText,
			multiSelect: isMultiSelect
		});
	},

	/**
	 *
	 * @param sKey
	 * @param sText
	 * @returns {sap.m.ViewSettingsItem}
	 */
	_createFilterItem: function(sKey, sText) {
		var oFilterItem = new sap.m.ViewSettingsItem({
			text: sText,
			key: sKey
		});

		if (this._findFilterKey(sKey)) {
			oFilterItem.setSelected(true);
		}
		return oFilterItem;
	},
	
	fnCreateSubstitutedUserFilterKeys: function(oEvent) {
		var that = this;
		var aSelectedSubstitutes =  oEvent.getSource().getSelectedItems();
		var oFilterKey = {};
		that.sSelectedSubstitutesNameForFilterString = ""; // required to display user names in the filter string shown in list
		var sKey = null;
		for (var i = 0; i < aSelectedSubstitutes.length; i++ ) {
			sKey = aSelectedSubstitutes[i].data("key");
			oFilterKey[sKey] = true;
			that.sSelectedSubstitutesNameForFilterString = (aSelectedSubstitutes.length === 1) ? aSelectedSubstitutes[i].getTitle() : 
			that.sSelectedSubstitutesNameForFilterString + aSelectedSubstitutes[i].getTitle() +  ", " ;
		}
		that.oSubstitutedUserFilterKeys = oFilterKey;
		that.resetSubstitutedUserFilterCategoryCount(aSelectedSubstitutes.length);
	},
	
	// Creating filter item for Substituted User List
	createSubstitutedUserFilterCategory: function (i18nBundle) {
		var oSubstitutedUserFilterCategory = new sap.m.ViewSettingsCustomItem({
				text: i18nBundle.getText("filter.substitutingUserList")
		});
		return oSubstitutedUserFilterCategory;
	},
	
	resetSubstitutesListSelection: function(oEvent) {
		var oFilterDialog = oEvent.getSource();
		var i18nBundle = this.getView().getModel("i18n").getResourceBundle();
		var oSubstitutedFilterCategory = null;
		jQuery.each(oFilterDialog.getAggregation('filterItems'), function(index, oFilterItem) {
			if (oFilterItem.getText() == i18nBundle.getText("filter.substitutingUserList")) {
				 oSubstitutedFilterCategory = oFilterItem;
				 return;
				
			}
		});
		if (oSubstitutedFilterCategory) {
			 var oSubtitutesList = oSubstitutedFilterCategory.getCustomControl();
			 oSubtitutesList.removeSelections(true);
		}
		//this.oSubstitutedUserList.removeSelections(true);
		this.oSubstitutedUserFilterKeys = null; // remove the SubstitutedFilterKeys
	},
	
	storeSubstitutedUserKeysInListItem: function(aSubstitutes, oSubstitutedUserModel) {
		if(aSubstitutes) {
			for (var i = 0; i <aSubstitutes.length; i++) {
				aSubstitutes[i].data("key", oSubstitutedUserModel.oData.oItems[i].key);
			}	
		}
		
	},
	
	createDynamicSubstiutedUserList: function(substitutedUserFilterItem,oSubstitutedUserModel) {
		
		var oDynamicSubstitutedUserList = substitutedUserFilterItem;
		var that = this;
		var sNoSubstituteUserText = this.getView().getModel("i18n").getResourceBundle().getText("view.SubstitutedUserList.noRecipients");
		//create the list which will display all the users 
		var oSubstituesList = sap.ui.getCore().byId("substituesUser");
		if (!oSubstituesList) {
			oSubstituesList = new sap.m.List({
				id : "substituesUser",
				mode : "MultiSelect"
			});
		}
		
		var oUser = new sap.m.StandardListItem({
			title : "{substitutedUserModel>text}"
		});
		
		oSubstituesList.attachSelectionChange(function(oEvent) {
			that.fnCreateSubstitutedUserFilterKeys(oEvent);
		});
		
		oDynamicSubstitutedUserList.setCustomControl(oSubstituesList);
		oDynamicSubstitutedUserList.setModel(oSubstitutedUserModel, "substitutedUserModel");
		oSubstituesList.setModel(oSubstitutedUserModel, "substitutedUserModel");
		oSubstituesList.bindAggregation("items", "substitutedUserModel>/oItems", oUser);
		that.storeSubstitutedUserKeysInListItem(oSubstituesList.getAggregation("items"), oSubstitutedUserModel);
		oSubstituesList.setNoDataText(sNoSubstituteUserText);
		
		if (that.oSubstitutedUserFilterKeys) {
			//if substitutes were selected earlier
			for(var i =0; i<that.aSubstitutedUserFilterItemList.length; i++) {
				if(that.oSubstitutedUserFilterKeys[that.aSubstitutedUserFilterItemList[i].key]) //if keys are matching with the selected substitute, select the substtitute
					{ oSubstituesList.setSelectedItem(oSubstituesList.getItems()[i]); }
			}
			
		}
		return oDynamicSubstitutedUserList;
	},
	
	createSubstitutedUserFilterItems: function (sUserKey, sUserName) {
		var oSubstitutedUserEntry = {
				text : sUserName,
				key : sUserKey,
				selected : false
		};

		if (this._findFilterKey(sUserKey)) {
			oSubstitutedUserEntry.selected = true;
		}
		return oSubstitutedUserEntry;
	},
	
	getSubstitutedUsers: function(substitutedUserFilterItem) {
		
		// initially the model is empty
		var oSubstitutedUserCollectionModel = new sap.ui.model.json.JSONModel({});
		oSubstitutedUserCollectionModel.setData({oItems: []});
		this.createDynamicSubstiutedUserList(substitutedUserFilterItem, oSubstitutedUserCollectionModel);
		this.aSubstitutedUserFilterItemList = [];
		this.oSubstitutedUserDynamicFilter = substitutedUserFilterItem;
		
		var fnSuccessForSubstitutedUserList = function(oData) {
			var aUserList = oData.results, that = this;
			var aOriginalUserList = [];
			var bNewEntry;
			jQuery.each(aUserList, function(index, substitutedUser) {
				if(!jQuery.isEmptyObject(aUserList)) {
					bNewEntry = true;
					jQuery.each(aOriginalUserList, function (index, oProcessedUser) {
						if (oProcessedUser.UniqueName === substitutedUser.UniqueName) {
							bNewEntry = false;
							return false;
						}
					});
				}
				if (bNewEntry) {
					aOriginalUserList.push(cross.fnd.fiori.inbox.Substitution._processSubstitutedUsersCollection(substitutedUser));
				}
			});
			
			for(var i = 0; i < aOriginalUserList.length ; i++) {
				var oSubstitutedUserFilterKey = that._FILTER_CATEGORY_SUBSTITUTED_USER + ":" + aOriginalUserList[i].UniqueName;
				var filterItem = this.createSubstitutedUserFilterItems(oSubstitutedUserFilterKey, aOriginalUserList[i].DisplayName);
				that.aSubstitutedUserFilterItemList.push(filterItem);
			}
			
			oSubstitutedUserCollectionModel.setData({oItems: that.aSubstitutedUserFilterItemList});
			oSubstitutedUserCollectionModel.checkUpdate(true);
			that.createDynamicSubstiutedUserList(substitutedUserFilterItem, oSubstitutedUserCollectionModel);
		};
		
		this.oDataManager.readSubstitutedUserList(jQuery.proxy(fnSuccessForSubstitutedUserList, this));
	},
	
	resetSubstitutedUserFilterCategoryCount: function(iCount) {
	if(this.oSubstitutedUserDynamicFilter!==undefined){
		this.oSubstitutedUserDynamicFilter.setFilterCount(iCount);
		}
	},

	onShowFilter: function() {
		var that = this;
		that.aTaskTypeFilterItemsOrigins = [];
		var i18nBundle = that.getView().getModel("i18n").getResourceBundle();
		//Task type filter item
		var taskTypeFilterItem = this._createFilterCategory(i18nBundle.getText("filter.taskType"));

		this.aTaskTypeFilterItems = new Array();
		// Collect unique TaskDefinitionIDs.
		var fnSuccess = function(oResult) {
			if (!this.oDataManager.bAllItems) {
				var aScenarioServiceInfos = this.oDataManager.getScenarioConfig().ScenarioServiceInfos;
			}
			for (var i = 0; i < oResult.length; i++) {
				//display only those task types, which are part of the scenario
				var bPushIt = false;
				if (this.oDataManager.bAllItems) {
					bPushIt = true;
				} else {
					for (var j = 0; j < aScenarioServiceInfos.length; j++) {
						for (var k = 0; k < aScenarioServiceInfos[j].TaskDefinitionIDs.length; k++) {
							if (oResult[i].TaskDefinitionID.toUpperCase().indexOf(aScenarioServiceInfos[j].TaskDefinitionIDs[k].toUpperCase()) == 0 &&
								aScenarioServiceInfos[j].Origin === oResult[i].SAP__Origin) {
								bPushIt = true;
								break;
							}
						}
					}
				}
				if (bPushIt) {
					var taskType = {
						taskTitle: oResult[i].TaskName,
						taskDefinitionID: oResult[i].TaskDefinitionID,
						SAP__Origin: oResult[i].SAP__Origin
					};
					this.aTaskTypeFilterItems.push(taskType);

				}
			}
			//sort task types A-Z
			this.aTaskTypeFilterItems.sort(function(taskType1, taskType2) {
				if (taskType1.taskTitle < taskType2.taskTitle) {
					return -1;
				}
				if (taskType1.taskTitle > taskType2.taskTitle) {
					return 1;
				}
				return 0;
			});
			for (var i = 0; i < this.aTaskTypeFilterItems.length; i++) {
				var ttFilterKey = this._FILTER_CATEGORY_TASK_DEFINITION_ID + ":" + this.aTaskTypeFilterItems[i].taskDefinitionID + ":" + this.aTaskTypeFilterItems[
					i].SAP__Origin;
				var filterItem = this._createFilterItem(ttFilterKey, this.aTaskTypeFilterItems[i].taskTitle);
				taskTypeFilterItem.addItem(filterItem);
			}

			if (this.oDataManager.bOutbox) {
				this.aFilterItems = cross.fnd.fiori.inbox.util.OutboxFilterContributor.getAllFilters(i18nBundle,this.complexFilter);
				this.aFilterItems.push(taskTypeFilterItem);
			} else {
				this.aFilterItems.push(taskTypeFilterItem);
			}

			//Custom attributes
			if (this._areItemsUniqueByTaskType()) {

				var oContext = null;
				var aListItems = this.getList().getItems();
				if (aListItems && aListItems.length > 0) {
					oContext = aListItems[0].getBindingContext();
				}
				if (!oContext) {
					oContext = aListItems[1].getBindingContext();
				}

				//CustomNumber filter
				var aCustomNumbers = this._populateAllUniqueCustomAttributes(this._CUSTOM_NUMBER_VALUE);
				aCustomNumbers.sort();

				if (aCustomNumbers.length > 0 && aCustomNumbers.length < aListItems.length / 2) {
					var customNumberFilterItem = this._createFilterCategory(oContext.getProperty(this._CUSTOM_NUMBER_LABEL), false);
					this.aFilterItems.push(customNumberFilterItem);

					for (var i = 0, iMax = aCustomNumbers.length; i < iMax; i++) {
						var CN_FILTER_KEY = this._CUSTOM_NUMBER_VALUE + ":" + aCustomNumbers[i];
						var cnFilter = this._createFilterItem(CN_FILTER_KEY, aCustomNumbers[i]);
						customNumberFilterItem.addItem(cnFilter);
					}
				}

				//CustomNumberUnit filter
				var aCustomNumberUnits = this._populateAllUniqueCustomAttributes(this._CUSTOM_NUMBER_UNIT_VALUE);
				aCustomNumberUnits.sort();
				if (aCustomNumberUnits.length > 0 && aCustomNumberUnits.length < aListItems.length / 2) {
					var customNumberUnitFilterItem = this._createFilterCategory(oContext.getProperty(this._CUSTOM_NUMBER_UNIT_LABEL), false);
					this.aFilterItems.push(customNumberUnitFilterItem);

					for (var i = 0, iMax = aCustomNumbers.length; i < iMax; i++) {
						var CNU_FILTER_KEY = this._CUSTOM_NUMBER_UNIT_VALUE + ":" + aCustomNumberUnits[i];
						var cnuFilter = this._createFilterItem(CNU_FILTER_KEY, aCustomNumberUnits[i]);
						customNumberUnitFilterItem.addItem(cnuFilter);
					}
				}

				//CustomObjectAtribute filter
				var aCustomObjectAttributes = this._populateAllUniqueCustomAttributes(this._CUSTOM_OBJECT_ATTRIBUTE_VALUE);
				aCustomObjectAttributes.sort();
				if (aCustomObjectAttributes.length > 0 && aCustomObjectAttributes.length < aListItems.length / 2) {
					var customObjectAttributeFilterItem = this._createFilterCategory(oContext.getProperty(this._CUSTOM_OBJECT_ATTRIBUTE_LABEL), false);
					this.aFilterItems.push(customObjectAttributeFilterItem);

					for (var i = 0, iMax = aCustomObjectAttributes.length; i < iMax; i++) {
						var COA_FILTER_KEY = this._CUSTOM_OBJECT_ATTRIBUTE_VALUE + ":" + aCustomObjectAttributes[i];
						var coaFilter = this._createFilterItem(COA_FILTER_KEY, aCustomObjectAttributes[i]);
						customObjectAttributeFilterItem.addItem(coaFilter);
					}
				}
			}

			/**
			 * @ControllerHook Change filter items
			 * This hook method can be used to modify the list of properties
			 * that are used for filtering of the S2 list items.
			 * It is called right before the filter dialog is displayed.
			 * @callback cross.fnd.fiori.inbox.view.S2~extHookChangeFilterItems
			 * @param {array} aFilterItems
			 * @return {void}
			 */
			if (this.extHookChangeFilterItems) {
				this.extHookChangeFilterItems(this.aFilterItems);
			}

			var filterDialog = new sap.m.ViewSettingsDialog({
				title: i18nBundle.getText("filter.dialog.title"),
				filterItems: this.aFilterItems,
				confirm: function(oEvent) {
					this.destroy();

					that.oFilterKeys = oEvent.getParameter("filterKeys");
					if (that.oSubstitutedUserFilterKeys) {
						jQuery.extend(that.oFilterKeys,that.oSubstitutedUserFilterKeys );
					}
					if (Object.keys(that.oFilterKeys).length === 0) {
						that.sInfoHeaderFilterString = null;
					} else {
						var i18nBundle = that.getView().getModel("i18n").getResourceBundle();
						var sSubstitutedUserFilterString= null;
						var sFilterString = oEvent.getParameter("filterString");
						//creating filter string if SubstitutedUser filter is also selected
						if (that.oSubstitutedUserFilterKeys) {
							 sSubstitutedUserFilterString = that.addFilterTextForSubstitutionFilter(sFilterString, i18nBundle);
						}
						that.sInfoHeaderFilterString = sSubstitutedUserFilterString ? sSubstitutedUserFilterString : sFilterString;
						//that.sInfoHeaderFilterString = sFilterString;
					}

					that.refreshInfoHeaderToolbar();

					if (that.aTaskTypeFilterItems.length > 1 && !that._doesFilterContainOneTaskDefinitionId(that.oFilterKeys)) {
						that._removeCustomAttributesFromFilter(that.oFilterKeys);

						if (that._isListSortedByCustomAttribute()) {
							//remove group by a custom attribute
							that.oGroupConfigItem = null;

							that._removeCustomAttributesSorter();
						}
					}

					that._saveFilterState(that.oFilterKeys);
					that.handleFilter(that.oFilterKeys);
				},

				cancel: function(oEvent) {
					if (that.resetInitiated) {
						that.complexFilter = that.complexFilterBackup;
						that.resetInitiated = false;
					}
					this.destroy();
				},

				resetFilters: function(oEvent) {
					that.resetInitiated = true;
					that._resetFilterState();
					// SubstitutedUser filter item is a ViewSettingsCustom item, hence we have to manually handle the count displayed
					that.resetSubstitutedUserFilterCategoryCount(0);
					that.resetSubstitutesListSelection(oEvent);
				}
			});
			filterDialog.open();
		};
		// get TaskDefinitionIDs.
		this.oDataManager.readTaskDefinitionCollection(
			jQuery.proxy(fnSuccess, this)
		);
	},
	
	addFilterTextForSubstitutionFilter: function(sFilterText, i18nBundle) {
		var sSubsttitutedUserFilterString;
		if(sFilterText) {
			//if other filters are also applied, then append the SubstitutedUser Filter string
			sSubsttitutedUserFilterString = sFilterText + ", " + i18nBundle.getText("filter.substitutingUserList") + " (" + this.sSelectedSubstitutesNameForFilterString + ")"; 
		} else {
			sSubsttitutedUserFilterString = i18nBundle.getText("multi.header", i18nBundle.getText("filter.substitutingUserList") + " (" + this.sSelectedSubstitutesNameForFilterString + ")");
		}
		return sSubsttitutedUserFilterString;
	},

	_removeCustomAttributesFromFilter: function(oFilterKeys) {
		for (var key in oFilterKeys) {
			if (key.indexOf(this._CUSTOM_NUMBER_VALUE) > -1 || key.indexOf(this._CUSTOM_NUMBER_UNIT_VALUE) > -1 || key.indexOf(this._CUSTOM_OBJECT_ATTRIBUTE_VALUE) >
				-1) {
				delete oFilterKeys[key];
			}
		}
	},

	_removeCustomAttributesSorter: function() {
		var oConfig = this.oDataManager.getScenarioConfig();
		var sBackendDefaultSortKey = oConfig.SortBy;
		this.handleSort(sBackendDefaultSortKey);
		this.sSortKey = sBackendDefaultSortKey;
	},

	_isListSortedByCustomAttribute: function() {
		var sortParam = this.getList().getBinding("items").sSortParams;
		if (sortParam.indexOf(this._CUSTOM_NUMBER_VALUE) > -1 || sortParam.indexOf(this._CUSTOM_NUMBER_UNIT_VALUE) > -1 || sortParam.indexOf(
			this._CUSTOM_OBJECT_ATTRIBUTE_VALUE) > -1) {
			return true;
		}
		return false;
	},

	_doesFilterContainOneTaskDefinitionId: function(oFilterKeys) {
		var taskDefIdNum = 0;
		for (var key in oFilterKeys) {
			if (key.indexOf(this._FILTER_CATEGORY_TASK_DEFINITION_ID) > -1) {
				taskDefIdNum++;
			}
		}
		if (taskDefIdNum === 1) {
			return true;
		}
		return false;
	},

	_populateAllUniqueCustomAttributes: function(propertyName) {
		var aListItems = this.getList().getItems();

		var afilterItems = [];
		var oMap = {};

		for (var i = 0; i < aListItems.length; i++) {
			var oListItem = aListItems[i];
			var oContext = oListItem.getBindingContext();
			if (!oContext) {
				continue;
			}

			var sValue = oContext.getProperty(propertyName);
			if (sValue && !oMap.hasOwnProperty(sValue)) {
				oMap[sValue] = true;
				afilterItems.push(sValue);
			}
		}
		return afilterItems;
	},

	_createGroupSettingItem: function(oGroupConfigItem, sText) {
		var i18nBundle = this.getView().getModel("i18n").getResourceBundle();

		if (!sText) {
			sText = i18nBundle.getText(oGroupConfigItem.textKey);
		}
		var oGroupSettingItem = new sap.m.ViewSettingsItem({
			key: oGroupConfigItem.key,
			text: sText
		});

		return oGroupSettingItem;
	},

	onShowGroup: function() {
		var that = this;
		var aGroupSettingItems = [];

		// Create ViewSettingsItems from group configuration.

		for (var i = 0; i < this.aGroupConfig.length; i++) {
			var oGroupSettingItem = this._createGroupSettingItem(this.aGroupConfig[i]);
			aGroupSettingItems.push(oGroupSettingItem);
		}

		aGroupSettingItems = this._addCustomAttributeGroupItems(aGroupSettingItems);

		// Display dialog.
		var oGroupDialog = new sap.m.ViewSettingsDialog({
			title: "{i18n>group.dialog.title}",
			groupItems: aGroupSettingItems,
			groupDescending: this.bGroupDescending,
			selectedGroupItem: this.oGroupConfigItem ? this.oGroupConfigItem.key : null,
			confirm: function(oEvent) {
				oGroupDialog.destroy();

				// Read out user selected setting.

				var oGroupSettingItem = oEvent.getParameter("groupItem");
				if (oGroupSettingItem) {
					var sGroupSettingItemKey = oGroupSettingItem.getKey();

					for (var i = 0; i < that.aGroupConfig.length; i++) {
						var oGroupConfigItem = that.aGroupConfig[i];
						if (oGroupConfigItem.key == sGroupSettingItemKey) {
							that.oGroupConfigItem = oGroupConfigItem;
							break;
						}
					}

					for (var i = 0; i < that.aCustomAttributesGroupConfig.length; i++) {
						var oGroupConfigItem = that.aCustomAttributesGroupConfig[i];
						if (oGroupConfigItem.key == sGroupSettingItemKey) {
							that.oGroupConfigItem = oGroupConfigItem;
							break;
						}
					}

				} else {
					that.oGroupConfigItem = null;
				}

				that.bGroupDescending = oEvent.getParameter("groupDescending");

				// Do grouping.

				that.handleGroup();
			},
			cancel: function() {
				oGroupDialog.destroy();
			}
		});

		oGroupDialog.open();
	},

	_isListFilteredByTaskType: function(oBindingContext, aListItems) {
		var i, imax;
		for (i = 2, imax = aListItems.length; i < imax; i++) {
			var oBindingContext2 = aListItems[i].getBindingContext();
			// Shown if there is at least one due date.
			if (oBindingContext2 && oBindingContext2.getProperty("TaskDefinitionID") != oBindingContext.getProperty("TaskDefinitionID")) {
				return false;
			}
		}
		return true;
	},

	_addCustomAttributeGroupItems: function(aGroupSettingItems) {
		this.aCustomAttributesGroupConfig = [];
		var aListItems = this.getList().getItems();
		var oBindingContext = this._getBindingContextOfFirstItem();

		var taskTypeFiltered = this._isListFilteredByTaskType(oBindingContext, aListItems);
		if (taskTypeFiltered) {
			var aCustomNumbers = this._populateAllUniqueCustomAttributes(this._CUSTOM_NUMBER_VALUE);
			if (oBindingContext.getProperty(this._CUSTOM_NUMBER_VALUE) && aCustomNumbers.length < aListItems.length / 2) {
				var sCustomNumberLabel = oBindingContext.getProperty(this._CUSTOM_NUMBER_LABEL);
				var customNumberGroupItem = {
					key: this._CUSTOM_NUMBER_VALUE,
					textKey: null
				};
				this.aCustomAttributesGroupConfig.push(customNumberGroupItem);
				var oCustomNumberGroupSettingItem = this._createGroupSettingItem(customNumberGroupItem, sCustomNumberLabel);
				aGroupSettingItems.push(oCustomNumberGroupSettingItem);
			}

			var aCustomNumberUnits = this._populateAllUniqueCustomAttributes(this._CUSTOM_NUMBER_UNIT_VALUE);
			if (oBindingContext.getProperty(this._CUSTOM_NUMBER_UNIT_VALUE) && aCustomNumberUnits.length < aListItems.length / 2) {
				var sCustomNumberUnitLabel = oBindingContext.getProperty(this._CUSTOM_NUMBER_UNIT_LABEL);
				var customNumberUnitGroupItem = {
					key: this._CUSTOM_NUMBER_UNIT_VALUE,
					textKey: null
				};
				this.aCustomAttributesGroupConfig.push(customNumberUnitGroupItem);
				var oCustomNumberUnitGroupSettingItem = this._createGroupSettingItem(customNumberUnitGroupItem, sCustomNumberUnitLabel);
				aGroupSettingItems.push(oCustomNumberUnitGroupSettingItem);
			}

			var aCustomObjectAttributes = this._populateAllUniqueCustomAttributes(this._CUSTOM_OBJECT_ATTRIBUTE_VALUE);
			if (oBindingContext.getProperty(this._CUSTOM_OBJECT_ATTRIBUTE_VALUE) && aCustomObjectAttributes.length < aListItems.length / 2) {
				var sCustomObjectAttributeLabel = oBindingContext.getProperty(this._CUSTOM_OBJECT_ATTRIBUTE_LABEL);
				var customObjectAttributeGroupItem = {
					key: this._CUSTOM_OBJECT_ATTRIBUTE_VALUE,
					textKey: null
				};
				this.aCustomAttributesGroupConfig.push(customObjectAttributeGroupItem);
				var oCustomObjectAttributeGroupSettingItem = this._createGroupSettingItem(customObjectAttributeGroupItem, sCustomObjectAttributeLabel);
				aGroupSettingItems.push(oCustomObjectAttributeGroupSettingItem);
			}
		}
		return aGroupSettingItems;
	},

	prepareMultiSelect: function() {
		var that = this;
		this.setMultiSelectButtonActive(false);

		var aListItems = this.getList().getItems();

		if (aListItems.length == 0) {
			// If list is empty, don't turn on multi-select.
			return;
		}

		var aFilterItems = [];

		var fnSuccess = function(oResult) {
			if (!this.oDataManager.bAllItems) {
				var aScenarioServiceInfos = this.oDataManager.getScenarioConfig().ScenarioServiceInfos;
			}
			var aFilters = [];
			for (var key in this.oFilterKeys) {
				if (this.oFilterKeys.hasOwnProperty(key) && key) {
					var aKeyParts = key.split(":");
					if (aKeyParts[0] === this._FILTER_CATEGORY_TASK_DEFINITION_ID) {
						aFilters.push(aKeyParts[1]);
					}
				}
			}
			for (var i = 0; i < oResult.length; i++) {
				// display only those task types, which are part
				// of the scenario
				var bPushIt = false;
				if (this.oDataManager.bAllItems) {
					bPushIt = true;
				} else {
					for (var j = 0; j < aScenarioServiceInfos.length; j++) {
						for (var k = 0; k < aScenarioServiceInfos[j].TaskDefinitionIDs.length; k++) {
							if (oResult[i].TaskDefinitionID.toUpperCase().indexOf(aScenarioServiceInfos[j].TaskDefinitionIDs[k].toUpperCase()) == 0 &&
								aScenarioServiceInfos[j].Origin === oResult[i].SAP__Origin) {
								bPushIt = true;
								break;
							}
						}
					}
				}
				if (bPushIt && (aFilters.length === 0 || aFilters.indexOf(oResult[i].TaskDefinitionID) !== -1)) {
					var oFilterItem = {
						title: oResult[i].TaskName,
						id: oResult[i].TaskDefinitionID,
						origin: oResult[i].SAP__Origin
					};
					aFilterItems.push(oFilterItem);
				}
			}

			if (aFilterItems.length > 1) {
				// If multiple TaskDefinitionIDs are present,
				// then show selection dialog.
				// Do nothing if the user cancels the dialog.

				aFilterItems.sort(function(a, b) {
					if (a.title < b.title)
						return -1;
					if (a.title > b.title)
						return 1;
					return 0;
				});

				cross.fnd.fiori.inbox.util.MultiSelect
					.openFilterDialog(
						aFilterItems,
						jQuery
						.proxy(
							this.multiSelectFilterDialogOK,
							this), null);
			} else {
				// If we have only one TaskDefinitionID, then
				// selection dialog is not needed.

				var oFilterItem = aFilterItems[0];
				this.multiSelectFilterDialogOK(oFilterItem);
			}
		};

		// get TaskDefinitionIDs.
		var iTaskDefCounter = 0;
		for (var key in this.oFilterKeys) {
			if (this.oFilterKeys.hasOwnProperty(key) && key) {
				var aKeyParts = key.split(":");
				if (aKeyParts[0] === this._FILTER_CATEGORY_TASK_DEFINITION_ID) {
					iTaskDefCounter++;
				}
			}
		}

		this.getView().getModel().bMassActionActive = true;

		if (iTaskDefCounter !== 1) {
			this.oDataManager.readTaskDefinitionCollection(jQuery
				.proxy(fnSuccess, this));
		} else {
			var oList = this.getList();
			if (oList.getItems().length !== 0) {
				var oContext = {};
				for (var i = 0; i < oList.getItems().length; i++) {
					oContext = oList.getItems()[i].getBindingContext();
					if (oContext) {
						var oFilterItem = {
							title: oContext.getProperty("TaskDefinitionName"),
							id: oContext.getProperty("TaskDefinitionID"),
							origin: oContext.getProperty("SAP__Origin")
						};
						this.multiSelectFilterDialogOK(oFilterItem);
						break;
					}
				}
			}
		}
	},

	dismissMultiSelect: function() {
		this.setMultiSelectButtonActive(false);

		var oList = this.getList();

		// Remove custom header and put back the original.

		oList.destroyHeaderToolbar();
		oList.destroyInfoToolbar();

		this.getPage().setSubHeader(this.oSubHeader);
		if (this._oControlStore.oMasterPullToRefresh)
			this._oControlStore.oMasterPullToRefresh.setVisible(true);

		this.refreshInfoHeaderToolbar();

		// Switch list to normal mode.

		oList.setMode(this.getView().getModel("device").getProperty("/listMode"));
		oList.removeSelections(true);

		// Refresh footer (to show filtering/sort/grouping buttons).

		this._oApplicationImplementation.oMHFHelper.defineMasterHeaderFooter(this);

		// Show all items.

		this.filterItemsByTaskDefinitionID(null);

		// Hide decision buttons.

		this.hideDecisionButtons();
	},

	multiSelectFilterDialogOK: function(oFilterItem) {
		var oList = this.getList();
		oList.removeSelections(true);
		this._oControlStore.oMasterSearchField.setValue("");
		var i18nBundle = this.getView().getModel("i18n").getResourceBundle();
		this.refreshInfoHeaderToolbar(i18nBundle.getText("multi.header", i18nBundle.getText("group.taskType") + " (" + oFilterItem.title + ")"));
		this.filterItemsByTaskDefinitionID(oFilterItem.id, oFilterItem.origin);
		oList.setMode(sap.m.ListMode.MultiSelect);
	},

	refreshInfoHeaderToolbar: function(sText) {
		// Construct header text.

		if (!sText) {
			var sText = "";
		}

		if (this.sInfoHeaderGroupString) {
			if (sText)
				sText += "; ";
			sText += this.sInfoHeaderGroupString;
		}

		if (this.sInfoHeaderFilterString) {
			if (sText)
				sText += "; ";
			sText += this.sInfoHeaderFilterString;
		}

		// Refresh list headers. Actually, Scaffolding has two sap.m.List
		// controls for S2:
		// - One for displaying an empty list in case the user fills searchbar
		// and no results are found (this._emptyList).
		// - Another one for displaying workitems (this.getList()).

		this.refreshInfoHeaderToolbarForList(this.getList(), sText);
		this.refreshInfoHeaderToolbarForList(this._emptyList, sText);
	},

	refreshInfoHeaderToolbarForList: function(oList, sText) {
		var oHeaderToolbar = oList.getHeaderToolbar();

		if (sText) {
			// Header text is needed, create header toolbar if not visible.

			if (!oHeaderToolbar) {
				oHeaderToolbar = new sap.m.Toolbar({
					design: sap.m.ToolbarDesign.Info
				});

				oList.setHeaderToolbar(oHeaderToolbar);
			}

			oHeaderToolbar.destroyContent();
			oHeaderToolbar.addContent(new sap.m.Label({
				text: sText
			}));
		} else {
			// Header text is not needed, destroy header toolbar if visible.

			if (oHeaderToolbar)
				oList.destroyHeaderToolbar();
		}
	},

	downloadDecisionOptions: function(sSAP__Origin, sInstanceID) {
		// Initiate downloading of decision options for the selected TaskDefinitionID.
		// Decision options for workitems with a given TaskDefinitionID are the same,
		// therefore it is enough to download decision options for just one workitem.
		// If an error happens during downloading, then an error dialog will be 
		// displayed by DataManager.

		this.oDataManager.readDecisionOptions(sSAP__Origin, sInstanceID,
			jQuery.proxy(this.downloadDecisionOptionsSuccess, this),
			null);
	},

	downloadDecisionOptionsSuccess: function(aDecisionOptions) {
		this.setMultiSelectButtonActive(true);

		if (!sap.ui.Device.system.phone)
			this.oRouter.navTo("multi_select_summary", {}, true);

		var oList = this.getList();
		var i18nBundle = this.getView().getModel("i18n").getResourceBundle();

		this.oSelectAllCheckBox = new sap.m.CheckBox({
			select: jQuery.proxy(this.handleSelectAllCheckBoxPress, this)
		});

		// FIXME: Checkbox positioning.
		var oInfoToolbar = new sap.m.Toolbar({
			design: sap.m.ToolbarDesign.Transparent,
			content: [
				this.oSelectAllCheckBox
			]
		});

		oInfoToolbar.addStyleClass("crossFndFioriInboxInfoToolbarPadding");

		oList.setInfoToolbar(oInfoToolbar);

		this.getPage().setSubHeader(null);
		if (this._oControlStore.oMasterPullToRefresh)
			this._oControlStore.oMasterPullToRefresh.setVisible(false);

		// Switch list to multi-select mode.

		oList.removeSelections(true);

		this.aMultiSelectDecisionOptions = aDecisionOptions;

		// Refresh footer (to hide filtering/sort/grouping buttons).

		this._oApplicationImplementation.oMHFHelper.defineMasterHeaderFooter(this);

		// Update Select All checkbox status (have to be done after filtering items).

		this.updateSelectAllCheckBox();
	},

	_handleSelect: function(oEvent) {
		if (!this.isMultiSelectActive()) {
			sap.ca.scfld.md.controller.ScfldMasterController.prototype._handleSelect.call(this, oEvent);
		} else {
			// Handle manual item selection.

			this.updateMultiSelectState();

			//notify Multi Select Summary screen
			this.publishMultiSelectEvent(oEvent.getParameter("selected"), [oEvent.getParameter("listItem").getBindingContext().getProperty()]);
		}
	},

	updateMultiSelectState: function() {
		var iSelectedListItemsCount = this.getList().getSelectedItems().length;

		switch (iSelectedListItemsCount) {
			case 0:
				// No selected items, hide decision options.

				this.hideDecisionButtons();
				break;

			default:
				// Once an item is selected, then display decision options.

				this.showDecisionButtons();
				break;
		}

		// Update Select All checkbox status.

		this.updateSelectAllCheckBox();
	},

	publishMultiSelectEvent: function(bSelected, aWorkItems) {
		var oMultiSelectEvent = {};
		oMultiSelectEvent.Source = "S2";
		oMultiSelectEvent.Selected = bSelected;
		oMultiSelectEvent.WorkItems = aWorkItems;
		sap.ca.scfld.md.app.Application.getImpl().getComponent().getEventBus().publish("cross.fnd.fiori.inbox", "multiselect", oMultiSelectEvent);
	},

	updateSelectAllCheckBox: function() {
		var i18nBundle = this.getView().getModel("i18n").getResourceBundle();
		var iTotalItems = this.getList().getItems().length;
		if (this.iTotalFilteredItems) iTotalItems = this.iTotalFilteredItems;
		var bSelectAll = this.getList().getSelectedItems().length < iTotalItems;

		this.oSelectAllCheckBox.setText(i18nBundle.getText(bSelectAll ? "multi.selectall" : "multi.deselectall"));
		this.oSelectAllCheckBox.setSelected(!bSelectAll);
	},

	handleSelectAllCheckBoxPress: function() {
		// Handle Select All / Deselect All.

		var oList = this.getList();
		var iTotalItems = this.getList().getItems().length;
		if (this.iTotalFilteredItems) iTotalItems = this.iTotalFilteredItems;

		if (this.getList().getSelectedItems().length < iTotalItems) {

			var aListItems = oList.getItems();
			var aActiveListItems = [];
			var iCounter = 0;

			for (var i = 0; i < aListItems.length; i++) {
				var oListItem = aListItems[i];

				if (!oListItem.getBindingContext())
					continue;

				if (oListItem.getVisible()) {
					oListItem.setSelected(true);
					iCounter++;
					aActiveListItems.push(oListItem.getBindingContext().getProperty());
				}
			}
			this.iTotalFilteredItems = iCounter;
			//notify Multi Select Summary screen
			//all items are selected
			this.publishMultiSelectEvent(true, aActiveListItems);
		} else {
			// Deselect all items.

			oList.removeSelections(true);

			//notify Multi Select Summary screen
			//all items are deselected
			this.publishMultiSelectEvent(false, []);
		}

		this.updateMultiSelectState();
	},

	onMultiSelectEvent: function(sChannelId, sEventId, oMultiSelectEvent) {
		if (oMultiSelectEvent.Source === "MultiSelectSummary") {
			var oList = this.getList();
			var aListItems = oList.getItems();

			for (var i = 0; i < oMultiSelectEvent.WorkItems.length; i++) {
				for (var j = 0; j < aListItems.length; j++) {
					var oListItem = aListItems[j];

					var oContext = oListItem.getBindingContext();
					if (!oContext)
						continue;

					if (oContext.getProperty("SAP__Origin") == oMultiSelectEvent.WorkItems[i].SAP__Origin &&
						oContext.getProperty("InstanceID") == oMultiSelectEvent.WorkItems[i].InstanceID)
						oListItem.setSelected(oMultiSelectEvent.Selected);
				}
			}

			this.updateMultiSelectState();
		}
	},

	onSupportInfoOpenEvent: function(sChannelId, sEventId, oSupportInfoOpenEvent) {
		if (oSupportInfoOpenEvent.source === "MAIN") {
			cross.fnd.fiori.inbox.util.SupportInfo.setSearchPattern(this.sSearchPattern_Support);
			cross.fnd.fiori.inbox.util.SupportInfo.setFilters(this.sFilterKey_Support);
			cross.fnd.fiori.inbox.util.SupportInfo.setSorters(this.sSortKey_Support);
			cross.fnd.fiori.inbox.util.SupportInfo.setGroup(this.sGroupkey_Support);
		}
	},

	filterItemsByTaskDefinitionID: function(sTaskDefinitionID, sOrigin) {

		if (sTaskDefinitionID) {
			// copy the filter keys object
			this.oFilterKeysBeforeMultiSelect = jQuery.extend(true, {}, this.oFilterKeys);
			var oFilterKeys = {};
			var SAP__Origin = sOrigin ? sOrigin : "";

			oFilterKeys["TaskDefinitionID:" + sTaskDefinitionID + ":" + SAP__Origin] = true;
			var bStatusFilter = false;

			for (var key in this.oFilterKeys) {
				if (this.oFilterKeys.hasOwnProperty(key) && key) {
					var aKeyParts = key.split(":");
					if (aKeyParts[0] !== this._FILTER_CATEGORY_TASK_DEFINITION_ID) {
						if (aKeyParts[0] === this._FILTER_CATEGORY_STATUS && aKeyParts[1] !== this._FILTER_STATUS_AWAITING_CONFIRMATION) {
							oFilterKeys[key] = true;
							bStatusFilter = true;
						} else if (aKeyParts[0] !== this._FILTER_CATEGORY_STATUS) {
							oFilterKeys[key] = true;
						}
					}
				}
			}
			if (!bStatusFilter) {
				oFilterKeys[this._FILTER_CATEGORY_STATUS + ":" + this._FILTER_STATUS_NEW] = true;
				oFilterKeys[this._FILTER_CATEGORY_STATUS + ":" + this._FILTER_STATUS_IN_PROGRESS] = true;
				oFilterKeys[this._FILTER_CATEGORY_STATUS + ":" + this._FILTER_STATUS_RESERVED] = true;
			}
			this.oFilterKeys = oFilterKeys;
			this.handleFilter(this.oFilterKeys);
		} else {
			if (this.oFilterKeysBeforeMultiSelect) {
				this.oFilterKeys = jQuery.extend(true, {}, this.oFilterKeysBeforeMultiSelect);
				this.handleFilter(this.oFilterKeys);
			}
		}

	},

	clearDecisionButtons: function() {
		this.oMultiSelectActions = {
			positiveAction: null,
			negativeAction: null,
			additionalActions: []
		};
	},

	hideDecisionButtons: function() {
		// Clear decision buttons.

		this.clearDecisionButtons();

		// Refresh footer (to remove decision buttons).

		this._oApplicationImplementation.oMHFHelper.defineMasterHeaderFooter(this);
	},

	checkDecisionSupport: function(aSelectedItems, oDecisions) {
		for (var i = 0; i < aSelectedItems.length; i++) {
			var oListItem = aSelectedItems[i];
			var oContext = oListItem.getBindingContext();
			if (oDecisions.Forward) {
				if (oContext.getProperty("SupportsForward") === false) {
					oDecisions.Forward = false;
				}
			}
			if (oDecisions.Resubmit) {
				if (oContext.getProperty("TaskSupports/Resubmit") === false) {
					oDecisions.Resubmit = false;
				}
			}
			if (!oDecisions.Forward && !oDecisions.Resubmit)
				break;
		}
		return oDecisions;
	},

	showDecisionButtons: function() {
		// Clear decision buttons.

		this.clearDecisionButtons();

		// Create buttons.

		var that = this;

		for (var i = 0; i < this.aMultiSelectDecisionOptions.length; i++) {
			var oDecisionOption = this.aMultiSelectDecisionOptions[i];
			var sDecisionText = oDecisionOption.DecisionText;

			var oButton = {
				sBtnTxt: sDecisionText,
				onBtnPressed: (function(oDecisionOption) {
					return function() {
						that.showDecisionDialog(oDecisionOption);
					};
				})(oDecisionOption)
			};

			switch (oDecisionOption.Nature) {
				case "POSITIVE":
					this.oMultiSelectActions.positiveAction = oButton;
					break;

				case "NEGATIVE":
					this.oMultiSelectActions.negativeAction = oButton;
					break;

				default:
					this.oMultiSelectActions.additionalActions.push(oButton);
			}
		}

		var aSelectedListItems = this.getList().getSelectedItems();
		var oDecisions = {
			Forward: true,
			Resubmit: true
		};
		var oDecisionsSupported = this.checkDecisionSupport(aSelectedListItems, oDecisions);

		if (oDecisionsSupported.Forward === true) {
			var oForwardButton = {
				sI18nBtnTxt: "XBUT_FORWARD",
				onBtnPressed: jQuery.proxy(this.onForwardPopUp, this)
			};
			this.oMultiSelectActions.additionalActions.push(oForwardButton);
		}

		if (oDecisionsSupported.Resubmit === true) {
			var oResubmitButton = {
				sI18nBtnTxt: "XBUT_RESUBMIT",
				onBtnPressed: jQuery.proxy(this.showResubmitPopUp, this)
			};
			this.oMultiSelectActions.additionalActions.push(oResubmitButton);
		}

		var oButtonList = {};
		oButtonList.oPositiveAction = this.oMultiSelectActions.positiveAction;
		oButtonList.oNegativeAction = this.oMultiSelectActions.negativeAction;
		oButtonList.aButtonList = this.oMultiSelectActions.additionalActions;

		/**
		 * @ControllerHook Modify the footer buttons
		 * This hook method can be used to add and change buttons for the list view footer in mass approval mode
		 * It is called before the list of buttons are created in the footer
		 * @callback cross.fnd.fiori.inbox.view.S2~extHookChangeMassApprovalButtons
		 * @param {object} oButtonList - contains the positive, negative buttons and the additional button list.
		 * @return {void}
		 */
		if (this.extHookChangeMassApprovalButtons) {
			this.extHookChangeMassApprovalButtons(oButtonList);
		}

		// Refresh footer (to display decision buttons).

		this._oApplicationImplementation.oMHFHelper.defineMasterHeaderFooter(this);
	},

	showDecisionDialog: function(oDecisionOption) {
		// Display confirmation dialog.
		var aSelectedListItems = this.getList().getSelectedItems();
		var i18nBundle = this.getView().getModel("i18n").getResourceBundle();

		this.oConfirmationDialogManager.showDecisionDialog({
			question: i18nBundle.getText(aSelectedListItems.length > 1 ? "XMSG_MULTI_DECISION_QUESTION_PLURAL" : "XMSG_MULTI_DECISION_QUESTION", [
				oDecisionOption.DecisionText, aSelectedListItems.length
			]),
			showNote: true,
			title: i18nBundle.getText("XTIT_SUBMIT_DECISION"),
			confirmButtonLabel: i18nBundle.getText("XBUT_SUBMIT"),
			noteMandatory: oDecisionOption.CommentMandatory,
			confirmActionHandler: jQuery.proxy(function(oDeciOption, sNote) {
										this.sendMultiSelectAction(oDeciOption, sNote);
									}, this, oDecisionOption)
		});
	},

	sendMultiSelectAction: function(oDecisionOption, sNote) {
		var aSelectedListItems = this.getList().getSelectedItems();
		var aItems = [];

		for (var i = 0; i < aSelectedListItems.length; i++) {
			var oListItem = aSelectedListItems[i];
			var oContext = oListItem.getBindingContext();

			var oItem = {
				SAP__Origin: oContext.getProperty("SAP__Origin"),
				InstanceID: oContext.getProperty("InstanceID")
			};
			aItems.push(oItem);
		}

		// If an error happens during batch send, then an error dialog will be
		// displayed by DataManager.

		this.oDataManager.sendMultiAction(aItems, oDecisionOption, sNote,
			jQuery.proxy(this.sendMultiSelectActionSuccess, this),
			null);
	},

	sendMultiSelectActionSuccess: function(aSuccessList, aErrorList) {
		// Display success or error messages.

		if (aErrorList.length == 0) {
			var i18nBundle = this.getView().getModel("i18n").getResourceBundle();

			jQuery.sap.delayedCall(500, this, function() {
				sap.ca.ui.message.showMessageToast(i18nBundle.getText(aSuccessList.length > 1 ? "dialog.success.multi_complete_plural" :
					"dialog.success.multi_complete", aSuccessList.length));
			});

			this.sendMultiSelectActionEnd();
		} else {
			cross.fnd.fiori.inbox.util.MultiSelect.openMessageDialog(aSuccessList, aErrorList,
				jQuery.proxy(this.sendMultiSelectActionEnd, this));
		}
	},

	sendMultiSelectActionEnd: function() {
		// Turn off multi-select.

		this.dismissMultiSelect();

		// Refresh workitems.
		this.getView().getModel().bFullRefreshNeeded = true;
		this.getView().getModel().refresh();
	},

	sendMultiSelectForwardSuccess: function(aSuccessList, aErrorList, oAgent) {
		// Display success or error messages.

		if (aErrorList.length == 0) {
			var i18nBundle = this.getView().getModel("i18n").getResourceBundle();

			jQuery.sap.delayedCall(500, this, function() {
				sap.ca.ui.message.showMessageToast(i18nBundle.getText(aSuccessList.length > 1 ? "dialog.success.multi_forward_complete_plural" :
					"dialog.success.multi_forward_complete", [aSuccessList.length, oAgent.DisplayName]));
			});

			this.sendMultiSelectActionEnd();
		} else {
			cross.fnd.fiori.inbox.util.MultiSelect.openMessageDialog(aSuccessList, aErrorList,
				jQuery.proxy(this.sendMultiSelectActionEnd, this));
		}
	},

	isMultiSelectActive: function() {
		return (this.getList().getMode() == sap.m.ListMode.MultiSelect);
	},

	setMultiSelectButtonActive: function(bActive) {
		// Instruct Scaffolding to set multi-select button state on S2 header. (FIXME)

		this._oControlStore.bEditState = bActive;
		this._oControlStore.oEditBtn.setIcon(bActive ? "sap-icon://sys-cancel" : "sap-icon://multi-select");
		this._oControlStore.oEditBtn.setTooltip(this.oApplicationFacade.getUiLibResourceModel().getText(bActive ? "CANCEL" : "MULTI_SELECT"));
	},

	loadInitialAppData: function() {
		if (this.oDataManager.sScenarioId != null) {
			this.oDataManager.loadInitialAppData(jQuery.proxy(function(oScenario) {
				if (!oScenario) {
					return;
				}
				this.getView().getModel().ScenarioServiceInfos = oScenario.ScenarioServiceInfos;

				// get the config with the possible url parameter overrides
				var oConfig = this.oDataManager.getScenarioConfig();

				if ((oScenario.ScenarioServiceInfos.length == 1) || (oConfig.AllItems == true))
					this.bDisplaySortOption = true;

				this.bDisplayMultiSelectButton = oConfig.IsMassActionEnabled;

				// Get default sort key from backend.

				this.sBackendDefaultSortKey = oConfig.SortBy;

				this.initListBinding(this.configureSorters(this.sBackendDefaultSortKey), this.getAllFilters());
			}, this));
		} else {
			var oConfig = this.oDataManager.getScenarioConfig();
			if (oConfig.AllItems == true) {
				this.bDisplayMultiSelectButton = oConfig.IsMassActionEnabled ? true : false;
				this.bDisplaySortOption = true;
				this.sBackendDefaultSortKey = oConfig.SortBy;
				this.initListBinding(this.configureSorters(this.sBackendDefaultSortKey), this.getAllFilters());
			}
		}

	},

	//This function takes care of binding the List on initial load of the application. The sorters and the filters could be different in All Items and Scenario
	//definition cases, hence these are parameterized.
	initListBinding: function(aSorters, aFilters){
		
		var aPropertiesToSelect = this.aSelectProperties;
		/**
         * @ControllerHook Add additional properties related to the work item to the $Select system query option
         * This hook method can be used to add additional properties to the $select list of the master data request
         * It is called when the master view is displayed and the before the master list binding is initialized
         * @callback cross.fnd.fiori.inbox.view.S2~extHookGetPropertiesToSelect
         * @return {array} aProperties - contains the names of the related properties
         */
		if(this.extHookGetPropertiesToSelect){
			var aProperties = this.extHookGetPropertiesToSelect();
			// append custom entity sets to the default list
			aPropertiesToSelect = aPropertiesToSelect.concat(aProperties);
		}
		
		if(this.oDataManager.bOutbox){
			aPropertiesToSelect = aPropertiesToSelect.concat(this.aSelectPropertiesOutbox);
		}
		
		this.getList().bindAggregation("items",{
			path:"/TaskCollection", 
			template: this.getView().byId("MAIN_LIST_ITEM"), 
			sorter: aSorters, 
			filters: aFilters, 
			templateShareable: true,
			parameters:{
				countMode: sap.ui.model.odata.CountMode.InlineRepeat,
				faultTolerant: true,
				select: aPropertiesToSelect.join(",")
			}
		});
	},

	getAllFilters: function(oAdditionalFilter) {
		var aFilters = [];
		var oScenarioConfig = this.oDataManager.getScenarioConfig();
		var bAllItems = oScenarioConfig.AllItems;
		var oModel = this.getView().getModel();
		if (bAllItems)
			aFilters = this.getFiltersWithoutScenario(oModel);
		else
			aFilters = this.getFiltersWithScenario(oModel);

		if (oAdditionalFilter)
			aFilters.push(oAdditionalFilter);

		//add status filter
		var aStatusFilterKeys = oModel.aStatusFilterKeys;
		var statusFilters = cross.fnd.fiori.inbox.util.TaskStatusFilterProvider.getAllFilters(this.oDataManager.bOutbox, aStatusFilterKeys,aFilters);
		aFilters.push(new sap.ui.model.Filter(statusFilters, false));

		return [new sap.ui.model.Filter(aFilters, true)];
	},

	getFiltersWithoutScenario: function(oModel) {
		var that = this;
		var aFilters = [];
		var aTaskDefinitionIDFilterKeys = oModel.aTaskDefinitionIDFilterKeys || [];
		var aSubstitutedUserFilterKeys = oModel.aSubstitutedUserFilterKeys || [];
		var aStatusFilterKeys = oModel.aStatusFilterKeys;

		if (!aTaskDefinitionIDFilterKeys)
			aTaskDefinitionIDFilterKeys = [];
		if (!aSubstitutedUserFilterKeys)
			aSubstitutedUserFilterKeys = [];
		if (!aStatusFilterKeys)
			aStatusFilterKeys = [];

		var aTaskDefinitionIDFilters = [];
		var aSubstitutedUserFilters = [];
		var aSAPOriginsFilters = [];
		var aOriginsApplied = [];

		for (var j = 0; j < aTaskDefinitionIDFilterKeys.length; j++) {
			var oTaskDefinitionIDFilter = new sap.ui.model.Filter({
				path: "TaskDefinitionID",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: aTaskDefinitionIDFilterKeys[j]
			});
			aTaskDefinitionIDFilters.push(oTaskDefinitionIDFilter);
			if (aOriginsApplied.indexOf(that.aTaskTypeFilterItemsOrigins[j]) != -1)
				continue;
			var oSAPOriginFilter = new sap.ui.model.Filter({
				path: "SAP__Origin",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: that.aTaskTypeFilterItemsOrigins[j]
			});
			aSAPOriginsFilters.push(oSAPOriginFilter);
			aOriginsApplied.push(that.aTaskTypeFilterItemsOrigins[j]);
		}
		for (var i = 0; i < aSubstitutedUserFilterKeys.length; i++) {
			var oSubstitutedUserFilter = new sap.ui.model.Filter({
				path: "SubstitutedUser",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: aSubstitutedUserFilterKeys[i]
			});
			aSubstitutedUserFilters.push(oSubstitutedUserFilter);
		}
		if (aSAPOriginsFilters.length > 0)
			aFilters.push(new sap.ui.model.Filter(aSAPOriginsFilters, false));

		if (aTaskDefinitionIDFilters.length > 0) {
			aFilters.push(new sap.ui.model.Filter(aTaskDefinitionIDFilters, false));
		}
		
		if (aSubstitutedUserFilters.length > 0) {
			aFilters.push(new sap.ui.model.Filter(aSubstitutedUserFilters, false));
		}

		return aFilters;
	},

	getFiltersWithScenario: function(oModel) {
		var aFilters = [];
		var aTaskDefinitionIDFilterKeys = oModel.aTaskDefinitionIDFilterKeys;
		var aStatusFilterKeys = oModel.aStatusFilterKeys;
		var oScenarioConfig = this.oDataManager.getScenarioConfig();
		var that = this;

		if (!aTaskDefinitionIDFilterKeys)
			aTaskDefinitionIDFilterKeys = [];
		if (!aStatusFilterKeys)
			aStatusFilterKeys = [];

		var aSAPOriginsFilters = [];
		var aOriginsApplied = [];
		var oSAPOriginFilter = {};
		var bIsTaskTypeFilterApplied = aTaskDefinitionIDFilterKeys.length > 0 ? true : false;
		var aTaskDefinitionIDsToApply = [];
		var aTaskDefinitionIDFilters = [];

		//List binding data fetch - TaskCollection in batch
		for (var i = 0; i < oScenarioConfig.ScenarioServiceInfos.length; i++) {
			var oScenarioServiceInfo = oScenarioConfig.ScenarioServiceInfos[i];

			// Step 1: TaskDefinitionID
			var iTaskDefinitionIDFilterCount = 0;
			var bTaskExistsInScenario = false;
			var sTaskDefIDForFilter = "";

			for (var j = 0; j < oScenarioServiceInfo.TaskDefinitionIDs.length; j++) {
				bTaskExistsInScenario = false;
				sTaskDefIDForFilter = "";
				// Check aTaskDefinitionIDFilterKeys if we are filtering for task definition IDs.

				for (var k = 0; k < aTaskDefinitionIDFilterKeys.length; k++) {
					// if the tasks filtered are present in the scenario
					if (aTaskDefinitionIDFilterKeys[k].toUpperCase().indexOf(oScenarioServiceInfo.TaskDefinitionIDs[j].toUpperCase()) == 0) {
						bTaskExistsInScenario = true;
						sTaskDefIDForFilter = aTaskDefinitionIDFilterKeys[k];

						// Get Unique SAP__Origin
						if (aOriginsApplied.indexOf(that.aTaskTypeFilterItemsOrigins[k]) == -1) {
							oSAPOriginFilter = new sap.ui.model.Filter({
								path: "SAP__Origin",
								operator: sap.ui.model.FilterOperator.EQ,
								value1: that.aTaskTypeFilterItemsOrigins[k]
							});
							aSAPOriginsFilters.push(oSAPOriginFilter);
							aOriginsApplied.push(that.aTaskTypeFilterItemsOrigins[k]);
						}
						break;
					}
				}

				// skip creating filter if filtered by task type but the task does not exist in the scenario
				if (aTaskDefinitionIDFilterKeys.length > 0 && !bTaskExistsInScenario)
					continue;

				//Creating filters for task definition ID, only if (not filtered by task type) or (filtered by task type and task exists in scenario)
				if (!bTaskExistsInScenario) { // if task type filter not applied, fetch task definition id from the scenario
					sTaskDefIDForFilter = oScenarioServiceInfo.TaskDefinitionIDs[j];
				}
				if (aTaskDefinitionIDsToApply.indexOf(sTaskDefIDForFilter) == -1) {
					iTaskDefinitionIDFilterCount++;
					var oTaskDefinitionIDFilter = new sap.ui.model.Filter({
						path: "TaskDefinitionID",
						operator: sap.ui.model.FilterOperator.EQ,
						value1: sTaskDefIDForFilter
					});
					aTaskDefinitionIDFilters.push(oTaskDefinitionIDFilter);
				}

			}

			// Donot send SAP Origin from Scenarios if Task Type filter is applied
			if (!bIsTaskTypeFilterApplied && aOriginsApplied.indexOf(oScenarioServiceInfo.Origin) == -1) {
				var oSAPOriginFilter = new sap.ui.model.Filter({
					path: "SAP__Origin",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: oScenarioServiceInfo.Origin
				});
				aOriginsApplied.push(oScenarioServiceInfo.Origin);
				aSAPOriginsFilters.push(oSAPOriginFilter);
			}

		}

		if (aTaskDefinitionIDFilters.length > 0) {
			aFilters.push(new sap.ui.model.Filter(aTaskDefinitionIDFilters, false));
		}

		// add sap origins filters for individual tasks when filtered on task type
		if (aSAPOriginsFilters.length > 0) {
			aFilters.push(new sap.ui.model.Filter(aSAPOriginsFilters, false));
		}

		return aFilters;
	},

	onForwardPopUp: function() {
		var oFirstSelectedItemContext = this.getList().getSelectedItems()[0].getBindingContext();
		var sOrigin = oFirstSelectedItemContext.getProperty("SAP__Origin");
		var sInstanceID = oFirstSelectedItemContext.getProperty("InstanceID");
		var iNumberOfSelectedItems = this.getList().getSelectedItems().length;

		cross.fnd.fiori.inbox.util.Forward.open(
			jQuery.proxy(this.startForwardFilter, this),
			jQuery.proxy(this.closeForwardPopUp, this),
			iNumberOfSelectedItems
		);

		this.oDataManager.readPotentialOwners(sOrigin, sInstanceID,
			jQuery.proxy(this._PotentialOwnersSuccess, this));
	},

	showResubmitPopUp: function() {
		cross.fnd.fiori.inbox.util.Resubmit.open(
			this.sResubmitUniqueId,
			this,
			this.getView()
		);
	},
	sendMultiSelectResubmitSuccess: function(aSuccessList, aErrorList, dResubmissionDate) {
		if (aErrorList.length == 0) {
			var i18nBundle = this.getView().getModel("i18n").getResourceBundle();

			jQuery.sap.delayedCall(500, this, function() {
				sap.ca.ui.message.showMessageToast(i18nBundle.getText(aSuccessList.length > 1 ? "dialog.success.multi_resubmit_multiple_tasks" :
					"dialog.success.multi_resubmit_single_task", [aSuccessList.length]));
			});

			this.sendMultiSelectActionEnd();
		} else {
			cross.fnd.fiori.inbox.util.MultiSelect.openMessageDialog(aSuccessList, aErrorList,
				jQuery.proxy(this.sendMultiSelectActionEnd, this));
		}
	},

	handleResubmitPopOverOk: function(oResult) {
		var aSelectedListItems = this.getList().getSelectedItems();
		var aItems = [];

		for (var i = 0; i < aSelectedListItems.length; i++) {
			var oListItem = aSelectedListItems[i];
			var oContext = oListItem.getBindingContext();

			var oItem = {
				SAP__Origin: oContext.getProperty("SAP__Origin"),
				InstanceID: oContext.getProperty("InstanceID")
			};
			aItems.push(oItem);
		}
		var oCalendar = sap.ui.core.Fragment.byId(this.sResubmitUniqueId, "DATE_RESUBMIT");
		var aSelectedDates = oCalendar.getSelectedDates();
		if (aSelectedDates.length > 0) {
			var oDate = aSelectedDates[0].getStartDate();
			var oFormat = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "YYYY-MM-ddTHH:mm:ss"
			});
			this.oDataManager.doMassResubmit(aItems,
				"datetime'" + oFormat.format(oDate) + "'",
				jQuery.proxy(this.sendMultiSelectResubmitSuccess, this),
				null);
			cross.fnd.fiori.inbox.util.Resubmit.close();
		} else {
			this.sendMultiSelectActionEnd();
		}
	},

	_PotentialOwnersSuccess: function(oResult) {
		cross.fnd.fiori.inbox.util.Forward.setAgents(oResult.results);
		cross.fnd.fiori.inbox.util.Forward.setOrigin(this.getList().getSelectedItems()[0].getBindingContext().getProperty("SAP__Origin"));
	},

	startForwardFilter: function(oListItem, sQuery) {
		sQuery = sQuery.toLowerCase();
		var sFullName = oListItem.getBindingContext().getProperty("DisplayName").toLowerCase();
		var sDepartment = oListItem.getBindingContext().getProperty("Department").toLowerCase();

		return (sFullName.indexOf(sQuery) != -1) ||
			(sDepartment.indexOf(sQuery) != -1);
	},

	closeForwardPopUp: function(oResult) {
		if (oResult && oResult.bConfirmed) {
			var aSelectedListItems = this.getList().getSelectedItems();
			var aItems = [];

			for (var i = 0; i < aSelectedListItems.length; i++) {
				var oListItem = aSelectedListItems[i];
				var oContext = oListItem.getBindingContext();

				var oItem = {
					SAP__Origin: oContext.getProperty("SAP__Origin"),
					InstanceID: oContext.getProperty("InstanceID")
				};
				aItems.push(oItem);
			}

			this.oDataManager.doMassForward(aItems,
				oResult.oAgentToBeForwarded,
				oResult.sNote,
				jQuery.proxy(this.sendMultiSelectForwardSuccess, this),
				null);
		} else {
			this.sendMultiSelectActionEnd();
		}
	},

	_handleListSwipe: function(oEvent) {
		if (this.isMultiSelectActive()) {
			// If we are in multi-select mode, then disable quick approval.
			oEvent.bPreventDefault = true;
			return;
		}

		if (!this.oDataManager.getScenarioConfig().IsQuickActionEnabled) {
			//quick action is not enabled
			oEvent.bPreventDefault = true;
			//no feedback to end user, but at least log entry
			$.sap.log.error("Quick Action is not enabled in Scenario Customizing");
		} else {
			var oSwipeListItem = oEvent.getParameter("listItem");
			var oContext = oSwipeListItem.getBindingContext();
			var sOrigin = oContext.getProperty("SAP__Origin");
			var sInstanceID = oContext.getProperty("InstanceID");
			var aDecisionOptions = null;

			//check EXECUTED status
			if (oContext.getProperty("Status") === "EXECUTED") {
				var oDecision = {};
				oDecision.selectedListItem = oSwipeListItem;
				//oDecision.DecisionKey = aActions[i].decisionKey;
				oDecision.isMandatoryComment = false;
				oDecision.text = this.getView().getModel("i18n").getResourceBundle().getText("XBUT_CONFIRM");

				//-- add swipe button dynamically
				var oSwipeContent = oEvent.getParameter("swipeContent"); // get swiped content from event, this will be a button
				oSwipeContent.setText(oDecision.text);

				var oApproveDecisionCustomData = new sap.ui.core.CustomData({
					key: "APPROVE_DECISION",
					value: oDecision
				});
				//remove all custom attribute
				oSwipeContent.removeAllCustomData();
				oSwipeContent.addCustomData(oApproveDecisionCustomData);
			} else {
				//-- read decision options
				this.oDataManager.readDecisionOptions(sOrigin, sInstanceID, function(aResult) {
					aDecisionOptions = aResult;
				});

				var aActions = [];
				if (aDecisionOptions) {
					for (var h = 0; h < aDecisionOptions.length; h++) {
						var oActionData = {};
						oActionData.decisionKey = aDecisionOptions[h].DecisionKey;
						oActionData.buttonText = aDecisionOptions[h].DecisionText;
						oActionData.isApprove = aDecisionOptions[h].Nature === "POSITIVE" ? true : false;
						oActionData.isReject = aDecisionOptions[h].Nature === "NEGATIVE" ? true : false;
						oActionData.isNonNature = aDecisionOptions[h].Nature === "" ? true : false;
						oActionData.isMandatoryComment = aDecisionOptions[h].CommentMandatory;
						aActions.push(oActionData);
					}
				}
				//-- get the positive action name and decision
				for (var i = 0; i < aActions.length; i++) {
					if (aActions[i].isApprove) {
						var oDecision = {};
						oDecision.selectedListItem = oSwipeListItem;
						oDecision.DecisionKey = aActions[i].decisionKey;
						oDecision.isMandatoryComment = aActions[i].isMandatoryComment;
						oDecision.text = aActions[i].buttonText;

						//-- add swipe button dynamically
						var oSwipeContent = oEvent.getParameter("swipeContent"); // get swiped content from event, this will be a button
						oSwipeContent.setText(oDecision.text);

						var oApproveDecisionCustomData = new sap.ui.core.CustomData({
							key: "APPROVE_DECISION",
							value: oDecision
						});
						//remove all custom attribute
						oSwipeContent.removeAllCustomData();
						oSwipeContent.addCustomData(oApproveDecisionCustomData);
						//-- pick first approve option and leave
						return;
					}
				}
				//no positive decision, no swipe
				oEvent.bPreventDefault = true;
				//no feedback to end user, but at least log entry
				$.sap.log.error("No decision option with nature POSITVE found, no swipe possible.");
			}
		}
	},

	_handleSwipeApproved: function(oEvent) {

		var oList = this.getList();
		var oSwipedItem = oList.getSwipedItem();
		//-- generic approve needs an object, usual approve is always boolean
		oList.swipeOut();

		var oDecision = oEvent.getSource().getCustomData()[0].getValue();
		oDecision.InstanceID = oSwipedItem.getBindingContext().getProperty("InstanceID");
		oDecision.SAP__Origin = oSwipedItem.getBindingContext().getProperty("SAP__Origin");
		if (oDecision.isMandatoryComment) {
			this.showDecisionDialogForQuickAction(this.oDataManager.FUNCTION_IMPORT_DECISION, oDecision, true);
		} else {
			if (oSwipedItem.getBindingContext().getProperty("Status") === "EXECUTED") {
				var sFunctionImportName = this.oDataManager.FUNCTION_IMPORT_CONFIRM;
			} else {
				var sFunctionImportName = this.oDataManager.FUNCTION_IMPORT_DECISION;
			}
			this.oDataManager.sendAction(sFunctionImportName, oDecision, "", jQuery.proxy(function(oData) {
				jQuery.sap.delayedCall(500, this, function() {
					sap.ca.ui.message.showMessageToast(this.oApplicationFacade.getResourceBundle().getText("dialog.success.complete"));
				});
			}, this));
		}
	},

	showDecisionDialogForQuickAction: function(sFunctionImportName, oDecision, bShowNote) {
		var i18nBundle = this.getView().getModel("i18n").getResourceBundle();
		this.oConfirmationDialogManager.showDecisionDialog({
			question: i18nBundle.getText("XMSG_DECISION_QUESTION", oDecision.text),
			showNote: bShowNote,
			title: i18nBundle.getText("XTIT_SUBMIT_DECISION"),
			confirmButtonLabel: i18nBundle.getText("XBUT_SUBMIT"),
			noteMandatory: oDecision.isMandatoryComment,
			confirmActionHandler : jQuery.proxy(function(oDecision, sNote) {
					this.oDataManager.sendAction(sFunctionImportName, oDecision, sNote);
			},this, oDecision)
		});
	},

	onUpdateStarted: function(oEvent) {
		var oList = oEvent.getSource();
		var sNoDataText = this.oApplicationFacade.getResourceBundle().getText("XMSG_LOADING");
		oList.setNoDataText(sNoDataText);
		var oModel = this.getView().getModel();

		// Refresh the selected task also if the task model is getting refreshed
		if (oEvent.getParameter("reason") == "Refresh" && oList.getSelectedItem()) {
			if (oModel.bFullRefreshNeeded) {
				oModel.bFullRefreshNeeded = false;
			} else if (!sap.ui.Device.system.phone) {
				this.oDataManager.fireItemRemoved();
			}
		}

		// bind master list
		this.registerMasterListBind(this.getList());
		this.oDataManager.fnShowReleaseLoader(true);
	},

	// This function gets called after list has been updated
	onUpdateFinished: function(oEvent) {

		this.oDataManager.fnShowReleaseLoader(false);
		var oList = oEvent.getSource();
		if (!sap.ui.Device.system.phone && this.isMultiSelectActive() == false) {
			// If there are no items in the list, navigate to an empty view
			if (oList.getItems().length < 1) {
				this.navToEmptyView();
				this.oRouter.navTo("master", null, true);
			} else {
				/* If list is refreshed because of filter, select the first list item
				 * If no item is selected in the list, select the first item
				 * TODO refresh the first item if the selection has not been changed
				 *  */
				if (oEvent.getParameter("reason") == "Filter" || oList.getSelectedItem() == null) {
					this.selectFirstItem();
				} else {
					//Ideally this path should be hit for deep linking scenario.
					//In deep linking scenario, the Scaffolding framework selects the correct item based on the bindingContext created out of the detail path.(_handleDetailMatched)
					//Though the correct item is selected in the List, there is no bindingContext set for the detail view. Here we call this method,
					//so that the binding context can be set
					var isItemSelected = this._selectItemByCtxtPath();
					if (!isItemSelected) {
						this.selectFirstItem();
					}
				}

				// adjust the scrollbar of the S2 page so that the selected item is visible in the list
				if (oList.getSelectedItem()) {
					var oScrollDelegate = oList.getParent().getScrollDelegate();
					if (oScrollDelegate && oScrollDelegate.getScrollTop() === 0) {
						oList.getParent().scrollTo(oList.getSelectedItem().$().offset().top - oList.getItems()[0].$().offset().top, 0);
					}
				}
			}
		}

		var sNoDataText = this.oApplicationFacade.getUiLibResourceModel().getText("NO_ITEMS_AVAILABLE");
		oList.setNoDataText(sNoDataText);

	},

	/*
	 * override BaseMasterController method, called when data is downloaded
	 */
	onDataLoaded: function() {

	},

	/*
	 * override ScfldMasterController method, inject SAP__Origin and InstanceID
	 */
	getDetailNavigationParameters: function(oListItem) {
		var oEntry = this.getView().getModel().getProperty(oListItem.getBindingContext().getPath());
		return {
			SAP__Origin: oEntry.SAP__Origin,
			InstanceID: oEntry.InstanceID,
			contextPath: oListItem.getBindingContext().getPath().substr(1)
		};
	},

	applySearchPattern: function(sFilterPattern) {
		var iCount = sap.ca.scfld.md.controller.ScfldMasterController.prototype.applySearchPattern.call(this, sFilterPattern);
		var sKey = (iCount > 0 || sFilterPattern == "") ? "NO_ITEMS_AVAILABLE" : "NO_MATCHING_ITEMS";
		var sNoDataText = this.oApplicationFacade.getUiLibResourceModel().getText(sKey);

		this.getList().setNoDataText(sNoDataText);

		return iCount;
	},

	_getBindingContextOfFirstItem: function() {
		var aListItems = this.getList().getItems();
		var oBindingContext = null;
		if (aListItems.length == 1) {
			oBindingContext = aListItems[0].getBindingContext();
		}
		if (!oBindingContext) {
			oBindingContext = aListItems[1].getBindingContext();
		}
		return oBindingContext;
	},

	displayVisibleSortItems: function() {
		var oConfigItem;
		var bVisible;

		this.aVisibleSortItems = [];
		// Sort item is visible, if
		for (var sSortKey in this.oSortConfig) {
			oConfigItem = this.oSortConfig[sSortKey];
			// - it doesn't have getVisible method, or
			// - has getVisible method and it returns true, or
			bVisible = oConfigItem.getVisible ? oConfigItem.getVisible() : true;
			// - it is the current sort item (this.sSortKey).
			if (bVisible /*|| sSortKey === this.sSortKey*/ ) {
				var sText;
				if (oConfigItem.text === this._CUSTOM_NUMBER_LABEL) {
					var oBindingContext = this._getBindingContextOfFirstItem();
					sText = oBindingContext.getProperty(this._CUSTOM_NUMBER_LABEL);
				} else if (oConfigItem.text === this._CUSTOM_NUMBER_UNIT_LABEL) {
					var oBindingContext = this._getBindingContextOfFirstItem();
					sText = oBindingContext.getProperty(this._CUSTOM_NUMBER_UNIT_LABEL);
				} else if (oConfigItem.text === this._CUSTOM_OBJECT_ATTRIBUTE_LABEL) {
					var oBindingContext = this._getBindingContextOfFirstItem();
					sText = oBindingContext.getProperty(this._CUSTOM_OBJECT_ATTRIBUTE_LABEL);
				} else {
					sText = oConfigItem.text;
				}

				this.aVisibleSortItems.push({
					key: sSortKey,
					text: sText
				});
			}
		}

		// Refresh footer.
		this._oApplicationImplementation.oMHFHelper.defineMasterHeaderFooter(this);
	},

	handleFilter: function(sFilterKey) {
		this.aTaskTypeFilterItemsOrigins = [];
		this.aSubstitutedUserFilterItem = [];
		var oFilter = this.getFilter(sFilterKey);
		this.sFilterKey_Support = sFilterKey;
		var aAllFilters = this.getAllFilters(oFilter);
		this.getList().getBinding("items").aApplicationFilters = [];
		this.iTotalFilteredItems = this.getList().getBinding("items").filter(aAllFilters).iLastEndIndex; // to fetch number of filtered items
	},

	handleSort: function(sSortKey) {
		this.sSortKey_Support = sSortKey;
		//cross.fnd.fiori.inbox.util.SupportInfo.setSorters(sSortKey);
		var aSorters = this.configureSorters(sSortKey);
		this.getList().getBinding("items").sort(aSorters);
	},

	handleGroup: function() {
		var aSorters = this.configureSorters(this.sSortKey);
		//cross.fnd.fiori.inbox.util.SupportInfo.setGroup(this.sSortKey);
		this.getList().getBinding("items").sort(aSorters);
	},

	configureSorters: function(sSortKey) {
		var oSorter;
		var aSorters = [];
		var fnCustomSorter = null;
		var fnCustomGrouper = null;
		var sRealGroupKey = null;
		var i18nBundle = this.getView().getModel("i18n").getResourceBundle();

		// Configure grouping.

		if (this.oGroupConfigItem) {
			sRealGroupKey = this.oGroupConfigItem.key;
			var bRealGroupDescending = this.bGroupDescending;
			var fnGroup = this.oGroupConfigItem.formatter || true;

			// Handle special cases.

			switch (this.oGroupConfigItem.key) {
				case this._SORT_PRIORITY:
					sRealGroupKey = this._SORT_PRIORITY_NUMBER;
					bRealGroupDescending = !bRealGroupDescending;
					break;

				case this._SORT_STATUS:
					fnCustomGrouper = function(oGroup1, oGroup2) {
						return this.statusGrouper(oGroup1, oGroup2, bRealGroupDescending);
					};
					break;
			}

			oSorter = new sap.ui.model.Sorter(sRealGroupKey, bRealGroupDescending, fnGroup);
			aSorters.push(oSorter);

			this.sInfoHeaderGroupString = i18nBundle.getText("group.header", i18nBundle.getText(this.oGroupConfigItem.textKey));
		} else {
			this.sInfoHeaderGroupString = null;
		}

		this.refreshInfoHeaderToolbar();

		// Configure sorting.

		// Default sort key if not configured on back-end (see loadInitialAppData).
		if (!sSortKey)
			sSortKey = this.sDefaultSortKey;
		// If unknown sort key received from back-end, then we revert to default (see loadInitialAppData)
		if (!this.oSortConfig[sSortKey]) {
			sSortKey = this.sDefaultSortKey;
		}

		var sRealSortKey = sSortKey;
		var bRealSortDescending = this.oSortConfig[sSortKey].descending;

		// Handle special cases.

		switch (sSortKey) {
			case this._SORT_PRIORITY:
				sRealSortKey = this._SORT_PRIORITY_NUMBER;
				bRealSortDescending = !bRealSortDescending;
				break;

			case this._SORT_COMPLETIONDEADLINE:
				fnCustomSorter = this.completionDeadLineSorter;
				break;

			case this._SORT_CREATEDONREVERSE:
				sRealSortKey = this._SORT_CREATEDON;
				break;
		}

		// If the grouping and sorting keys are the same (SORT_PRIORITY(_NUMBER),
		// SORT_TASKDEFINITIONID, SORT_STATUS), then don't create an additional sorter for sorting key.

		if (sRealGroupKey != sRealSortKey) {
			oSorter = new sap.ui.model.Sorter(sRealSortKey, bRealSortDescending);
			aSorters.push(oSorter);
		}

		var oModel = this.getView().getModel();

		oModel.extFnCustomGrouper = fnCustomGrouper ? $.proxy(fnCustomGrouper, this) : null;
		oModel.extFnCustomSorter = fnCustomSorter ? $.proxy(fnCustomSorter, this) : null;
		oModel.extSGroupingProperty = sRealGroupKey;
		this.sSortKey = sSortKey;
		this.sGroupkey_Support = sRealGroupKey;
		//cross.fnd.fiori.inbox.util.SupportInfo.setGroup(sRealGroupKey);

		return aSorters;
	},

	isBackendDefaultSortKeyEqualsTo: function(sSortKey) {
		return (this.sBackendDefaultSortKey === sSortKey);
	},

	completionDeadLineSorter: function(oItem1, oItem2) {
		if (!oItem1[this._SORT_COMPLETIONDEADLINE]) {
			return 1;
		}
		if (!oItem2[this._SORT_COMPLETIONDEADLINE]) {
			return -1;
		}
		return (oItem1[this._SORT_COMPLETIONDEADLINE] - oItem2[this._SORT_COMPLETIONDEADLINE]);
	},

	statusGrouper: function(oGroup1, oGroup2, bDescending) {
		var iGroup1StatusIndex;
		var iGroup2StatusIndex;
		var iMult = bDescending ? -1 : 1;

		for (var i = 0; i < this._GROUP_STATUS_ORDER.length; i++) {
			var oGroupOrder = this._GROUP_STATUS_ORDER[i];

			if (oGroupOrder.Status == oGroup1.GroupingValue)
				iGroup1StatusIndex = i;
			if (oGroupOrder.Status == oGroup2.GroupingValue)
				iGroup2StatusIndex = i;
		}

		return (iGroup1StatusIndex - iGroup2StatusIndex) * iMult;
	},

	getFilter: function(oFilterKeys) {
		var oFilter = null;
		var oCustomFilter = null;
		var that = this;
		var aPriorityFilters = [];
		var oDueDateFilter = null;
		var aTaskTypeFilters = [];
		var aSubstitutedUserFilter = [];
		//Workaround due to ODataModelExtension
		var aTaskDefinitionIDFilterKeys = [];
		var aSubstitutedUserFilterKeys = [];
		var aStatusFilters = [];
		//Workaround due to ODataModelExtension
		var aStatusFilterKeys = [];
		var aAdditionalFilters = [];
		var oCreationDateFilter = null;
		var oCompletedOnFilters = null;
		var oResumeOnFilters = null;
		var emptyFilter = true;
		for (var key in oFilterKeys) {
			emptyFilter = false;
			if (oFilterKeys.hasOwnProperty(key) && key) {
				var aKeyParts = key.split(":");
				var resultPriorityFilters = cross.fnd.fiori.inbox.util.InboxFilterContributor.getFilterForPriorityBykey(aKeyParts);
				if(resultPriorityFilters!==undefined && resultPriorityFilters!==null){
					aPriorityFilters.push(resultPriorityFilters);
				}
				var resultDueDateFilter = cross.fnd.fiori.inbox.util.InboxFilterContributor.getFilterForDueDateByKey(aKeyParts);
				if(resultDueDateFilter!==undefined &&  resultDueDateFilter!==null){
					oDueDateFilter=resultDueDateFilter;
				}
				var resultStatusFilters = cross.fnd.fiori.inbox.util.InboxFilterContributor.getFilterForStatusByKey(aKeyParts);
				if(resultStatusFilters!==undefined && resultStatusFilters!==null){
					aStatusFilterKeys.push(resultStatusFilters);
				}
			    var resultCreationDateFilter = cross.fnd.fiori.inbox.util.InboxFilterContributor.getFilterForCreationDateByKey(aKeyParts);
				if(resultCreationDateFilter!==undefined &&  resultCreationDateFilter!==null){
					oCreationDateFilter=resultCreationDateFilter;
				}
				var resultCompletedOnFilters = cross.fnd.fiori.inbox.util.OutboxFilterContributor.getCompletedFilterByKey(aKeyParts);
				if(resultCompletedOnFilters!==undefined &&  resultCompletedOnFilters!==null){
					oCompletedOnFilters=resultCompletedOnFilters;
				}
			   
			   var resultResumeOnFilters = cross.fnd.fiori.inbox.util.OutboxFilterContributor.getResumeOnFilterByKey(aKeyParts);
				if(resultResumeOnFilters!==undefined &&  resultResumeOnFilters!==null){
					oResumeOnFilters=resultResumeOnFilters;
				}
				if (aKeyParts[0] === this._FILTER_CATEGORY_TASK_DEFINITION_ID) {
					var oTaskTypeFilter = new sap.ui.model.Filter(aKeyParts[0], sap.ui.model.FilterOperator.EQ, aKeyParts[1]);
					aTaskTypeFilters.push(oTaskTypeFilter);
					//Workaround due to ODataModelExtension
					aTaskDefinitionIDFilterKeys.push(aKeyParts[1]);
					that.aTaskTypeFilterItemsOrigins.push(aKeyParts[2]);

				} else if (aKeyParts[0] === this._FILTER_CATEGORY_SUBSTITUTED_USER) {
					var oSubstitutedUserFilter = new sap.ui.model.Filter(aKeyParts[0], sap.ui.model.FilterOperator.EQ, aKeyParts[1]);
					aSubstitutedUserFilter.push(oSubstitutedUserFilter);
					aSubstitutedUserFilterKeys.push(aKeyParts[1]);
					that.aSubstitutedUserFilterItem.push(aKeyParts[2]);
				} else if (aPriorityFilters === null && oDueDateFilter === null && aStatusFilters === null && oCreationDateFilter === null &&
					oCompletedOnFilters === null &&	oResumeOnFilters === null) {
					var oAdditionalFilter = new sap.ui.model.Filter(aKeyParts[0], sap.ui.model.FilterOperator.EQ, aKeyParts[1]);
					aAdditionalFilters.push(oAdditionalFilter);
				}
			}
		}

		var oFilterOptions = {
			selectedFilterOptions: oFilterKeys,
			taskDefinitionFilter: aTaskDefinitionIDFilterKeys,
			substitutedUserFilter: aSubstitutedUserFilterKeys,
			statusFilter: aStatusFilterKeys,
			priorityFilter: aPriorityFilters,
			dueDateFilter: oDueDateFilter,
			creationDateFilter: oCreationDateFilter,
			completedDateFilter: oCompletedOnFilters,
			resumeDateFilter: oResumeOnFilters,
	     	additionalFilters: aAdditionalFilters //custom filters
		};

		/**
		 * @ControllerHook Implement a custom filter
		 * This hook method can be used to replace the standard filter by a custom
		 * one based on the filterKey and add addtional custom filters
		 * It is called when a filter option is selected on the UI.
		 * @callback cross.fnd.fiori.inbox.view.S2~extHookGetCustomFilter
		 * @param {object} filterOptions
		 * @return {void}
		 */
		if (this.extHookGetCustomFilter) {
			this.extHookGetCustomFilter(oFilterOptions);
		}

		this.getView().getModel().aTaskDefinitionIDFilterKeys = oFilterOptions.taskDefinitionFilter;
		this.getView().getModel().aSubstitutedUserFilterKeys = oFilterOptions.substitutedUserFilter;
		this.getView().getModel().aStatusFilterKeys = oFilterOptions.statusFilter;

		if (emptyFilter) {
			return oFilter;
		}

		var aFilters = [];
		if (oFilterOptions.priorityFilter.length > 1) {
			var oFullPriorityFilter = new sap.ui.model.Filter(oFilterOptions.priorityFilter, false);
			aFilters.push(oFullPriorityFilter);
		} else if (oFilterOptions.priorityFilter.length == 1) {
			aFilters.push(oFilterOptions.priorityFilter[0]);
		}

		if (oFilterOptions.dueDateFilter) {
			aFilters.push(oFilterOptions.dueDateFilter);
		}

		if (oFilterOptions.creationDateFilter) {
			aFilters.push(oFilterOptions.creationDateFilter);
		}

		if (oFilterOptions.completedDateFilter) {
			aFilters.push(oFilterOptions.completedDateFilter);
		}
		
		if (oFilterOptions.resumeDateFilter) {
			aFilters.push(oFilterOptions.resumeDateFilter);
		}

		if (oFilterOptions.additionalFilters.length > 1) {
			var oFullAdditionalFilter = new sap.ui.model.Filter(oFilterOptions.additionalFilters, true);
			aFilters.push(oFullAdditionalFilter);
		} else if (oFilterOptions.additionalFilters.length == 1) {
			aFilters.push(oFilterOptions.additionalFilters[0]);
		}

		if (aFilters.length > 1) {
			oFilter = new sap.ui.model.Filter(aFilters, true);
		} else if (aFilters.length == 1) {
			oFilter = aFilters[0];
		}

		return oFilter;
	},

	handleMetadataFailed: function(oEvent) {
		this.removeHeaderFooterOptions();
		this.oDataManager.handleMetadataFailed(oEvent);
	},

	removeHeaderFooterOptions: function() {
		this.bHideHeaderFooterOptions = true;
		this._oApplicationImplementation.oMHFHelper.defineMasterHeaderFooter(this);
	}
});