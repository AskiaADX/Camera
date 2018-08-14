function showOverlay(instanceId){
    removeClass(getElementByDynamicId("overlay_loader", instanceId),'hidden');
}

function hideOverlay(instanceId){
    addClass(getElementByDynamicId("overlay_loader", instanceId),'hidden');
}

function uploadFile(instanceId){
	hideErrorMessage(instanceId);
    hideSuccessMessage(instanceId);

    if (!uploadConfig(instanceId).apiKey || !uploadConfig(instanceId).secretKey) {
		displayErrorMessage(uploadConfig(instanceId).ErrMsgInvalidApiSecretKeys, instanceId);
        return;
    }

    if(fileSelected(instanceId)){
        if(validFileSize(instanceId)){
            generateNewToken(function(token){
                uploadConfig(instanceId).token=token;
                sendFileTransferCall(instanceId);
            }, instanceId);
        }
        else{
            displayErrorMessage(uploadConfig(instanceId).ErrMsgFileSizeExceeded, instanceId);
        }
    }
    else{
        displayErrorMessage(uploadConfig(instanceId).ErrMsgSelectFile, instanceId);
    }
}

function fileSelected(instanceId){
    var fileData = getElementByDynamicId("adc_uploader", instanceId).files[0];
    return fileData!=undefined;
}

function validFileSize(instanceId){
    var fileData = getElementByDynamicId("adc_uploader", instanceId).files[0];
    var filesize = 0;
    var maxsize = uploadConfig(instanceId).maxfilesize;
    if (fileData) {
        filesize = fileData.size / 1024;
    }

    if (fileData && filesize > maxsize) {
        return false;
    }
    return true;
}

function generateNewToken(callback, instanceId) {

    var data = {
        ApiKey: uploadConfig(instanceId).apiKey,
        SecretKey: uploadConfig(instanceId).secretKey
    };

    var url = uploadConfig(instanceId).authenticationUrl;

    var generateTokenSuccess = function (token) {
        callback(token);
    };
    var generateTokenError = function (error) {
        hideOverlay(instanceId);
        displayErrorMessage(uploadConfig(instanceId).ErrMsgInvalidApiSecretKeys, instanceId);
    };
    var generateTokenBeforeSend=function(){
        showOverlay(instanceId);
    };

    sendAjaxPostCall(url, data, true, generateTokenSuccess, generateTokenError,generateTokenBeforeSend);

}

function sendFileTransferCall(instanceId) {
    if(!uploadConfig(instanceId).token){
        displayErrorMessage(uploadConfig(instanceId).ErrMsgToken, instanceId);
        return;
    }

    var projectName = uploadConfig(instanceId).ausProjectName;
    var fileData = getElementByDynamicId("adc_uploader", instanceId).files[0];
    var shortcut = uploadConfig(instanceId).shortcut;
    var seed = uploadConfig(instanceId).seedvalue;
    var guid = uploadConfig(instanceId).guidstring;

    // clean up guid of curly braces
    if (guid.charAt(0) == "{") guid = guid.substr(1);
    if (guid.charAt(guid.length - 1) == "}") guid = guid.substr(0, guid.length - 1);

    var url=uploadConfig(instanceId).uploadUrl + "?tokenkey=" + uploadConfig(instanceId).token + "&filename=" + fileData.name
    + "&projectname=" + projectName + "&shortcut=" + shortcut + "&seed=" + seed + "&guid=" + guid;

    var uploadSuccessCallback = function (response) {
        getElementByDynamicId("HidResult", instanceId).value=response.DestinationFileName;
        displaySuccessMessage(uploadConfig(instanceId).SuccessMsgUpload, uploadConfig(instanceId).SuccessMsgColor, instanceId);
        hideOverlay(instanceId);
        if (uploadConfig(instanceId).disabledUploadBtn == 1) {
	    	disableUploadBtn(instanceId);
        }
        if (uploadConfig(instanceId).AutoSubmitAfterUpload == 1) {
            document.getElementsByTagName("form")[0].submit();
        } else {
            if (uploadConfig(instanceId).EnabledNextAfterUpload == 1) {
                document.getElementsByName("Next")[0].hidden = false;
            }
        }        
    };
    var uploadErrorCallback = function (error) {
        getElementByDynamicId("HidResult", instanceId).value='';
        displayErrorMessage(uploadConfig(instanceId).ErrMsgErrorAtUpload, instanceId);
        hideOverlay(instanceId);
    };

    sendAjaxPostCall(url, fileData, false, uploadSuccessCallback, uploadErrorCallback);

}

