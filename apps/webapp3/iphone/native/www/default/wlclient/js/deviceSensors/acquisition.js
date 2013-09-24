
/* JavaScript content from wlclient/js/deviceSensors/acquisition.js in Common Resources */
/**
 * @license
 * Licensed Materials - Property of IBM
 * 5725-G92 (C) Copyright IBM Corp. 2006, 2013. All Rights Reserved.
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 */
/**
 * WL.Device
 */

__SensorsAcquisition = function() {
	
	/**
	 * Start acquisition on all sensors.Delegate the start action to all relevant sensors.
	 * @param policy -configure the acquisition. Policy object hold relevant entries per sensor.
	 * 		<li>	Geo: @see __Geo#startAcquisition
	 * 		<li>	Wifi: @see __Wifi#startAcquisition
	 * @param triggers - the object holding the trigger definitions for all sensors, in the form {Geo:{...}, Wifi:{...}}
	 * @param Object holding error handlers for each of the sensors. The object structure is {Geo: errorCallbackFunction, Wifi: errorCallbackFunction}
	 */
	this.startAcquisition = function(policy, triggers, onFailure) {

		var geoFailureCallback = (!onFailure || !onFailure.Geo) ? function(error)
				{WL.Logger.error("error starting Geo acquisition, reason: "+error);} : onFailure.Geo;
		var wifiFailureCallback = (!onFailure || !onFailure.Wifi) ? function(error)
				{WL.Logger.error("error starting Wifi acquisition, reason: "+error);} : onFailure.Wifi;		

		if (!policy.Geo) // not undefined and not null
			WL.Device.Geo.stopAcquisition();
		else WL.Device.Geo.startAcquisition(geoFailureCallback,policy.Geo,triggers.Geo);		
		
		if (!policy.Wifi) // not undefined and not null
			WL.Device.Wifi.stopAcquisition();
		else WL.Device.Wifi.startAcquisition(wifiFailureCallback,policy.Wifi,triggers.Wifi);
	};
	
	this.stopAcquisition = function()
	{
		WL.Device.Geo.stopAcquisition();
		WL.Device.Wifi.stopAcquisition();
		WL.Device.context = {}; // clear the context
	};
};

var sensorsAcquisition = new __SensorsAcquisition();

WL.Device.startAcquisition = sensorsAcquisition.startAcquisition;
WL.Device.stopAcquisition = sensorsAcquisition.stopAcquisition;

WL.Device.context = {};
WL.Device.getContext = function() {
	if (WLJSX.Object.keys(WL.Device.context).length == 0) {
		return null;
	}
	
	return WLJSX.Object.clone(WL.Device.context);
};



__DCTPiggyBacker = function () {
	
	this.name = "DeviceContextTransmission Piggybacker"; // for display/debug purposes
	var force = true;
	
	this.processOptions = function(options) {
		var delta = WL.Client.__deviceContextTransmission.getDelta(force);
		if (delta != null) {
			options.parameters.__wl_deviceCtxDelta = WLJSX.Object.toJSON(delta);
		}
		options.parameters.__wl_deviceCtxVersion = WL.Client.__deviceContextTransmission.getVersion();
		if (force)
			options.parameters.__wl_deviceCtxForce = true; // force reset the server session on first transmission
	};
	
	this.onSuccess = function(transport, options) {
		if (!WLJSX.Object.isUndefined(options.parameters.__wl_deviceCtxVersion)) {
			WL.Client.__deviceContextTransmission.clearDataThroughVersion(options.parameters.__wl_deviceCtxVersion);
		}
		force = false; // force for first time only
	};		
};



