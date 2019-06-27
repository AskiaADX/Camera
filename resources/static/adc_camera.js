function showOverlay(instanceId){
    removeClass(getElementByDynamicId("overlay_loader", instanceId),'hidden');
}

function hideOverlay(instanceId){
    addClass(getElementByDynamicId("overlay_loader", instanceId),'hidden');
}

/*
*	instanceId {Integer} ID of the current adc
* 	Save the recorded video on the user's disk
*/
function saveVideo(instanceId){
	hideErrorMessage(instanceId);
    hideSuccessMessage(instanceId);
    var video = document.getElementById("player");
    if (!hasClass(video, "saved")) {
        if(videoRecorder != undefined){
            if (window.navigator.msSaveOrOpenBlob) { // Edge
                videoRecorder.getBlob().then(function(blob) {
                  window.navigator.msSaveOrOpenBlob(blob, "my_video.mp4");
                });
            } else { // Others
                var a = document.createElement("a");
                a.href = video.src;
                a.download = "my_video.mp4";
                document.body.appendChild(a);
                a.click();
                setTimeout(function() {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(video.src);
                }, 0);
            }
            addClass(video, "saved");
            getElementByDynamicId("btnSave", instanceId).disabled = true;
            displaySuccessMessage(uploadConfig(instanceId).SuccessMsgSave, uploadConfig(instanceId).SuccessMsgColor, instanceId);
        } else{
            displayErrorMessage(uploadConfig(instanceId).ErrMsgSave, instanceId);
        }
    }
}

/*
*	instanceId {Integer} ID of the current adc
* 	Save the captured photo on the user's disk
*/
function saveImage(instanceId){
	hideErrorMessage(instanceId);
    hideSuccessMessage(instanceId);
    var image = document.getElementById("capturedImage");
    if(!image.hasAttribute('hidden')){
    	if (window.navigator.msSaveOrOpenBlob) { // Edge
            var blob = document.getElementById("canvas").msToBlob();
            window.navigator.msSaveOrOpenBlob(blob, "my_image.png");
        } else { // Others
            var a = document.createElement("a");
            a.href = image.src;
            a.download = "my_image.png";
            document.body.appendChild(a);
            a.click();
            setTimeout(function() {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(image.src);
            }, 0);
        }
        displaySuccessMessage(uploadConfig(instanceId).SuccessMsgSave, uploadConfig(instanceId).SuccessMsgColor, instanceId);
    } else{
        displayErrorMessage(uploadConfig(instanceId).ErrMsgSave, instanceId);
    }
}

