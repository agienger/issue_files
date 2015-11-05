jQuery.sap.require("cross.fnd.fiori.inbox.util.Forward");
jQuery.sap.require("cross.fnd.fiori.inbox.util.SupportInfo");
jQuery.sap.require("cross.fnd.fiori.inbox.util.Conversions");
jQuery.sap.require("cross.fnd.fiori.inbox.attachment.util.AttachmentFormatters");
jQuery.sap.require("cross.fnd.fiori.inbox.util.DataManager");
jQuery.sap.require("sap.ca.scfld.md.controller.BaseDetailController");
jQuery.sap.require("sap.ca.ui.message.message");
jQuery.sap.require("sap.ca.ui.model.type.DateTime");
jQuery.sap.require("sap.collaboration.components.fiori.sharing.Component");
jQuery.sap.require("sap.collaboration.components.fiori.sharing.dialog.Component");
jQuery.sap.require("sap.ui.commons.TextArea"); //TimeLine control uses it, but it does not load it
jQuery.sap.require("sap.suite.ui.commons.Timeline");
jQuery.sap.require("sap.suite.ui.commons.TimelineItem");
jQuery.sap.require("cross.fnd.fiori.inbox.util.Resubmit");
jQuery.sap.require("cross.fnd.fiori.inbox.util.Parser");
jQuery.sap.require("cross.fnd.fiori.inbox.util.ConfirmationDialogManager");
jQuery.sap.require("cross.fnd.fiori.inbox.util.EmployeeCard");

