export class Transport {
  public slipReaderEnabled = false;
  public leftOver = new Uint8Array(0);
  public baudrate = 9600;
  private traceLog = "";
  private lastTraceTime = Date.now();
  private reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

  constructor(
    public device: SerialPort, //SerialPort change latter
    public tracing = true,
    enableSlipReader = false
  ) {
    this.slipReaderEnabled = enableSlipReader;
    this.getInfo();
  }
  public getInfo() {
    const info = this.device.getInfo();
    console.log("Product info", info);
    return info.usbVendorId && info.usbProductId;
  }
  async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  /**
   * Wait for a given timeout ms for serial device unlock.
   * @param {number} timeout Timeout time in milliseconds (ms) to sleep
   */
  async waitForUnlock(timeout: number) {
    while (
      (this.device.readable && this.device.readable.locked) ||
      (this.device.writable && this.device.writable.locked)
    ) {
      await this.sleep(timeout);
    }
  }
  /**
   * Connect to serial device using the Webserial open method.
   * @param {number} baud Number baud rate for serial connection.
   * @param {typeof import("w3c-web-serial").SerialOptions} serialOptions Serial Options for WebUSB SerialPort class.
   */
  public async connect(baud = 115200) {
    try {
      await this.device.open({
        baudRate: baud,
        // dataBits: serialOptionzs?.dataBits,
        // stopBits: serialOptions?.stopBits,
        bufferSize: 1024 * 10, //serialOptions?.bufferSize,
        // parity: serialOptions?.parity,
        // flowControl: serialOptions?.flowControl,
      });
      this.baudrate = baud;
      this.leftOver = new Uint8Array(0);
      console.log("Connected to device");
    } catch (error) {
      console.error("Error in connect", error);
    }
  }
  async disconnect() {
    if (this.device.readable?.locked) {
      await this.reader?.cancel();
    }
    await this.waitForUnlock(400);
    this.reader = undefined;
    await this.device.close();
  }
  /**
   * Format received or sent data for tracing output.
   * @param {string} message Message to format as trace line.
   */
  trace(message: string) {
    const delta = Date.now() - this.lastTraceTime;
    const prefix = `TRACE ${delta.toFixed(3)}`;
    const traceMessage = `${prefix} ${message}`;
    console.log(traceMessage);
    this.traceLog += traceMessage + "\n";
  }
  hexify(s: Uint8Array) {
    return Array.from(s)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
      .padEnd(16, " ");
  }

