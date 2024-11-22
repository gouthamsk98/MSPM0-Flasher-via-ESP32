export interface Section {
  offset: number;
  value: Uint8Array;
}
export interface IHexRecord {
  type: string;
  offset: number;
  data: Uint8Array;
  address: number;
}
export enum OLEDPOS {
  ALIGN_DEFAULT = 0,
  ALIGN_TOP_LEFT = 1,
  ALIGN_TOP_MID = 2,
  ALIGN_TOP_RIGHT = 3,
  ALIGN_BOTTOM_LEFT = 4,
  ALIGN_BOTTOM_MED = 5,
  ALIGN_BOTTOM_RIGHT = 6,
  ALIGN_LEFT_MID = 7,
  ALIGN_RIGHT_MID = 8,
  ALIGN_CENTER = 9,
}
export type ESPCommand = {
  BSL_ENBL: string[];
  OLED_CLR: string[];
  OLED_ON: string[];
  OLED_OFF: string[];
  OLED_PRINT: string[];
};
export type BSLCommand =
  | { type: "Connection" }
  | { type: "UnlockBootloader"; data: Uint8Array }
  | { type: "FlashRangeErase"; start_address: number; end_address: number }
  | { type: "MassErase" }
  | { type: "ProgramData"; start_address: number; data: Uint8Array }
  | { type: "ProgramDataFast"; start_address: number; data: Uint8Array }
  | {
      type: "MemoryRead";
      start_address: number;
      data: Uint8Array;
    }
  | { type: "FactoryReset"; start_address: number; data: Uint8Array }
  | { type: "GetDeviceInfo" }
  | { type: "StandaloneVerify"; start_address: number; data: Uint8Array }
  | { type: "StartApp" };
export type CommandResponse =
  | { type: "Connection"; response: BSLResponse }
  | { type: "UnlockBootloader"; response: BSLResponse }
  | { type: "FlashRangeErase"; response: BSLResponse }
  | { type: "MassErase"; response: BSLResponse }
  | { type: "ProgramData"; response: BSLResponse }
  | { type: "ProgramDataFast"; response: BSLResponse }
  | { type: "MemoryRead"; response: BSLResponse; data: Uint8Array }
  | { type: "FactoryReset"; response: BSLResponse }
  | {
      type: "GetDeviceInfo";
      response: BSLResponse;
      CMD_interpreter_version: number;
      build_id: number;
      app_version: number;
      active_plugin_interface_version: number;
      BSL_max_buffer_size: number;
      BSL_buffer_start_address: number;
      BCR_config_id: number;
      BSL_config_id: number;
    }
  | { type: "StandaloneVerify"; response: BSLResponse }
  | { type: "StartApp"; response: BSLResponse };

export enum BSLResponse {
  BSL_ACK = 0x00, // Packet received successfully
  BSL_ERROR_HEADER_INCORRECT = 0x51, // Header incorrect
  BSL_ERROR_CHECKSUM_INCORRECT = 0x52, // Checksum incorrect
  BSL_ERROR_PACKET_SIZE_ZERO = 0x53, // Packet size zero
  BSL_ERROR_PACKET_SIZE_TOO_BIG = 0x54, // Packet size too big
  BSL_ERROR_UNKNOWN_ERROR = 0x55, // Unknown error
  BSL_ERROR_UNKNOWN_BAUD_RATE = 0x56, // Unknown baud rate
}
//*******************************Frame Format********************************************
// |Header|Length|BSL Core Data|CRC32|
// |1 Byte|2 Byte|N Byte|4 Byte|
//***************************************************************************************
export class Protocol {
  //Command Codes
  static HEADER = 0x80;
  static CONNECTION = 0x12;
  static UNLOCK_BOOTLOADER = 0x21;
  static FLASH_RANGE_ERASE = 0x23;
  static MASS_ERASE = 0x15;
  static PROGRAM_DATA = 0x20;
  static PROGRAM_DATA_FAST = 0x24;
  static MEMORY_READ = 0x29;
  static FACTORY_RESET = 0x30;
  static GET_DEVICE_INFO = 0x19;
  static STANDALONE_VERIFY = 0x31;
  static START_APP = 0x40;
  //CRC32 Polynomial
  static CRC32_POLYNOMIAL = 0xedb88320;
  static INITIAL_SEED = 0xffffffff;
  //offset
  static OFFSET_BYTE = 4;
  static ADDRS_BYTES = 4;
  static CMD_BYTES = 1;