/*
*	instanceId {Integer} ID of the current adc
* 	Upload the recorded video on the server
*/
function uploadVideo(instanceId){
	hideErrorMessage(instanceId);
    hideSuccessMessage(instanceId);

    if (!uploadConfig(instanceId).apiKey || !uploadConfig(instanceId).secretKey) {
		displayErrorMessage(uploadConfig(instanceId).ErrMsgInvalidApiSecretKeys, instanceId);
        return;
    }

    if(videoRecorder != undefined){ // if a video has been recorded
        var videoBlob;
        videoRecorder.getBlob().then(function(blob) {
          videoBlob = blob;
        });

        if(validFileSize(instanceId, videoBlob)){
            generateNewToken(function(token){
                uploadConfig(instanceId).token=token;
                sendFileTransferCall(instanceId, videoBlob, 'video');
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

/*
*	instanceId {Integer} ID of the current adc
* 	Upload the captured photo on the server
*/
function uploadImage(instanceId){
	hideErrorMessage(instanceId);
    hideSuccessMessage(instanceId);

    if (!uploadConfig(instanceId).apiKey || !uploadConfig(instanceId).secretKey) {
		displayErrorMessage(uploadConfig(instanceId).ErrMsgInvalidApiSecretKeys, instanceId);
        return;
    }
    var image_b64 = window.atob(document.getElementById("capturedImage").src.split(",")[1]);
    var tmp = new Uint8Array(image_b64.length);
    for (var i = 0; i < image_b64.length; i++) {
        tmp[i] = image_b64.charCodeAt(i);
    }
    var file = new Blob([tmp], {type: "image/png"});
    
    var image = document.getElementById("capturedImage");
    if(!image.hasAttribute("hidden")){ // if a photo has been captured
        if(validFileSize(instanceId, file)){
            generateNewToken(function(token){
                uploadConfig(instanceId).token=token;
                sendFileTransferCall(instanceId, file, 'image');
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

/*
*	instanceId {Integer} ID of the current adc
*	fileData {Data} Data from the current file
* 	Checks if the current file has a valid size
*/
function validFileSize(instanceId, fileData){
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

/*
*	callback {function} Function to execute
*	instanceId {Integer} ID of the current adc
* 	Generates tokens for the post call
*/
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

/*
*	instanceId {Integer} ID of the current adc
*	fileData {Data} Data from the current file
* 	type {String} Type of file (video or photo)
* 	Generates right url, success and error callbacks and transfers it to sendAjaxPostCall function
*/
function sendFileTransferCall(instanceId, fileData, type) {
    if(!uploadConfig(instanceId).token){
        displayErrorMessage(uploadConfig(instanceId).ErrMsgToken, instanceId);
        return;
    }

    var projectName = uploadConfig(instanceId).ausProjectName;
    var shortcut = uploadConfig(instanceId).shortcut;
    var seed = uploadConfig(instanceId).seedvalue;
    var guid = uploadConfig(instanceId).guidstring;

    var fileDataName = function () {
       if (type == 'video') return 'file-name.webm';
       if (type == 'image') return 'file-name.png';
    }

    // clean up guid of curly braces
    if (guid.charAt(0) == "{") guid = guid.substr(1);
    if (guid.charAt(guid.length - 1) == "}") guid = guid.substr(0, guid.length - 1);

    var url=uploadConfig(instanceId).uploadUrl + "?tokenkey=" + uploadConfig(instanceId).token + "&filename=" + fileDataName()
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

/*
* 	url {String} url for the request
*  	data {Data} Data from the current file
* 	isJsonRequest {boolean} Specifies if it is a JSON request or not
*	successCallback {Function} Function to execute after successful request
* 	errorCallback {Function} Function to execute after unsuccessful request
*	beforeSend {Function} Function to execute before sending request (optional)
* 	Send the request and execute the callbacks
*/
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

/*
* 	ele {DOM Element} Element from the HTML
*	cls {String} A class
* 	Returns a boolean depending on the element ele having the class cls or not
*/
function hasClass(ele,cls) {
    return ele.className.match(new RegExp('(\\s|^)'+cls+'(\\s|$)'));
}

/*
* 	ele {DOM Element} Element from the HTML
*	cls {String} A class
* 	Removes the class cls from element ele, if ele has the class cls
*/
function removeClass(ele,cls) {
    if (hasClass(ele,cls)) {
        var reg = new RegExp('(\\s|^)'+cls+'(\\s|$)');
        ele.className=ele.className.replace(reg,' ');
    }
}

/*
* 	ele {DOM Element} Element from the HTML
*	cls {String} A class
* 	Add the class cls to the element ele, if ele has not the class cls already
*/
function addClass(ele,cls) {
    if (!hasClass(ele,cls)) {
        ele.className += ' '+ cls;
    }
}

/*
*	message {String} The message to display
*	instanceId {Integer} ID of the current adc
* 	Displays an error message
*/
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

/*
*	message {String} The message to display
*	colorcode {String} Background color of the message - ex: xxx,xxx,xxx
*	instanceId {Integer} ID of the current adc
* 	Displays a success message
*/
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

/*
*	instanceId {Integer} ID of the current adc
* 	Disable the upload button
*/
function disableUploadBtn(instanceId) {
    var btn = getElementByDynamicId("btnUpload", instanceId);
    btn.disabled = true;
    addClass(btn,"disabled");
    btn.style.cursor = "not-allowed";
}

/*
*	instanceId {Integer} ID of the current adc
* 	Enable the upload button
*/
function enableUploadBtn(instanceId) {
    var btn = getElementByDynamicId("btnUpload", instanceId);
   	btn.disabled = false;
    removeClass(btn,"disabled");
    btn.style.cursor = "pointer";
}

/*
*	instanceId {Integer} ID of the current adc
* 	Hides success message
*/
function hideSuccessMessage(instanceId) {
    var div = getElementByDynamicId("adc-succdiv", instanceId);
    div.removeAttribute("style");
    var span = getElementByDynamicId("spanSuccessMessage", instanceId);
    span.innerHTML = "";
}

/*
*	instanceId {Integer} ID of the current adc
* 	Hides error message
*/
function hideErrorMessage(instanceId){
    var div = getElementByDynamicId("adc-errdiv", instanceId);
    removeClass(div, "askia-errors-summary");
    div.removeAttribute("style");
    var ul = getElementByDynamicId("ulErrorMessages", instanceId);
    ul.innerHTML = "";
}

/*
*	instanceId {Integer} ID of the current adc
* 	Return the DOM element of the current adc
*/
function getElementByDynamicId(elementId, instanceId) {
    return document.getElementById(elementId + "_" + instanceId);
}

/*
*	instanceId {Integer} ID of the current adc
* 	Return the uploadConfig variable containing properties of the current adc
*/
function uploadConfig(instanceId) {
	return eval('uploadConfig_' + instanceId);
}

/*
*	instanceId {Integer} ID of the current adc
* 	Start the record of a video, displays the stream on screen, storing the stream in videoRecorder variable
*/
function startRecordingVideo(instanceId) {
    var video = document.getElementById('player');
    removeClass(document.getElementsByClassName("label-start")[0], "primary");
    addClass(document.getElementsByClassName("label-stop")[0], "primary");
    removeClass(video, "saved");
    getElementByDynamicId("btnSave",instanceId).disabled = false;
    if (uploadConfig(instanceId).allowUploadFileChange == 1) {
        enableUploadBtn(instanceId);
    }
    document.getElementById('btn-start-recording').disabled = true;
    navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
    }).then(function(stream) {
        setSrcObject(stream, video);
        video.play();
        video.muted = true;
        videoRecorder = new RecordRTCPromisesHandler(stream, {
            mimeType: 'video/mp4',
            audioBitsPerSecond: 128000,
            videoBitsPerSecond : 2500000,
        });
        videoRecorder.startRecording().then(function() {
            console.info('Recording video ...');
        }).catch(function(error) {
            displayErrorMessage(uploadConfig(instanceId).ErrMsgStartRec, instanceId);
            console.error('Cannot start video recording: ', error);
        });
        videoRecorder.stream = stream;
        document.getElementById('btn-stop-recording').disabled = false;
    }).catch(function(error) {
        displayErrorMessage(uploadConfig(instanceId).ErrMsgUserMediaAccess, instanceId);
        console.error("Cannot access media devices: ", error);
    });
}

/*
*	instanceId {Integer} ID of the current adc
* 	Stop the video recording, diplays the recorded video on screen and stores the video in videoRecorder variable
*/
function stopRecordingVideo(instanceId) {
    removeClass(document.getElementsByClassName("label-stop")[0], "primary");
    addClass(document.getElementsByClassName("label-start")[0], "primary");
    document.getElementById('btn-stop-recording').disabled = true;
    var video = document.getElementById('player');
    videoRecorder.stopRecording().then(function() {
        console.info('stopRecording success');

        videoRecorder.getBlob().then(function(blob) {
          video.src = URL.createObjectURL(blob);
        });

        video.play();
        video.muted = false;
        videoRecorder.stream.stop();
        document.getElementById('btn-start-recording').disabled = false;
    }).catch(function(error) {
        displayErrorMessage(uploadConfig(instanceId).ErrMsgStopRec, instanceId);
        console.log("Stop recording error:", error);
    });
}

/*
*	instanceId {Integer} ID of the current adc
* 	Capture image from webcam stream and stores it into <img> element
*/
function captureImage(instanceId) {
    if (uploadConfig(instanceId).allowUploadFileChange == 1) {
        enableUploadBtn(instanceId);
    }
    var video = document.getElementById('preview');
    var canvas = document.getElementById("canvas");
    var img = document.getElementById("capturedImage");
    if (img.hasAttribute("hidden")) {
        img.removeAttribute("hidden");
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    img.src = canvas.toDataURL('image/png');
}
