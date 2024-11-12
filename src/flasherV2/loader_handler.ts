//***************************************************************************************
//  MSPM0 Flasher
//
//  Receives information from backchannel UART, tells target BSL to:
//  Description; Flashes the all target MSPM0 series using external Espressif ESP32s3.
//      1) Wipe target device using the incorrect password method.
//      2) Write any bytes the connected PC tells this device to write to the target.
//      3) Inform the controlling PC of any UART or other errors.
//
// Copyright (c) Nov 2024 Goutham S Krishna
// Evobi Automations Pvt Ltd
// All rights reserved.
// This code is licensed under the MIT License.
// You may obtain a copy of the License at https://opensource.org/licenses/MIT
//***************************************************************************************
import { SerialTransport } from "./transport_handler";
import { Protocol, BSLResponse } from "./protocol_handler";
import {
  BSLCommand,
  CommandResponse,
  ESPCommand,
  OLEDPOS,
} from "./protocol_handler";
export class MSPLoaderV2 extends SerialTransport {
  DEFAULT_TIMEOUT = 2000;
  conn_established = false;
  FLASH_START_ADDRESS = 0x0000;
  FLASH_MAX_BUFFER_SIZE = 0x0000;
  BSL_PW_RESET = [
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
  ];

  //******************************* BSL Core MessageFrame Format**************************
  // |Header|Length|RSP|MSG Data|CRC32|
  // |1 Byte|2 Byte|1 Byte|N Byte|4 Byte|
  //********************************BSL Core Response**************************************
  MEMORY_READ_RESPONSE = 0x30;
  DEVICE_INFO_RESPONSE = 0x31;
  STANDALONE_VERIFY_RESPONSE = 0x32;
  MESSAGE_RESPONSE = 0x3b;
  ERROR_RESPONSE = 0x3a;
  //***************************************************************************************

  //********************************ESP Controll*******************************************
  ESP_CMD: ESPCommand = {
    BSL_ENBL: ["B", "S", "L"],
    OLED_CLR: ["O", "L", "D", "R", "S", "T"],
    OLED_ON: ["O", "L", "D", "O", "N"],
    OLED_OFF: ["O", "L", "D", "O", "F", "F"],
    OLED_PRINT: ["O", "L", "D", "W", "R", "T"],
  };
  //***************************************************************************************

