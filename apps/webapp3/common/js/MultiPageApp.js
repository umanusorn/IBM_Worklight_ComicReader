/*
* Licensed Materials - Property of IBM
* 5725-G92 (C) Copyright IBM Corp. 2006, 2013. All Rights Reserved.
* US Government Users Restricted Rights - Use, duplication or
* disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
*/

var pagesHistory = [];
var currentPage = {};

function wlCommonInit(){
	
	$("#pagePort").load("pages/MainPage.html", function(){
		currentPage.init();
	});
}