function sendAjaxPostCall(url, data, isJsonRequest, successCallback, errorCallback,beforeSend) {
    var http = new XMLHttpRequest();
    http.open("POST", url, true);
    if (isJsonRequest) {
        http.setRequestHeader("Content-type", "application/json");
        data = JSON.stringify(data);
    }

    http.onreadystatechange = function () {
        if (http.readyState == 4) {
            if (http.status == 200) {
                var response = JSON.parse(http.responseText);
                successCallback(response);
            } else {
                var response = JSON.parse(http.responseText);
                errorCallback(response);
            }
        }
    }
    if(beforeSend){
        beforeSend();
    }
    http.send(data);
}

function hasClass(ele,cls) {
    return ele.className.match(new RegExp('(\\s|^)'+cls+'(\\s|$)'));
}

function removeClass(ele,cls) {
    if (hasClass(ele,cls)) {
        var reg = new RegExp('(\\s|^)'+cls+'(\\s|$)');
        ele.className=ele.className.replace(reg,' ');
    }
}

function addClass(ele,cls) {
    if (!hasClass(ele,cls)) {
        ele.className += ' '+ cls;
    }
}

function displayErrorMessage(message, instanceId){
    hideOverlay(instanceId);
    var div = getElementByDynamicId("adc-errdiv", instanceId);
    addClass(div, "askia-errors-summary");
    div.style.marginBottom = "50px";
    var ul = getElementByDynamicId("ulErrorMessages", instanceId);
    ul.innerHTML = "";
    var li = document.createElement("li");
    li.appendChild(document.createTextNode(message));
    ul.appendChild(li);
}

function displaySuccessMessage(message, colorcode, instanceId){
    hideOverlay(instanceId);
    var div = getElementByDynamicId("adc-succdiv", instanceId);
    div.style.backgroundColor= 'rgb(' + colorcode + ')';
    div.style.color = 'white';
    div.style.width = '100%';
    div.style.paddingTop = '15px';
    div.style.paddingBottom = '15px';
    div.style.marginBottom = '50px';
    div.style.borderRadius = '3px';
    var span = getElementByDynamicId("spanSuccessMessage", instanceId);
    span.innerHTML = message;
}

function disableUploadBtn(instanceId) {
    var file = getElementByDynamicId("adc_uploader", instanceId).files[0];
    var btn = getElementByDynamicId("btnUpload", instanceId);
    if (btn.hasAttribute("disabled")) {
        btn.setAttribute("disabled","disabled");
    } else {
        var att = document.createAttribute("disabled");
        att.value = "disabled";
        btn.setAttributeNode(att);
    }
    addClass(btn,"disabled");
    btn.style.cursor = "not-allowed";
}

function enableUploadBtn(instanceId) {
    var btn = getElementByDynamicId("btnUpload", instanceId);
    if (btn.hasAttribute("disabled")) {
        btn.removeAttribute("disabled");
    }
    removeClass(btn,"disabled");
    btn.style.cursor = "pointer";
}

function hideSuccessMessage(instanceId) {
    var div = getElementByDynamicId("adc-succdiv", instanceId);
    div.removeAttribute("style");
    var span = getElementByDynamicId("spanSuccessMessage", instanceId);
    span.innerHTML = "";
}

function hideErrorMessage(instanceId){
    var div = getElementByDynamicId("adc-errdiv", instanceId);
    removeClass(div, "askia-errors-summary");
    div.removeAttribute("style");
    var ul = getElementByDynamicId("ulErrorMessages", instanceId);
    ul.innerHTML = "";
}

function getElementByDynamicId(elementId, instanceId) {
    return document.getElementById(elementId + "_" + instanceId);
}

function uploadConfig(instanceId) {
	return eval('uploadConfig_' + instanceId);
}

function activateBtnUpload(instanceId) {
    if (uploadConfig(instanceId).allowUploadFileChange == 1) {
        enableUploadBtn(instanceId);
    }
}

function getBrowser() {
    var ua=navigator.userAgent,tem,M=ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    if(/trident/i.test(M[1])){
        tem=/\brv[ :]+(\d+)/g.exec(ua) || [];
        return {name:'IE',version:(tem[1]||'')};
        }
    if(M[1]==='Chrome'){
        tem=ua.match(/\bOPR|Edge\/(\d+)/)
        if(tem!=null)   {return {name:'Opera', version:tem[1]};}
        }
    M=M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
    if((tem=ua.match(/version\/(\d+)/i))!=null) {M.splice(1,1,tem[1]);}
    return {
      name: M[0],
      version: M[1]
    };
 }
