var videoRecorders = videoRecorders || {};
var imageStreams = imageStreams || {};

function getVideoRecorder(instanceId) {
    return videoRecorders[instanceId];
}

function setVideoRecorder(instanceId, recorder) {
    videoRecorders[instanceId] = recorder;
}

function getSupportedVideoMimeType() {
    if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) {
        return "";
    }

    var mimeTypes = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm;codecs=h264,opus",
        "video/webm",
        "video/mp4;codecs=h264,aac",
        "video/mp4"
    ];

    for (var i = 0; i < mimeTypes.length; i++) {
        if (MediaRecorder.isTypeSupported(mimeTypes[i])) {
            return mimeTypes[i];
        }
    }

    return "";
}

function getVideoFileExtension(blob) {
    if (!blob || !blob.type) {
        return "webm";
    }

    var mimeType = blob.type.toLowerCase();

    if (mimeType.indexOf("mp4") > -1) {
        return "mp4";
    }

    if (mimeType.indexOf("webm") > -1) {
        return "webm";
    }

    if (mimeType.indexOf("ogg") > -1) {
        return "ogv";
    }

    return "webm";
}

function getVideoFileName(blob, baseName) {
    return (baseName || "my_video") + "." + getVideoFileExtension(blob);
}

function stopStreamTracks(stream) {
    if (!stream || !stream.getTracks) {
        return;
    }

    var tracks = stream.getTracks();

    for (var i = 0; i < tracks.length; i++) {
        try {
            tracks[i].stop();
        } catch (e) {}
    }
}

function clearMediaSource(mediaElement) {
    if (!mediaElement) {
        return;
    }

    try {
        mediaElement.pause();
    } catch (e) {}

    if ("srcObject" in mediaElement && mediaElement.srcObject) {
        mediaElement.srcObject = null;
    }

    mediaElement.removeAttribute("src");

    try {
        mediaElement.load();
    } catch (e) {}
}

function showOverlay(instanceId){
    removeClass(getElementByDynamicId("overlay_loader", instanceId), 'hidden');
}

function hideOverlay(instanceId){
    addClass(getElementByDynamicId("overlay_loader", instanceId), 'hidden');
}

