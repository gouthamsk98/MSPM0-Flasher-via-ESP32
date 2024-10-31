import { MSPLoader } from "./flasher/msp_loader";
let connection = false;
let loader: MSPLoader;
let fileContent: string;
const filters_serial = [{ usbVendorId: 0x303a, usbProductId: 0x1001 }];
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
        loader = await new MSPLoader(port);
        await loader.connect();
        // await loader.BSLInit();
        element.innerHTML = `Connected`;
        connection = true;
      })
      .catch((error) => {
        console.error(error);
        alert("Error Connecting");
        loader.disconnect();
        element.innerHTML = `Connect`;
        connection = false;
      });
  });
}
export function erase(element: HTMLButtonElement) {
  element.addEventListener("click", async () => {
    if (!connection) {
      alert("Please Connect First");
      return;
    }
    element.innerHTML = `Erasing...`;
    try {
      await loader.erase();
      alert("Erase Done");
    } catch (e) {
      console.log(e);
      alert("Error Erasing");
    }
    element.innerHTML = `Erase`;
  });
}
export function verify(element: HTMLButtonElement) {
  element.addEventListener("click", async () => {
    if (!connection) {
      alert("Please Connect First");
      return;
    }
    if (!fileContent) {
      alert("Please upload a .Hex file first");
      return;
    }
    element.innerHTML = `Verifying...`;
    try {
      await loader.verifyFlash(fileContent);
    } catch (e) {
      console.log(e);
      alert("Error Verifying");
    }
    element.innerHTML = `Verify`;
  });
}
export function flash(element: HTMLButtonElement) {
  element.addEventListener("click", async () => {
    if (!connection) {
      alert("Please Connect First");
      return;
    }
    if (!fileContent) {
      alert("Please upload a .Hex file first");
      return;
    }
    element.innerHTML = `Flashing...`;
    try {
      await loader.writeFlash(fileContent);
      alert("Flashing Done");
    } catch (e) {
      console.log(e);
      alert("Error Flashing");
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
    const file = (event.target as HTMLInputElement).files![0];
    if (file && file.name.endsWith(".hex")) {
      fileContent = await readFileAsText(file);
      console.log(fileContent);
    } else {
      alert("Please upload a valid .hex file");
    }
  });
}
export function reset(element: HTMLButtonElement) {
  element.addEventListener("click", async () => {
    if (!connection) {
      alert("Please Connect First");
      return;
    }
    element.innerHTML = `Resting...`;
    await loader.startApp();
    element.innerHTML = `Reset`;
  });
}
