import { MSPLoader } from "./flasher/msp_loader";
import { MSPLoaderV2 } from "./flasherV2/loader_handler";
let connection = false;
let loader: MSPLoader;
let loaderv2: MSPLoaderV2;
let fileContent: string;
const filters_serial = [
  { usbVendorId: 0x303a, usbProductId: 0x1001 },
  {
    usbVendorId: 0xb1b0,
    usbProductId: 0x8055,
  },
];
export function connect(element: HTMLButtonElement) {
  element.addEventListener("click", () => {
    if (connection && loader) {
      loader.disconnect();
      element.innerHTML = `Connect`;
      connection = false;
      return;
    }
    element.innerHTML = `Connecting...`;
    navigator.serial
      .requestPort({ filters: filters_serial })
      .then(async (port) => {
        // loader = await new MSPLoader(port);
        // await loader.connect();
        loaderv2 = await new MSPLoaderV2(port);
        await loaderv2.connect();
        // await loader.BSLInit();
        element.innerHTML = `Connected`;
        connection = true;
      })
      .catch((error) => {
        console.error(error);
        MSPLoader.mdebug(1, "Error Connecting");
        loader.disconnect();
        element.innerHTML = `Connect`;
        connection = false;
      });
  });
}
export function erase(element: HTMLButtonElement) {
  element.addEventListener("click", async () => {
    if (!connection) {
      MSPLoader.mdebug(1, "Please Connect First");
      return;
    }
    element.innerHTML = `Erasing...`;
    try {
      await loader.erase();
    } catch (e) {
      console.log(e);
      MSPLoader.mdebug(1, "Error Erasing");
    }
    element.innerHTML = `Erase`;
  });
}
export function verify(element: HTMLButtonElement) {
  element.addEventListener("click", async () => {
    if (!connection) {
      MSPLoader.mdebug(1, "Please Connect First");
      return;
    }
    if (!fileContent) {
      MSPLoader.mdebug(1, "Please upload a .Hex file first");
      return;
    }
    element.innerHTML = `Verifying...`;
    try {
      await loader.verifyFlash(fileContent);
    } catch (e) {
      console.log(e);
      MSPLoader.mdebug(1, "Error Verifying");
    }
    element.innerHTML = `Verify`;
  });
}
export function flash(element: HTMLButtonElement) {
  element.addEventListener("click", async () => {
    if (!connection) {
      MSPLoader.mdebug(1, "Please Connect First");
      return;
    }
    if (!fileContent) {
      MSPLoader.mdebug(1, "Please upload a .Hex file first");
      return;
    }
    element.innerHTML = `Flashing...`;
    try {
      await loader.writeFlash(fileContent);
      MSPLoader.mdebug(1, "Flashing Done");
    } catch (e) {
      console.log(e);
      MSPLoader.mdebug(1, "Error Flashing");
    }
    element.innerHTML = `Flash`;
  });
}
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
export function readFile(element: HTMLInputElement) {
  element.addEventListener("change", async (event) => {
    fileContent = "";
    const file = (event.target as HTMLInputElement).files![0];
    if (file && file.name.endsWith(".hex")) {
      fileContent = await readFileAsText(file);
      console.log(fileContent);
    } else {
      MSPLoader.mdebug(1, "Please upload a valid .hex file");
    }
  });
}
export function reset(element: HTMLButtonElement) {
  element.addEventListener("click", async () => {
    if (!connection) {
      MSPLoader.mdebug(1, "Please Connect First");
      return;
    }
    element.innerHTML = `Resting...`;
    await loader.startApp();
    element.innerHTML = `Reset`;
  });
}
export function test(element: HTMLButtonElement) {
  element.addEventListener("click", async () => {
    if (!connection) {
      loaderv2.debug("Please Connect First");
      return;
    }
    element.innerHTML = `Testing...`;
    try {
      await loaderv2.establish_conn();
    } catch (e) {
      console.log(e);
      loaderv2.debug("Error Testing");
    }
    element.innerHTML = `Test`;
  });
}
