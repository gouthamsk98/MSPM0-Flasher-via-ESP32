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
    if (connection && loaderv2) {
      loaderv2.disconnect();
      element.innerHTML = `Connect`;
      connection = false;
      return;
    }
    navigator.serial
      .requestPort({ filters: filters_serial })
      .then(async (port) => {
        loaderv2 = await new MSPLoaderV2(port);
        await loaderv2.connect();
        element.innerHTML = `disconnect`;
        connection = true;
      })
      .catch((error) => {
        console.error(error);
        loaderv2.debug("Error Connecting");
        loader.disconnect();
        element.innerHTML = `Connect`;
        connection = false;
      });
  });
}
export function erase(element: HTMLButtonElement) {
  element.addEventListener("click", async () => {
    if (!connection) {
      loaderv2.debug("Please Connect First");
      return;
    }
    element.innerHTML = `Erasing...`;
    try {
      await loaderv2.mass_earse();
    } catch (e) {
      console.log(e);
      loaderv2.debug("Error Erasing");
    }
    element.innerHTML = `Mass Erase`;
  });
}
export function flash(element: HTMLButtonElement) {
  element.addEventListener("click", async () => {
    if (!connection) {
      loaderv2.debug("Please Connect First");
      return;
    }
    if (!fileContent) {
      loaderv2.debug("Please upload a .Hex file first");
      return;
    }
    element.innerHTML = `Flashing...`;
    try {
      await loaderv2.program_data(fileContent);
      loaderv2.debug("Flashing Done");
    } catch (e) {
      loaderv2.debug("Error Flashing");
    }
    element.innerHTML = `Flash`;
  });
}
export function verify(element: HTMLButtonElement) {
  element.addEventListener("click", async () => {
    if (!connection) {
      loaderv2.debug("Please Connect First");
      return;
    }
    element.innerHTML = `Verifying...`;
    try {
      await loaderv2.read_memory();
    } catch (e) {
      console.log(e);
      loaderv2.debug("Error Verifying");
    }
    element.innerHTML = `Verify`;
  });
}
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file, "utf-8");
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
      loaderv2.debug("Please upload a valid .hex file");
    }
  });
}
export function reset(element: HTMLButtonElement) {
  element.addEventListener("click", async () => {
    if (!connection) {
      loaderv2.debug("Please Connect First");
      return;
    }
    element.innerHTML = `Resting...`;
    await loaderv2.start_app();
    element.innerHTML = `Reset`;
  });
}
export function getDeviceInfo(element: HTMLButtonElement) {
  element.addEventListener("click", async () => {
    if (!connection) {
      loaderv2.debug("Please Connect First");
      return;
    }
    element.innerHTML = `Getting Device Info...`;
    try {
      await loaderv2.establish_conn();
    } catch (e) {
      console.log(e);
      loaderv2.debug("Error Getting Device Info");
    }
    element.innerHTML = `Get Device Info`;
  });
}
export function fileDrop(
  element: HTMLDivElement,
  file_element: HTMLInputElement,
  dropMessage: HTMLElement
) {
  element.addEventListener("dragover", (event) => {
    event.preventDefault();
    element.style.borderColor = "#646cff";
  });

  element.addEventListener("dragleave", () => {
    element.style.borderColor = "#ccc";
  });
  element.addEventListener("drop", async (event) => {
    event.preventDefault();
    element.style.borderColor = "#ccc";
    if (!event.dataTransfer) return;
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      dropMessage.style.display = "block";
      file_element.files = files;
      if (files && files[0].name.endsWith(".hex")) {
        fileContent = await readFileAsText(files[0]);
        console.log(fileContent);
      } else {
        loaderv2.debug("Please upload a valid .hex file");
      }
    }
  });
}
