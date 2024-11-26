import { SerialTransport } from "./transport_handler";
import { ESPCommand, OLEDPOS } from "./protocol_handler";
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
    esp_oled_print(text: string, align?: OLEDPOS, x_offset?: number, y_offset?: number, clr_screen?: boolean): Promise<void>;
    get_device_info(): Promise<void>;
    unlock_bootloader(): Promise<void>;
    mass_earse(): Promise<void>;
    program_data(hex: string): Promise<void>;
    read_memory(): Promise<void>;
    flash_earse_range(): Promise<void>;
    start_app(): Promise<void>;
}
