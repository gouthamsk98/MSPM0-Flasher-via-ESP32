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
    ALIGN_CENTER = 9
}
export type ESPCommand = {
    BSL_ENBL: string[];
    OLED_CLR: string[];
    OLED_ON: string[];
    OLED_OFF: string[];
    OLED_PRINT: string[];
};
export type BSLCommand = {
    type: "Connection";
} | {
    type: "UnlockBootloader";
    data: Uint8Array;
} | {
    type: "FlashRangeErase";
    start_address: number;
    end_address: number;
} | {
    type: "MassErase";
} | {
    type: "ProgramData";
    start_address: number;
    data: Uint8Array;
} | {
    type: "ProgramDataFast";
    start_address: number;
    data: Uint8Array;
} | {
    type: "MemoryRead";
    start_address: number;
    data: Uint8Array;
} | {
    type: "FactoryReset";
    start_address: number;
    data: Uint8Array;
} | {
    type: "GetDeviceInfo";
} | {
    type: "StandaloneVerify";
    start_address: number;
    data: Uint8Array;
} | {
    type: "StartApp";
};
export type CommandResponse = {
    type: "Connection";
    response: BSLResponse;
} | {
    type: "UnlockBootloader";
    response: BSLResponse;
} | {
    type: "FlashRangeErase";
    response: BSLResponse;
} | {
    type: "MassErase";
    response: BSLResponse;
} | {
    type: "ProgramData";
    response: BSLResponse;
} | {
    type: "ProgramDataFast";
    response: BSLResponse;
} | {
    type: "MemoryRead";
    response: BSLResponse;
    data: Uint8Array;
} | {
    type: "FactoryReset";
    response: BSLResponse;
} | {
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
} | {
    type: "StandaloneVerify";
    response: BSLResponse;
} | {
    type: "StartApp";
    response: BSLResponse;
};
export declare enum BSLResponse {
    BSL_ACK = 0,// Packet received successfully
    BSL_ERROR_HEADER_INCORRECT = 81,// Header incorrect
    BSL_ERROR_CHECKSUM_INCORRECT = 82,// Checksum incorrect
    BSL_ERROR_PACKET_SIZE_ZERO = 83,// Packet size zero
    BSL_ERROR_PACKET_SIZE_TOO_BIG = 84,// Packet size too big
    BSL_ERROR_UNKNOWN_ERROR = 85,// Unknown error
    BSL_ERROR_UNKNOWN_BAUD_RATE = 86
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
