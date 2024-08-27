export enum ParityType {
  "none",
  "even",
  "odd",
}
export enum FlowControlType {
  "none",
  "hardware",
}
export interface SerialOptions {
  /**
   * A positive, non-zero value indicating the baud rate at which serial communication should be established.
   * @type {number | undefined}
   */
  baudRate?: number | undefined;

  /**
   * The number of data bits per frame. Either 7 or 8.
   * @type {number | undefined}
   */
  dataBits?: number | undefined;

  /**
   * The number of stop bits at the end of a frame. Either 1 or 2.
   * @type {number | undefined}
   */
  stopBits?: number | undefined;

  /**
   * The parity mode: none, even or odd
   * @type {ParityType | undefined}
   */
  parity?: ParityType | undefined;

  /**
   * A positive, non-zero value indicating the size of the read and write buffers that should be created.
   * @type {number | undefined}
   */
  bufferSize?: number | undefined;

  /**
   * The flow control mode: none or hardware.
   * @type {FlowControlType | undefined}
   */
  flowControl?: FlowControlType | undefined;
}
