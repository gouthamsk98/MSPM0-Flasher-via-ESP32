import { SerialTransport } from "./transport_handler";
import { Protocol, BSLResponse } from "./protocol_handler";
import { Command, CommandResponse } from "./protocol_handler";
type ESPCommands = {
  ESP_BSL_CMD: number[];
  ESP_OLED_CLR: string[];
  ESP_OLED_ON: string[];
  ESP_OLED_OFF: string[];
  ESP_OLED_PRINT: string[];
};
export class MSPLoaderV2 extends SerialTransport {
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
  ESP_BSL_CMD = [0x42, 0x53, 0x4c]; //BSL
  ESP_OLED_CLR = ["O", "L", "D", "R", "S", "T"];
  ESP_OLED_ON = ["O", "L", "D", "O", "N"];
  ESP_OLED_OFF = ["O", "L", "D", "O", "F", "F"];
  ESP_OLED_PRINT = ["O", "L", "D", "W", "R", "T"];

  //***************************************************************************************

  constructor(device: SerialPort) {
    super(device);
  }
  LSB(x: number): number {
    return x & 0x00ff;
  }

  /**
   * Array of strings to array of uint8
   */
  s2a(s: string[]): Uint8Array {
    let a = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) {
      a[i] = s[i].charCodeAt(0);
    }
    return a;
  }
  async enableBSL() {
    await this.send(new Uint8Array(this.ESP_BSL_CMD));
    await this.receive();
    await this.send(this.s2a(this.ESP_OLED_CLR));
    await this.receive();
    this.sleep(100);
  }
  async control_esp_oled(cmd: string[]) {
    await this.send(this.s2a(cmd));
    await this.receive();
  }
  async establish_conn() {
    this.debug("Enabling BSL Mode...");
    await this.enableBSL();
    let cmd: Command = { type: "Connection" };
    let send = await Protocol.getFrameRaw(cmd);
    await this.send(send);
    let resRaw = await this.receive();
    let res = Protocol.getResponse(resRaw, cmd);
    if (res.response == BSLResponse.BSL_ACK) {
      this.conn_established = true;
      this.debug("BSL Mode Enabled");
      this.get_device_info();
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
    const cmd: Command = { type: "GetDeviceInfo" };
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
      this.unlock_bootloader();
    } else {
      this.debug("Device Info Failed", res.response);
    }
  }
  async unlock_bootloader() {
    if (!this.conn_established) this.establish_conn();
    this.debug("Unlocking Bootloader ...");
    let cmd: Command = {
      type: "UnlockBootloader",
      password: new Uint8Array(this.BSL_PW_RESET),
    };
    let send = await Protocol.getFrameRaw(cmd);
    await this.send(send);
    let resRaw = await this.receive();
    let res = Protocol.getResponse(resRaw, cmd);
    if (res.response == BSLResponse.BSL_ACK) {
      this.debug("Bootloader Unlocked");
    } else {
      this.debug("Bootloader Unlock Failed", res.response);
      throw new Error("Bootloader Unlock Failed");
    }
  }
  async mass_earse() {
    if (!this.conn_established) this.establish_conn();
    this.debug("Mass Erasing ...");
    let cmd: Command = { type: "MassErase" };
    let send = await Protocol.getFrameRaw(cmd);
    await this.send(send);
    console.log("send is", this.hexify(send));
    let resRaw = await this.receive();
    let res = Protocol.getResponse(resRaw, cmd);
    if (res.response == BSLResponse.BSL_ACK) {
      this.debug("Mass Erase Done");
    } else {
      this.debug("Mass Erase Failed", res.response);
    }
  }
  async program_data(hex: string) {
    const raw = this.intelHexToUint8Array(hex);
    if (!this.conn_established) this.establish_conn();
    let address = 0x00000000; //this.FLASH_START_ADDRESS;
    console.log("adress", address);
    const cmd: Command = {
      type: "ProgramData",
      start_address: address,
      data: raw,
    };
    let send = await Protocol.getFrameRaw(cmd);
    await this.send(send);
    let resRaw = await this.receive();
    console.log("data is", resRaw);

    // for (let i = 0; i < raw.length; i += chunk_size) {
    //   let data = raw.subarray(i, i + chunk_size);
    //   const cmd: Command = {
    //     type: "ProgramData",
    //     start_address: address,
    //     data: data,
    //   };
    //   let send = await Protocol.getFrameRaw(cmd);
    //   await this.send(send);
    //   let resRaw = await this.receive();
    //   let res = Protocol.getResponse(resRaw, cmd);
    //   if (res.response == BSLResponse.BSL_ACK) {
    //     this.debug("Data Programmed");
    //   } else {
    //     this.debug("Data Program Failed", res.response);
    //     throw new Error("Data Program Failed");
    //   }
    //   address += data.length;
    //   this.sleep(100);
    // }
  }
  async flash_earse_range() {
    if (!this.conn_established) this.establish_conn();
    this.debug("Flashing ...");
    let cmd: Command = {
      type: "FlashRangeErase",
      start_address: 0x0000,
      end_address: 0x0000,
    };
    // let send = await Protocol.getFrameRaw(cmd);
    // await this.send(send);
    // let resRaw = await this.receive();
    // let res = Protocol.getResponse(resRaw, cmd);
    // if (res.response == BSLResponse.BSL_ACK) {
    //   this.debug("Mass Erase Done");
    // } else {
    //   this.debug("Mass Erase Failed", res.response);
    // }
  }
  async start_app() {
    if (!this.conn_established) this.establish_conn();
    let cmd1: Command = { type: "StartApp" };
    let send1 = await Protocol.getFrameRaw(cmd1);
    await this.send(send1);
    let resRaw = await this.receive();
    let res = Protocol.getResponse(resRaw, cmd1);
    if (res.response == BSLResponse.BSL_ACK) {
      this.conn_established = false;
      this.debug("App Started");
    } else {
      this.debug("App Start Failed", res.response);
    }
  }
}

const address = 0x20000160;
const addressBytes = new Uint8Array([
  (address >> 24) & 0xff,
  (address >> 16) & 0xff,
  (address >> 8) & 0xff,
  address & 0xff,
]);
