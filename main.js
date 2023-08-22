
var fpHTTSrvOpEP = "http://127.0.0.1:15170/fpoperation"

var btnEnrollAnsi;
var btnEnrollFTR;
var btnEnrollFTRIdn;
var btnCapture;
var btnCancel;

var checkBoxConvToISO;
var sampleNumList;

var testUserName;

var resultLink

var fingerFrame;

var lastInitOp;

function fixError(statusText, errorText) {
    textResult.style = "color:red"
    
    if(errorText != "") {
        if( statusText != "" ) {
            textResult.innerHTML = errorText + "(" + statusText + ")";
        }
        else {
            textResult.innerHTML = errorText;
        }
    }
    else {
        textResult.innerHTML = statusText
    }
}

function setAskTest(textMes) {
    textResult.style = "color:blue"
    textResult.innerHTML = textMes;
}

function setOperationResult(textMes) {
    textResult.style = "color:green"
    textResult.innerHTML = textMes;
}

function beginOperation(opName,libName, sendSampleNum) {

    var sampleNum = "1"
    if(sendSampleNum) {
        sampleNum = sampleNumList.value;
        
        var checkNum = parseInt(sampleNum);
        
        if(checkNum < 3 || checkNum > 10 || sampleNum == "") {
            fixError("", "Invalid number of samples")
            return;
        }
    }

    var req = JSON.stringify({operation: opName, username: "", usedlib: libName, isoconv: checkBoxConvToISO.checked ? "1" : "0", samplenum: sampleNum });
    enableControlsForOp(true);
    resultLink.innerHTML = "";

    post(fpHTTSrvOpEP, req).then(function(response) {
        setAskTest("Operation begin");
        parseOperationDsc(JSON.parse(response));
    }).catch(function(error) {
        enableControlsForOp(false);
    })
}

function cancelOperation() {
    var url = fpHTTSrvOpEP + '/' + lastInitOp + '/cancel';
    put(url);
}

function getOperationState(opId) {
    var url = fpHTTSrvOpEP + '/' + opId;

     get(url,false).then(function(response) {
         parseOperationDsc(JSON.parse(response));
    }).catch(function(error) {
        enableControlsForOp(false);
    })
    
}

function getOperationImg(opId,frameWidth, frameHeight) {
    var url = fpHTTSrvOpEP + '/' + opId + '/image';

     get(url,true).then(function(response) {
         drawFingerFrame(new Uint8Array(response),opId, frameWidth, frameHeight);
    }).catch(function(error) {
        enableControlsForOp(false);
    })
}

function linkOperationTemplate(opId, operationName) {
    var target = "/template";
    var saveAs = "template.bin"
    var resultText = "Result template"
    if ( operationName == 'capture' ) {
        target = "/image"
        saveAs = "image.bin"
        resultText = "Result image bytes"
    }
    var url = fpHTTSrvOpEP + '/' + opId + target;

    resultLink.href = url;
    resultLink.download = saveAs;
    resultLink.innerHTML = resultText;

    //resultLink.click()
}

function deleteOperation(opId) {
    var url = fpHTTSrvOpEP + '/' + opId;
    deleteVerb(url);
}

function parseOperationDsc(opDsc) {
    var res = true;

    if(opDsc.state == 'done') {
        enableControlsForOp(false);

        if(opDsc.status == 'success') {
            setOperationResult(opDsc.message);
            linkOperationTemplate(opDsc.id, opDsc.operation)
        }

        if(opDsc.status == 'fail') {
            fixError("", opDsc.errorstr)
            res = false;
            
            if(parseInt(opDsc.errornum) != -1) {
                deleteOperation(opDsc.id);
            }
        }
    }
    else if(opDsc.state == 'init') {
        lastInitOp = opDsc.id
        setTimeout(getOperationState, 1000, opDsc.id);
        setTimeout(getOperationImg, 1000, opDsc.id, parseInt(opDsc.devwidth), parseInt(opDsc.devheight));
    }
    else if(opDsc.state == 'inprogress')
    {
        if(opDsc.fingercmd == 'puton') {
            setAskTest("Put finger on scanner");
        }

        if(opDsc.fingercmd == 'takeoff') {
            setAskTest("Take off finger from scanner");
        }

        setTimeout(getOperationState, 1000, opDsc.id);
        setTimeout(getOperationImg, 1000, opDsc.id, parseInt(opDsc.devwidth), parseInt(opDsc.devheight));
    }

    return res;
}

