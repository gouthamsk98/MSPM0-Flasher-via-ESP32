import { IHexRecord } from "./protocol_handler";
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
    debug(message: string, e?: unknown, console_print?: boolean, dom_print?: boolean, dom_element_id?: string, edit_on_same_line?: boolean): void;
    sleep(ms: number): Promise<unknown>;
    connect(baudrate?: number): Promise<void>;
    disconnect(): Promise<void>;
    send(data: Uint8Array): Promise<void>;
    private mergeSections;
    readIHex(data: string): Promise<Uint8Array>;
    parseIHexRecord(line: string): IHexRecord;
    receive(timeout?: number): Promise<Uint8Array>;
}
