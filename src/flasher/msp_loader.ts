import { Transport } from "./msp_transport";
export class MSPLoader extends Transport {
  QUIET = 5;
  // Default Baud
  DEFAULT_BAUD = 115200;
  MAX_BUFF_LEN = 64;
  SETUP = false;
  BSL = false;
  CRC32_POLY = 0xedb88320;
  // FUNCTIONS
  START = 0x01;
  ERASE = 0x02;
  PAGE_ERASE = 0x03;
  WRITE = 0x04;
  READ = 0x05;
  VERIFY = 0x06;
  START_APP = 0x07;
  EXIT = 0x08;
  ACK = 0x09; //hexa to decimal value of 0x09
  DATA = 0x10; //hexa to decimal value of 0x10

  FOR_WRITE = 0x11;
  FOR_READ = 0x22;

  OK = 0x01;
  FAIL = 0x00;
  flash_start_addr = 0x00000000;
  page_size = 2048;

  // Response code(s) sent by ROM
  ROM_INVALID_RECV_MSG = 0x05; // response if an invalid message is received
  constructor(
    public port: any //SerialPort change latter
  ) {
    super(port);
  }
  mdebug(level: number, message: string, attr: any = "\n"): void {
    if (this.QUIET >= level) {
      console.log(message + attr);
    }
  }
  /**
   * Convert short integer to byte array
   * @param {number} i - Number to convert.
   * @returns {Uint8Array} Byte array.
   */
  _shortToBytearray(i: number) {
    return new Uint8Array([i & 0xff, (i >> 8) & 0xff]);
  }

  /**
   * Convert an integer to byte array
   * @param {number} i - Number to convert.
   * @returns {ROM} The chip ROM class related to given magic hex number.
   */
  _intToByteArray(i: number): Uint8Array {
    return new Uint8Array([
      i & 0xff,
      (i >> 8) & 0xff,
      (i >> 16) & 0xff,
      (i >> 24) & 0xff,
    ]);
  }
  /**
   * Convert a byte array to short integer.
   * @param {number} i - Number to convert.
   * @param {number} j - Number to convert.
   * @returns {number} Return a short integer number.
   */
  _byteArrayToShort(i: number, j: number) {
    return i | (j >> 8);
  }

  /**
   * Convert a byte array to integer.
   * @param {number} i - Number to convert.
   * @param {number} j - Number to convert.
   * @param {number} k - Number to convert.
   * @param {number} l - Number to convert.
   * @returns {number} Return a integer number.
   */
  _byteArrayToInt(i: number, j: number, k: number, l: number) {
    return i | (j << 8) | (k << 16) | (l << 24);
  }
  /**
   * Flush the serial input by raw read with 200 ms timeout.
   */
  async flushInput() {
    try {
      await this.rawRead(200);
    } catch (e) {
      console.error((e as Error).message);
    }
  }
  /**
   * Use the device serial port read function with given timeout to create a valid packet.
   * @param {number} op Operation number
   * @param {number} timeout timeout number in milliseconds
   * @returns {[number, Uint8Array]} valid response packet.
   */
  async readPacket(
    op: number | null = null,
    timeout = 3000
  ): Promise<[number, Uint8Array]> {
    // Check up-to next 100 packets for valid response packet
    for (let i = 0; i < 100; i++) {
      const p = await this.read(timeout);
      const resp = p[0];
      const opRet = p[1];
      const val = this._byteArrayToInt(p[4], p[5], p[6], p[7]);
      const data = p.slice(8);
      if (resp == 1) {
        if (op == null || opRet == op) {
          return [val, data];
        } else if (data[0] != 0 && data[1] == this.ROM_INVALID_RECV_MSG) {
          await this.flushInput();
          throw new Error("unsupported command error");
        }
      }
    }
    throw new Error("invalid response");
  }
  /**
   * Write a serial command to the chip
   * @param {number} op - Operation number
   * @param {Uint8Array} data - Unsigned 8 bit array
   * @param {number} chk - channel number
   * @param {boolean} waitResponse - wait for response ?
   * @param {number} timeout - timeout number in milliseconds
   * @returns {Promise<[number, Uint8Array]>} Return a number and a 8 bit unsigned integer array.
   */
  async command(
    op: number | null = null,
    data: Uint8Array = new Uint8Array(0),
    chk = 0,
    waitResponse = true,
    timeout = 3000
  ): Promise<[number, Uint8Array]> {
    if (op != null) {
      if (this.tracing) {
        this.trace(
          `command op:0x${op.toString(16).padStart(2, "0")} data len=${
            data.length
          } wait_response=${waitResponse ? 1 : 0} timeout=${(
            timeout / 1000
          ).toFixed(3)} data=${this.hexConvert(data)}`
        );
      }

      const pkt = new Uint8Array(8 + data.length);
      pkt[0] = 0x00;
      pkt[1] = op;
      pkt[2] = this._shortToBytearray(data.length)[0];
      pkt[3] = this._shortToBytearray(data.length)[1];
      pkt[4] = this._intToByteArray(chk)[0];
      pkt[5] = this._intToByteArray(chk)[1];
      pkt[6] = this._intToByteArray(chk)[2];
      pkt[7] = this._intToByteArray(chk)[3];

      let i;
      for (i = 0; i < data.length; i++) {
        pkt[8 + i] = data[i];
      }
      await this.write(pkt);
    }

    if (!waitResponse) {
      return [0, new Uint8Array(0)];
    }

    return this.readPacket(op, timeout);
  }

