export type Command =
  | { type: "Connection" }
  | { type: "UnlockBootloader"; data: Uint8Array }
  | { type: "FlashRangeErase"; start_address: number; data: Uint8Array }
  | { type: "MassErase" }
  | { type: "ProgramData"; start_address: number; data: Uint8Array }
  | { type: "ProgramDataFast"; start_address: number; data: Uint8Array }
  | { type: "MemoryRead"; start_address: number; data: Uint8Array }
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
  | { type: "GetDeviceInfo"; response: BSLResponse; data: Uint8Array }
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
  static async getFrameRaw(command: Command): Promise<Uint8Array> {
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
      default:
        throw new Error("Unimplemented command");
    }
  }
  static getResponse(data: Uint8Array, command: Command): CommandResponse {
    switch (command.type) {
      case "Connection":
      case "StartApp":
      case "MassErase":
        return { type: command.type, response: data[0] };
      case "GetDeviceInfo":

      default:
        throw new Error("Unimplemented command");
    }
  }
}