  constructor(device: SerialPort) {
    super(device);
  }
  /**
   * Array of strings to array of uint8
   */
  sa2a(s: string[]): Uint8Array {
    let a = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) {
      a[i] = s[i].charCodeAt(0);
    }
    return a;
  }
  /**
   * string to array of uint8
   */
  s2a(s: string): Uint8Array {
    let a = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) {
      a[i] = s.charCodeAt(i);
    }
    return a;
  }
  async enableBSL() {
    await this.send(new Uint8Array(this.sa2a(this.ESP_CMD.BSL_ENBL)));
    await this.read(this.DEFAULT_TIMEOUT, 5);
    await this.esp_oled_print("BSL", OLEDPOS.ALIGN_TOP_LEFT, 0, 0);
    await this.sleep(100);
  }
  async control_esp_oled(cmd: string[]) {
    await this.send(this.sa2a(cmd));
    await this.receive();
  }
  async establish_conn() {
    this.debug("Enabling BSL Mode...");
    await this.enableBSL();
    let cmd: BSLCommand = { type: "Connection" };
    let send = await Protocol.getFrameRaw(cmd);
    await this.send(send);
    let resRaw = await this.receive();
    let res = Protocol.getResponse(resRaw, cmd);
    if (res.response == BSLResponse.BSL_ACK) {
      this.conn_established = true;
      this.debug("BSL Mode Enabled");
      await this.get_device_info();
    } else {
      this.debug("BSL Mode Enable Failed", res.response);
      this.conn_established = false;
      throw new Error("BSL Mode Enable Failed");
    }
  }
  check_crc(frame: Uint8Array): boolean {
    const data_length = (frame[3] << 8) | frame[2];
    const data = frame.slice(4, 3 + data_length);
    const crc = Protocol.softwareCRC(data, data_length);
    // check if crc and last 4 bytes of frame are same
    const check_crc_value =
      (crc[0] << 24) | (crc[1] << 16) | (crc[2] << 8) | crc[3];
    const frame_crc_value =
      (frame[frame.length - 4] << 24) |
      (frame[frame.length - 3] << 16) |
      (frame[frame.length - 2] << 8) |
      frame[frame.length - 1];
    if (check_crc_value != frame_crc_value) {
      this.debug("CRC Check Failed");
      throw new Error("CRC Check Failed");
    }
    return true;
  }
  async get_device_info() {
    if (!this.conn_established) this.establish_conn();
    const cmd: BSLCommand = { type: "GetDeviceInfo" };
    const send = await Protocol.getFrameRaw(cmd);
    await this.send(send);
    const resRaw = await this.receive();
    const resSlip = this.slipReader(resRaw);
    this.check_crc(resSlip);
    let res: CommandResponse = Protocol.getResponse(resSlip, cmd);
    if (res.response == BSLResponse.BSL_ACK && res.type == "GetDeviceInfo") {
      this.FLASH_MAX_BUFFER_SIZE = res.BSL_max_buffer_size;
      this.FLASH_START_ADDRESS = res.BSL_buffer_start_address;
      this.debug(`Device Info:
        CMD_interpreter_version: 0x${res.CMD_interpreter_version.toString(16)}
        build_id: 0x${res.build_id.toString(16)}
        app_version: 0x${res.app_version.toString(16)}
        active_plugin_interface_version: 0x${res.active_plugin_interface_version.toString(
          16
        )}
        BSL_max_buffer_size: 0x${res.BSL_max_buffer_size.toString(16)}
        BSL_buffer_start_address: 0x${res.BSL_buffer_start_address.toString(16)}
        BCR_config_id: 0x${res.BCR_config_id.toString(16)}
        BSL_config_id: 0x${res.BSL_config_id.toString(16)}`);
      await this.unlock_bootloader();
    } else {
      this.debug("Device Info Failed", res.response);
    }
  }
  async unlock_bootloader() {
    if (!this.conn_established) await this.establish_conn();
    this.debug("Unlocking Bootloader ...");
    let cmd: BSLCommand = {
      type: "UnlockBootloader",
      password: new Uint8Array(this.BSL_PW_RESET),
    };
    let send = await Protocol.getFrameRaw(cmd);
    await this.send(send);
    let resRaw = await this.read(this.DEFAULT_TIMEOUT, 10);
    let res = Protocol.getResponse(resRaw, cmd);
    if (res.response == BSLResponse.BSL_ACK) {
      this.debug("Bootloader Unlocked");
    } else {
      this.debug("Bootloader Unlock Failed", res.response);
      throw new Error("Bootloader Unlock Failed");
    }
  }
  async mass_earse() {
    if (!this.conn_established) await this.establish_conn();
    await this.esp_oled_print("Erasing ...", OLEDPOS.ALIGN_TOP_LEFT, 0, 0);
    this.debug("Mass Erasing ...");
    let cmd: BSLCommand = { type: "MassErase" };
    let send = await Protocol.getFrameRaw(cmd);
    await this.send(send);
    console.log("send is", this.hexify(send));
    let resRaw = await this.read(this.DEFAULT_TIMEOUT, 10);
    let res = Protocol.getResponse(resRaw, cmd);
    if (res.response == BSLResponse.BSL_ACK) {
      this.debug("Mass Erase Done");
      await this.esp_oled_print("Erase Done", OLEDPOS.ALIGN_TOP_LEFT, 0, 0);
    } else {
      this.debug("Mass Erase Failed", res.response);
      await this.esp_oled_print("Erase Failed", OLEDPOS.ALIGN_TOP_LEFT, 0, 0);
    }
  }
  async esp_oled_print(
    text: string,
    align: OLEDPOS = OLEDPOS.ALIGN_DEFAULT,
    x_offset = 0,
    y_offset = 0
  ) {
    await this.send(new Uint8Array(this.sa2a(this.ESP_CMD.OLED_CLR)));
    await this.read(this.DEFAULT_TIMEOUT, 8);
    let data = new Uint8Array([
      ...this.sa2a(this.ESP_CMD.OLED_PRINT),
      align,
      x_offset,
      y_offset,
      ...this.s2a(text),
    ]);
    await this.send(data);
    await this.read(this.DEFAULT_TIMEOUT, 5);
  }
  async program_data(hex: string) {
    if (!this.conn_established) await this.establish_conn();
    await this.esp_oled_print("Flashing...", OLEDPOS.ALIGN_TOP_LEFT, 0, 0);
    const raw = this.intelHexToUint8Array(hex);
    let address = 0x00000000; //this.FLASH_START_ADDRESS;
    console.log("adress", address);
    const cmd: BSLCommand = {
      type: "ProgramData",
      start_address: address,
      data: raw,
    };
    let send = await Protocol.getFrameRaw(cmd);
    await this.send(send);
    let resRaw = await this.read(this.DEFAULT_TIMEOUT, 10);
    let res = Protocol.getResponse(resRaw, cmd);
    if (res.response == BSLResponse.BSL_ACK) {
      this.debug("Data Programmed");
      await this.esp_oled_print("Flashed", OLEDPOS.ALIGN_TOP_LEFT, 0, 0);
    } else {
      this.debug("Data Program Failed", res.response);
      throw new Error("Data Program Failed");
    }
  }
  async flash_earse_range() {
    this.debug("to be implemneted ");
  }
  async verifyFlash() {
    this.debug("to be implemneted ");
  }
  async start_app() {
    if (!this.conn_established) this.establish_conn();
    let cmd1: BSLCommand = { type: "StartApp" };
    let send1 = await Protocol.getFrameRaw(cmd1);
    await this.send(send1);
    let resRaw = await this.read(this.DEFAULT_TIMEOUT, 1);
    let res = Protocol.getResponse(resRaw, cmd1);
    if (res.response == BSLResponse.BSL_ACK) {
      this.conn_established = false;
      await this.esp_oled_print("App Started", OLEDPOS.ALIGN_TOP_LEFT, 0, 0);
      this.debug("App Started");
    } else {
      this.debug("App Start Failed", res.response);
    }
  }
}