  /**
   * Execute the command and check the command response.
   * @param {string} opDescription Command operation description.
   * @param {number} op Command operation number
   * @param {Uint8Array} data Command value
   * @param {number} chk Checksum to use
   * @param {number} timeout TImeout number in milliseconds (ms)
   * @returns {number} Command result
   */
  async checkCommand(
    opDescription = "",
    op: number | null = null,
    data: Uint8Array = new Uint8Array(0),
    chk = 0,
    timeout = 3000
  ) {
    console.log("check_command " + opDescription);
    const resp = await this.command(op, data, chk, undefined, timeout);
    if (resp[1].length > 4) {
      return resp[1];
    } else {
      return resp[0];
    }
  }
  async readSer(size: number = 1): Promise<Uint8Array> {
    // const data = await this.rawRead(100);
    const data = await this.read(10, size);
    return data;
  }
  /**
   * Initiates erase operation by sending command frame to serial port
   *
   * SEND FRAME: [0xf9, 0xff, L1, L2, L3, L4, cmd, function(erase), CKSM]
   *
   * then waits for RESPONSE FRAME from serial. Upon receiving the ACK as OK,
   * it confirms the erase operation is done and exits from the loop.
   *
   * If the ACK data is FAIL, it throws a CmdException.
   *
   * If the response frame is not received, it prints a debug message.
   */
  async erase(): Promise<void> {
    if (!this.BSL) throw new Error("Not in BSL mode");
    const frame = this.frameToSerial(
      this.FOR_WRITE,
      this.ERASE,
      new Uint8Array(),
      0
    );
    await this.write(frame);
    console.log(5, "performing mass erase", frame);
    while (true) {
      const frame = await this.readSer(this.MAX_BUFF_LEN);
      console.log(frame, "frame is");
      if (frame.length) {
        const serialData = this.dataFromSerial(frame);
        if (!serialData) {
          debugger;
          await this.sleep(100);
          continue;
        }
        const [fun, data] = serialData;
        if (fun === this.ACK && data.includes(this.OK)) {
          this.mdebug(5, "Erase done");
          break;
        } else if (fun === this.ACK && data.includes(this.FAIL))
          throw new Error("Erase Failed");
      } else this.mdebug(5, "erase: no data from serial");
      await this.sleep(100);
    }
  }
  async BSLInit(): Promise<void> {
    this.mdebug(5, "BSLInit");
    const frame = this.frameToSerial(
      this.FOR_WRITE,
      this.START,
      new Uint8Array(),
      0
    );
    console.log("BSLInit frame", frame);
    await this.write(frame);
    // while (true) {
    //   const frameData = await this.readSer(this.MAX_BUFF_LEN);
    //   this.mdebug(5, "BSLInit: frame", frameData);
    //   await this.sleep(100);
    // }
    while (!this.BSL) {
      const frame = await this.readSer();
      if (frame.length) {
        const serialData = this.dataFromSerial(frame);
        console.log("BSLInit frame", serialData, frame);
        if (!serialData) {
          this.mdebug(5, "BSLInit: no data from serial", serialData);
          await this.sleep(100);
          continue;
        }
        const [fun, data] = serialData;
        if (fun === this.ACK && data.includes(this.OK)) {
          this.BSL = true;
          this.mdebug(5, "Bootloader active");
          break;
        } else if (fun === this.ACK && data.includes(this.FAIL))
          throw new Error("BSLInit Failed");
      } else this.mdebug(5, "BSLInit: no data from serial");
      await this.sleep(100);
    }
  }
  async startApp(): Promise<void> {
    if (!this.BSL) throw new Error("Not in BSL mode");
    const frame = this.frameToSerial(
      this.FOR_WRITE,
      this.START_APP,
      new Uint8Array(),
      0
    );
    await this.write(frame);
    while (true) {
      const frame = await this.readSer(this.MAX_BUFF_LEN);
      console.log("startApp frame", frame);
      if (frame.length) {
        const serialData = this.dataFromSerial(frame);
        if (!serialData) {
          await this.sleep(100);
          continue;
        }
        const [fun, data] = serialData;
        if (fun === this.ACK && data.includes(this.OK)) {
          this.mdebug(5, "Start App done");
          break;
        } else if (fun === this.ACK && data.includes(this.FAIL))
          throw new Error("Start App Failed");
      } else this.mdebug(5, "startApp: no data from serial");
      await this.sleep(100);
    }
  }
  async writeDataInChunks(data: Uint8Array): Promise<void> {
    const chunkSize = 64;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await this.write(chunk); // Assuming write is an async function that accepts a Uint8Array
      await this.sleep(1000);
    }
  }

  async writeMemory(addr: number, data: Uint8Array): Promise<void> {
    if (!this.BSL) throw new Error("Not in BSL mode");
    const length = data.length;
    console.log("length", length);
    const tragetData = new Uint8Array([
      (addr >> 24) & 0xff,
      (addr >> 16) & 0xff,
      (addr >> 8) & 0xff,
      addr & 0xff,
      (length >> 24) & 0xff,
      (length >> 16) & 0xff,
      (length >> 8) & 0xff,
      length & 0xff,
    ]);
    const frame = this.frameToSerial(this.FOR_WRITE, this.WRITE, tragetData, 8);
    console.log("writeMemory frame", frame);
    // this.slipReaderEnabled = true;
    await this.write(frame);
    await this.write(data);
    // console.log("serial indicator before", await this.device.getSignals());
    // await this.device.setSignals({ break: true });
    // await this.sleep(200);
    // console.log("serial indicator after", await this.device.getSignals());

    // await this.device.setSignals({ break: false });
    // await this.sleep(1000);
    // for (let i = 0; i < data.length; i++) {
    //   const send = new Uint8Array([data[i]]);
    //   await this.write(send);
    // }

    // await this.write(data);
    // this.slipReaderEnabled = false;
    // await this.sleep(50);
    // await this.writeDataInChunks(data);
    while (true) {
      const frame = await this.readSer(this.MAX_BUFF_LEN);
      console.log("readMemory frame", frame);
      if (frame.length) {
        const serialData = this.dataFromSerial(frame);
        if (!serialData) {
          await this.sleep(100);
          continue;
        }
        const [fun, data] = serialData;
        if (fun === this.ACK && data.includes(this.OK)) {
          this.mdebug(5, "write done");
          await this.startApp();
          break;
        } else if (fun === this.ACK && data.includes(this.FAIL))
          throw new Error("write Failed");
      } else this.mdebug(5, "ReadMemory: no data from serial");
      await this.sleep(100);
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
  async writeFlash(hex: string) {
    if (!this.BSL) throw new Error("Not in BSL mode");
    // const data = this.intelHexToUint8Array(hex);
    // console.log("data", data);
    const data = new Uint8Array([
      0, 128, 32, 32, 183, 1, 0, 0, 195, 1, 0, 0, 195, 1, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 195,
      1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 195, 1, 0, 0, 195, 1, 0, 0, 195, 1, 0, 0,
      195, 1, 0, 0, 195, 1, 0, 0, 195, 1, 0, 0, 195, 1, 0, 0, 195, 1, 0, 0, 195,
      1, 0, 0, 195, 1, 0, 0, 0, 0, 0, 0, 195, 1, 0, 0, 195, 1, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 195, 1, 0, 0, 195, 1, 0, 0, 195, 1, 0, 0, 195, 1, 0, 0, 195,
      1, 0, 0, 195, 1, 0, 0, 195, 1, 0, 0, 195, 1, 0, 0, 195, 1, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 195, 1, 0, 0, 195, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 195, 1,
      0, 0, 0, 0, 0, 0, 195, 1, 0, 0, 195, 1, 0, 0, 13, 72, 0, 33, 1, 96, 13,
      72, 1, 31, 10, 104, 3, 35, 219, 67, 19, 64, 11, 96, 65, 104, 1, 34, 145,
      67, 65, 96, 65, 104, 18, 2, 145, 67, 65, 96, 1, 104, 48, 34, 145, 67, 1,
      96, 1, 104, 15, 34, 145, 67, 1, 96, 112, 71, 192, 70, 8, 3, 11, 64, 4, 1,
      11, 64, 10, 77, 11, 76, 1, 32, 134, 5, 0, 240, 72, 248, 40, 70, 16, 56, 6,
      96, 32, 70, 0, 240, 74, 248, 46, 96, 32, 70, 0, 240, 70, 248, 46, 96, 32,
      70, 0, 240, 66, 248, 46, 96, 242, 231, 176, 50, 10, 64, 0, 36, 244, 0,
      128, 181, 6, 72, 6, 73, 65, 96, 6, 74, 81, 96, 6, 73, 1, 96, 17, 96, 16,
      32, 0, 240, 48, 248, 128, 189, 192, 70, 0, 8, 10, 64, 3, 0, 0, 177, 0, 40,
      10, 64, 1, 0, 0, 38, 6, 72, 128, 243, 8, 136, 0, 191, 0, 191, 0, 240, 38,
      248, 0, 32, 255, 247, 198, 255, 1, 32, 0, 240, 34, 248, 192, 70, 0, 128,
      32, 32, 4, 72, 129, 33, 1, 96, 1, 32, 128, 5, 3, 73, 8, 96, 8, 99, 112,
      71, 192, 70, 200, 128, 66, 64, 160, 50, 10, 64, 128, 181, 255, 247, 201,
      255, 255, 247, 237, 255, 255, 247, 139, 255, 128, 189, 129, 30, 9, 31, 0,
      191, 252, 210, 112, 71, 211, 231, 112, 71, 1, 32, 112, 71, 0, 191, 254,
      231, 254, 231, 0, 0, 0, 0,
    ]);
    await this.writeMemory(this.flash_start_addr, data);
    const exitFrame = this.frameToSerial(
      this.FOR_WRITE,
      this.EXIT,
      new Uint8Array(),
      0
    );
    console.log("exiting", exitFrame);
    // await this.write(exitFrame);
  }
}
