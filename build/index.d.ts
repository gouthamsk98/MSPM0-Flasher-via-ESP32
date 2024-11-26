import { SerialTransport } from "./transport_handler";
import { ESPCommand, OLEDPOS } from "./protocol_handler";
import { IHexRecord } from "./protocol_handler";
export declare class MSPLoaderV2 extends SerialTransport {
  BSL_TRY: number;
  BSL_TRY_MAX: number;
  DEFAULT_TIMEOUT: number;
  conn_established: boolean;
  FLASH_START_ADDRESS: number;
  FLASH_MAX_BUFFER_SIZE: number;
  BSL_PW_RESET: number[];
  MAX_PAYLOAD_DATA_SIZE: number;
  MEMORY_READ_RESPONSE: number;
  DEVICE_INFO_RESPONSE: number;
  STANDALONE_VERIFY_RESPONSE: number;
  MESSAGE_RESPONSE: number;
  ERROR_RESPONSE: number;
  ESP_CMD: ESPCommand;
  constructor(device: SerialPort);
  /**
   * Array of strings to array of uint8
   */
  sa2a(s: string[]): Uint8Array;
  /**
   * string to array of uint8
   */
  s2a(s: string): Uint8Array;
  enableBSL(): Promise<void>;
  control_esp_oled(cmd: string[]): Promise<void>;
  establish_conn(): Promise<void>;
  check_crc(frame: Uint8Array): boolean;
  esp_oled_print(
    text: string,
    align?: OLEDPOS,
    x_offset?: number,
    y_offset?: number,
    clr_screen?: boolean
  ): Promise<void>;
  get_device_info(): Promise<void>;
  unlock_bootloader(): Promise<void>;
  mass_earse(): Promise<void>;
  program_data(hex: string): Promise<void>;
  read_memory(): Promise<void>;
  flash_earse_range(): Promise<void>;
  start_app(): Promise<void>;
}
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
export declare enum OLEDPOS {
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
  | {
      type: "Connection";
    }
  | {
      type: "UnlockBootloader";
      data: Uint8Array;
    }
  | {
      type: "FlashRangeErase";
      start_address: number;
      end_address: number;
    }
  | {
      type: "MassErase";
    }
  | {
      type: "ProgramData";
      start_address: number;
      data: Uint8Array;
    }
  | {
      type: "ProgramDataFast";
      start_address: number;
      data: Uint8Array;
    }
  | {
      type: "MemoryRead";
      start_address: number;
      data: Uint8Array;
    }
  | {
      type: "FactoryReset";
      start_address: number;
      data: Uint8Array;
    }
  | {
      type: "GetDeviceInfo";
    }
  | {
      type: "StandaloneVerify";
      start_address: number;
      data: Uint8Array;
    }
  | {
      type: "StartApp";
    };
export type CommandResponse =
  | {
      type: "Connection";
      response: BSLResponse;
    }
  | {
      type: "UnlockBootloader";
      response: BSLResponse;
    }
  | {
      type: "FlashRangeErase";
      response: BSLResponse;
    }
  | {
      type: "MassErase";
      response: BSLResponse;
    }
  | {
      type: "ProgramData";
      response: BSLResponse;
    }
  | {
      type: "ProgramDataFast";
      response: BSLResponse;
    }
  | {
      type: "MemoryRead";
      response: BSLResponse;
      data: Uint8Array;
    }
  | {
      type: "FactoryReset";
      response: BSLResponse;
    }
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
  | {
      type: "StandaloneVerify";
      response: BSLResponse;
    }
  | {
      type: "StartApp";
      response: BSLResponse;
    };
export declare enum BSLResponse {
  BSL_ACK = 0, // Packet received successfully
  BSL_ERROR_HEADER_INCORRECT = 81, // Header incorrect
  BSL_ERROR_CHECKSUM_INCORRECT = 82, // Checksum incorrect
  BSL_ERROR_PACKET_SIZE_ZERO = 83, // Packet size zero
  BSL_ERROR_PACKET_SIZE_TOO_BIG = 84, // Packet size too big
  BSL_ERROR_UNKNOWN_ERROR = 85, // Unknown error
  BSL_ERROR_UNKNOWN_BAUD_RATE = 86,
}
export declare class Protocol {
  static HEADER: number;
  static CONNECTION: number;
  static UNLOCK_BOOTLOADER: number;
  static FLASH_RANGE_ERASE: number;
  static MASS_ERASE: number;
  static PROGRAM_DATA: number;
  static PROGRAM_DATA_FAST: number;
  static MEMORY_READ: number;
  static FACTORY_RESET: number;
  static GET_DEVICE_INFO: number;
  static STANDALONE_VERIFY: number;
  static START_APP: number;
  static CRC32_POLYNOMIAL: number;
  static INITIAL_SEED: number;
  static OFFSET_BYTE: number;
  static ADDRS_BYTES: number;
  static CMD_BYTES: number;
  static softwareCRC(data: Uint8Array, length: number): Uint8Array;
  static getFrameRaw(command: BSLCommand): Promise<Uint8Array>;
  static getResponse(data: Uint8Array, command: BSLCommand): CommandResponse;
}
export declare class SerialTransport {
  device: SerialPort;
  baudrate: number;
  buffer_size: number;
  private traceLog;
  private lastTraceTime;
  tracing: boolean;
  private leftOver;
  private reader;
  slipReaderEnabled: boolean;
  trace_dom_log: boolean;
  constructor(device: SerialPort);
  /**
   * Concatenate buffer2 to buffer1 and return the resulting ArrayBuffer.
   * @param {ArrayBuffer} buffer1 First buffer to concatenate.
   * @param {ArrayBuffer} buffer2 Second buffer to concatenate.
   * @returns {ArrayBuffer} Result Array buffer.
   */
  _appendBuffer(buffer1: ArrayBuffer, buffer2: ArrayBuffer): ArrayBufferLike;
  /**
   * Read from serial device using the device ReadableStream.
   * @param {number} timeout Read timeout number
   * @param {number} minData Minimum packet array length
   * @returns {Uint8Array} 8 bit unsigned data array read from device.
   */
  read(timeout?: number, minData?: number): Promise<Uint8Array>;
  /**
   * Take a data array and return the first well formed packet after
   * replacing the escape sequence. Reads at least 8 bytes.
   * @param {Uint8Array} data Unsigned 8 bit array from the device read stream.
   * @returns {Uint8Array} Formatted packet using SLIP escape sequences.
   */
  slipReader(data: Uint8Array): Uint8Array;
  /**
   * Format received or sent data for tracing output.
   * @param {string} message Message to format as trace line.
   */
  trace(message: string): void;
  hexify(s: Uint8Array): string;
  hexConvert(uint8Array: Uint8Array, autoSplit?: boolean): string;
  debug(
    message: string,
    e?: unknown,
    console_print?: boolean,
    dom_print?: boolean,
    dom_element_id?: string,
    edit_on_same_line?: boolean
  ): void;
  sleep(ms: number): Promise<unknown>;
  connect(baudrate?: number): Promise<void>;
  disconnect(): Promise<void>;
  send(data: Uint8Array): Promise<void>;
  private mergeSections;
  readIHex(data: string): Promise<Uint8Array>;
  parseIHexRecord(line: string): IHexRecord;
  receive(timeout?: number): Promise<Uint8Array>;
}