sap.ca.scfld.md.controller.BaseDetailController.extend("cross.fnd.fiori.inbox.view.S3", {

	//	Controller Hook method definitions 

	//	This hook method can be used to perform additional requests for example
	//	It is called in the success callback of the detail data fetch
	extHookOnDataLoaded: null,

	//	This hook method can be used to add custom related entities to the expand list of the detail data request
	//	It is called when the detail view is displayed and before the detail data fetch starts
	extHookGetEntitySetsToExpand: null,

	//	This hook method can be used to add and change buttons for the detail view footer
	//	It is called when the decision options for the detail item are fetched successfully
	extHookChangeFooterButtons: null,

	// the model of the detail view
	oModel2: null,

	// cached detailed data for selected item
	oDetailData2: null,

	oGenericComponent: null,

	oGenericAttachmentComponent: null,
	
	oConfirmationDialogManager: cross.fnd.fiori.inbox.util.ConfirmationDialogManager,

	onInit: function() {
		//execute the onInit for the base class BaseDetailController
		sap.ca.scfld.md.controller.BaseDetailController.prototype.onInit.call(this);

		//-- set the default oData Model
		var oView = this.getView();

		this.i18nBundle = oView.getModel("i18n").getResourceBundle();

		// creating a unique ID of add substitute fragment for the current instance of view
		this.sResubmitUniqueId = this.createId() + "DLG_RESUBMIT";

		sap.ca.scfld.md.app.Application.getImpl().getComponent()
			.getEventBus().subscribe("cross.fnd.fiori.inbox", "open_supportinfo", this.onSupportInfoOpenEvent, this);

		// for Handling Custom Attributes creation/removal
		this.aCA = [];
		this.aTaskDefinitionData = [];
		this.aTaskDefinitionDataObject = {};
		this.aUIExecutionLinkCatchedData = [];
		var sUrlParams = this.getView().getModel().sUrlParams;

		//if upload enabled, must set xsrf token
		//and the base64 encodingUrl service for IE9 support!

		this.oRouter.attachRouteMatched(this.handleNavToDetail, this);

		this.oHeaderFooterOptions = {};

		this.oTabBar = oView.byId("tabBar");

		var oTimeline = this.byId("timeline");
		if (oTimeline) {
			var oTimelineItemTemplate = new sap.suite.ui.commons.TimelineItem({
				icon: {
					path: "detail>ActionName",
					formatter: cross.fnd.fiori.inbox.Conversions.formatterActionIcon
				},
				userName: {
					parts: [{
						path: "detail>PerformedByName"
					}, {
						path: "detail>ActionName"
					}],
					formatter: cross.fnd.fiori.inbox.Conversions.formatterActionUsername
				},
				title: {
					path: "detail>ActionName",
					formatter: cross.fnd.fiori.inbox.Conversions.formatterActionText
				},
				dateTime: "{detail>Timestamp}"
			});
			oTimeline.bindAggregation("content", {
				path: "detail>/ProcessingLogs/results",
				template: oTimelineItemTemplate
			});
		}

		var oDataManager = sap.ca.scfld.md.app.Application.getImpl().getComponent().getDataManager();
		if (oDataManager) {
			oDataManager.detailPage = this.getView();
		}

	},

	createGenericAttachmentComponent: function(oView) {
		if (!jQuery.isEmptyObject(this.oGenericAttachmentComponent)) {
			this.oGenericAttachmentComponent.destroy();
		}
		this.oGenericAttachmentComponent = sap.ui.getCore().createComponent({
			name: "cross.fnd.fiori.inbox.attachment",
			settings: {
				attachmentHandle: this.fnCreateAttachmentHandle(this.sCtxPath)
			}
		});
		this.oGenericAttachmentComponent.uploadURL(this.fnGetUploadUrl(this.sCtxPath));
		oView.byId("attachmentComponent").setPropagateModel(true);
		oView.byId("attachmentComponent").setComponent(this.oGenericAttachmentComponent);
	},
    
    // create Comments component and attach event listeners
    createGenericCommentsComponent : function(oView) {
    	if (!jQuery.isEmptyObject(this.oGenericCommentsComponent)) {
			this.oGenericCommentsComponent.destroy();
		}
    	this.oGenericCommentsComponent = sap.ui.getCore().createComponent({
            name: "cross.fnd.fiori.inbox.comments",
            componentData: {
            	oModel : this.oModel2 // this model will contain the comments data object
            	// oContainer: oView.byId("commentsContainer") mandatory setting in case of propagate model
            }
 		});
    	this.oGenericCommentsComponent.setContainer(oView.byId("commentsContainer"));
    	oView.byId("commentsContainer").setComponent(this.oGenericCommentsComponent);
    	
    	// Subscribe to events for comment added and to show business card
    	this.oGenericCommentsComponent.getEventBus().subscribe(null, "commentAdded", jQuery.proxy(this.onCommentPost,this) );
    	this.oGenericCommentsComponent.getEventBus().subscribe(null, "businessCardRequested", jQuery.proxy(this.onEmployeeLaunchCommentSender,this) );
    },

	handleNavToDetail: function(oEvent) {
		if (oEvent.getParameter("name") === "detail") {

			var sInstanceID = oEvent.getParameter("arguments").InstanceID;
			if (sInstanceID.search(":") == (sInstanceID.length - 1)) {
				return;
			}

			// Deep link scenario: if the detail navigation happens before the S2 list was downloaded, navigate to a different URL
			// so when the list data arrives and the item gets selected the URL will change, and the navigation won't be stopped
			if (jQuery.isEmptyObject(this.getView().getModel().oData)) {
				var oParameters = {
					SAP__Origin: oEvent.getParameters().arguments.SAP__Origin,
					InstanceID: oEvent.getParameters().arguments.InstanceID + ":",
					contextPath: oEvent.getParameters().arguments.contextPath
				};
				this.oRouter.navTo("detail", oParameters, true);
				return;
			}

			//In case of a list item selection the first tab shall be selected
			//Exception: Comment is added on the comment tab - this tab must stay selected or nav to detail on phone
			if (!this.stayOnDetailScreen || sap.ui.Device.system.phone) {
				var oDescriptionTab = this.oTabBar.getItems()[0];
				this.oTabBar.setSelectedItem(oDescriptionTab);
			} else {
				this.stayOnDetailScreen = false;
			}

			var oRefreshData = {
				sCtxPath: "/" + oEvent.getParameters().arguments.contextPath,
				sInstanceID: sInstanceID,
				sSAP__Origin: oEvent.getParameter("arguments").SAP__Origin,
				bCommentCreated: false
			};
			this.refreshData(oRefreshData);
		}
	},
	fnGetUploadUrl: function(sContextPath) {
		return this.oContext.getModel().sServiceUrl + sContextPath + "/Attachments";
	},

	fnCreateAttachmentHandle: function(sContextPath) {
		var oAttachmentHandle = {
			fnOnAttachmentChange: jQuery.proxy(this.onAttachmentChange, this),
			fnOnAttachmentUploadComplete: jQuery.proxy(this.onAttachmentUploadComplete, this),
			fnOnAttachmentDeleted: jQuery.proxy(this.onAttachmentDeleted, this),
			detailModel: this.oModel2,
			uploadUrl: this.fnGetUploadUrl(this.sCtxPath)
		};
		return oAttachmentHandle;
	},

	fnRenderComponent: function(oComponentParameters) {
		if (oComponentParameters.ApplicationPath != "") //if the Component is not in the same application
			jQuery.sap.registerModulePath(oComponentParameters.ComponentName, oComponentParameters.ApplicationPath[0] == "/" ? oComponentParameters
			.ApplicationPath : "/" + oComponentParameters.ApplicationPath);

		// destroy the Component for the last task before rendering component for the current task
		if (!jQuery.isEmptyObject(this.oGenericComponent)) {
			this.oGenericComponent.destroy();
		}
		var oParameters = {
			sServiceUrl: oComponentParameters.ServiceURL,
			sAnnoFileURI: oComponentParameters.AnnotationURL,
			sErrorMessageNoData: this.i18nBundle.getText("annotationcomponent.load.error"),
			sApplicationPath: oComponentParameters.ApplicationPath
		};

		this.oGenericComponent = sap.ui.getCore().createComponent({
			name: oComponentParameters.ComponentName,
			componentData: {
				startupParameters: {
					oParameters: oParameters
				},
				inboxHandle: {
					attachmentHandle: this.fnCreateAttachmentHandle(this.sCtxPath),
					tabSelectHandle: {
						fnOnTabSelect: jQuery.proxy(this.onTabSelect, this),
					},
					inboxDetailView: this

				}
			}
		});

		var oView = this.getView();
		oView.byId("genericComponentContainer").setComponent(this.oGenericComponent);
	},

	fnParseComponentParameters: function(sRawString) {
		var oParameters = cross.fnd.fiori.inbox.util.Parser.fnParseComponentParameters(sRawString);
		if (!jQuery.isEmptyObject(oParameters)) {
			this.fnRenderComponent(oParameters);
			this.oModel2.setProperty("/showGenericComponent", true);
			this.isGenericComponentRendered = true;
			this.fnShowHideDetailScrollBar(false);
			return true;
		} else {
			this.isGenericComponentRendered = false;
			this.oModel2.setProperty("/showGenericComponent", false);

			this.fnShowHideDetailScrollBar(true);
			return false;
		}
	},

	fnShowHideDetailScrollBar: function(bShow) {
		if (bShow) {
			this.byId("mainPage").setEnableScrolling(true);
		} else {
			this.byId("mainPage").setEnableScrolling(false);
		}
	},
	
	switchToOutbox : function() {
		return this.oDataManager.bOutbox ? true : false;
	},
	
	refreshData: function(oRefreshData) {

		//clearing already present custom attributes from DOM
		this.clearCustomAttributes();

		var oView = this.getView();
		this.oContext = new sap.ui.model.Context(oView.getModel(), oRefreshData.sCtxPath);
		oView.setBindingContext(this.oContext);

		// store the context path to be used for the delayed downloads
		this.sCtxPath = oRefreshData.sCtxPath;

		var oItem = jQuery.extend(true, {}, oView.getModel().getData(this.oContext.getPath(), this.oContext));
		this.oModel2 = new sap.ui.model.json.JSONModel(oItem);
		oView.setModel(this.oModel2, "detail");

		this._updateHeaderTitle(oItem);

		if (!this.bIsControllerInited) {
			var oComponent = sap.ca.scfld.md.app.Application.getImpl().getComponent();
			this.oDataManager = oComponent.getDataManager();
			if (!this.oDataManager) {
				var oOriginalModel = this.getView().getModel();
				this.oDataManager = new cross.fnd.fiori.inbox.util.DataManager(oOriginalModel, this);
				oComponent.setDataManager(this.oDataManager);
			}
			this.oDataManager.attachItemRemoved(jQuery.proxy(this._handleItemRemoved, this));
			this.bIsControllerInited = true;
		}

		/*
		 * Manual detail request via DataManager in batch with decision options together
		 * Automatic request with view binding would cause a S2 list re-rendering - SAPUI5 issue
		 */
		var that = this;
		var fnSuccess = function(oDetailData, aDecisionOptions) {

			/**
			 * @ControllerHook Provide custom logic after the item detail data received
			 * This hook method can be used to perform additional requests for example
			 * It is called in the success callback of the detail data fetch
			 * @callback cross.fnd.fiori.inbox.view.S3~extHookOnDataLoaded
			 * @param {object} oDetailData - contains the item detail data
			 * @return {void}
			 */

			if (that.extHookOnDataLoaded) {
				that.extHookOnDataLoaded(oDetailData);
			}

			that.oModel2.setData(oDetailData, true);

			//save detail data (used to fix the flickering of ProcessingLogs tab after detail screen refresh)
			that.oDetailData2 = oDetailData;
			that.createDecisionButtons(aDecisionOptions, oRefreshData.sSAP__Origin);
			that.addShareOnJamAndEmail();
			
			var sSelectedTabKey = that.byId("tabBar").getSelectedKey();
			if(sSelectedTabKey === "NOTES") {
				that.fnSetIconForCommentsFeedInput();
				if (that.oModel2.getData().HasComments) {
					that.fnReadCommentsAndCreatedByDetails();
				}
			}else if(sSelectedTabKey === "ATTACHMENTS" && that.oDetailData2.HasAttachments ) {
            	that.fnFetchAttachments();
            }else if(sSelectedTabKey === "PROCESSINGLOGS") {
            	that.fnFetchProcessingLogs();
            }else if(sSelectedTabKey === "OBJECTLINKS") {
            	that.fnFetchObjectLinks();
            }else if(sSelectedTabKey === "DESCRIPTION" ){
            	that.byId("DescriptionContent").rerender();
            }           
            
            if(oDetailData.CustomAttributeData.results.length>0)
            	that.oModel2.setProperty("/CustomAttributeData", oDetailData.CustomAttributeData.results );
            
            if(that.aCA.length === 0 && 
            	that.oModel2.getData().CustomAttributeData && 
            		that.oModel2.getData().CustomAttributeData.length>0 && 
            			that.aTaskDefinitionDataObject[ oDetailData.TaskDefinitionID + "_Exists" ] && 
            				that.aTaskDefinitionDataObject[ oDetailData.TaskDefinitionID + "_Exists" ]  === "true" ){
    			jQuery.proxy(that._createCustomAttributesElements(that.oModel2.getData()),that);
    		}

		};

		// At the start of each fetch:
		// - Initialize tabbar to show only description tab.
		// - Clear footer.
		if (this.oHeaderFooterOptions) {

			this.oHeaderFooterOptions = jQuery.extend(this.oHeaderFooterOptions, {
				oPositiveAction: null,
				oNegativeAction: null,
				buttonList: [],
				oJamOptions: null
			});

			this.refreshHeaderFooterOptions();
		}

		var aExpandEntitySets = ["Description", "CustomAttributeData"];

		/**
		 * @ControllerHook Add additional entities related to the work item
		 * This hook method can be used to add custom related entities to the expand list of the detail data request
		 * It is called when the detail view is displayed and before the detail data fetch starts
		 * @callback cross.fnd.fiori.inbox.view.S3~extHookGetEntitySetsToExpand
		 * @return {array} aEntitySets - contains the names of the related entities
		 */
		if (this.extHookGetEntitySetsToExpand) {
			var aEntitySets = this.extHookGetEntitySetsToExpand();
			// append custom entity sets to the default list
			aExpandEntitySets.push.apply(aExpandEntitySets, aEntitySets);
		}
		
		if(this.oModel2!=null) {
			this.fnClearCachedData();
		}
		
		var sKey = oRefreshData.sSAP__Origin + oRefreshData.sInstanceID;
		
		if (!this.aUIExecutionLinkCatchedData[sKey]){ // if UIExecutionLink is not cached, fetch it, cache it, then fetch task's data
			this.oDataManager.fetchUIExecutionLink(this.sCtxPath, jQuery.proxy(function(UIExecutionLinkData){
				this.aUIExecutionLinkCatchedData[sKey] = UIExecutionLinkData;
				this.fnGetDetailsForSelectedTask(UIExecutionLinkData, oRefreshData, fnSuccess);
			},this));
		} else { // if UIExecutionLink cached, pick from cache and fetch task's data
			this.fnGetDetailsForSelectedTask(this.aUIExecutionLinkCatchedData[sKey], oRefreshData, fnSuccess);
		}
		
	},
	
	// Fetches task details like Description, CustomAttributeData, Tab Counts based on whether the task is annotation based
	fnGetDetailsForSelectedTask : function(UIExecutionLinkData, oRefreshData, fnSuccess){
		var that = this;
		var aExpandEntitySets = ["Description", "CustomAttributeData"];
			if(!UIExecutionLinkData.GUI_Link){
				UIExecutionLinkData.GUI_Link="";
			}
			var bIsAnnotationBasedTask = that.fnParseComponentParameters(UIExecutionLinkData.GUI_Link); // checks if the selected task is annotation based task, also renders annotation component if needed
			if (!that.isGenericComponentRendered) {
				if (that.getView().byId("attachmentComponent")){
					that.createGenericAttachmentComponent(this.getView());
				}
				
				if(that.getView().byId("commentsContainer")){
					that.createGenericCommentsComponent(this.getView());
				}
				
			}
			if(!bIsAnnotationBasedTask){ // if not annotation based task, fetch task details, Description, Custom Attribute data, all tab counts if applicable and Decision Options
				
				var oItemData = that.oModel2.getData();
				
				// update count for each icon tab bars
				if (oItemData.TaskSupports.Attachments ) {
					that.fnCountUpdater("Attachments", oItemData.SAP__Origin, oItemData.InstanceID );
				}
				if (oItemData.TaskSupports.Comments) {
					this.fnCountUpdater("Comments", oItemData.SAP__Origin, oItemData.InstanceID );
				}
				if (oItemData.TaskSupports.ProcessingLogs ) {
					that.fnCountUpdater("ProcessingLogs", oItemData.SAP__Origin, oItemData.InstanceID );
				}
				if (oItemData.TaskSupports.TaskObject && that.oDataManager.bShowTaskObjects ) {
					that.fnCountUpdater("ObjectLinks", oItemData.SAP__Origin, oItemData.InstanceID );
				}
				
				// send a request to fetch custom attribute definition data for the selected task
				that.fnHandleCustomAttributeCreation(that.getView(),oItemData);
				
				that.oDataManager.readDataOnTaskSelectionWithDecisionOptions(oRefreshData.sCtxPath, aExpandEntitySets, oRefreshData.sSAP__Origin, oRefreshData.sInstanceID, 
					function(oDetailData, oDecisionOptions){
						oDetailData.UIExecutionLink = UIExecutionLinkData;
						fnSuccess.call(that,oDetailData, oDecisionOptions);
					}
				);
			}
			else{ // if annotation based task, fetch task details, update counts for attachment component and comments component if implemented and fetch decision options
					that.oDataManager.readDataOnTaskSelectionWithDecisionOptions(oRefreshData.sCtxPath, [], oRefreshData.sSAP__Origin, oRefreshData.sInstanceID, 
							function(oDetailData, oDecisionOptions){
								oDetailData.UIExecutionLink = UIExecutionLinkData;
								if (that.byId("attachmentComponent") && that.oModel2.getData().TaskSupports.Attachments) {
									that.fnCountUpdater("Attachments", that.oModel2.getData().SAP__Origin, that.oModel2.getData().InstanceID);
								}
								if(that.byId("commentsContainer")){
									that.fnCountUpdater("Comments", that.oModel2.getData().SAP__Origin, that.oModel2.getData().InstanceID);
								}
								that.oModel2.setData(oDetailData, true);
								//save detail data (used to fix the flickering of ProcessingLogs tab after detail screen refresh)
								that.oDetailData2 = oDetailData;
								that.createDecisionButtons(oDecisionOptions, oRefreshData.sSAP__Origin);
								that.addShareOnJamAndEmail();
							}
					);
			}
		
	},

    // fetch custom attribute's definition data for the selected task
    fnHandleCustomAttributeCreation : function( oView, oDetailData ){
    	this.clearCustomAttributes();	//clearing already present custom attributes from DOM
    	var that = this;
    	
    	//callback after a successful call is made to get CustomAttributeData definitions
    	var fnSuccessCustomAttribute = function( oData, bCachedData ){
    		if( bCachedData != true ) {	// if data is not fetched from Cache, put it in cache
    			that.aTaskDefinitionData.push( oData );
    			for( var i=0; i<oData.CustomAttributeDefinitionData.results.length; i++ ) {
    				that.aTaskDefinitionDataObject[ oDetailData.TaskDefinitionID + "_" + oData.CustomAttributeDefinitionData.results[i].Name ] = oData.CustomAttributeDefinitionData.results[i];
    			}
    			that.aTaskDefinitionDataObject[ oDetailData.TaskDefinitionID + "_Exists" ]  = "true"; // extra value in cache to check if definition Id for a task exists in cache
    			
    		}
    		if(that.aCA.length === 0 && that.oModel2.getData().CustomAttributeData && that.oModel2.getData().CustomAttributeData.length>0){
    			jQuery.proxy(that._createCustomAttributesElements(that.oModel2.getData()),that);
    		}
    		
        };
    	
    	var oComponent = sap.ca.scfld.md.app.Application.getImpl().getComponent();
    	this.oDataManager = oComponent.getDataManager();
    	var bCached = false;
    	var iCachedElement;
    	for( var i=0; i < that.aTaskDefinitionData.length; i++ ){
    		if( that.aTaskDefinitionDataObject[ oDetailData.TaskDefinitionID + "_Exists" ] == "true"  ){
    			bCached = true;
    			iCachedElement = i; // get position of required element in cached object
    			break;
    		}
    	}
    	if( bCached ) { // if data for selected task definition id is cached, take cached data from aTaskDefinitionData
    		fnSuccessCustomAttribute( "" , true );
    	} else { // else fetch new data
    		this.oDataManager.readCustomAttributeDefinitionData( oDetailData.SAP__Origin, oDetailData.TaskDefinitionID, fnSuccessCustomAttribute );
    	}
    },
    
    clearCustomAttributes : function(){
    	if( this.aCA.length>0 ){
    		for( var i=0; i<this.aCA.length; i++ )
    		this.aCA[i].destroy();
    		this.aCA = [];
    		
    	}
    },
    onAttachmentChange : function(e){
		
    	var oUploadCollection = e.getSource();
		var sFileName = e.getParameters().getParameters().files[0].name;
		if (oUploadCollection.getHeaderParameters())
			oUploadCollection.destroyHeaderParameters();
		//remove extension
		var iLastDot = sFileName.lastIndexOf(".");
		if (iLastDot != -1) {
			sFileName = sFileName.substr(0, iLastDot);
		}

		oUploadCollection.addHeaderParameter(new sap.m.UploadCollectionParameter({
			name: "x-csrf-token",
			value: this.getXsrfToken()
		}));
		oUploadCollection.addHeaderParameter(new sap.m.UploadCollectionParameter({
			name: "slug",
			value: sFileName
		}));
		oUploadCollection.addParameter(new sap.m.UploadCollectionParameter({
			name: "x-csrf-token",
			value: this.getXsrfToken()
		}));
		oUploadCollection.addParameter(new sap.m.UploadCollectionParameter({
			name: "slug",
			value: sFileName
		}));

	},

	onAttachmentUploadComplete: function(e) {
		var oItem = this.oModel2.getData();
		var that = this;
		that.oEventSource = e.getSource();
		var fnClose = function() {
			this.oEventSource.updateAggregation("items");
			this.oEventSource.rerender();
		};
		if (e.getParameters().getParameters().status == 201) {

			/* fetch attachments again.
			 * TODO Can we read the response and add the created entry to JSON model ?
			 */
			this.fnFetchAttachments();

			sap.ca.ui.message.showMessageToast(this.i18nBundle.getText("dialog.success.attachmentUpload"));

			// refresh task details
			this.oDataManager.updateTaskAfterAddAction(oItem, "Attachments", jQuery.proxy(function(oData) {
				this._updateTaskAfterAddAction(oItem, oData, "/AttachmentsCount", "HasAttachments");
			}, this));

		} else {
			var sErrorText = this.i18nBundle.getText("dialog.error.attachmentUpload");
			sap.ca.ui.message.showMessageBox({
				type: sap.ca.ui.message.Type.ERROR,
				message: sErrorText,
				details: ""
			}, jQuery.proxy(fnClose, that));
		}
	},

	onAttachmentDeleted: function(e) {
		this.stayOnDetailScreen = true;
		var sAttachmentId = e.getParameters().documentId;
		var oItem = this.oModel2.getData();
		this.oDataManager.deleteAttachment(oItem.SAP__Origin, oItem.InstanceID, sAttachmentId,
			$.proxy(function() {
				sap.ca.ui.message.showMessageToast(this.i18nBundle.getText("dialog.success.attachmentDeleted"));
			}, this),
			$.proxy(function(oError) {
				var sErrorText = this.i18nBundle.getText("dialog.error.attachmentDelete");
				sap.ca.ui.message.showMessageBox({
					type: sap.ca.ui.message.Type.ERROR,
					message: sErrorText,
					details: ""
				}, $.proxy(function() {
					this.oDataManager.processListAfterAction(oItem.SAP__Origin, oItem.InstanceID);
				}, this));
			}, this)
		);

	},

	getXsrfToken: function() {
		var sToken = this.getView().getModel().getHeaders()['x-csrf-token'];
		if (!sToken) {

			this.getView().getModel().refreshSecurityToken(
				function(e, o) {
					sToken = o.headers['x-csrf-token'];
				},
				function() {
					sap.ca.ui.message.showMessageBox({
						type: sap.ca.ui.message.Type.ERROR,
						message: 'Could not get XSRF token',
						details: ''
					});
				},
				false);
		}
		return sToken;
	},

	onFileUploadFailed: function(e) {
		var sErrorText = this.i18nBundle.getText("dialog.error.attachmentUpload");
		sap.ca.ui.message.showMessageBox({
			type: sap.ca.ui.message.Type.ERROR,
			message: sErrorText,
			details: e.getParameters().exception
		});
	},

	addShareOnJamAndEmail: function() {
		
		if (this.oDataManager.bOutbox === true){
			return;
		}

		var oJamOptions = {
			oShareSettings: {
				object: {
					id: window.location.href,
					share: this.getJamDescription()
				}
			},
		};

		var oEmailSettings = {
			sSubject: this.getMailSubject(),
			fGetMailBody: jQuery.proxy(this.getMailBody, this)
		};

		var oButtonList = {};

		oButtonList.oEmailSettings = oEmailSettings;
		oButtonList.oJamOptions = oJamOptions;

		/**
		 * @ControllerHook Modify the footer buttons
		 * This hook method can be used to add and change buttons for the detail view footer
		 * It is called when the decision options for the detail item are fetched successfully
		 * @callback cross.fnd.fiori.inbox.view.S3~extHookChangeFooterButtons
		 * @param {object} oButtonList - contains the positive, negative buttons and the additional button list.
		 * @return {void}
		 */
		if (this.extHookChangeFooterButtons) {
			this.extHookChangeFooterButtons(oButtonList);

			oEmailSettings = oButtonList.oEmailSettings;
			oJamOptions = oButtonList.oJamOptions;
		}

		this.oHeaderFooterOptions = jQuery.extend(this.oHeaderFooterOptions, {
			oJamOptions: oJamOptions,
			oEmailSettings: oEmailSettings
		});

		this.refreshHeaderFooterOptions();
	},

	_getDescriptionForShare: function(sDescriptionText) {
		var oData = this.oModel2.getData();
		var sBody = "\n\n" + this.i18nBundle.getText("share.email.body.detailsOfTheItem") + "\n\n";
		var oDateFormatter = sap.ui.core.format.DateFormat.getDateInstance();
		if (oData.TaskTitle != "") {
			sBody += this.i18nBundle.getText("item.taskTitle", oData.TaskTitle) + "\n";
		}
		if (oData.Priority != "") {
			sBody += this.i18nBundle.getText("item.priority", cross.fnd.fiori.inbox.Conversions.formatterPriority.call(this.getView(), oData.SAP__Origin,
				oData.Priority)) + "\n";
		}
		if (oData.CompletionDeadLine) {
			sBody += this.i18nBundle.getText("item.dueDate", oDateFormatter.format(oData.CompletionDeadLine, true)) + "\n";
		}
		if (sDescriptionText) {
			// use override text if given
			sBody += this.i18nBundle.getText("item.description", sDescriptionText) + "\n";
		} else if ((oData.Description) && (oData.Description.Description) && (oData.Description.Description != "")) {
			sBody += this.i18nBundle.getText("item.description", this._getTrimmedString(oData.Description.Description)) + "\n";
		}
		var sCreator = oData.CreatedByName;
		if (sCreator == "") {
			sCreator = oData.CreatedBy;
		}
		if (sCreator != "") {
			sBody += this.i18nBundle.getText("item.createdBy", sCreator) + "\n";
		}
		if (oData.CreatedOn) {
			sBody += this.i18nBundle.getText("item.createdOn", oDateFormatter.format(oData.CreatedOn, true)) + "\n";
		}
		if (oData.CompletedOn) {
			sBody += this.i18nBundle.getText("item.completedOn", oDateFormatter.format(oData.CompletedOn, true)) + "\n";
		}

		return sBody;
	},

	_getDescriptionForShareInMail: function(sDescriptionText) {
		var sBody = this._getDescriptionForShare(sDescriptionText);
		sBody += this.i18nBundle.getText("share.email.body.link", window.location.href.split("(").join("%28").split(")").join("%29")) + "\n";

		return sBody;
	},

	getJamDescription: function() {
		var sBody = this._getDescriptionForShare();

		return sBody;
	},

	getMailSubject: function() {
		var oData = this.oModel2.getData();
		var sPriority = cross.fnd.fiori.inbox.Conversions.formatterPriority.call(this.getView(), oData.SAP__Origin, oData.Priority);
		var sCreatedBy = oData.CreatedByName;
		var sTaskTitle = oData.TaskTitle;

		return cross.fnd.fiori.inbox.Conversions.formatterMailSubject.call(this, sPriority, sCreatedBy, sTaskTitle);
	},

	getMailBody: function() {

		// Internet Explorer supports only shorter mailto urls, we pass only the items url this case
		if (jQuery.browser.msie) {
			return window.location.href.split("(").join("%28").split(")").join("%29");
		}

		var sFullMailBody = this._getDescriptionForShareInMail();
		var sMailSubject = this.getMailSubject();
		// due to a limitation in most browsers, don't let the mail link longer than 2000 chars
		var sFullMailUrl = sap.m.URLHelper.normalizeEmail(null, sMailSubject, sFullMailBody);
		if (sFullMailUrl.length > 2000) {
			// mail url too long, we need to reduce the description field's size
			var oData = this.oModel2.getData();
			var sMinimalMailBody = this._getDescriptionForShareInMail(" ");
			var sMinimalMailUrl = sap.m.URLHelper.normalizeEmail(null, sMailSubject, sMinimalMailBody);
			var iMaxDescriptionLength = 2000 - sMinimalMailUrl.length;
			var sDescription = "";
			if (oData.Description && oData.Description.Description) {
				sDescription = window.encodeURIComponent(this._getTrimmedString(oData.Description.Description));
			}
			sDescription = sDescription.substring(0, iMaxDescriptionLength);

			// if we cut encoded chars in half the decoding won't work (encoded chars can have length of 9)
			// remove the encoded part from the end
			var bDecodeSucceeded = false;
			while (!bDecodeSucceeded || sDescription.length == 0) {
				bDecodeSucceeded = true;
				try {
					sDescription = window.decodeURIComponent(sDescription);
				} catch (oError) {
					sDescription = sDescription.substring(0, sDescription.length - 1);
					bDecodeSucceeded = false;
				}
			}
			sDescription = sDescription.substring(0, sDescription.length - 3) + "...";

			var sTruncatedMailBody = this._getDescriptionForShareInMail(sDescription);
			return sTruncatedMailBody;
		}

		return sFullMailBody;
	},
	
	_getTrimmedString: function(sText) {
		// removes spaces in the beginning and at the end. Also removes new line characters, extra spaces and tabs in the description string.
		return sText.replace(/\s+/g, " ").trim();
	},

	_handleItemRemoved: function(oEvent) {

		//Successful request processing - navigate back to list on phone
		if (sap.ui.Device.system.phone && !this.getView().getParent().getParent().isMasterShown()) {

			if (!this.stayOnDetailScreen) {
				this.oRouter.navTo("master", {}, sap.ui.Device.system.phone);
				// after overwriting the history state that points to the
				// item which is not available any more, we can step back because
				// the previos history state is also the master list
				window.history.back();
			} else {
				var oRefreshData = {
					sCtxPath: this.getView().getBindingContext().getPath(),
					sInstanceID: this.oModel2.getData().InstanceID,
					sSAP__Origin: this.oModel2.getData().SAP__Origin,
					bCommentCreated: true
				};
				this.refreshData(oRefreshData);
				this.stayOnDetailScreen = false;
			}

		}
	},

	_updateHeaderTitle: function(oData) {
		//-- update header
		if (oData) {
			this.oHeaderFooterOptions = jQuery.extend(this.oHeaderFooterOptions, {
				sDetailTitle: oData.TaskTitle
			});

			this.refreshHeaderFooterOptions();
		}
	},

	_isTaskConfirmable: function(oItem) {
		//    	if (oItem.TaskSupports.Confirm)
		if (oItem.Status == 'EXECUTED') {
			return true;
		} else {
			return false;
		}
	},

	createDecisionButtons: function(aDecisionOptions, sOrigin) {
		var oPositiveAction = null;
		var oNegativeAction = null;
		var aButtonList = [];

		var that = this;

		var oItem = this.oModel2.getData();
		
		if (!this.switchToOutbox()) {
			if (!this._isTaskConfirmable(oItem)) {
				for (var i = 0; i < aDecisionOptions.length; i++) {
					var oDecisionOption = aDecisionOptions[i];
					oDecisionOption.SAP__Origin = sOrigin;
					if (oDecisionOption.Nature === "POSITIVE") {
						oPositiveAction = {
							sBtnTxt: oDecisionOption.DecisionText,
							onBtnPressed: (function(oDecision) {
								return function() {
									that.showDecisionDialog(that.oDataManager.FUNCTION_IMPORT_DECISION, oDecision, true);
								};
							})(oDecisionOption)
						};
					} else if (oDecisionOption.Nature === "NEGATIVE") {
						oNegativeAction = {
							sBtnTxt: oDecisionOption.DecisionText,
							onBtnPressed: (function(oDecision) {
								return function() {
									that.showDecisionDialog(that.oDataManager.FUNCTION_IMPORT_DECISION, oDecision, true);
								};
							})(oDecisionOption)
						};
					} else {
						aButtonList.push({
							sBtnTxt: oDecisionOption.DecisionText,
							onBtnPressed: (function(oDecision) {
								return function() {
									that.showDecisionDialog(that.oDataManager.FUNCTION_IMPORT_DECISION, oDecision, true);
								};
							})(oDecisionOption)
						});
					}
				}
			}
			
			// add the confirm button
			if (this._isTaskConfirmable(oItem)) {
				// add the claim button to the end
				oPositiveAction = {
					sI18nBtnTxt: "XBUT_CONFIRM",
					onBtnPressed: (function(oDecision) {
						return function() {
							that.showConfirmationDialog(that.oDataManager.FUNCTION_IMPORT_CONFIRM, oItem);
						};
					})(oItem)
				};
			}

			// add the claim button
			if (oItem.SupportsClaim) {
				// add the claim button to the end
				aButtonList.push({
					sI18nBtnTxt: "XBUT_CLAIM",
					onBtnPressed: function(oEvent) {
						if (sap.ui.Device.system.phone) {
							that.stayOnDetailScreen = true;
						}
						that.sendAction("Claim", oItem, null);
					}
				});
			}

			// add the release button
			if (oItem.SupportsRelease) {
				// add the release button to the end
				aButtonList.push({
					sI18nBtnTxt: "XBUT_RELEASE",
					onBtnPressed: function(oEvent) {
						if (sap.ui.Device.system.phone) {
							that.stayOnDetailScreen = true;
						}
						that.sendAction("Release", oItem, null);
					}
				});
			}

			// add the forward button 
			if (oItem.SupportsForward) {
				aButtonList.push({
					sI18nBtnTxt: "XBUT_FORWARD",
					onBtnPressed: jQuery.proxy(this.onForwardPopUp, this)
				});
			}

			// add the resubmit button 
			if (oItem.TaskSupports) { // If task does not support TaskSupports
				if (oItem.TaskSupports.Resubmit) {
					aButtonList.push({
						sI18nBtnTxt: "XBUT_RESUBMIT",
						onBtnPressed: jQuery.proxy(this.showResubmitPopUp, this)
					});
				}

			}

			//add the open task button to the end
			if (sap.ui.Device.system.desktop && oItem.UIExecutionLink && oItem.UIExecutionLink.GUI_Link !== "" && !that.isGenericComponentRendered) {
				aButtonList.push({
					sI18nBtnTxt: "XBUT_OPEN",
					onBtnPressed: function(oEvent) {
						that.checkStatusAndOpenTaskUI();
					}
				});
			}
		}
		
		//add the resume button if the task is suspended
		if (this.switchToOutbox() && oItem.TaskSupports.CancelResubmission ) {
			aButtonList.push({
				sI18nBtnTxt: "XBUT_RESUME",
				onBtnPressed: function(oEvent) {
					that.sendAction("CancelResubmission", oItem, null);
				}
			});
		}

		var oButtonList = {};
		oButtonList.oPositiveAction = oPositiveAction;
		oButtonList.oNegativeAction = oNegativeAction;
		oButtonList.aButtonList = aButtonList;

		/**
		 * @ControllerHook Modify the footer buttons
		 * This hook method can be used to add and change buttons for the detail view footer
		 * It is called when the decision options for the detail item are fetched successfully
		 * @callback cross.fnd.fiori.inbox.view.S3~extHookChangeFooterButtons
		 * @param {object} oButtonList - contains the positive, negative buttons and the additional button list.
		 * @return {void}
		 */
		if (this.extHookChangeFooterButtons) {
			this.extHookChangeFooterButtons(oButtonList);

			oPositiveAction = oButtonList.oPositiveAction;
			oNegativeAction = oButtonList.oNegativeAction;
			aButtonList = oButtonList.aButtonList;
		}

		this.oHeaderFooterOptions = jQuery.extend(this.oHeaderFooterOptions, {
			oPositiveAction: oPositiveAction,
			oNegativeAction: oNegativeAction,
			buttonList: aButtonList,
			// remove bookmark button
			bSuppressBookmarkButton: true
		});

		this.refreshHeaderFooterOptions();
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
			var oItem = this.oModel2.getData();
			var sOrigin = oItem.SAP__Origin;
			var sInstanceID = oItem.InstanceID;

			this.oDataManager.doForward(sOrigin, sInstanceID,
				oResult.oAgentToBeForwarded.UniqueName, oResult.sNote, jQuery.proxy(function() {
					sap.ca.ui.message.showMessageToast(this.i18nBundle.getText("dialog.success.forward", oResult.oAgentToBeForwarded.DisplayName));
				}, this));
		}
	},

	onForwardPopUp: function() {
		var oItem = this.oModel2.getData();
		var sOrigin = oItem.SAP__Origin;
		var sInstanceID = oItem.InstanceID;

		cross.fnd.fiori.inbox.util.Forward.open(
			jQuery.proxy(this.startForwardFilter, this),
			jQuery.proxy(this.closeForwardPopUp, this)
		);
		
		var bHasPotentialOwners = cross.fnd.fiori.inbox.Conversions.formatterTaskSupportsValue(oItem.TaskSupports.PotentialOwners, oItem.HasPotentialOwners);
		if (bHasPotentialOwners) {
			this.oDataManager.readPotentialOwners(sOrigin, sInstanceID,
					jQuery.proxy(this._PotentialOwnersSuccess, this));
		} else {
			this._PotentialOwnersSuccess({results: []});
		}

	},

	_PotentialOwnersSuccess: function(oResult) {
		cross.fnd.fiori.inbox.util.Forward.setAgents(oResult.results);
		cross.fnd.fiori.inbox.util.Forward.setOrigin(this.oModel2.getData().SAP__Origin);
	},

	showResubmitPopUp: function() {
		cross.fnd.fiori.inbox.util.Resubmit.open(
			this.sResubmitUniqueId,
			this,
			this.getView()
		);
	},

	handleResubmitPopOverOk: function(oEvent) {
		var oItem = this.oModel2.getData();
		var sOrigin = oItem.SAP__Origin;
		var sInstanceID = oItem.InstanceID;
		var oCalendar = sap.ui.core.Fragment.byId(this.sResubmitUniqueId, "DATE_RESUBMIT");
		var aSelectedDates = oCalendar.getSelectedDates();
		if (aSelectedDates.length > 0) {
			var oDate = aSelectedDates[0].getStartDate();
			var oFormat = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "YYYY-MM-ddTHH:mm:ss"
			});
			this.oDataManager.doResubmit(sOrigin, sInstanceID, "datetime'" + oFormat.format(oDate) + "'", jQuery.proxy(function() {
				sap.ca.ui.message.showMessageToast(this.i18nBundle.getText("dialog.success.resubmit"));
			}, this));
			cross.fnd.fiori.inbox.util.Resubmit.close();
		}
	},

	onEmployeeLaunchTask: function(oEvent) {
		var oItem = this.oModel2.getData();
		var sOrigin = oItem.SAP__Origin;
		var sCreatedBy = oItem.CreatedBy;

		// get control that triggers the BusinessCard
		var oSelectedControl = cross.fnd.fiori.inbox.Conversions.getSelectedControl(oEvent);

		this.oDataManager.readUserInfo(sOrigin, sCreatedBy,
			jQuery.proxy(cross.fnd.fiori.inbox.util.EmployeeCard.displayEmployeeCard, this, oSelectedControl));
	},

	onEmployeeLaunchCommentSender: function(sChannel, sEventName, oEvent) {
		// Business card on Notes
		var oItem = this.oModel2.getData();
		var sOrigin = oItem.SAP__Origin;
		var sCreatedBy = oEvent.getSource().getBindingContext("detail").getProperty("CreatedBy");

		// get control that triggers the BusinessCard
		var oSelectedControl = cross.fnd.fiori.inbox.Conversions.getSelectedControl(oEvent);

		this.oDataManager.readUserInfo(sOrigin, sCreatedBy,
			jQuery.proxy(cross.fnd.fiori.inbox.util.EmployeeCard.displayEmployeeCard, this, oSelectedControl));

	},

	onEmployeeLaunchCommentIcon: function(oEvent) {
		// Business card on Notes
		var sOrigin = oEvent.getSource().getBindingContext().getProperty("SAP__Origin");
		var sCreatedBy = oEvent.getSource().getBindingContext("detail").getModel().getProperty(oEvent.getSource().getBindingContext("detail").getPath())
			.CreatedBy;

		if (!sOrigin) {
			//Deep link scenario
			var oItem = this.oModel2.getData();
			sOrigin = oItem.SAP__Origin;
		}

		// get control that triggers the BusinessCard
		var oSelectedControl = cross.fnd.fiori.inbox.Conversions.getSelectedControl(oEvent);

		this.oDataManager.readUserInfo(sOrigin, sCreatedBy,
			jQuery.proxy(cross.fnd.fiori.inbox.util.EmployeeCard.displayEmployeeCard, this, oSelectedControl));

	},

	onAttachmentShow: function(oEvent) {
		var oContext = oEvent.getSource().getBindingContext("detail");
		var sMediaSrc = cross.fnd.fiori.inbox.attachment.getRelativeMediaSrc(oContext.getProperty().__metadata.media_src);
		sap.m.URLHelper.redirect(sMediaSrc, true);
	},

	showDecisionDialog: function(sFunctionImportName, oDecision, bShowNote) {
		this.oConfirmationDialogManager.showDecisionDialog({
			question: this.i18nBundle.getText("XMSG_DECISION_QUESTION", oDecision.DecisionText),
			showNote: bShowNote,
			title: this.i18nBundle.getText("XTIT_SUBMIT_DECISION"),
			confirmButtonLabel: this.i18nBundle.getText("XBUT_SUBMIT"),
			noteMandatory: oDecision.CommentMandatory,
			confirmActionHandler: jQuery.proxy(function(oDecision, sNote) {
					this.sendAction(sFunctionImportName, oDecision, sNote);
			},
			this, oDecision)
			});
	},

	showConfirmationDialog: function(sFunctionImportName, oItem) {
		this.oConfirmationDialogManager.showDecisionDialog({
			question: this.i18nBundle.getText("XMSG_CONFIRM_QUESTION"),
			showNote: false,
			title: this.i18nBundle.getText("XTIT_SUBMIT_CONFIRM"),
			confirmButtonLabel: this.i18nBundle.getText("XBUT_CONFIRM"),
			confirmActionHandler: jQuery.proxy(function(oItem, sNote) {
					this.sendAction(sFunctionImportName, oItem, sNote);
			},
			this, oItem)
			});
	}, 

	// executed when the event CommentAdded is fired from the Comment Component
	onCommentPost : function(sChannel, sEventName, oEvent){
		var sComment = oEvent.getParameter("value");
		if (sComment && sComment.length > 0) {
			this.sendAction('AddComment', null, sComment);
		}
	},

	sendAction: function(sFunctionImportName, oDecision, sNote) {
		var that = this;
		var sSuccessMessage;
		var fnAfterSendActionFailed = function() {
			that.oDataManager.processListAfterAction(oDecision.SAP__Origin, oDecision.InstanceID);
		};

		switch (sFunctionImportName) {
			case "Release":
				sSuccessMessage = "dialog.success.release";
				break;
			case "Claim":
				sSuccessMessage = "dialog.success.reserve";
				break;
			case "AddComment":
				sSuccessMessage = "dialog.success.addComment";
				break;
			case "Confirm":
				sSuccessMessage = "dialog.success.completed";
				break;
			case "CancelResubmission":
				sSuccessMessage = "dialog.success.cancelResubmission";
				break;
			default:
				sSuccessMessage = "dialog.success.complete";
		}

		switch (sFunctionImportName) {
			case 'AddComment':
				{
					var oItem = this.oModel2.getData();
					this.oDataManager.addComment(oItem.SAP__Origin, oItem.InstanceID, sNote, jQuery.proxy(function(data, response) {

						/* fetch comments again on success
						 * Logic can be enhanced in future.
						 */
						this.fnReadCommentsAndCreatedByDetails();

						jQuery.sap.delayedCall(500, this, function() {
							sap.ca.ui.message.showMessageToast(this.i18nBundle.getText(sSuccessMessage));
						});

						// refresh task details
						this.oDataManager.updateTaskAfterAddAction(oItem, "Comments", jQuery.proxy(function(oData) {
							this._updateTaskAfterAddAction(oItem, oData, "/CommentsCount", "HasComments");
						}, this));

				}, this), null, this.oGenericCommentsComponent);

					break;
				}
			default:
				{
					this.oDataManager.sendAction(sFunctionImportName, oDecision, sNote,
						jQuery.proxy(function(oData) {
							// item is removed from S2 list in the data manager
							jQuery.sap.delayedCall(500, this, function() {
								sap.ca.ui.message.showMessageToast(this.i18nBundle.getText(sSuccessMessage));
							});
						}, this, oDecision),

						jQuery.proxy(function() {
							this.oDataManager.processListAfterAction(oDecision.SAP__Origin, oDecision.InstanceID);
						}, this)
					);
				}
		}
	},

	refreshHeaderFooterOptions: function() {
		this._oHeaderFooterOptions = jQuery.extend(this._oHeaderFooterOptions, this.oHeaderFooterOptions);
		this.setHeaderFooterOptions(this._oHeaderFooterOptions);
	},

	checkStatusAndOpenTaskUI: function() {
		var oTaskData = this.oModel2.getData();
		this.oDataManager.checkStatusAndOpenTask(oTaskData.SAP__Origin, oTaskData.InstanceID, jQuery.proxy(this.openTaskUIWindow, this));
	},

	openTaskUIWindow: function() {
		var sAppliedTheme = sap.ui.getCore().getConfiguration().getTheme();
		var cssURL = "";
		var rStandardThemePattern = /^sap_hcb/i;

		var mTaskAppThemesMap = {
			sap_hcb: {
				WDJ: "/com.sap.ui.lightspeed/themes/sap_hcb",
				WDA: "sap_hcb"
			}
		};

		if (rStandardThemePattern.test(sAppliedTheme)) {
			cssURL += "&sap-ui-theme=" + jQuery.sap.encodeURL(sAppliedTheme);
			var oTaskAppThemeMap = mTaskAppThemesMap[sAppliedTheme];
			if (oTaskAppThemeMap) {
				cssURL += oTaskAppThemeMap['WDJ'] ? "&sap-cssurl=" + location.protocol + "//" + location.host + ":" + location.port + oTaskAppThemeMap[
					'WDJ'] : "";
				cssURL += oTaskAppThemeMap['WDA'] ? "&sap-theme=" + jQuery.sap.encodeURL(oTaskAppThemeMap['WDA']) : "";
			}
		} else {
			cssURL += "&sap-ui-theme=" + jQuery.sap.encodeURL(sAppliedTheme);
		}

		var sURL = this.oModel2.getData().UIExecutionLink.GUI_Link + cssURL;
		this.fnValidateOpenTaskURLAndRedirect(sURL);
	},
	
	/* validate the URL.
		 * If validation fails, try to encode URL parameters and then validate again.
		   If still fails, encode the path and URL parameters both
		 * If validation fails again, show an error message.
		 * */
	fnValidateOpenTaskURLAndRedirect: function(sURL){
		if (jQuery.sap.validateUrl(sURL)) {
			sap.m.URLHelper.redirect(sURL, true);
		} else if ( (sURL.indexOf("?") > 0) && (jQuery.sap.validateUrl(cross.fnd.fiori.inbox.Conversions.getEncodedURL(sURL))) ) {
			sURL = cross.fnd.fiori.inbox.Conversions.getEncodedURL(sURL);
			sap.m.URLHelper.redirect(sURL, true);
		} else {
			var oParser = document.createElement('a');
			oParser.href = sURL;
			sURL = oParser.protocol + "//" + oParser.host + "/" + jQuery.sap.encodeURL( oParser.pathname[0]=="/"? oParser.pathname.substring(1): oParser.pathname ) + ( oParser.search!==""? cross.fnd.fiori.inbox.Conversions.getEncodedURL(oParser.search): "" );
			if(jQuery.sap.validateUrl(sURL)){
				sap.m.URLHelper.redirect(sURL, true);
			}
			else
			sap.ca.ui.message.showMessageBox({
							 type: sap.ca.ui.message.Type.ERROR,
							 message: this.i18nBundle.getText("dialog.error.taskExecutionUI")
			});
		}
	},

	onTabSelect: function(oControlEvent) {
		var sSelectedTab = oControlEvent.getParameters().selectedKey;
		var oModelData = this.oModel2 ? this.oModel2.getData() : "";

		switch (sSelectedTab) {
			// if comments tab selected, comments present and there are no comments cached, fetch comments
			case "NOTES":
				this.fnSetIconForCommentsFeedInput();
				if (oModelData.HasComments == true && (!oModelData.Comments.results || (oModelData.Comments.results && oModelData.Comments.results.length !=
					oModelData.CommentsCount))) {
					this.fnReadCommentsAndCreatedByDetails();
				}
				break;

				// if attachment tab selected, attachments present and there are no attachments cached, fetch attachments
			case "ATTACHMENTS":
				if (oModelData.HasAttachments == true && !oModelData.Attachments.results) {
					this.fnFetchAttachments();
				} else if (oModelData.HasAttachments == false) {
					this.oModel2.setProperty("/Attachments", {});

				}
				break;

			case "PROCESSINGLOGS":
				if (oModelData.TaskSupports.ProcessingLogs == true && !oModelData.ProcessingLogs.results) {
					this.fnFetchProcessingLogs();
					// defines the no. of records to show in History tab by default, this code also prevents rendering issues with history tab in other tasks when clicked showmore
					this.byId("timeline").setGrowingThreshold(10);
				}
				break;

			case "OBJECTLINKS":
				if (oModelData.TaskSupports.TaskObject === true && !oModelData.ObjectLinks && oModelData.ObjectLinksCount > 0) {
					this.fnFetchObjectLinks();
				}
				break;
		}
	},

	/* reads attachments when clicked on the attachments tab */
	fnFetchAttachments: function() {
		var oModelData = this.oModel2.getData();
		var that = this;
		var oView = that.oAttachmentComponentView;

		var fnSuccess = function(oAttachmentData) {
			that.oModel2.setProperty("/Attachments", oAttachmentData); // populate the view's model with attachment data
		};
		if (that.oGenericAttachmentComponent && !that.isGenericComponentRendered) {
			oView = that.oGenericAttachmentComponent.view;
		}
		that.oDataManager.fnGetDataWithCountSupport(oView, oModelData.SAP__Origin, oModelData.InstanceID, false, fnSuccess, "Attachments");
	},

	fnSetIconForCommentsFeedInput: function() {
		if(this.oGenericCommentsComponent.fnIsFeedInputPresent() && !this.oGenericCommentsComponent.fnGetFeedInputIcon()){
			var sSAP__Origin = this.oModel2.getData().SAP__Origin;
			var sUserId;
			var isImagePresent = false;
			var url = "sap-icon://person-placeholder";
			if (sap.ushell.Container != undefined) {
				sUserId = sap.ushell.Container.getUser().getId();
				var oDManager = this.oDataManager;
				url = oDManager.oModel.sServiceUrl + "/UserInfoCollection(SAP__Origin='" + sSAP__Origin + "',UniqueName='" + sUserId + "')/$value";
				isImagePresent = oDManager.fnIsImagePresent(url, sUserId);
				if (!isImagePresent) {
					url = "sap-icon://person-placeholder";
				}
			}
			this.oGenericCommentsComponent.fnSetFeedInputIcon(url);
		}

	},

	/* Updates the count in the model */
	fnCountUpdater: function(sKey, sSAP__Origin, sInstanceID) {
		var that = this;

		switch (sKey) {
			case "Attachments":
				that.oModel2.setProperty("/AttachmentsCount", "...");
				this.oDataManager.fnGetDataWithCountSupport(null, sSAP__Origin, sInstanceID, true, function(sNumberOFAttachments) {
					that.oModel2.setProperty("/AttachmentsCount", sNumberOFAttachments);
					that.fnHandleNoTextCreation("Attachments");
				}, "Attachments");
				break;
			case "Comments":
				that.oModel2.setProperty("/CommentsCount", "...");
				this.oDataManager.fnGetDataWithCountSupport(null, sSAP__Origin, sInstanceID, true, function(sNumberOFComments) {
					that.oModel2.setProperty("/CommentsCount", sNumberOFComments);
					that.fnHandleNoTextCreation("Comments");
				}, "Comments");
				break;
			case "ProcessingLogs":
				that.oModel2.setProperty("/ProcessingLogsCount", "...");
				this.oDataManager.fnGetDataWithCountSupport(null, sSAP__Origin, sInstanceID, true, function(sNumberOfLogs) {
					that.oModel2.setProperty("/ProcessingLogsCount", sNumberOfLogs);
					that.fnHandleNoTextCreation("ProcessingLogs");
				}, "ProcessingLogs");
				break;
			case "ObjectLinks":
				that.oModel2.setProperty("/ObjectLinksCount", "...");
				this.oDataManager.fnGetDataWithCountSupport(null, sSAP__Origin, sInstanceID, true, function(sNumberOfLinks) {
					that.oModel2.setProperty("/ObjectLinksCount", sNumberOfLinks);
					that.fnHandleNoTextCreation("ObjectLinks");
				}, "TaskObjects");
				break;
		}
	},

	fnHandleNoTextCreation: function(sEntity) {
		var that = this;
		var oModelData = this.oModel2.getData();
		if(that.oGenericAttachmentComponent)
		var oGenericUploadControl = that.oGenericAttachmentComponent ? that.oGenericAttachmentComponent.view.byId("uploadCollection") : null;

		switch (sEntity) {
			case "Comments":
				if (oModelData.CommentsCount && oModelData.CommentsCount > 0)
					that.oGenericCommentsComponent.setNoDataText( that.i18nBundle.getText("XMSG_LOADING") );
				else if (oModelData.CommentsCount && oModelData.CommentsCount == 0)
					that.oGenericCommentsComponent.setNoDataText(that.i18nBundle.getText("view.CreateComment.noComments"));
				break;
			case "Attachments":
				var oAttachmentsTab = that.isGenericComponentRendered ? that.oAttachmentComponentView.byId("uploadCollection") : oGenericUploadControl;
				if (oAttachmentsTab) {
					if (oModelData.AttachmentsCount && oModelData.AttachmentsCount > 0)
						oAttachmentsTab.setNoDataText(that.i18nBundle.getText("XMSG_LOADING"));
					else if (oModelData.AttachmentsCount && oModelData.AttachmentsCount == 0)
						oAttachmentsTab.setNoDataText(that.i18nBundle.getText("view.Attachments.noAttachments"));
				} else {
					return;
				}
				break;
			case "ProcessingLogs":
				var oHistoryTab = that.byId("timeline");
				if (oModelData.ProcessingLogsCount && oModelData.ProcessingLogsCount > 0)
					oHistoryTab.setNoDataText(that.i18nBundle.getText("XMSG_LOADING"));
				else if (oModelData.ProcessingLogsCount && oModelData.ProcessingLogsCount == 0)
					oHistoryTab.setNoDataText(that.i18nBundle.getText("view.ProcessLogs.noProcessLog"));
				break;
			case "ObjectLinks":
				var oObjectLinksTab = that.byId("MIBObjectLinksList");
				if (oModelData.ObjectLinksCount && oModelData.ObjectLinksCount > 0)
					oObjectLinksTab.setNoDataText(that.i18nBundle.getText("XMSG_LOADING"));
				else if (oModelData.ObjectLinksCount && oModelData.ObjectLinksCount == 0)
					oObjectLinksTab.setNoDataText(that.i18nBundle.getText("view.ObjectLinks.noObjectLink"));
				break;
			default:
				break;
		}
	},

	fnClearCachedData: function() {
		this.oModel2.setProperty("/AttachmentsCount", "");
		this.oModel2.setProperty("/CommentsCount", "");
		this.oModel2.setProperty("/ProcessingLogsCount", "");
		this.oModel2.setProperty("/ObjectLinksCount", "");
		this.oModel2.setProperty("/ProcessingLogs", ""); // to fetch new data on every refresh for processing logs
		this.oModel2.setProperty("/Attachments", ""); // to fetch new attachments on every refresh
		this.oModel2.setProperty("/Comments", ""); // to fetch new comments on every refresh
	},

	fnFetchProcessingLogs: function() {
		var oModelData = this.oModel2.getData();
		var fnSuccess = function(data) {
			this.oModel2.setProperty("/ProcessingLogs", data);
			// to enable proper rendering of History tab. Otherwise the background is not properly updated
			this.byId("tabBar").rerender();
		};
		this.oDataManager.fnGetDataWithCountSupport(null, oModelData.SAP__Origin, oModelData.InstanceID, false, jQuery.proxy(fnSuccess, this),
			"ProcessingLogs");

	},

	fnFetchObjectLinks: function() {
		var oModelData = this.oModel2.getData();
		var iObjectLinkNumber = 0;
		var fnSuccess = function(data) {
			for (var i = 0; i < data.results.length; i++) {
				if (!data.results[i].Label) {
					iObjectLinkNumber = iObjectLinkNumber + 1;
					data.results[i].Label = this.i18nBundle.getText("object.link.label") + " " + iObjectLinkNumber;
				}
			}
			this.oModel2.setProperty("/ObjectLinks", data);
		};
		this.oDataManager.fnGetDataWithCountSupport(null, oModelData.SAP__Origin, oModelData.InstanceID, false, jQuery.proxy(fnSuccess, this),
			"TaskObjects");
	},

	/* Reads comments and createdBy details when clicked on the comments tab */
	fnReadCommentsAndCreatedByDetails: function() {
		var that = this;
		var sPath = this.sCtxPath + "/Comments";
		var oModelData = this.oModel2.getData();
		var fnSuccess = function(data) {
			oModelData.Comments = data;
			that.oModel2.setData(oModelData);
        	that.oGenericCommentsComponent.getAggregation("rootControl").byId('MIBCommentList').rerender();
		};
        this.oDataManager.fnReadCommentsAndCreatedByDetails(sPath,{$expand: "CreatedByDetails"},fnSuccess, that.oGenericCommentsComponent);
		},

	onSupportInfoOpenEvent: function(sChannelId, sEventId, oSupportInfoOpenEvent) {
		if (oSupportInfoOpenEvent.source === "MAIN") {
			//To support info
			var oCustomAttributeDefinition = null;
				var oItem = this.oModel2.getData();

			if (this.aTaskDefinitionData) {
				for (var i = 0; i < this.aTaskDefinitionData.length; i++) {
					if (oItem && (oItem.TaskDefinitionID === this.aTaskDefinitionData[i].TaskDefinitionID)) {
						if (this.aTaskDefinitionData[i].CustomAttributeDefinitionData.results) {
							oCustomAttributeDefinition = this.aTaskDefinitionData[i].CustomAttributeDefinitionData.results;
						}
					}
				}
			}

			cross.fnd.fiori.inbox.util.SupportInfo.setTask(oItem, oCustomAttributeDefinition);
		}
	},

	_updateTaskAfterAddAction: function(oItem, oData, sCountProperty, sHasProperty) {

		var that = this;
		var aBatchResponses = oData.__batchResponses;

		var oAddedEntryCountResponse = aBatchResponses[0];
		if (oAddedEntryCountResponse.hasOwnProperty("data") && oAddedEntryCountResponse.statusCode >= '200' && oAddedEntryCountResponse.statusCode <
			'300') {
			// update comments or attachments count
			that.oModel2.setProperty(sCountProperty, oAddedEntryCountResponse.data);
			if (oAddedEntryCountResponse.data > 0 && !oItem[sHasProperty]) {
				that.oModel2.setProperty("/" + sHasProperty, true);
			}
			// that.fnHandleNoTextCreation("Attachments"); TODO do we need this ?
		}

		if (oItem.TaskSupports.ProcessingLogs) {
			var oProcessingLogsCountResponse = aBatchResponses[1];
			if (oProcessingLogsCountResponse.hasOwnProperty("data") && oProcessingLogsCountResponse.statusCode >= '200' &&
				oProcessingLogsCountResponse.statusCode < '300') {
				// update Processing Logs count
				that.oModel2.setProperty("/ProcessingLogsCount", oProcessingLogsCountResponse.data);
			}
			// clear processing logs data as adding a comment or an attachment will change the processing logs data
			this.oModel2.setProperty("/ProcessingLogs", "");
		}
		
	},
	
	_createCustomAttributesElements: function(oDetailData){
		var oCustomAttributesContainer = this.getView().byId( "customAttributesContainer" );	//getting parent element for dynamic child element creation
		var aCustomAttributeElements = this.aCA;
		for( var i = 0; i < oDetailData.CustomAttributeData.length; i++ ){ // iterate each custom attribute
			var sAttributeName = oDetailData.CustomAttributeData[i].Name;
		    var sDefinitionLabelName;
		    var sLabelType;
		    var bDefinitionPresent = false;
		    
		    // if a custom attribute's definition is not present, skip it
		    if( !this.aTaskDefinitionDataObject[ oDetailData.TaskDefinitionID + "_" + sAttributeName ] )
		    	continue;
		    sLabelType = this.aTaskDefinitionDataObject[ oDetailData.TaskDefinitionID + "_" + sAttributeName ].Type;
		    sDefinitionLabelName = this.aTaskDefinitionDataObject[ oDetailData.TaskDefinitionID + "_" + sAttributeName ].Label;
		    if(sLabelType && sDefinitionLabelName) bDefinitionPresent = true;
		   
		    if( bDefinitionPresent == true ){ // show attribute only if it's definition is present
		    	var oNewFormElement = new sap.ui.layout.form.FormElement ( "", {} );
		    	oNewFormElement.setLayoutData( new sap.ui.commons.layout.ResponsiveFlowLayoutData ( "", { linebreak:true, margin:false } ) );
		    	var oLabel = new sap.m.Label ( "", { text : sDefinitionLabelName } );
		        oLabel.setLayoutData( new sap.ui.commons.layout.ResponsiveFlowLayoutData ( "", {  weight:3, minWidth:192 } ) );
		        oNewFormElement.setLabel( oLabel );
		        var sValue = cross.fnd.fiori.inbox.Conversions.fnCustomAttributeTypeFormatter( oDetailData.CustomAttributeData[i].Value, sLabelType );
		        var oText = new sap.m.Text ( "", { text:sValue } );
		        oText.setLayoutData( new sap.ui.commons.layout.ResponsiveFlowLayoutData ( "", { weight:5 } ) );
		        oNewFormElement.addField( oText );
		        oCustomAttributesContainer.addFormElement( oNewFormElement );
		        aCustomAttributeElements.push( oNewFormElement );
		    }
		}
		this.byId("DescriptionContent").rerender();
	}	

});