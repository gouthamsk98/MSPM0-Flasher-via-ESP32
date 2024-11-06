import { SerialTransport } from "./transport_handler";
import { Protocol, BSLResponse } from "./protocol_handler";
import { Command } from "./protocol_handler";
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
  BSL_CMD = [0x42, 0x53, 0x4c]; //BSL
  constructor(device: SerialPort) {
    super(device);
  }
  LSB(x: number): number {
    return x & 0x00ff;
  }
  async enableBSL() {
    await this.send(new Uint8Array(this.BSL_CMD));
    await this.receive();
    this.sleep(100);
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
      this.debug("BSL Mode Enabled");
      this.get_device_info();
      this.conn_established = true;
    } else {
      this.debug("BSL Mode Enable Failed", res.response);
      this.conn_established = false;
      throw new Error("BSL Mode Enable Failed");
    }
  }
  async get_device_info() {
    if (!this.conn_established) this.establish_conn();
    let cmd: Command = { type: "GetDeviceInfo" };
    let send = await Protocol.getFrameRaw(cmd);
    await this.send(send);
    let resRaw = await this.receive();
    // let res = Protocol.getResponse(resRaw, cmd);
    // if (res.response == BSLResponse.BSL_ACK) {
    //   console.log("Device Info", res);
    // } else {
    //   this.debug("Device Info Failed", res.response);
    // }
  }

  async mass_earse() {
    if (!this.conn_established) this.establish_conn();
    this.debug("Mass Erasing ...");
    let cmd: Command = { type: "MassErase" };
    let send = await Protocol.getFrameRaw(cmd);
    await this.send(send);
    let resRaw = await this.receive();
    let res = Protocol.getResponse(resRaw, cmd);
    if (res.response == BSLResponse.BSL_ACK) {
      this.debug("Mass Erase Done");
    } else {
      this.debug("Mass Erase Failed", res.response);
    }
  }
  async program_data(hex: string) {
    if (!this.conn_established) this.establish_conn();
    const flash_data = this.intelHexToUint8Array(hex);
  }
  async start_app() {
    if (!this.conn_established) this.establish_conn();
    let cmd1: Command = { type: "StartApp" };
    let send1 = await Protocol.getFrameRaw(cmd1);
    await this.send(send1);
    let resRaw = await this.receive();
    let res = Protocol.getResponse(resRaw, cmd1);
    if (res.response == BSLResponse.BSL_ACK) {
      this.debug("App Started");
    } else {
      this.debug("App Start Failed", res.response);
    }
  }
}
