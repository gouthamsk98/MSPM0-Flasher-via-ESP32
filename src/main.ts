import "./style.css";
import {
  connect,
  erase,
  flash,
  readFile,
  reset,
  verify,
  getDeviceInfo,
  fileDrop,
} from "./connection.ts";
document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
<h1>MSPMO Flasher via UART</h1>
<h4>Supported Browsers: Chrome, Edge</h4>
<div class="container">
  <div class="left">
    <button id="connect" type="button">Connect</button>
    <input type="file" id="myfile" name="myfile" accept=".hex">
    <div id="dropZone" style="border: 2px dashed #ccc; padding: 10px; margin-top: 10px;">
      Drag and drop your file here
    </div>
    <div id="dropMessage" style="margin-top: 10px; color: green; display: none;">
      File has been uploaded successfully!
    </div><br><br>
    <input type="checkbox" id="toggleTraceLog" checked> Enable Trace Log
    <button id="getDeviceInfo" type="button">Get Device Info</button>
    <button id="erase" type="button">Erase</button>
    <button id="flash" type="button">Flash</button>
    <button id="verify" type="button">Verify</button>
    <button id="reset" type="button">Reset</button>
    <textarea id="console" rows="15" cols="50" readonly></textarea>
  </div>
  <div class="right">
    <h4>Trace Log</h4>
    <textarea id="traceLog" rows="20" cols="50" readonly></textarea>
  </div>
</div>
`;
const traceLog_button = document.getElementById("toggleTraceLog");
const traceLog = document.getElementById("traceLog");
console.log("trace", traceLog, traceLog_button);
if (traceLog_button && traceLog)
  traceLog_button.addEventListener("change", function () {
    if (traceLog.style.display == "none") traceLog.style.display = "inline";
    else traceLog.style.display = "none";
  });

connect(document.querySelector<HTMLButtonElement>("#connect")!);
getDeviceInfo(document.querySelector<HTMLButtonElement>("#getDeviceInfo")!);
erase(document.querySelector<HTMLButtonElement>("#erase")!);
flash(document.querySelector<HTMLButtonElement>("#flash")!);
readFile(document.querySelector<HTMLInputElement>("#myfile")!);
reset(document.querySelector<HTMLButtonElement>("#reset")!);
verify(document.querySelector<HTMLButtonElement>("#verify")!);
fileDrop(
  document.querySelector<HTMLDivElement>("#dropZone")!,
  document.querySelector<HTMLInputElement>("#myfile")!,
  document.querySelector<HTMLElement>("#dropMessage")!
);