  static softwareCRC(data: Uint8Array, length: number): Uint8Array {
    let crc = 0xffffffff;

    for (let i = 0; i < length; i++) {
      let byte = data[i];
      crc = crc ^ byte;

      for (let j = 0; j < 8; j++) {
        const mask = -(crc & 1);
        crc = (crc >>> 1) ^ (this.CRC32_POLYNOMIAL & mask);
      }
    }
    crc = crc >>> 0; // Convert to an unsigned 32-bit integer
    return new Uint8Array([
      crc & 0xff, // Least significant byte
      (crc >>> 8) & 0xff,
      (crc >>> 16) & 0xff,
      (crc >>> 24) & 0xff, // Most significant byte
    ]);
  }
  static async getFrameRaw(command: BSLCommand): Promise<Uint8Array> {
    switch (command.type) {
      case "Connection": {
        const crc = this.softwareCRC(new Uint8Array([this.CONNECTION]), 1);
        return new Uint8Array([
          this.HEADER,
          0x01,
          0x00,
          this.CONNECTION,
          ...crc,
        ]);
      }
      case "StartApp": {
        const crc = this.softwareCRC(new Uint8Array([this.START_APP]), 1);
        return new Uint8Array([
          this.HEADER,
          0x01,
          0x00,
          this.START_APP,
          ...crc,
        ]);
      }
      case "GetDeviceInfo": {
        const crc = this.softwareCRC(new Uint8Array([this.GET_DEVICE_INFO]), 1);
        return new Uint8Array([
          this.HEADER,
          0x01,
          0x00,
          this.GET_DEVICE_INFO,
          ...crc,
        ]);
      }
      case "MassErase": {
        const crc = this.softwareCRC(new Uint8Array([this.MASS_ERASE]), 1);
        return new Uint8Array([
          this.HEADER,
          0x01,
          0x00,
          this.MASS_ERASE,
          ...crc,
        ]);
      }
      case "ProgramData": {
        const data = command.data;
        const start_address = [
          command.start_address & 0x000000ff, //LSB
          (command.start_address & 0x0000ff00) >> 8,
          (command.start_address & 0x00ff0000) >> 16,
          (command.start_address & 0xff000000) >> 24, //MSB
        ];
        const length = data.length + this.ADDRS_BYTES + this.CMD_BYTES;
        const crc = this.softwareCRC(
          new Uint8Array([this.PROGRAM_DATA, ...start_address, ...data]),
          length
        );
        return new Uint8Array([
          this.HEADER,
          length & 0x00ff, //lsb
          (length & 0xff00) >> 8, //msb
          this.PROGRAM_DATA,
          ...start_address,
          ...data,
          ...crc,
        ]);
      }
      case "UnlockBootloader": {
        const data = command.data;
        if (data.length != 32) throw new Error("Data length should be 32");
        const length = data.length + 1;
        const crc = this.softwareCRC(
          new Uint8Array([this.UNLOCK_BOOTLOADER, ...data]),
          length
        );
        return new Uint8Array([
          this.HEADER,
          length & 0xff,
          length >> 8,
          this.UNLOCK_BOOTLOADER,
          ...data,
          ...crc,
        ]);
      }
      case "MemoryRead": {
        const data = command.data;
        if (data.length != 4) throw new Error("Data length should be 4");
        const start_address = [
          (command.start_address >> 24) & 0xff,
          (command.start_address >> 16) & 0xff,
          (command.start_address >> 8) & 0xff,
          command.start_address & 0xff,
        ];
        const length = data.length + 4 + 1;
        const crc = this.softwareCRC(
          new Uint8Array([this.MEMORY_READ, ...start_address, ...data]),
          length
        );
        return new Uint8Array([
          this.HEADER,
          length & 0xff,
          length >> 8,
          this.MEMORY_READ,
          ...start_address,
          ...data,
          ...crc,
        ]);
      }
      default:
        throw new Error("Unimplemented command");
    }
  }
  static getResponse(data: Uint8Array, command: BSLCommand): CommandResponse {
    switch (command.type) {
      case "Connection":
      case "StartApp":
        return { type: command.type, response: data[0] };
      case "MassErase":
      case "ProgramData":
      case "UnlockBootloader":
        return { type: command.type, response: data[5] };
      case "GetDeviceInfo":
        return {
          type: command.type,
          response: data[5],
          CMD_interpreter_version:
            (data[this.OFFSET_BYTE + 2] << 8) | data[this.OFFSET_BYTE + 1],
          build_id:
            (data[this.OFFSET_BYTE + 4] << 8) | data[this.OFFSET_BYTE + 3],
          app_version:
            (data[this.OFFSET_BYTE + 8] << 24) |
            (data[this.OFFSET_BYTE + 7] << 16) |
            (data[this.OFFSET_BYTE + 6] << 8) |
            data[this.OFFSET_BYTE + 5],
          active_plugin_interface_version:
            (data[this.OFFSET_BYTE + 10] << 8) | data[this.OFFSET_BYTE + 9],
          BSL_max_buffer_size:
            (data[this.OFFSET_BYTE + 12] << 8) | data[this.OFFSET_BYTE + 11],
          BSL_buffer_start_address:
            (data[this.OFFSET_BYTE + 16] << 24) |
            (data[this.OFFSET_BYTE + 15] << 16) |
            (data[this.OFFSET_BYTE + 14] << 8) |
            data[this.OFFSET_BYTE + 13],
          BCR_config_id:
            (data[this.OFFSET_BYTE + 20] << 24) |
            (data[this.OFFSET_BYTE + 19] << 16) |
            (data[this.OFFSET_BYTE + 18] << 8) |
            data[this.OFFSET_BYTE + 17],
          BSL_config_id:
            (data[this.OFFSET_BYTE + 24] << 24) |
            (data[this.OFFSET_BYTE + 23] << 16) |
            (data[this.OFFSET_BYTE + 22] << 8) |
            data[this.OFFSET_BYTE + 21],
        };
      default:
        throw new Error("Unimplemented command");
    }
  }
}
