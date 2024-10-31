var g=Object.defineProperty;var p=(o,r,e)=>r in o?g(o,r,{enumerable:!0,configurable:!0,writable:!0,value:e}):o[r]=e;var l=(o,r,e)=>p(o,typeof r!="symbol"?r+"":r,e);(function(){const r=document.createElement("link").relList;if(r&&r.supports&&r.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))t(i);new MutationObserver(i=>{for(const s of i)if(s.type==="childList")for(const a of s.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&t(a)}).observe(document,{childList:!0,subtree:!0});function e(i){const s={};return i.integrity&&(s.integrity=i.integrity),i.referrerPolicy&&(s.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?s.credentials="include":i.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function t(i){if(i.ep)return;i.ep=!0;const s=e(i);fetch(i.href,s)}})();class m{constructor(r,e=!0,t=!1){l(this,"slipReaderEnabled",!1);l(this,"leftOver",new Uint8Array(0));l(this,"baudrate",115200);l(this,"traceLog","");l(this,"lastTraceTime",Date.now());l(this,"reader");l(this,"checksum",function(r){let e,t=239;for(e=0;e<r.length;e++)t^=r[e];return t});this.device=r,this.tracing=e,this.slipReaderEnabled=t,this.getInfo()}getInfo(){const r=this.device.getInfo();return console.log("Product info",r),r.usbVendorId&&r.usbProductId}async sleep(r){return new Promise(e=>setTimeout(e,r))}async waitForUnlock(r){for(;this.device.readable&&this.device.readable.locked||this.device.writable&&this.device.writable.locked;)await this.sleep(r)}async connect(r=115200){try{await this.device.open({baudRate:r,bufferSize:1024*10}),this.baudrate=r,this.leftOver=new Uint8Array(0),console.log("Connected to device")}catch(e){console.error("Error in connect",e)}}async disconnect(){var r,e;(r=this.device.readable)!=null&&r.locked&&await((e=this.reader)==null?void 0:e.cancel()),await this.waitForUnlock(400),this.reader=void 0,await this.device.close()}trace(r){const i=`${`TRACE ${(Date.now()-this.lastTraceTime).toFixed(3)}`} ${r}`;console.log(i),this.traceLog+=i+`
`}hexify(r){return Array.from(r).map(e=>e.toString(16).padStart(2,"0")).join("").padEnd(16," ")}hexConvert(r,e=!0){if(e&&r.length>16){let t="",i=r;for(;i.length>0;){const s=i.slice(0,16),a=String.fromCharCode(...s).split("").map(n=>n===" "||n>=" "&&n<="~"&&n!=="  "?n:".").join("");i=i.slice(16),t+=`
    ${this.hexify(s.slice(0,8))} ${this.hexify(s.slice(8))} | ${a}`}return t}else return this.hexify(r)}async returnTrace(){try{await navigator.clipboard.writeText(this.traceLog),console.log("Text copied to clipboard!")}catch(r){console.error("Failed to copy text:",r)}}_appendBuffer(r,e){const t=new Uint8Array(r.byteLength+e.byteLength);return t.set(new Uint8Array(r),0),t.set(new Uint8Array(e),r.byteLength),t.buffer}slipWriter(r){const e=new Array;e.push(192);for(let t=0;t<r.length;t++)r[t]===219?e.push(219,221):r[t]===192?e.push(219,220):e.push(r[t]);return e.push(192),new Uint8Array(e)}async writeChunk(r,e){let t=0;if(this.device.writable){const i=this.device.writable.getWriter();for(;t<r.length;){const s=r.slice(t,t+e);await i.write(s),console.log("Write chunk",s),t+=e}i.releaseLock()}}async write(r){const e=this.slipReaderEnabled?this.slipWriter(r):r;if(this.device.writable){const t=this.device.writable.getWriter();this.tracing&&(console.log("Write bytes"),this.trace(`Write ${e.length} bytes: ${this.hexConvert(e)}`)),await t.write(e),console.log("Write bytes",e),t.releaseLock()}}slipReader(r){let e=0,t=0,i=0,s="init";for(;e<r.length;){if(s==="init"&&r[e]==192){t=e+1,s="valid_data",e++;continue}if(s==="valid_data"&&r[e]==192){i=e-1,s="packet_complete";break}e++}if(s!=="packet_complete")return this.leftOver=r,new Uint8Array(0);this.leftOver=r.slice(i+2);const a=new Uint8Array(i-t+1);let n=0;for(e=t;e<=i;e++,n++){if(r[e]===219&&r[e+1]===220){a[n]=192,e++;continue}if(r[e]===219&&r[e+1]===221){a[n]=219,e++;continue}a[n]=r[e]}return a.slice(0,n)}async read(r=0,e=12){let t,i=this.leftOver;if(this.leftOver=new Uint8Array(0),this.slipReaderEnabled){const s=this.slipReader(i);if(s.length>0)return s;i=this.leftOver,this.leftOver=new Uint8Array(0)}if(this.device.readable==null)return this.leftOver;this.reader=this.device.readable.getReader();try{r>0&&(t=setTimeout(()=>{this.reader&&this.reader.cancel()},r));do{if(!this.reader)throw new Error("Reader is undefined");const{value:s,done:a}=await this.reader.read();if(a&&(this.leftOver=i,console.log("Timeout")),!s)break;i=new Uint8Array(this._appendBuffer(i.buffer,s.buffer))}while(i.length<e)}finally{if(r>0&&clearTimeout(t),!this.reader)throw new Error("Reader is undefined");this.reader.releaseLock()}if(this.tracing&&(console.log("Read bytes"),this.trace(`Read ${i.length} bytes: ${this.hexConvert(i)}`)),this.slipReaderEnabled){const s=this.slipReader(i);return this.tracing&&(console.log("Slip reader results"),this.trace(`Read ${s.length} bytes: ${this.hexConvert(s)}`)),s}return i}async rawRead(r=0){if(this.leftOver.length!=0){const t=this.leftOver;return this.leftOver=new Uint8Array(0),t}if(!this.device.readable)return this.leftOver;this.reader=this.device.readable.getReader();let e;try{if(r>0&&(e=setTimeout(()=>{this.reader&&this.reader.cancel()},r)),!this.reader)throw new Error("Reader is undefined");const{value:t,done:i}=await this.reader.read();return i?t||new Uint8Array(0):(this.tracing&&(console.log("Raw Read bytes"),this.trace(`Read ${t.length} bytes: ${this.hexConvert(t)}`)),t)}finally{if(r>0&&clearTimeout(e),!this.reader)throw new Error("Reader is undefined");this.reader.releaseLock()}}checkSum(r,e){let t=0;console.log("buf",e);for(let i=2;i<e-1;i++)t+=r[i];return t=t&255,t=~t&255,t}frameToSerial(r,e,t,i){const s=i+9,a=i+2,n=new Uint8Array(s);return n[0]=249,n[1]=255,n[2]=a>>24&255,n[3]=a>>16&255,n[4]=a>>8&255,n[5]=a&255,n[6]=r,n[7]=e,n.set(t,8),n[n.length-1]=this.checkSum(n,n.length-1),n}dataFromSerial(r){const e=this.checkSum(r,r.length);return console.log("CKSM",e,r),r[0]!==249||r[1]!==245||r[r.length-1]!==e?(console.log("Invalid frame"),null):[r[7],r.subarray(8,r.length)]}}class A extends m{constructor(e){super(e);l(this,"QUIET",5);l(this,"DEFAULT_BAUD",115200);l(this,"MAX_BUFF_LEN",64);l(this,"SETUP",!1);l(this,"BSL",!1);l(this,"CRC32_POLY",3988292384);l(this,"_crc32",4294967295);l(this,"START",1);l(this,"ERASE",2);l(this,"PAGE_ERASE",3);l(this,"WRITE",4);l(this,"READ",5);l(this,"VERIFY",6);l(this,"START_APP",7);l(this,"EXIT",8);l(this,"ACK",9);l(this,"DATA",16);l(this,"FOR_WRITE",17);l(this,"FOR_READ",34);l(this,"OK",1);l(this,"FAIL",0);l(this,"flash_start_addr",0);l(this,"page_size",2048);l(this,"ROM_INVALID_RECV_MSG",5);this.port=e}mdebug(e,t,i=`
`){this.QUIET>=e&&console.log(t+i)}_shortToBytearray(e){return new Uint8Array([e&255,e>>8&255])}_intToByteArray(e){return new Uint8Array([e&255,e>>8&255,e>>16&255,e>>24&255])}_byteArrayToShort(e,t){return e|t>>8}_byteArrayToInt(e,t,i,s){return e|t<<8|i<<16|s<<24}async flushInput(){try{await this.rawRead(200)}catch(e){console.error(e.message)}}async readPacket(e=null,t=3e3){for(let i=0;i<100;i++){const s=await this.read(t),a=s[0],n=s[1],c=this._byteArrayToInt(s[4],s[5],s[6],s[7]),h=s.slice(8);if(a==1){if(e==null||n==e)return[c,h];if(h[0]!=0&&h[1]==this.ROM_INVALID_RECV_MSG)throw await this.flushInput(),new Error("unsupported command error")}}throw new Error("invalid response")}async command(e=null,t=new Uint8Array(0),i=0,s=!0,a=3e3){if(e!=null){this.tracing&&this.trace(`command op:0x${e.toString(16).padStart(2,"0")} data len=${t.length} wait_response=${s?1:0} timeout=${(a/1e3).toFixed(3)} data=${this.hexConvert(t)}`);const n=new Uint8Array(8+t.length);n[0]=0,n[1]=e,n[2]=this._shortToBytearray(t.length)[0],n[3]=this._shortToBytearray(t.length)[1],n[4]=this._intToByteArray(i)[0],n[5]=this._intToByteArray(i)[1],n[6]=this._intToByteArray(i)[2],n[7]=this._intToByteArray(i)[3];let c;for(c=0;c<t.length;c++)n[8+c]=t[c];await this.write(n)}return s?this.readPacket(e,a):[0,new Uint8Array(0)]}async checkCommand(e="",t=null,i=new Uint8Array(0),s=0,a=3e3){console.log("check_command "+e);const n=await this.command(t,i,s,void 0,a);return n[1].length>4?n[1]:n[0]}async readSer(e=1){return await this.read(10,e)}async erase(){this.BSL||await this.BSLInit();const e=this.frameToSerial(this.FOR_WRITE,this.ERASE,new Uint8Array,0);for(await this.write(e),console.log(5,"performing mass erase",e);;){const t=await this.readSer(this.MAX_BUFF_LEN);if(console.log(t,"frame is"),t.length){const i=this.dataFromSerial(t);if(!i){await this.sleep(100);continue}const[s,a]=i;if(s===this.ACK&&a.includes(this.OK)){this.mdebug(5,"Erase done");break}else if(s===this.ACK&&a.includes(this.FAIL))throw new Error("Erase Failed")}else this.mdebug(5,"erase: no data from serial");await this.sleep(100)}}async BSLInit(){this.mdebug(5,"BSLInit");const e=this.frameToSerial(this.FOR_WRITE,this.START,new Uint8Array,0);for(console.log("BSLInit frame",e),await this.write(e);!this.BSL;){const t=await this.readSer();if(t.length){const i=this.dataFromSerial(t);if(console.log("BSLInit frame",i,t),!i){this.mdebug(5,"BSLInit: no data from serial",i),await this.sleep(100);continue}const[s,a]=i;if(s===this.ACK&&a.includes(this.OK)){this.BSL=!0,this.mdebug(5,"Bootloader active");break}else if(s===this.ACK&&a.includes(this.FAIL))throw new Error("BSLInit Failed")}else this.mdebug(5,"BSLInit: no data from serial");await this.sleep(100)}}async startApp(){if(!this.BSL)throw new Error("Not in BSL mode");const e=this.frameToSerial(this.FOR_WRITE,this.START_APP,new Uint8Array,0);for(await this.write(e);;){const t=await this.readSer(this.MAX_BUFF_LEN);if(console.log("startApp frame",t),t.length){const i=this.dataFromSerial(t);if(!i){await this.sleep(100);continue}const[s,a]=i;if(s===this.ACK&&a.includes(this.OK)){this.mdebug(5,"Start App done");break}else if(s===this.ACK&&a.includes(this.FAIL))throw new Error("Start App Failed")}else this.mdebug(5,"startApp: no data from serial");await this.sleep(100)}}async writeDataInChunks(e){for(let i=0;i<e.length;i+=64){const s=e.slice(i,i+64);await this.write(s),await this.sleep(1e3)}}crc32(e){this._crc32=4294967295;for(const t of e){this._crc32^=t;for(let i=0;i<8;i++){const s=-(this._crc32&1);this._crc32=this._crc32>>>1^this.CRC32_POLY&s}}return this._crc32>>>0}async verify(e,t,i){let s=this.crc32(i);const a=new Uint8Array([s>>24&255,s>>8&255,s&255,e>>24&255,e>>16&255,e>>8&255,e&255,t>>24&255,t>>16&255,t>>8&255,t&255]),n=this.frameToSerial(this.FOR_WRITE,this.VERIFY,a,12);for(await this.write(n);;){const c=await this.readSer(this.MAX_BUFF_LEN);if(console.log("readMemory frame",c),c.length){const h=this.dataFromSerial(c);if(!h){await this.sleep(100);continue}const[w,y]=h;if(w===this.ACK&&y.includes(this.OK)){this.mdebug(5,"verification done"),await this.startApp();break}else if(w===this.ACK&&y.includes(this.FAIL))throw new Error("verification Failed")}else this.mdebug(5,"ReadMemory: no data from serial");await this.sleep(100)}}async writeMemory(e,t){if(!this.BSL)throw new Error("Not in BSL mode");const i=t.length;console.log("length",i);const s=new Uint8Array([e>>24&255,e>>16&255,e>>8&255,e&255,i>>24&255,i>>16&255,i>>8&255,i&255]),a=this.frameToSerial(this.FOR_WRITE,this.WRITE,s,8);for(console.log("writeMemory frame",a),await this.write(a),await this.writeChunk(t,64);;){const n=await this.readSer(this.MAX_BUFF_LEN);if(console.log("readMemory frame",n),n.length){const c=this.dataFromSerial(n);if(!c){await this.sleep(100);continue}const[h,w]=c;if(h===this.ACK&&w.includes(this.OK)){this.mdebug(5,"write done"),await this.startApp();break}else if(h===this.ACK&&w.includes(this.FAIL))throw new Error("write Failed")}else this.mdebug(5,"ReadMemory: no data from serial");await this.sleep(100)}}intelHexToUint8Array(e){const t=e.trim().split(`
`),i=[];return t.forEach(s=>{if(s.startsWith(":")){const a=parseInt(s.substr(1,2),16),n=9,c=n+a*2;for(let h=n;h<c;h+=2)i.push(parseInt(s.substr(h,2),16))}}),new Uint8Array(i)}async writeFlash(e){this.BSL||await this.BSLInit();const t=this.intelHexToUint8Array(e);await this.erase(),await this.writeMemory(this.flash_start_addr,t);const i=this.frameToSerial(this.FOR_WRITE,this.EXIT,new Uint8Array,0);console.log("exiting",i)}async verifyFlash(e){this.BSL||await this.BSLInit();const t=this.intelHexToUint8Array(e);await this.verify(this.flash_start_addr,t.length,t)}}let f=!1,d,u;const b=[{usbVendorId:12346,usbProductId:4097}];function S(o){o.addEventListener("click",()=>{if(f&&d){d.disconnect(),o.innerHTML="Connect",f=!1;return}o.innerHTML="Connecting...",navigator.serial.requestPort({filters:b}).then(async r=>{d=await new A(r),await d.connect(),o.innerHTML="Connected",f=!0}).catch(r=>{console.error(r),alert("Error Connecting"),d.disconnect(),o.innerHTML="Connect",f=!1})})}function E(o){o.addEventListener("click",async()=>{if(!f){alert("Please Connect First");return}o.innerHTML="Erasing...";try{await d.erase(),alert("Erase Done")}catch(r){console.log(r),alert("Error Erasing")}o.innerHTML="Erase"})}function T(o){o.addEventListener("click",async()=>{if(!f){alert("Please Connect First");return}if(!u){alert("Please upload a .Hex file first");return}o.innerHTML="Verifying...";try{await d.verifyFlash(u)}catch(r){console.log(r),alert("Error Verifying")}o.innerHTML="Verify"})}function L(o){o.addEventListener("click",async()=>{if(!f){alert("Please Connect First");return}if(!u){alert("Please upload a .Hex file first");return}o.innerHTML="Flashing...";try{await d.writeFlash(u),alert("Flashing Done")}catch(r){console.log(r),alert("Error Flashing")}o.innerHTML="Flash"})}function v(o){return new Promise((r,e)=>{const t=new FileReader;t.onload=()=>r(t.result),t.onerror=e,t.readAsText(o)})}function R(o){o.addEventListener("change",async r=>{const e=r.target.files[0];e&&e.name.endsWith(".hex")?(u=await v(e),console.log(u)):alert("Please upload a valid .hex file")})}function F(o){o.addEventListener("click",async()=>{if(!f){alert("Please Connect First");return}o.innerHTML="Resting...",await d.startApp(),o.innerHTML="Reset"})}document.querySelector("#app").innerHTML=`
  <div>
    <h1>Port11 MSPMO Flasher</h1>
    <h2>Supported only with Chrome Browser</h2>
    <button id="connect" type="button">Connect</button
      <input type="file" id="myfile" name="myfile" accept=".hex">
      <input type="file" id="myfile" name="myfile"><br><br>
      <button id="erase" type="button">Erase</button>
      <button id="flash" type="button">Flash</button>
      <button id="verify" type="button">Verify</button>
      <button id="reset" type="button">Reset</button>
  </div>
`;S(document.querySelector("#connect"));E(document.querySelector("#erase"));L(document.querySelector("#flash"));R(document.querySelector("#myfile"));F(document.querySelector("#reset"));T(document.querySelector("#verify"));