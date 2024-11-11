import "./style.css";
import {
  connect,
  erase,
  flash,
  readFile,
  reset,
  verify,
  getDeviceInfo,
} from "./connection.ts";
document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
<h1>MSPMO Flasher via UART</h1>
<h4>Supported Browsers: Chrome, Edge</h4>
<div class="container">
  <div class="left">
    <button id="connect" type="button">Connect</button>
    <input type="file" id="myfile" name="myfile" accept=".hex">

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

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("myfile");
const dropMessage = document.getElementById("dropMessage");
const traceLog_button = document.getElementById("toggleTraceLog");
const traceLog = document.getElementById("traceLog");
console.log("trace", traceLog, traceLog_button);
if (traceLog_button && traceLog)
  traceLog_button.addEventListener("change", function () {
    if (traceLog.style.display == "none") traceLog.style.display = "inline";
    else traceLog.style.display = "none";
  });
if (dropZone && fileInput && dropMessage) {
  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.style.borderColor = "#646cff";
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.style.borderColor = "#ccc";
  });

  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.style.borderColor = "#ccc";
    if (!event.dataTransfer) return;
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      // fileInput.files = files;
      dropMessage.style.display = "block";
    }
  });
}
connect(document.querySelector<HTMLButtonElement>("#connect")!);
getDeviceInfo(document.querySelector<HTMLButtonElement>("#getDeviceInfo")!);
erase(document.querySelector<HTMLButtonElement>("#erase")!);
flash(document.querySelector<HTMLButtonElement>("#flash")!);
readFile(document.querySelector<HTMLInputElement>("#myfile")!);
reset(document.querySelector<HTMLButtonElement>("#reset")!);
verify(document.querySelector<HTMLButtonElement>("#verify")!);
