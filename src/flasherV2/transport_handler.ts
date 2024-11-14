export class SerialTransport {
  baudrate = 9600;
  buffer_size = 1024 * 1024; //1MB (max can be 16MB)
  private traceLog = "";
  private lastTraceTime = Date.now();
  public tracing = true;
  private leftOver = new Uint8Array(0);
  private reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  slipReaderEnabled = true;
  trace_dom_log = true;
  constructor(public device: SerialPort) {
    console.log("SerialTransport intialized");
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
          `Slip Read ${slipReaderResult.length} bytes: ${this.hexConvert(
            slipReaderResult
          )}`
        );
      }
      return slipReaderResult;
    }
    return packet;
  }
  /**
   * Take a data array and return the first well formed packet after
   * replacing the escape sequence. Reads at least 8 bytes.
   * @param {Uint8Array} data Unsigned 8 bit array from the device read stream.
   * @returns {Uint8Array} Formatted packet using SLIP escape sequences.
   */
  slipReader(data: Uint8Array): Uint8Array {
    const SLIP_END = 0x3e60;
    const SLIP_ESC = 0xdb;
    const SLIP_ESC_END = 0xdc;
    const SLIP_ESC_ESC = 0xdd;

    let buffer: number[] = [];
    let isEscaped = false;

    for (const byte of data) {
      if (byte === SLIP_END) {
        // End of packet marker found
        continue; // Skip the SLIP_END byte
      } else if (byte === SLIP_ESC) {
        // Escape character detected
        isEscaped = true;
      } else {
        if (isEscaped) {
          // Substitute escaped sequences
          if (byte === SLIP_ESC_END) {
            buffer.push(SLIP_END);
          } else if (byte === SLIP_ESC_ESC) {
            buffer.push(SLIP_ESC);
          }
          isEscaped = false;
        } else {
          buffer.push(byte);
        }
      }
    }

    // Create a Uint8Array from the concatenated buffer
    return new Uint8Array(buffer);
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
    if (this.trace_dom_log) {
      const consoleTextarea =
        document.querySelector<HTMLTextAreaElement>("#traceLog")!;
      if (consoleTextarea) {
        consoleTextarea.value = this.traceLog;
        consoleTextarea.scrollTop = consoleTextarea.scrollHeight;
      }
    }
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
  debug(
    message: string,
    e?: unknown,
    console_print = true,
    dom_print = true,
    dom_element_id = "#console"
  ) {
    if (console_print) console.log(message, e);

    if (dom_print) {
      const consoleTextarea = document.querySelector<HTMLTextAreaElement>(
        `${dom_element_id}`
      )!;
      if (consoleTextarea) {
        consoleTextarea.value += message + "\n";
        consoleTextarea.scrollTop = consoleTextarea.scrollHeight;
      }
    }
  }
  async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  async connect(baudrate: number = this.baudrate) {
    try {
      await this.device.open({
        baudRate: baudrate,
        bufferSize: this.buffer_size,
      });
      this.debug("Device Connected");
      this.leftOver = new Uint8Array(0);
    } catch (e) {
      this.debug("Error in connect", e);
    }
  }
  async disconnect() {
    try {
      await this.device.close();
      this.debug("Device Disconnected");
    } catch (e) {
      this.debug("Error in disconnect", e);
    }
  }
  async send(data: Uint8Array) {
    if (this.device.writable) {
      const writer = this.device.writable.getWriter();
      await writer.write(data);
      if (this.tracing) {
        this.trace(`Write ${data.length} bytes: ${this.hexConvert(data)}`);
      }
      // this.debug("Data sent", data, true, false);
      writer.releaseLock();
    }
  }
  intelHexToUint8Array(hexString: string) {
    const lines = hexString.trim().split("\n");
    const data: Array<number> = [];
    lines.forEach((line) => {
      if (line.startsWith(":")) {
        const byteCount = parseInt(line.substr(1, 2), 16);
        const dataStartIndex = 9; // Data starts after 9 characters (: + 2-byte count + 4-byte address + 2-byte record type)
        const dataEndIndex = dataStartIndex + byteCount * 2;

        for (let i = dataStartIndex; i < dataEndIndex; i += 2) {
          data.push(parseInt(line.substr(i, 2), 16));
        }
      }
    });

    return new Uint8Array(data);
  }
  async receive(timeout = 0) {
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
      console.log("Raw Read bytes", value);
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
}