__DeviceContextTransmission = function() {
	this.currentVersion = -1;
	this.updates = {};
	this.deletions = {};
	this.lastMarkedTZOffset = null;
	this.lastModifiedDeleted = true;
	this.piggybackerAdded = false;
	
	
	var self = this;	
	
	this.isEmpty = function(obj) {
		if (typeof obj == 'undefined')
			return true;
		
		for (var prop in obj)
			if (obj.hasOwnProperty(prop))
				return false;
		
		return true;	
	};
	
	this.getOwnProperties = function(obj) {
		var result = [];
		for (var prop in obj)
			if (obj.hasOwnProperty(prop))
				result.push(prop);
		
		return result;
	};
	
	this.enablePiggybacking = function() {
		if (self.piggybackerAdded) {
			return;
		}
		
		var dctPiggyBacker = new __DCTPiggyBacker();
		WLJSX.Ajax.WlRequestPiggyBackers.push(dctPiggyBacker);
		
		self.piggybackerAdded = true;
	};
	
	this.updateField = function(field) {
		self.updates[field] = self.currentVersion;
		if (self.deletions[field])
			delete self.deletions[field];
	}
	
	this.deleteField = function(field) {
		self.deletions[field] = self.currentVersion;
		if (self.updates[field])
			delete self.updates[field];
	}
	
	this.updateSensor = function(sensorName) {		
		self.currentVersion++;
		self.updateField(sensorName);
		
		if (WLJSX.Object.isUndefined(WL.Device.context.lastModified)) {
			if (!self.lastModifiedDeleted) {
				self.deleteField("lastModified");
				self.lastModifiedDeleted = true;
			}
		}
		else {
			self.updateField("lastModified"); // assume we'll need to update the last modified timestamp
			self.lastModifiedDeleted = false;
		}
			
		if (WLJSX.Object.isUndefined(WL.Device.context.timezoneOffset)) {
			if (self.lastMarkedTZOffset != null) {
				self.deleteField("timezoneOffset");
				self.lastMarkedTZOffset = null;
			}
		}
		else if (WL.Device.context.timezoneOffset != self.lastMarkedTZOffset) {			
			self.updateField("timezoneOffset");
			self.lastMarkedTZOffset = WL.Device.context.timezoneOffset;			
		}
		
		this.enablePiggybacking();
	};
	
	this.deleteSensor = function(sensorName) {
		self.currentVersion++;
		self.deletions[sensorName] = self.currentVersion;
		if (self.updates[sensorName])
			delete self.updates[sensorName];
	};
	
	this.getVersion = function() {
		return self.currentVersion;
	};

	this.getDelta = function(force) {
		if (WL.Device.context == null || self.isEmpty(WL.Device.context)) {		
			self.lastMarkedTZOffset = null;
			return null;
		}
		
		if (force && !WLJSX.Object.isUndefined(WL.Device.context.timezoneOffset)) {			
			self.updateField("timezoneOffset");
			self.lastMarkedTZOffset = WL.Device.context.timezoneOffset;			
		}
		
		var deltaUpdateNames = WLJSX.Object.keys(self.updates);
		var deltaDelNames = WLJSX.Object.keys(self.deletions);
				
		var result = {};
		if (deltaUpdateNames.length > 0) {
			result.updates = {};
			for (var i = 0; i < deltaUpdateNames.length; i++) {
				var sensorName = deltaUpdateNames[i];
				result.updates[sensorName] = WL.Device.context[sensorName];
			}
		}
		if (deltaDelNames.length > 0) {
			result.deletions = deltaDelNames;
		}
		
		return result;
	};

	this.clearDataThroughVersion = function(versionSent) {	
		var deltaUpdateNames = WLJSX.Object.keys(self.updates);
		var deltaDelNames = WLJSX.Object.keys(self.deletions);

		for (var i = 0; i < deltaUpdateNames.length; i++) {
			var sensorName = deltaUpdateNames[i];
			if (self.updates[sensorName] <= versionSent)
				delete self.updates[sensorName];
		}
		
		for (var i = 0; i < deltaDelNames.length; i++) {
			var sensorName = deltaDelNames[i];
			if (self.deletions[sensorName] <= versionSent)
				delete self.deletions[sensorName];
		}
	};
};

WL.Client.__deviceContextTransmission = new __DeviceContextTransmission();
WL.Client.__deviceContextTransmission.enablePiggybacking();

