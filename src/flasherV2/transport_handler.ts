export class SerialTransport {
  baudrate = 9600;
  buffer_size = 1024 * 1024; //1MB (max can be 16MB)
  private traceLog = "";
  private lastTraceTime = Date.now();
  public tracing = true;
  private leftOver = new Uint8Array(0);
  private reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  constructor(public device: SerialPort) {
    console.log("SerialTransport intialized");
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

  async send(data: Uint8Array) {
    if (this.device.writable) {
      const writer = this.device.writable.getWriter();
      await writer.write(data);
      this.debug("Data sent", data, true, false);
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