/*
*	instanceId {Integer} ID of the current adc
* 	Save the recorded video on the user's disk
*/
function saveVideo(instanceId){
    hideErrorMessage(instanceId);
    hideSuccessMessage(instanceId);

    var video = getElementByDynamicId("player", instanceId);
    var recorder = getVideoRecorder(instanceId);

    if (!hasClass(video, "saved")) {
        if (recorder != undefined && recorder.blob) {
            var fileName = getVideoFileName(recorder.blob, "my_video");

            if (window.navigator.msSaveOrOpenBlob) {
                window.navigator.msSaveOrOpenBlob(recorder.blob, fileName);
            } else {
                var a = document.createElement("a");
                var objectUrl = video.src;

                if (!objectUrl) {
                    objectUrl = URL.createObjectURL(recorder.blob);
                }

                a.href = objectUrl;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();

                setTimeout(function() {
                    document.body.removeChild(a);
                }, 0);
            }

            addClass(video, "saved");

            var saveBtn = getElementByDynamicId("btnSave", instanceId);
            if (saveBtn) {
                saveBtn.disabled = true;
            }

            displaySuccessMessage(uploadConfig(instanceId).SuccessMsgSave, uploadConfig(instanceId).SuccessMsgColor, instanceId);
        } else {
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

    var image = getElementByDynamicId("capturedImage", instanceId);
    var canvas = getElementByDynamicId("canvas", instanceId);

    if (image && !image.hasAttribute('hidden')) {
        if (window.navigator.msSaveOrOpenBlob) {
            var blob = canvas.msToBlob();
            window.navigator.msSaveOrOpenBlob(blob, "my_image.png");
        } else {
            var a = document.createElement("a");
            a.href = image.src;
            a.download = "my_image.png";
            document.body.appendChild(a);
            a.click();

            setTimeout(function() {
                document.body.removeChild(a);
            }, 0);
        }

        displaySuccessMessage(uploadConfig(instanceId).SuccessMsgSave, uploadConfig(instanceId).SuccessMsgColor, instanceId);
    } else {
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

    var recorder = getVideoRecorder(instanceId);

    if (recorder != undefined && recorder.blob) {
        var videoBlob = recorder.blob;

        if (validFileSize(instanceId, videoBlob)) {
            generateNewToken(function(token){
                uploadConfig(instanceId).token = token;
                sendFileTransferCall(instanceId, videoBlob, 'video');
            }, instanceId);
        } else {
            displayErrorMessage(uploadConfig(instanceId).ErrMsgFileSizeExceeded, instanceId);
        }
    } else {
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

    var image = getElementByDynamicId("capturedImage", instanceId);

    if (!image || image.hasAttribute("hidden") || !image.src) {
        displayErrorMessage(uploadConfig(instanceId).ErrMsgSelectFile, instanceId);
        return;
    }

    var image_b64 = window.atob(image.src.split(",")[1]);
    var tmp = new Uint8Array(image_b64.length);

    for (var i = 0; i < image_b64.length; i++) {
        tmp[i] = image_b64.charCodeAt(i);
    }

    var file = new Blob([tmp], {type: "image/png"});

    if (validFileSize(instanceId, file)) {
        generateNewToken(function(token){
            uploadConfig(instanceId).token = token;
            sendFileTransferCall(instanceId, file, 'image');
        }, instanceId);
    } else {
        displayErrorMessage(uploadConfig(instanceId).ErrMsgFileSizeExceeded, instanceId);
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

    var generateTokenError = function () {
        hideOverlay(instanceId);
        displayErrorMessage(uploadConfig(instanceId).ErrMsgInvalidApiSecretKeys, instanceId);
    };

    var generateTokenBeforeSend = function(){
        showOverlay(instanceId);
    };

    sendAjaxPostCall(url, data, true, generateTokenSuccess, generateTokenError, generateTokenBeforeSend);
}

/*
*	instanceId {Integer} ID of the current adc
*	fileData {Data} Data from the current file
* 	type {String} Type of file (video or photo)
* 	Generates right url, success and error callbacks and transfers it to sendAjaxPostCall function
*/
function sendFileTransferCall(instanceId, fileData, type) {
    if (!uploadConfig(instanceId).token) {
        displayErrorMessage(uploadConfig(instanceId).ErrMsgToken, instanceId);
        return;
    }

    var projectName = uploadConfig(instanceId).ausProjectName;
    var shortcut = uploadConfig(instanceId).shortcut;
    var seed = uploadConfig(instanceId).seedvalue;
    var guid = uploadConfig(instanceId).guidstring;

    var fileDataName = function () {
        if (type == 'video') return getVideoFileName(fileData, 'file-name');
        if (type == 'image') return 'file-name.png';
        return 'file-name';
    };

    if (guid.charAt(0) == "{") guid = guid.substr(1);
    if (guid.charAt(guid.length - 1) == "}") guid = guid.substr(0, guid.length - 1);

    var url = uploadConfig(instanceId).uploadUrl +
        "?tokenkey=" + encodeURIComponent(uploadConfig(instanceId).token) +
        "&filename=" + encodeURIComponent(fileDataName()) +
        "&projectname=" + encodeURIComponent(projectName) +
        "&shortcut=" + encodeURIComponent(shortcut) +
        "&seed=" + encodeURIComponent(seed) +
        "&guid=" + encodeURIComponent(guid);

    var uploadSuccessCallback = function (response) {
        getElementByDynamicId("HidResult", instanceId).value = response.DestinationFileName;
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

    var uploadErrorCallback = function () {
        getElementByDynamicId("HidResult", instanceId).value = '';
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
function sendAjaxPostCall(url, data, isJsonRequest, successCallback, errorCallback, beforeSend) {
    var http = new XMLHttpRequest();
    http.open("POST", url, true);

    if (isJsonRequest) {
        http.setRequestHeader("Content-type", "application/json");
        data = JSON.stringify(data);
    }

    http.onreadystatechange = function () {
        if (http.readyState == 4) {
            var response = null;

            try {
                response = JSON.parse(http.responseText);
            } catch (e) {
                response = http.responseText;
            }

            if (http.status == 200) {
                successCallback(response);
            } else {
                errorCallback(response);
            }
        }
    };

    if (beforeSend) {
        beforeSend();
    }

    http.send(data);
}

/*
* 	ele {DOM Element} Element from the HTML
*	cls {String} A class
* 	Returns a boolean depending on the element ele having the class cls or not
*/
function hasClass(ele, cls) {
    if (!ele || !ele.className) {
        return false;
    }

    return ele.className.match(new RegExp('(\\s|^)' + cls + '(\\s|$)'));
}

/*
* 	ele {DOM Element} Element from the HTML
*	cls {String} A class
* 	Removes the class cls from element ele, if ele has the class cls
*/
function removeClass(ele, cls) {
    if (!ele) {
        return;
    }

    if (hasClass(ele, cls)) {
        var reg = new RegExp('(\\s|^)' + cls + '(\\s|$)');
        ele.className = ele.className.replace(reg, ' ');
    }
}

/*
* 	ele {DOM Element} Element from the HTML
*	cls {String} A class
* 	Add the class cls to the element ele, if ele has not the class cls already
*/
function addClass(ele, cls) {
    if (!ele) {
        return;
    }

    if (!hasClass(ele, cls)) {
        ele.className += ' ' + cls;
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
    div.style.backgroundColor = 'rgb(' + colorcode + ')';
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

    if (!btn) {
        return;
    }

    btn.disabled = true;
    addClass(btn, "disabled");
    btn.style.cursor = "not-allowed";
}

/*
*	instanceId {Integer} ID of the current adc
* 	Enable the upload button
*/
function enableUploadBtn(instanceId) {
    var btn = getElementByDynamicId("btnUpload", instanceId);

    if (!btn) {
        return;
    }

    btn.disabled = false;
    removeClass(btn, "disabled");
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
* 	Start image preview stream
*/
function startImagePreview(instanceId) {
    var video = getElementByDynamicId('preview', instanceId);

    if (!video) {
        return;
    }

    navigator.mediaDevices.getUserMedia({ video: true }).then(function(stream) {
        imageStreams[instanceId] = stream;
        setSrcObject(stream, video);
    }).catch(function(error) {
        displayErrorMessage(uploadConfig(instanceId).ErrMsgUserMediaAccess, instanceId);
        console.error("Cannot access media devices: ", error);
    });
}

/*
*	instanceId {Integer} ID of the current adc
* 	Start the record of a video, displays the stream on screen, storing the stream in videoRecorder variable
*/
function startRecordingVideo(instanceId) {
    hideErrorMessage(instanceId);
    hideSuccessMessage(instanceId);

    var video = getElementByDynamicId('player', instanceId);
    var startBtn = getElementByDynamicId('btn-start-recording', instanceId);
    var stopBtn = getElementByDynamicId('btn-stop-recording', instanceId);
    var saveBtn = getElementByDynamicId("btnSave", instanceId);

    if (startBtn) {
        startBtn.disabled = true;
    }

    if (stopBtn) {
        stopBtn.disabled = true;
    }

    removeClass(video, "saved");

    if (saveBtn) {
        saveBtn.disabled = false;
    }

    if (uploadConfig(instanceId).allowUploadFileChange == 1) {
        enableUploadBtn(instanceId);
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        displayErrorMessage(uploadConfig(instanceId).ErrMsgUserMediaAccess, instanceId);

        if (startBtn) {
            startBtn.disabled = false;
        }

        return;
    }

    navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
    }).then(function(stream) {
        clearMediaSource(video);
        setSrcObject(stream, video);
        video.muted = true;

        var recorderOptions = {
            type: "video",
            audioBitsPerSecond: 128000,
            videoBitsPerSecond: 2500000
        };

        var supportedMimeType = getSupportedVideoMimeType();

        if (supportedMimeType) {
            recorderOptions.mimeType = supportedMimeType;
        }

        console.log("Selected video MIME type:", supportedMimeType || "browser default");

        var recorder = new RecordRTCPromisesHandler(stream, recorderOptions);
        recorder.stream = stream;
        setVideoRecorder(instanceId, recorder);

        var playPromise;

        try {
            playPromise = video.play();
        } catch (e) {}

        if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(function() {});
        }

        return recorder.startRecording();
    }).then(function() {
        console.info('Recording video ...');

        if (stopBtn) {
            stopBtn.disabled = false;
        }
    }).catch(function(error) {
        console.error('Cannot start video recording: ', error);
        displayErrorMessage(uploadConfig(instanceId).ErrMsgStartRec, instanceId);

        var recorder = getVideoRecorder(instanceId);

        if (recorder && recorder.stream) {
            stopStreamTracks(recorder.stream);
        }

        clearMediaSource(video);
        setVideoRecorder(instanceId, undefined);

        if (startBtn) {
            startBtn.disabled = false;
        }

        if (stopBtn) {
            stopBtn.disabled = true;
        }
    });
}

/*
*	instanceId {Integer} ID of the current adc
* 	Stop the video recording, displays the recorded video on screen and stores the video in videoRecorder variable
*/
function stopRecordingVideo(instanceId) {
    var startBtn = getElementByDynamicId('btn-start-recording', instanceId);
    var stopBtn = getElementByDynamicId('btn-stop-recording', instanceId);
    var video = getElementByDynamicId('player', instanceId);
    var recorder = getVideoRecorder(instanceId);

    if (stopBtn) {
        stopBtn.disabled = true;
    }

    if (!recorder) {
        displayErrorMessage(uploadConfig(instanceId).ErrMsgStopRec, instanceId);

        if (startBtn) {
            startBtn.disabled = false;
        }

        return;
    }

    recorder.stopRecording().then(function() {
        console.info('stopRecording success');

        clearMediaSource(video);

        if (!recorder.blob) {
            throw "Empty video blob.";
        }

        video.src = URL.createObjectURL(recorder.blob);
        video.muted = false;

        try {
            video.load();
        } catch (e) {}

        var playPromise;

        try {
            playPromise = video.play();
        } catch (e) {}

        if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(function() {});
        }

        stopStreamTracks(recorder.stream);

        if (startBtn) {
            startBtn.disabled = false;
        }
    }).catch(function(error) {
        displayErrorMessage(uploadConfig(instanceId).ErrMsgStopRec, instanceId);
        console.log("Stop recording error:", error);

        stopStreamTracks(recorder && recorder.stream ? recorder.stream : null);
        clearMediaSource(video);

        if (startBtn) {
            startBtn.disabled = false;
        }
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

    var video = getElementByDynamicId('preview', instanceId);
    var canvas = getElementByDynamicId("canvas", instanceId);
    var img = getElementByDynamicId("capturedImage", instanceId);

    if (!video || !canvas || !img) {
        displayErrorMessage(uploadConfig(instanceId).ErrMsgSave, instanceId);
        return;
    }

    if (img.hasAttribute("hidden")) {
        img.removeAttribute("hidden");
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    img.src = canvas.toDataURL('image/png');
}