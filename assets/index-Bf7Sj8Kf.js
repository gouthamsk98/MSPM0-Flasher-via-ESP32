var L=Object.defineProperty;var v=(c,t,e)=>t in c?L(c,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):c[t]=e;var o=(c,t,e)=>v(c,typeof t!="symbol"?t+"":t,e);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))r(i);new MutationObserver(i=>{for(const s of i)if(s.type==="childList")for(const n of s.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&r(n)}).observe(document,{childList:!0,subtree:!0});function e(i){const s={};return i.integrity&&(s.integrity=i.integrity),i.referrerPolicy&&(s.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?s.credentials="include":i.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function r(i){if(i.ep)return;i.ep=!0;const s=e(i);fetch(i.href,s)}})();class O{constructor(t,e=!0,r=!1){o(this,"slipReaderEnabled",!1);o(this,"leftOver",new Uint8Array(0));o(this,"baudrate",9600);o(this,"traceLog","");o(this,"lastTraceTime",Date.now());o(this,"reader");o(this,"checksum",function(t){let e,r=239;for(e=0;e<t.length;e++)r^=t[e];return r});this.device=t,this.tracing=e,this.slipReaderEnabled=r,this.getInfo()}getInfo(){const t=this.device.getInfo();return console.log("Product info",t),t.usbVendorId&&t.usbProductId}async sleep(t){return new Promise(e=>setTimeout(e,t))}async waitForUnlock(t){for(;this.device.readable&&this.device.readable.locked||this.device.writable&&this.device.writable.locked;)await this.sleep(t)}async connect(t=115200){try{await this.device.open({baudRate:t,bufferSize:1024*10}),this.baudrate=t,this.leftOver=new Uint8Array(0),console.log("Connected to device")}catch(e){console.error("Error in connect",e)}}async disconnect(){var t,e;(t=this.device.readable)!=null&&t.locked&&await((e=this.reader)==null?void 0:e.cancel()),await this.waitForUnlock(400),this.reader=void 0,await this.device.close()}trace(t){const i=`${`TRACE ${(Date.now()-this.lastTraceTime).toFixed(3)}`} ${t}`;console.log(i),this.traceLog+=i+`
`}hexify(t){return Array.from(t).map(e=>e.toString(16).padStart(2,"0")).join("").padEnd(16," ")}hexConvert(t,e=!0){if(e&&t.length>16){let r="",i=t;for(;i.length>0;){const s=i.slice(0,16),n=String.fromCharCode(...s).split("").map(a=>a===" "||a>=" "&&a<="~"&&a!=="  "?a:".").join("");i=i.slice(16),r+=`
    ${this.hexify(s.slice(0,8))} ${this.hexify(s.slice(8))} | ${n}`}return r}else return this.hexify(t)}async returnTrace(){try{await navigator.clipboard.writeText(this.traceLog),console.log("Text copied to clipboard!")}catch(t){console.error("Failed to copy text:",t)}}_appendBuffer(t,e){const r=new Uint8Array(t.byteLength+e.byteLength);return r.set(new Uint8Array(t),0),r.set(new Uint8Array(e),t.byteLength),r.buffer}slipWriter(t){const e=new Array;e.push(192);for(let r=0;r<t.length;r++)t[r]===219?e.push(219,221):t[r]===192?e.push(219,220):e.push(t[r]);return e.push(192),new Uint8Array(e)}async writeChunk(t,e){let r=0;if(this.device.writable){const i=this.device.writable.getWriter();for(;r<t.length;){const s=t.slice(r,r+e);await i.write(s),console.log("Write chunk",s),r+=e}i.releaseLock()}}async write(t){const e=this.slipReaderEnabled?this.slipWriter(t):t;if(this.device.writable){const r=this.device.writable.getWriter();this.tracing&&(console.log("Write bytes"),this.trace(`Write ${e.length} bytes: ${this.hexConvert(e)}`)),await r.write(e),console.log("Write bytes",e),r.releaseLock()}}slipReader(t){let e=0,r=0,i=0,s="init";for(;e<t.length;){if(s==="init"&&t[e]==192){r=e+1,s="valid_data",e++;continue}if(s==="valid_data"&&t[e]==192){i=e-1,s="packet_complete";break}e++}if(s!=="packet_complete")return this.leftOver=t,new Uint8Array(0);this.leftOver=t.slice(i+2);const n=new Uint8Array(i-r+1);let a=0;for(e=r;e<=i;e++,a++){if(t[e]===219&&t[e+1]===220){n[a]=192,e++;continue}if(t[e]===219&&t[e+1]===221){n[a]=219,e++;continue}n[a]=t[e]}return n.slice(0,a)}async read(t=0,e=12){let r,i=this.leftOver;if(this.leftOver=new Uint8Array(0),this.slipReaderEnabled){const s=this.slipReader(i);if(s.length>0)return s;i=this.leftOver,this.leftOver=new Uint8Array(0)}if(this.device.readable==null)return this.leftOver;this.reader=this.device.readable.getReader();try{t>0&&(r=setTimeout(()=>{this.reader&&this.reader.cancel()},t));do{if(!this.reader)throw new Error("Reader is undefined");const{value:s,done:n}=await this.reader.read();if(n&&(this.leftOver=i,console.log("Timeout")),!s)break;i=new Uint8Array(this._appendBuffer(i.buffer,s.buffer))}while(i.length<e)}finally{if(t>0&&clearTimeout(r),!this.reader)throw new Error("Reader is undefined");this.reader.releaseLock()}if(this.tracing&&(console.log("Read bytes"),this.trace(`Read ${i.length} bytes: ${this.hexConvert(i)}`)),this.slipReaderEnabled){const s=this.slipReader(i);return this.tracing&&(console.log("Slip reader results"),this.trace(`Read ${s.length} bytes: ${this.hexConvert(s)}`)),s}return i}async rawRead(t=0){if(this.leftOver.length!=0){const r=this.leftOver;return this.leftOver=new Uint8Array(0),r}if(!this.device.readable)return this.leftOver;this.reader=this.device.readable.getReader();let e;try{if(t>0&&(e=setTimeout(()=>{this.reader&&this.reader.cancel()},t)),!this.reader)throw new Error("Reader is undefined");const{value:r,done:i}=await this.reader.read();return i?r||new Uint8Array(0):(this.tracing&&(console.log("Raw Read bytes"),this.trace(`Read ${r.length} bytes: ${this.hexConvert(r)}`)),r)}finally{if(t>0&&clearTimeout(e),!this.reader)throw new Error("Reader is undefined");this.reader.releaseLock()}}checkSum(t,e){let r=0;console.log("buf",e);for(let i=2;i<e-1;i++)r+=t[i];return r=r&255,r=~r&255,r}frameToSerial(t,e,r,i){const s=i+9,n=i+2,a=new Uint8Array(s);return a[0]=249,a[1]=255,a[2]=n>>24&255,a[3]=n>>16&255,a[4]=n>>8&255,a[5]=n&255,a[6]=t,a[7]=e,a.set(r,8),a[a.length-1]=this.checkSum(a,a.length-1),a}dataFromSerial(t){const e=this.checkSum(t,t.length);return console.log("CKSM",e,t),t[0]!==249||t[1]!==245||t[t.length-1]!==e?(console.log("Invalid frame"),null):[t[7],t.subarray(8,t.length)]}}const d=class d extends O{constructor(e){super(e);o(this,"DEFAULT_BAUD",115200);o(this,"MAX_BUFF_LEN",64);o(this,"SETUP",!1);o(this,"BSL",!1);o(this,"CRC32_POLY",3988292384);o(this,"_crc32",4294967295);o(this,"START",1);o(this,"ERASE",2);o(this,"PAGE_ERASE",3);o(this,"WRITE",4);o(this,"READ",5);o(this,"VERIFY",6);o(this,"START_APP",7);o(this,"EXIT",8);o(this,"ACK",9);o(this,"DATA",16);o(this,"FOR_WRITE",17);o(this,"FOR_READ",34);o(this,"OK",1);o(this,"FAIL",0);o(this,"flash_start_addr",0);o(this,"page_size",2048);o(this,"ROM_INVALID_RECV_MSG",5);this.port=e}static mdebug(e,r,i=`
`){{const s=document.querySelector("#console");s.value+=r+`
`,s.scrollTop=s.scrollHeight}}_shortToBytearray(e){return new Uint8Array([e&255,e>>8&255])}_intToByteArray(e){return new Uint8Array([e&255,e>>8&255,e>>16&255,e>>24&255])}_byteArrayToShort(e,r){return e|r>>8}_byteArrayToInt(e,r,i,s){return e|r<<8|i<<16|s<<24}async flushInput(){try{await this.rawRead(200)}catch(e){console.error(e.message)}}async readPacket(e=null,r=3e3){for(let i=0;i<100;i++){const s=await this.read(r),n=s[0],a=s[1],l=this._byteArrayToInt(s[4],s[5],s[6],s[7]),u=s.slice(8);if(n==1){if(e==null||a==e)return[l,u];if(u[0]!=0&&u[1]==this.ROM_INVALID_RECV_MSG)throw await this.flushInput(),new Error("unsupported command error")}}throw new Error("invalid response")}async command(e=null,r=new Uint8Array(0),i=0,s=!0,n=3e3){if(e!=null){this.tracing&&this.trace(`command op:0x${e.toString(16).padStart(2,"0")} data len=${r.length} wait_response=${s?1:0} timeout=${(n/1e3).toFixed(3)} data=${this.hexConvert(r)}`);const a=new Uint8Array(8+r.length);a[0]=0,a[1]=e,a[2]=this._shortToBytearray(r.length)[0],a[3]=this._shortToBytearray(r.length)[1],a[4]=this._intToByteArray(i)[0],a[5]=this._intToByteArray(i)[1],a[6]=this._intToByteArray(i)[2],a[7]=this._intToByteArray(i)[3];let l;for(l=0;l<r.length;l++)a[8+l]=r[l];await this.write(a)}return s?this.readPacket(e,n):[0,new Uint8Array(0)]}async checkCommand(e="",r=null,i=new Uint8Array(0),s=0,n=3e3){console.log("check_command "+e);const a=await this.command(r,i,s,void 0,n);return a[1].length>4?a[1]:a[0]}async readSer(e=1){return await this.read(10,e)}async erase(){this.BSL||await this.BSLInit();const e=this.frameToSerial(this.FOR_WRITE,this.ERASE,new Uint8Array,0);for(await this.write(e),console.log(5,"performing mass erase",e);;){const r=await this.readSer(this.MAX_BUFF_LEN);if(console.log(r,"frame is"),r.length){const i=this.dataFromSerial(r);if(!i){await this.sleep(100);continue}const[s,n]=i;if(s===this.ACK&&n.includes(this.OK)){d.mdebug(5,"Erase done");break}else if(s===this.ACK&&n.includes(this.FAIL))throw new Error("Erase Failed")}else d.mdebug(5,"erase: no data from serial");await this.sleep(100)}}async BSLInit(){d.mdebug(5,"BSLInit");const e=this.frameToSerial(this.FOR_WRITE,this.START,new Uint8Array,0);for(console.log("BSLInit frame",e),await this.write(e);!this.BSL;){const r=await this.readSer();if(r.length){const i=this.dataFromSerial(r);if(console.log("BSLInit frame",i,r),!i){d.mdebug(5,"BSLInit: no data from serial",i),await this.sleep(100);continue}const[s,n]=i;if(s===this.ACK&&n.includes(this.OK)){this.BSL=!0,d.mdebug(5,"Bootloader active");break}else if(s===this.ACK&&n.includes(this.FAIL))throw new Error("BSLInit Failed")}else d.mdebug(5,"BSLInit: no data from serial");await this.sleep(100)}}async startApp(){const e=this.frameToSerial(this.FOR_WRITE,this.START_APP,new Uint8Array,0);for(await this.write(e);;){const r=await this.readSer(this.MAX_BUFF_LEN);if(console.log("startApp frame",r),r.length){const i=this.dataFromSerial(r);if(!i){await this.sleep(100);continue}const[s,n]=i;if(s===this.ACK&&n.includes(this.OK)){d.mdebug(5,"Start App done");break}else if(s===this.ACK&&n.includes(this.FAIL))throw new Error("Start App Failed")}else d.mdebug(5,"startApp: no data from serial");await this.sleep(100)}}async writeDataInChunks(e){for(let i=0;i<e.length;i+=64){const s=e.slice(i,i+64);await this.write(s),await this.sleep(1e3)}}crc32(e){this._crc32=4294967295;for(const r of e){this._crc32^=r;for(let i=0;i<8;i++){const s=-(this._crc32&1);this._crc32=this._crc32>>>1^this.CRC32_POLY&s}}return this._crc32>>>0}async verify(e,r,i){let s=this.crc32(i);const n=new Uint8Array([s>>24&255,s>>8&255,s&255,e>>24&255,e>>16&255,e>>8&255,e&255,r>>24&255,r>>16&255,r>>8&255,r&255]),a=this.frameToSerial(this.FOR_WRITE,this.VERIFY,n,12);for(await this.write(a);;){const l=await this.readSer(this.MAX_BUFF_LEN);if(console.log("readMemory frame",l),l.length){const u=this.dataFromSerial(l);if(!u){await this.sleep(100);continue}const[p,b]=u;if(p===this.ACK&&b.includes(this.OK)){d.mdebug(5,"verification done"),await this.startApp();break}else if(p===this.ACK&&b.includes(this.FAIL))throw new Error("verification Failed")}else d.mdebug(5,"ReadMemory: no data from serial");await this.sleep(100)}}async writeMemory(e,r){if(!this.BSL)throw new Error("Not in BSL mode");const i=r.length;console.log("length",i);const s=new Uint8Array([e>>24&255,e>>16&255,e>>8&255,e&255,i>>24&255,i>>16&255,i>>8&255,i&255]),n=this.frameToSerial(this.FOR_WRITE,this.WRITE,s,8);for(console.log("writeMemory frame",n),await this.write(n),await this.writeChunk(r,64);;){const a=await this.readSer(this.MAX_BUFF_LEN);if(console.log("readMemory frame",a),a.length){const l=this.dataFromSerial(a);if(!l){await this.sleep(100);continue}const[u,p]=l;if(u===this.ACK&&p.includes(this.OK)){d.mdebug(5,"write done"),await this.startApp();break}else if(u===this.ACK&&p.includes(this.FAIL))throw new Error("write Failed")}else d.mdebug(5,"ReadMemory: no data from serial");await this.sleep(100)}}intelHexToUint8Array(e){const r=e.trim().split(`
`),i=[];return r.forEach(s=>{if(s.startsWith(":")){const n=parseInt(s.substr(1,2),16),a=9,l=a+n*2;for(let u=a;u<l;u+=2)i.push(parseInt(s.substr(u,2),16))}}),new Uint8Array(i)}async writeFlash(e){this.BSL||await this.BSLInit();const r=this.intelHexToUint8Array(e);await this.erase(),await this.writeMemory(this.flash_start_addr,r);const i=this.frameToSerial(this.FOR_WRITE,this.EXIT,new Uint8Array,0);console.log("exiting",i)}async verifyFlash(e){this.BSL||await this.BSLInit();const r=this.intelHexToUint8Array(e);await this.verify(this.flash_start_addr,r.length,r)}};o(d,"QUIET",5);let E=d;class F{constructor(t){o(this,"baudrate",9600);o(this,"buffer_size",1024*1024);o(this,"traceLog","");o(this,"lastTraceTime",Date.now());o(this,"tracing",!0);o(this,"leftOver",new Uint8Array(0));o(this,"reader");o(this,"slipReaderEnabled",!0);o(this,"trace_dom_log",!0);this.device=t,console.log("SerialTransport intialized")}_appendBuffer(t,e){const r=new Uint8Array(t.byteLength+e.byteLength);return r.set(new Uint8Array(t),0),r.set(new Uint8Array(e),t.byteLength),r.buffer}async read(t=0,e=12){let r,i=this.leftOver;if(this.leftOver=new Uint8Array(0),this.slipReaderEnabled){const s=this.slipReader(i);if(s.length>0)return s;i=this.leftOver,this.leftOver=new Uint8Array(0)}if(this.device.readable==null)return this.leftOver;this.reader=this.device.readable.getReader();try{t>0&&(r=setTimeout(()=>{this.reader&&this.reader.cancel()},t));do{if(!this.reader)throw new Error("Reader is undefined");const{value:s,done:n}=await this.reader.read();if(n&&(this.leftOver=i,console.log("Timeout")),!s)break;i=new Uint8Array(this._appendBuffer(i.buffer,s.buffer))}while(i.length<e)}finally{if(t>0&&clearTimeout(r),!this.reader)throw new Error("Reader is undefined");this.reader.releaseLock()}if(this.tracing&&(console.log("Read bytes"),this.trace(`Read ${i.length} bytes: ${this.hexConvert(i)}`)),this.slipReaderEnabled){const s=this.slipReader(i);return this.tracing&&(console.log("Slip reader results"),this.trace(`Read ${s.length} bytes: ${this.hexConvert(s)}`)),s}return i}slipReader(t){let n=[],a=!1;for(const l of t)l!==15968&&(l===219?a=!0:a?(l===220?n.push(15968):l===221&&n.push(219),a=!1):n.push(l));return new Uint8Array(n)}trace(t){const i=`${`TRACE ${(Date.now()-this.lastTraceTime).toFixed(3)}`} ${t}`;if(console.log(i),this.traceLog+=i+`
`,this.trace_dom_log){const s=document.querySelector("#traceLog");s&&(s.value+=this.traceLog,s.scrollTop=s.scrollHeight)}}hexify(t){return Array.from(t).map(e=>e.toString(16).padStart(2,"0")).join("").padEnd(16," ")}hexConvert(t,e=!0){if(e&&t.length>16){let r="",i=t;for(;i.length>0;){const s=i.slice(0,16),n=String.fromCharCode(...s).split("").map(a=>a===" "||a>=" "&&a<="~"&&a!=="  "?a:".").join("");i=i.slice(16),r+=`
    ${this.hexify(s.slice(0,8))} ${this.hexify(s.slice(8))} | ${n}`}return r}else return this.hexify(t)}debug(t,e,r=!0,i=!0,s="#console"){if(r&&console.log(t,e),i){const n=document.querySelector(`${s}`);n&&(n.value+=t+`
`,n.scrollTop=n.scrollHeight)}}async sleep(t){return new Promise(e=>setTimeout(e,t))}async connect(t=this.baudrate){try{await this.device.open({baudRate:t,bufferSize:this.buffer_size}),this.debug("Device Connected"),this.leftOver=new Uint8Array(0)}catch(e){this.debug("Error in connect",e)}}async send(t){if(this.device.writable){const e=this.device.writable.getWriter();await e.write(t),this.debug("Data sent",t,!0,!1),e.releaseLock()}}intelHexToUint8Array(t){const e=t.trim().split(`
`),r=[];return e.forEach(i=>{if(i.startsWith(":")){const s=parseInt(i.substr(1,2),16),n=9,a=n+s*2;for(let l=n;l<a;l+=2)r.push(parseInt(i.substr(l,2),16))}}),new Uint8Array(r)}async receive(t=0){if(this.leftOver.length!=0){const r=this.leftOver;return this.leftOver=new Uint8Array(0),r}if(!this.device.readable)return this.leftOver;this.reader=this.device.readable.getReader();let e;try{if(t>0&&(e=setTimeout(()=>{this.reader&&this.reader.cancel()},t)),!this.reader)throw new Error("Reader is undefined");const{value:r,done:i}=await this.reader.read();return console.log("Raw Read bytes",r),i?r||new Uint8Array(0):(this.tracing&&(console.log("Raw Read bytes"),this.trace(`Read ${r.length} bytes: ${this.hexConvert(r)}`)),r)}finally{if(t>0&&clearTimeout(e),!this.reader)throw new Error("Reader is undefined");this.reader.releaseLock()}}}var y=(c=>(c[c.BSL_ACK=0]="BSL_ACK",c[c.BSL_ERROR_HEADER_INCORRECT=81]="BSL_ERROR_HEADER_INCORRECT",c[c.BSL_ERROR_CHECKSUM_INCORRECT=82]="BSL_ERROR_CHECKSUM_INCORRECT",c[c.BSL_ERROR_PACKET_SIZE_ZERO=83]="BSL_ERROR_PACKET_SIZE_ZERO",c[c.BSL_ERROR_PACKET_SIZE_TOO_BIG=84]="BSL_ERROR_PACKET_SIZE_TOO_BIG",c[c.BSL_ERROR_UNKNOWN_ERROR=85]="BSL_ERROR_UNKNOWN_ERROR",c[c.BSL_ERROR_UNKNOWN_BAUD_RATE=86]="BSL_ERROR_UNKNOWN_BAUD_RATE",c))(y||{});class h{static softwareCRC(t,e){let r=4294967295;for(let i=0;i<e;i++){let s=t[i];r=r^s;for(let n=0;n<8;n++){const a=-(r&1);r=r>>>1^this.CRC32_POLYNOMIAL&a}}return r=r>>>0,new Uint8Array([r&255,r>>>8&255,r>>>16&255,r>>>24&255])}static async getFrameRaw(t){switch(t.type){case"Connection":{const e=this.softwareCRC(new Uint8Array([this.CONNECTION]),1);return new Uint8Array([this.HEADER,1,0,this.CONNECTION,...e])}case"StartApp":{const e=this.softwareCRC(new Uint8Array([this.START_APP]),1);return new Uint8Array([this.HEADER,1,0,this.START_APP,...e])}case"GetDeviceInfo":{const e=this.softwareCRC(new Uint8Array([this.GET_DEVICE_INFO]),1);return new Uint8Array([this.HEADER,1,0,this.GET_DEVICE_INFO,...e])}case"MassErase":{const e=this.softwareCRC(new Uint8Array([this.MASS_ERASE]),1);return new Uint8Array([this.HEADER,1,0,this.MASS_ERASE,...e])}case"ProgramData":{const e=t.data,r=[t.start_address>>24&255,t.start_address>>16&255,t.start_address>>8&255,t.start_address&255],i=e.length+4+1,s=this.softwareCRC(new Uint8Array([this.PROGRAM_DATA,...r,...e]),i);return new Uint8Array([this.HEADER,i&255,i>>8,this.PROGRAM_DATA,...r,...e,...s])}case"UnlockBootloader":{const e=t.password,r=e.length+1,i=this.softwareCRC(new Uint8Array([this.UNLOCK_BOOTLOADER,...e]),r);return new Uint8Array([this.HEADER,r&255,r>>8,this.UNLOCK_BOOTLOADER,...e,...i])}default:throw new Error("Unimplemented command")}}static getResponse(t,e){switch(e.type){case"Connection":case"StartApp":return{type:e.type,response:t[0]};case"MassErase":case"ProgramData":case"UnlockBootloader":return{type:e.type,response:t[5]};case"GetDeviceInfo":return{type:e.type,response:t[5],CMD_interpreter_version:t[this.OFFSET_BYTE+2]<<8|t[this.OFFSET_BYTE+1],build_id:t[this.OFFSET_BYTE+4]<<8|t[this.OFFSET_BYTE+3],app_version:t[this.OFFSET_BYTE+8]<<24|t[this.OFFSET_BYTE+7]<<16|t[this.OFFSET_BYTE+6]<<8|t[this.OFFSET_BYTE+5],active_plugin_interface_version:t[this.OFFSET_BYTE+10]<<8|t[this.OFFSET_BYTE+9],BSL_max_buffer_size:t[this.OFFSET_BYTE+12]<<8|t[this.OFFSET_BYTE+11],BSL_buffer_start_address:t[this.OFFSET_BYTE+16]<<24|t[this.OFFSET_BYTE+15]<<16|t[this.OFFSET_BYTE+14]<<8|t[this.OFFSET_BYTE+13],BCR_config_id:t[this.OFFSET_BYTE+20]<<24|t[this.OFFSET_BYTE+19]<<16|t[this.OFFSET_BYTE+18]<<8|t[this.OFFSET_BYTE+17],BSL_config_id:t[this.OFFSET_BYTE+24]<<24|t[this.OFFSET_BYTE+23]<<16|t[this.OFFSET_BYTE+22]<<8|t[this.OFFSET_BYTE+21]};default:throw new Error("Unimplemented command")}}}o(h,"HEADER",128),o(h,"CONNECTION",18),o(h,"UNLOCK_BOOTLOADER",33),o(h,"FLASH_RANGE_ERASE",35),o(h,"MASS_ERASE",21),o(h,"PROGRAM_DATA",32),o(h,"PROGRAM_DATA_FAST",36),o(h,"MEMORY_READ",41),o(h,"FACTORY_RESET",48),o(h,"GET_DEVICE_INFO",25),o(h,"STANDALONE_VERIFY",49),o(h,"START_APP",64),o(h,"CRC32_POLYNOMIAL",3988292384),o(h,"INITIAL_SEED",4294967295),o(h,"OFFSET_BYTE",4);class C extends F{constructor(e){super(e);o(this,"conn_established",!1);o(this,"FLASH_START_ADDRESS",0);o(this,"FLASH_MAX_BUFFER_SIZE",0);o(this,"BSL_PW_RESET",[255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255]);o(this,"MEMORY_READ_RESPONSE",48);o(this,"DEVICE_INFO_RESPONSE",49);o(this,"STANDALONE_VERIFY_RESPONSE",50);o(this,"MESSAGE_RESPONSE",59);o(this,"ERROR_RESPONSE",58);o(this,"ESP_BSL_CMD",[66,83,76]);o(this,"ESP_OLED_CLR",["O","L","D","R","S","T"]);o(this,"ESP_OLED_ON",["O","L","D","O","N"]);o(this,"ESP_OLED_OFF",["O","L","D","O","F","F"]);o(this,"ESP_OLED_PRINT",["O","L","D","W","R","T"])}LSB(e){return e&255}s2a(e){let r=new Uint8Array(e.length);for(let i=0;i<e.length;i++)r[i]=e[i].charCodeAt(0);return r}async enableBSL(){await this.send(new Uint8Array(this.ESP_BSL_CMD)),await this.receive(),await this.send(this.s2a(this.ESP_OLED_CLR)),await this.receive(),this.sleep(100)}async control_esp_oled(e){await this.send(this.s2a(e)),await this.receive()}async establish_conn(){this.debug("Enabling BSL Mode..."),await this.enableBSL();let e={type:"Connection"},r=await h.getFrameRaw(e);await this.send(r);let i=await this.receive(),s=h.getResponse(i,e);if(s.response==y.BSL_ACK)this.conn_established=!0,this.debug("BSL Mode Enabled"),this.get_device_info();else throw this.debug("BSL Mode Enable Failed",s.response),this.conn_established=!1,new Error("BSL Mode Enable Failed")}check_crc(e){const r=e[3]<<8|e[2],i=e.slice(4,3+r),s=h.softwareCRC(i,r),n=s[0]<<24|s[1]<<16|s[2]<<8|s[3],a=e[e.length-4]<<24|e[e.length-3]<<16|e[e.length-2]<<8|e[e.length-1];if(n!=a)throw this.debug("CRC Check Failed"),new Error("CRC Check Failed");return!0}async get_device_info(){this.conn_established||this.establish_conn();const e={type:"GetDeviceInfo"},r=await h.getFrameRaw(e);await this.send(r);const i=await this.receive(),s=this.slipReader(i);this.check_crc(s);let n=h.getResponse(s,e);n.response==y.BSL_ACK&&n.type=="GetDeviceInfo"?(this.FLASH_MAX_BUFFER_SIZE=n.BSL_max_buffer_size,this.FLASH_START_ADDRESS=n.BSL_buffer_start_address,this.debug(`Device Info:
        CMD_interpreter_version: 0x${n.CMD_interpreter_version.toString(16)}
        build_id: 0x${n.build_id.toString(16)}
        app_version: 0x${n.app_version.toString(16)}
        active_plugin_interface_version: 0x${n.active_plugin_interface_version.toString(16)}
        BSL_max_buffer_size: 0x${n.BSL_max_buffer_size.toString(16)}
        BSL_buffer_start_address: 0x${n.BSL_buffer_start_address.toString(16)}
        BCR_config_id: 0x${n.BCR_config_id.toString(16)}
        BSL_config_id: 0x${n.BSL_config_id.toString(16)}`),this.unlock_bootloader()):this.debug("Device Info Failed",n.response)}async unlock_bootloader(){this.conn_established||this.establish_conn(),this.debug("Unlocking Bootloader ...");let e={type:"UnlockBootloader",password:new Uint8Array(this.BSL_PW_RESET)},r=await h.getFrameRaw(e);await this.send(r);let i=await this.receive(),s=h.getResponse(i,e);if(s.response==y.BSL_ACK)this.debug("Bootloader Unlocked");else throw this.debug("Bootloader Unlock Failed",s.response),new Error("Bootloader Unlock Failed")}async mass_earse(){this.conn_established||this.establish_conn(),this.debug("Mass Erasing ...");let e={type:"MassErase"},r=await h.getFrameRaw(e);await this.send(r),console.log("send is",this.hexify(r));let i=await this.receive(),s=h.getResponse(i,e);s.response==y.BSL_ACK?this.debug("Mass Erase Done"):this.debug("Mass Erase Failed",s.response)}async program_data(e){const r=this.intelHexToUint8Array(e);this.conn_established||this.establish_conn();let i=0;console.log("adress",i);const s={type:"ProgramData",start_address:i,data:r};let n=await h.getFrameRaw(s);await this.send(n);let a=await this.receive();console.log("data is",a)}async flash_earse_range(){this.conn_established||this.establish_conn(),this.debug("Flashing ...")}async start_app(){this.conn_established||this.establish_conn();let e={type:"StartApp"},r=await h.getFrameRaw(e);await this.send(r);let i=await this.receive(),s=h.getResponse(i,e);s.response==y.BSL_ACK?(this.conn_established=!1,this.debug("App Started")):this.debug("App Start Failed",s.response)}}let _=!1,R,f,w;const m=[{usbVendorId:12346,usbProductId:4097},{usbVendorId:45488,usbProductId:32853}];function I(c){c.addEventListener("click",()=>{if(_&&R){R.disconnect(),c.innerHTML="Connect",_=!1;return}c.innerHTML="Connecting...",navigator.serial.requestPort({filters:m}).then(async t=>{f=await new C(t),await f.connect(),c.innerHTML="Connected",_=!0}).catch(t=>{console.error(t),E.mdebug(1,"Error Connecting"),R.disconnect(),c.innerHTML="Connect",_=!1})})}function B(c){c.addEventListener("click",async()=>{if(!_){f.debug("Please Connect First");return}c.innerHTML="Erasing...";try{await f.mass_earse()}catch(t){console.log(t),E.mdebug(1,"Error Erasing")}c.innerHTML="Erase"})}function U(c){c.addEventListener("click",async()=>{if(!_){f.debug("Please Connect First");return}if(!w){f.debug("Please upload a .Hex file first");return}c.innerHTML="Flashing...";try{await f.program_data(w),f.debug("Flashing Done")}catch{f.debug("Error Flashing")}c.innerHTML="Flash"})}function D(c){c.addEventListener("click",async()=>{if(!_){E.mdebug(1,"Please Connect First");return}if(!w){E.mdebug(1,"Please upload a .Hex file first");return}c.innerHTML="Verifying...";try{await R.verifyFlash(w)}catch(t){console.log(t),E.mdebug(1,"Error Verifying")}c.innerHTML="Verify"})}function M(c){return new Promise((t,e)=>{const r=new FileReader;r.onload=()=>t(r.result),r.onerror=e,r.readAsText(c)})}function x(c){c.addEventListener("change",async t=>{w="";const e=t.target.files[0];e&&e.name.endsWith(".hex")?(w=await M(e),console.log(w)):E.mdebug(1,"Please upload a valid .hex file")})}function N(c){c.addEventListener("click",async()=>{if(!_){f.debug("Please Connect First");return}c.innerHTML="Resting...",await f.start_app(),c.innerHTML="Reset"})}function k(c){c.addEventListener("click",async()=>{if(!_){f.debug("Please Connect First");return}c.innerHTML="Getting Device Info...";try{await f.establish_conn()}catch(t){console.log(t),f.debug("Error Getting Device Info")}c.innerHTML="Get Device Info"})}document.querySelector("#app").innerHTML=`
<h1>MSPMO Flasher via UART</h1>
<h4>Supported Browsers: Chrome, Edge</h4>
<div class="container">
  <div class="left">
    <button id="connect" type="button">Connect</button>
    <input type="file" id="myfile" name="myfile" accept=".hex">

    <div id="dropMessage" style="margin-top: 10px; color: green; display: none;">
      File has been uploaded successfully!
    </div><br><br>
    <input type="checkbox" id="toggleTraceLog" checked> Enable Trace Log
    <button id="getDeviceInfo" type="button">Get Device Info</button>
    <button id="erase" type="button">Erase</button>
    <button id="flash" type="button">Flash</button>
    <button id="verify" type="button">Verify</button>
    <button id="reset" type="button">Reset</button>
    <textarea id="console" rows="15" cols="50" readonly></textarea>
  </div>
  <div class="right">
    <h4>Trace Log</h4>
    <textarea id="traceLog" rows="20" cols="50" readonly></textarea>
  </div>
</div>
`;const g=document.getElementById("dropZone"),P=document.getElementById("myfile"),T=document.getElementById("dropMessage"),A=document.getElementById("toggleTraceLog"),S=document.getElementById("traceLog");console.log("trace",S,A);A&&S&&A.addEventListener("change",function(){S.style.display=="none"?S.style.display="inline":S.style.display="none"});g&&P&&T&&(g.addEventListener("dragover",c=>{c.preventDefault(),g.style.borderColor="#646cff"}),g.addEventListener("dragleave",()=>{g.style.borderColor="#ccc"}),g.addEventListener("drop",c=>{if(c.preventDefault(),g.style.borderColor="#ccc",!c.dataTransfer)return;c.dataTransfer.files.length>0&&(T.style.display="block")}));I(document.querySelector("#connect"));k(document.querySelector("#getDeviceInfo"));B(document.querySelector("#erase"));U(document.querySelector("#flash"));x(document.querySelector("#myfile"));N(document.querySelector("#reset"));D(document.querySelector("#verify"));