  hexConvert(uint8Array: Uint8Array, autoSplit = true) {
    if (autoSplit && uint8Array.length > 16) {
      let result = "";
      let s = uint8Array;

      while (s.length > 0) {
        const line = s.slice(0, 16);
        const asciiLine = String.fromCharCode(...line)
          .split("")
          .map((c) =>
            c === " " || (c >= " " && c <= "~" && c !== "  ") ? c : "."
          )
          .join("");
        s = s.slice(16);
        result += `\n    ${this.hexify(line.slice(0, 8))} ${this.hexify(
          line.slice(8)
        )} | ${asciiLine}`;
      }

      return result;
    } else {
      return this.hexify(uint8Array);
    }
  }
  async returnTrace() {
    try {
      await navigator.clipboard.writeText(this.traceLog);
      console.log("Text copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  }
  /**
   * Concatenate buffer2 to buffer1 and return the resulting ArrayBuffer.
   * @param {ArrayBuffer} buffer1 First buffer to concatenate.
   * @param {ArrayBuffer} buffer2 Second buffer to concatenate.
   * @returns {ArrayBuffer} Result Array buffer.
   */
  _appendBuffer(buffer1: ArrayBuffer, buffer2: ArrayBuffer) {
    const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer;
  }
  /**
   * Format data packet using the Serial Line Internet Protocol (SLIP).
   * @param {Uint8Array} data Binary unsigned 8 bit array data to format.
   * @returns {Uint8Array} Formatted unsigned 8 bit data array.
   */
  slipWriter(data: Uint8Array) {
    const outData = new Array<number>();
    outData.push(0xc0);
    for (let i = 0; i < data.length; i++) {
      if (data[i] === 0xdb) {
        outData.push(0xdb, 0xdd);
      } else if (data[i] === 0xc0) {
        outData.push(0xdb, 0xdc);
      } else {
        outData.push(data[i]);
      }
    }
    outData.push(0xc0);
    return new Uint8Array(outData);
  }
  async writeChunk(data: Uint8Array, chunkSize: number) {
    let position = 0;
    if (this.device.writable) {
      const writer = this.device.writable.getWriter();
      while (position < data.length) {
        // Slice the data into chunks
        const chunk = data.slice(position, position + chunkSize);
        await writer.write(chunk); // Write each chunk to the serial port
        console.log("Write chunk", chunk);
        position += chunkSize;
      }
      // writer.close();
      writer.releaseLock();
    }
  }

  /**
   * Write binary data to device using the WebSerial device writable stream.
   * @param {Uint8Array} data 8 bit unsigned data array to write to device.
   */
  async write(data: Uint8Array) {
    const outData = this.slipReaderEnabled ? this.slipWriter(data) : data;
    if (this.device.writable) {
      const writer = this.device.writable.getWriter();
      if (this.tracing) {
        console.log("Write bytes");
        this.trace(
          `Write ${outData.length} bytes: ${this.hexConvert(outData)}`
        );
      }
      await writer.write(outData);
      console.log("Write bytes", outData);
      writer.releaseLock();
    }
  }
  /**
   * Take a data array and return the first well formed packet after
   * replacing the escape sequence. Reads at least 8 bytes.
   * @param {Uint8Array} data Unsigned 8 bit array from the device read stream.
   * @returns {Uint8Array} Formatted packet using SLIP escape sequences.
   */
  slipReader(data: Uint8Array) {
    let i = 0;
    let dataStart = 0,
      dataEnd = 0;
    let state = "init";
    while (i < data.length) {
      if (state === "init" && data[i] == 0xc0) {
        dataStart = i + 1;
        state = "valid_data";
        i++;
        continue;
      }
      if (state === "valid_data" && data[i] == 0xc0) {
        dataEnd = i - 1;
        state = "packet_complete";
        break;
      }
      i++;
    }
    if (state !== "packet_complete") {
      this.leftOver = data;
      return new Uint8Array(0);
    }

    this.leftOver = data.slice(dataEnd + 2);
    const tempPkt = new Uint8Array(dataEnd - dataStart + 1);
    let j = 0;
    for (i = dataStart; i <= dataEnd; i++, j++) {
      if (data[i] === 0xdb && data[i + 1] === 0xdc) {
        tempPkt[j] = 0xc0;
        i++;
        continue;
      }
      if (data[i] === 0xdb && data[i + 1] === 0xdd) {
        tempPkt[j] = 0xdb;
        i++;
        continue;
      }
      tempPkt[j] = data[i];
    }
    const packet = tempPkt.slice(
      0,
      j
    ); /* Remove unused bytes due to escape seq */
    return packet;
  }
  /**
   * Read from serial device using the device ReadableStream.
   * @param {number} timeout Read timeout number
   * @param {number} minData Minimum packet array length
   * @returns {Uint8Array} 8 bit unsigned data array read from device.
   */
  async read(timeout = 0, minData = 12) {
    let t;
    let packet = this.leftOver;
    this.leftOver = new Uint8Array(0);
    if (this.slipReaderEnabled) {
      const valFinal = this.slipReader(packet);
      if (valFinal.length > 0) {
        return valFinal;
      }
      packet = this.leftOver;
      this.leftOver = new Uint8Array(0);
    }
    if (this.device.readable == null) return this.leftOver;
    this.reader = this.device.readable.getReader();
    try {
      if (timeout > 0) {
        t = setTimeout(() => {
          if (this.reader) {
            this.reader.cancel();
          }
        }, timeout);
      }
      do {
        if (!this.reader) throw new Error("Reader is undefined");
        const { value, done } = await this.reader.read();
        if (done) {
          this.leftOver = packet;
          console.log("Timeout");
        }
        if (!value) break;
        const p = new Uint8Array(
          this._appendBuffer(packet.buffer, value.buffer)
        );
        packet = p;
      } while (packet.length < minData);
    } finally {
      if (timeout > 0) clearTimeout(t);
      if (!this.reader) throw new Error("Reader is undefined");
      this.reader.releaseLock();
    }

    if (this.tracing) {
      console.log("Read bytes");
      this.trace(`Read ${packet.length} bytes: ${this.hexConvert(packet)}`);
    }

    if (this.slipReaderEnabled) {
      const slipReaderResult = this.slipReader(packet);
      if (this.tracing) {
        console.log("Slip reader results");
        this.trace(
          `Read ${slipReaderResult.length} bytes: ${this.hexConvert(
            slipReaderResult
          )}`
        );
      }
      return slipReaderResult;
    }
    return packet;
  }
  /**
   * Read from serial device without slip formatting.
   * @param {number} timeout Read timeout in milliseconds (ms)
   * @returns {Uint8Array} 8 bit unsigned data array read from device.
   */
  async rawRead(timeout = 0) {
    if (this.leftOver.length != 0) {
      const p = this.leftOver;
      this.leftOver = new Uint8Array(0);
      return p;
    }
    if (!this.device.readable) {
      return this.leftOver;
    }
    this.reader = this.device.readable.getReader();
    let t;
    try {
      if (timeout > 0) {
        t = setTimeout(() => {
          if (this.reader) {
            this.reader.cancel();
          }
        }, timeout);
      }
      if (!this.reader) throw new Error("Reader is undefined");
      const { value, done } = await this.reader.read();
      if (done) {
        if (!value) return new Uint8Array(0);
        return value;
      }
      if (this.tracing) {
        console.log("Raw Read bytes");
        this.trace(`Read ${value.length} bytes: ${this.hexConvert(value)}`);
      }
      return value;
    } finally {
      if (timeout > 0) {
        clearTimeout(t);
      }
      if (!this.reader) throw new Error("Reader is undefined");
      this.reader.releaseLock();
    }
  }

  //Frahana code

  /**
   *
   * @param buf transmit frame
   * @param length length of tx_frame
   * @returns calculates and returns the checksum
   */
  checkSum(buf: Uint8Array, length: number): number {
    let temp = 0;
    console.log("buf", length);
    for (let i = 2; i < length - 1; i++) {
      temp += buf[i];
    }
    temp = temp & 0xff;
    temp = ~temp & 0xff;
    return temp;
  }
  /**
   * Get the checksum for given unsigned 8-bit array
   * @param {Uint8Array} data Unsigned 8-bit integer array
   * @returns {number} - Array checksum
   */
  checksum = function (data: Uint8Array) {
    let i;
    let chk = 0xef;

    for (i = 0; i < data.length; i++) {
      chk ^= data[i];
    }
    return chk;
  };
  /**
   *
   * @param cmd
   * @param fun
   * @param data
   * @param length
   * @returns this function constructs and return the transmit frame
   */
  frameToSerial(
    cmd: number,
    fun: number,
    data: Uint8Array,
    length: number
  ): Uint8Array {
    const size = length + 9; // total frame size
    const frameLength = length + 2; // size of data + cmd + function
    const txFrame = new Uint8Array(size);

    // SEND FRAME: [0xF9, 0xFF, L1, L2, L3, L4, cmd, function, parameter seq..., CKSM]
    txFrame[0] = 0xf9;
    txFrame[1] = 0xff;
    txFrame[2] = (frameLength >> 24) & 0xff;
    txFrame[3] = (frameLength >> 16) & 0xff;
    txFrame[4] = (frameLength >> 8) & 0xff;
    txFrame[5] = frameLength & 0xff;
    txFrame[6] = cmd;
    txFrame[7] = fun;
    txFrame.set(data, 8); // Insert 'data' starting at index 8
    txFrame[txFrame.length - 1] = this.checkSum(txFrame, txFrame.length - 1);

    return txFrame;
  }
  dataFromSerial(frame: Uint8Array): [number, Uint8Array] | null {
    const CKSM = this.checkSum(frame, frame.length);
    console.log("CKSM", CKSM, frame);
    if (
      frame[0] !== 0xf9 ||
      frame[1] !== 0xf5 ||
      frame[frame.length - 1] !== CKSM
    ) {
      console.log("Invalid frame");
      return null;
    }
    return [frame[7], frame.subarray(8, frame.length)];
  }
}
