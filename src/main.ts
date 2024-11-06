import "./style.css";
import {
  connect,
  erase,
  flash,
  readFile,
  reset,
  verify,
  test,
} from "./connection.ts";
document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <h1>MSPMO Flasher via ESP</h1>
    <h4>Supported Browsers: Chrome, Edge</h4>
    <button id="connect" type="button">Connect</button
    <input type="file" id="myfile" name="myfile" accept=".hex">
    <input type="file" id="myfile" name="myfile"><br><br>
    <button id="test" type="button">Test</button>
    <button id="erase" type="button">Erase</button>
      <button id="flash" type="button">Flash</button>
      <button id="verify" type="button">Verify</button>
      <button id="reset" type="button">Reset</button>
      <textarea id="console" rows="15" cols="50" readonly></textarea>
  </div>
`;
connect(document.querySelector<HTMLButtonElement>("#connect")!);
test(document.querySelector<HTMLButtonElement>("#test")!);
erase(document.querySelector<HTMLButtonElement>("#erase")!);
flash(document.querySelector<HTMLButtonElement>("#flash")!);
readFile(document.querySelector<HTMLInputElement>("#myfile")!);
reset(document.querySelector<HTMLButtonElement>("#reset")!);
verify(document.querySelector<HTMLButtonElement>("#verify")!);
