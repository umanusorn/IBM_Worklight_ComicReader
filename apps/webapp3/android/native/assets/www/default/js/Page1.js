
/* JavaScript content from js/Page1.js in folder common */
/*
*  Licensed Materials - Property of IBM
*  5725-G92 (C) Copyright IBM Corp. 2006, 2013. All Rights Reserved.
*  US Government Users Restricted Rights - Use, duplication or
*  disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
*/

currentPage={};

currentPage.init = function() {
	WL.Logger.debug("Page1 :: init");
};

currentPage.buttonClick = function() {
	WL.Logger.debug("Page1 :: buttonClick");
	WL.SimpleDialog.show("Page1","Button on Page1 was clicked",[{text:'OK'}]);
};

currentPage.insertFragment = function() {
	WL.Logger.debug("Page1 :: insertFragment");
	$("#FragmentsDiv").load("pages/fragment.html");
};

currentPage.back = function(){
	WL.Logger.debug("Page1 :: back");
	$("#pagePort").load(pagesHistory.pop(), function(){
		currentPage.init();
	});
};

currentPage.loadPage = function(pageIndex){
	WL.Logger.debug("MainPage :: loadPage :: pageIndex: " + pageIndex);
	pagesHistory.push("pages/MainPage.html");
	
	$("#pagePort").load("pages/Page" + pageIndex + ".html", function(){
		currentPage.init();
	});
	
};