function drawFingerFrame(frameBytes,opId, frameWidth, frameHeight) {
    var ctx = fingerFrame.getContext('2d');
    var imgData= ctx.createImageData(fingerFrame.width,fingerFrame.height);

    for(var i = 0; i < frameBytes.length; i++) {
      // red
      imgData.data[4*i] = frameBytes[i];
      // green
      imgData.data[4*i + 1] = frameBytes[i];
      // blue
      imgData.data[4*i + 2] = frameBytes[i];
      //alpha
      imgData.data[4*i + 3] = 255;
    }

    ctx.putImageData(imgData, 0, 0, 0, 0, fingerFrame.width,fingerFrame.height);
}

function get(url, asArray) {
  return new Promise(function(resolve, reject) {

    var req = new XMLHttpRequest();
    req.open('GET', url);
    
    if(asArray) {
        req.responseType = "arraybuffer";
    }

    req.onload = function() {

      if (req.status == 200) {
        resolve(req.response);
      }
      else {
        reject(fixError(req.statusText, "Server response"));
      }
    };

    req.onerror = function() {
      reject(fixError("", "Can't link to local Futronic Web Server Demo. Use following link to download it"));
    };

    req.send();
  });
}

function post(url,json) {
  return new Promise(function(resolve, reject) {

    var req = new XMLHttpRequest();
    req.open("POST", url);
    req.setRequestHeader('Content-type', 'application/json; charset=utf-8');

    req.onload = function() {
      if (req.status == 200) {
        resolve(req.response);
      }
      else {
        reject(fixError(req.statusText, "Server response"));
      }
    };

    req.onerror = function() {
      reject(fixError("", "FPHttpServer not available"));
    };

    req.send(json);
  });
}

function deleteVerb(url) {
  return new Promise(function(resolve, reject) {

    var req = new XMLHttpRequest();
    req.open("DELETE", url);

    req.onload = function() {
      if (req.status == 200) {
        resolve(req.response);
      }
      else {
        //reject(fixError(req.statusText, "Server response"));
      }
    };

    req.onerror = function() {
      reject(fixError("", "FPHttpServer not available"));
    };

    req.send();
  });
}

function put(url) {
  return new Promise(function(resolve, reject) {

    var req = new XMLHttpRequest();
    req.open('PUT', url);

    req.onload = function() {

      if (req.status == 200) {
        resolve(req.response);
      }
      else {
        reject(fixError(req.statusText, "Server response"));
      }
    };

    req.onerror = function() {
      reject(fixError("", "FPHttpServer not available"));
    };

    req.send();
  });
}

function enableControls() {
    btnEnrollAnsi.disabled = false;
    btnEnrollFTR.disabled = false;
    btnCapture.disabled = false;
    btnEnrollFTRIdn.disabled = false;
}

function enableControlsForOp(opBegin) {
    btnEnrollAnsi.disabled = opBegin;
    btnEnrollFTR.disabled = opBegin;
    btnCapture.disabled = opBegin;
    btnEnrollFTRIdn.disabled = opBegin;
    btnCancel.disabled = !opBegin
}

function CheckFPHttpSrvConnection()
{
    get(fpHTTSrvOpEP,false).then(function(response) {
        enableControls();
        resultLink.innerHTML = "";
        setAskTest("Press operation button");
    }).catch(function(error) {
        setTimeout(CheckFPHttpSrvConnection, 1000);
    })
}

function onBodyLoad()
{
    btnEnrollAnsi = document.getElementById("EnrollBtnANSI");
    btnEnrollFTR = document.getElementById("EnrollBtnFTRAPI");
    btnCapture = document.getElementById("CaptureBtn");
    btnCancel = document.getElementById("CancelBtn");
    btnEnrollFTRIdn = document.getElementById("EnrollIdnBtnFTRAPI");

    textResult =   document.getElementById("result");
    testUserName = document.getElementById("txtUserName");

    fingerFrame = document.getElementById("fingerframe");
    resultLink = document.getElementById("resultLink");
    
    checkBoxConvToISO = document.getElementById("ConvIsoCheckBox");
    sampleNumList = document.getElementById("sampleNumList");

    var defImg = new Image();

    defImg.onload = function() {
        var context = fingerFrame.getContext('2d');
        context.drawImage(defImg, 0, 0);
    };
    defImg.src = "defframe.png";

    CheckFPHttpSrvConnection();
}