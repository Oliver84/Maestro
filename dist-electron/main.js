import { protocol, ipcMain, app, BrowserWindow, net, dialog } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createSocket } from "node:dgram";
import { EventEmitter } from "node:events";
const typeTags = {
  s: "string",
  f: "float",
  i: "integer",
  b: "blob"
};
class Argument {
  constructor(type, value) {
    this.type = type;
    this.value = value;
  }
}
class Message {
  constructor(address, ...args) {
    this.oscType = "message";
    this.address = address;
    this.args = args;
  }
  append(arg) {
    let argOut;
    switch (typeof arg) {
      case "object":
        if (arg instanceof Array) {
          arg.forEach((a) => this.append(a));
        } else if (arg.type) {
          if (typeTags[arg.type]) arg.type = typeTags[arg.type];
          this.args.push(arg);
        } else {
          throw new Error(`don't know how to encode object ${arg}`);
        }
        break;
      case "number":
        if (Math.floor(arg) === arg) {
          argOut = new Argument("integer", arg);
        } else {
          argOut = new Argument("float", arg);
        }
        break;
      case "string":
        argOut = new Argument("string", arg);
        break;
      case "boolean":
        argOut = new Argument("boolean", arg);
        break;
      default:
        throw new Error(`don't know how to encode ${arg}`);
    }
    if (argOut) this.args.push(argOut);
  }
}
function padString(str) {
  const nullTerminated = str + "\0";
  const padding = 4 - nullTerminated.length % 4;
  return nullTerminated + "\0".repeat(padding === 4 ? 0 : padding);
}
function readString(buffer, offset) {
  let end = offset;
  while (end < buffer.length && buffer[end] !== 0) {
    end++;
  }
  const str = buffer.subarray(offset, end).toString("utf8");
  const paddedLength = Math.ceil((end - offset + 1) / 4) * 4;
  return { value: str, offset: offset + paddedLength };
}
function writeInt32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeInt32BE(value, 0);
  return buffer;
}
function readInt32(buffer, offset) {
  const value = buffer.readInt32BE(offset);
  return { value, offset: offset + 4 };
}
function writeFloat32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeFloatBE(value, 0);
  return buffer;
}
function readFloat32(buffer, offset) {
  const value = buffer.readFloatBE(offset);
  return { value, offset: offset + 4 };
}
function writeBlob(value) {
  const length = value.length;
  const lengthBuffer = writeInt32(length);
  const padding = 4 - length % 4;
  const paddingBuffer = Buffer.alloc(padding === 4 ? 0 : padding);
  return Buffer.concat([lengthBuffer, value, paddingBuffer]);
}
function readBlob(buffer, offset) {
  const lengthResult = readInt32(buffer, offset);
  const length = lengthResult.value;
  const data = buffer.subarray(lengthResult.offset, lengthResult.offset + length);
  const padding = 4 - length % 4;
  const nextOffset = lengthResult.offset + length + (padding === 4 ? 0 : padding);
  return { value: data, offset: nextOffset };
}
function writeTimeTag(value) {
  const buffer = Buffer.alloc(8);
  if (typeof value === "number") {
    const seconds = Math.floor(value);
    const fraction = Math.floor((value - seconds) * 4294967296);
    buffer.writeUInt32BE(seconds + 2208988800, 0);
    buffer.writeUInt32BE(fraction, 4);
  } else {
    buffer.writeUInt32BE(0, 0);
    buffer.writeUInt32BE(1, 4);
  }
  return buffer;
}
function readTimeTag(buffer, offset) {
  const seconds = buffer.readUInt32BE(offset);
  const fraction = buffer.readUInt32BE(offset + 4);
  let value;
  if (seconds === 0 && fraction === 1) {
    value = 0;
  } else {
    const unixSeconds = seconds - 2208988800;
    const fractionalSeconds = fraction / 4294967296;
    value = unixSeconds + fractionalSeconds;
  }
  return { value, offset: offset + 8 };
}
function writeMidi(value) {
  const buffer = Buffer.alloc(4);
  if (Buffer.isBuffer(value)) {
    if (value.length !== 4) {
      throw new Error("MIDI message must be exactly 4 bytes");
    }
    value.copy(buffer);
  } else if (typeof value === "object" && value !== null) {
    buffer.writeUInt8(value.port || 0, 0);
    buffer.writeUInt8(value.status || 0, 1);
    buffer.writeUInt8(value.data1 || 0, 2);
    buffer.writeUInt8(value.data2 || 0, 3);
  } else {
    throw new Error("MIDI value must be a 4-byte Buffer or object with port, status, data1, data2 properties");
  }
  return buffer;
}
function readMidi(buffer, offset) {
  if (offset + 4 > buffer.length) {
    throw new Error("Not enough bytes for MIDI message");
  }
  const value = buffer.subarray(offset, offset + 4);
  return { value, offset: offset + 4 };
}
function encodeArgument(arg) {
  if (typeof arg === "object" && arg.type && arg.value !== void 0) {
    switch (arg.type) {
      case "i":
      case "integer":
        return { tag: "i", data: writeInt32(arg.value) };
      case "f":
      case "float":
        return { tag: "f", data: writeFloat32(arg.value) };
      case "s":
      case "string":
        return { tag: "s", data: Buffer.from(padString(arg.value)) };
      case "b":
      case "blob":
        return { tag: "b", data: writeBlob(arg.value) };
      case "d":
      case "double":
        return { tag: "f", data: writeFloat32(arg.value) };
      case "T":
      case "boolean":
        return arg.value ? { tag: "T", data: Buffer.alloc(0) } : { tag: "F", data: Buffer.alloc(0) };
      case "m":
      case "midi":
        return { tag: "m", data: writeMidi(arg.value) };
      default:
        throw new Error(`Unknown argument type: ${arg.type}`);
    }
  }
  switch (typeof arg) {
    case "number":
      if (Number.isInteger(arg)) {
        return { tag: "i", data: writeInt32(arg) };
      } else {
        return { tag: "f", data: writeFloat32(arg) };
      }
    case "string":
      return { tag: "s", data: Buffer.from(padString(arg)) };
    case "boolean":
      return arg ? { tag: "T", data: Buffer.alloc(0) } : { tag: "F", data: Buffer.alloc(0) };
    default:
      if (Buffer.isBuffer(arg)) {
        return { tag: "b", data: writeBlob(arg) };
      }
      throw new Error(`Don't know how to encode argument: ${arg}`);
  }
}
function decodeArgument(tag, buffer, offset) {
  switch (tag) {
    case "i":
      return readInt32(buffer, offset);
    case "f":
      return readFloat32(buffer, offset);
    case "s":
      return readString(buffer, offset);
    case "b":
      return readBlob(buffer, offset);
    case "T":
      return { value: true, offset };
    case "F":
      return { value: false, offset };
    case "N":
      return { value: null, offset };
    case "m":
      return readMidi(buffer, offset);
    default:
      throw new Error(`I don't understand the argument code ${tag}`);
  }
}
function toBuffer(message) {
  if (message.oscType === "bundle") {
    return encodeBundleToBuffer(message);
  } else {
    return encodeMessageToBuffer(message);
  }
}
function encodeMessageToBuffer(message) {
  const address = padString(message.address);
  const addressBuffer = Buffer.from(address);
  const encodedArgs = message.args.map(encodeArgument);
  const typeTags2 = "," + encodedArgs.map((arg) => arg.tag).join("");
  const typeTagsBuffer = Buffer.from(padString(typeTags2));
  const argumentBuffers = encodedArgs.map((arg) => arg.data);
  return Buffer.concat([addressBuffer, typeTagsBuffer, ...argumentBuffers]);
}
function encodeBundleToBuffer(bundle) {
  const bundleString = padString("#bundle");
  const bundleStringBuffer = Buffer.from(bundleString);
  const timetagBuffer = writeTimeTag(bundle.timetag);
  const elementBuffers = bundle.elements.map((element) => {
    let elementBuffer;
    if (element.oscType === "bundle") {
      elementBuffer = encodeBundleToBuffer(element);
    } else {
      elementBuffer = encodeMessageToBuffer(element);
    }
    const sizeBuffer = writeInt32(elementBuffer.length);
    return Buffer.concat([sizeBuffer, elementBuffer]);
  });
  return Buffer.concat([bundleStringBuffer, timetagBuffer, ...elementBuffers]);
}
function fromBuffer(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).toString() === "#bundle\0") {
    return decodeBundleFromBuffer(buffer);
  } else {
    return decodeMessageFromBuffer(buffer);
  }
}
function decodeMessageFromBuffer(buffer) {
  let offset = 0;
  const addressResult = readString(buffer, offset);
  const address = addressResult.value;
  offset = addressResult.offset;
  const typeTagsResult = readString(buffer, offset);
  const typeTags2 = typeTagsResult.value;
  offset = typeTagsResult.offset;
  if (!typeTags2.startsWith(",")) {
    throw new Error("Malformed Packet");
  }
  const tags = typeTags2.slice(1);
  const args = [];
  for (const tag of tags) {
    const argResult = decodeArgument(tag, buffer, offset);
    args.push({ value: argResult.value });
    offset = argResult.offset;
  }
  return {
    oscType: "message",
    address,
    args
  };
}
function decodeBundleFromBuffer(buffer) {
  let offset = 8;
  const timetagResult = readTimeTag(buffer, offset);
  const timetag = timetagResult.value;
  offset = timetagResult.offset;
  const elements = [];
  while (offset < buffer.length) {
    const sizeResult = readInt32(buffer, offset);
    const size = sizeResult.value;
    offset = sizeResult.offset;
    const elementBuffer = buffer.subarray(offset, offset + size);
    const element = fromBuffer(elementBuffer);
    elements.push(element);
    offset += size;
  }
  return {
    oscType: "bundle",
    timetag,
    elements
  };
}
function sanitizeMessage(decoded) {
  const message = [];
  message.push(decoded.address);
  decoded.args.forEach((arg) => {
    message.push(arg.value);
  });
  return message;
}
function sanitizeBundle(decoded) {
  decoded.elements = decoded.elements.map((element) => {
    if (element.oscType === "bundle") return sanitizeBundle(element);
    else if (element.oscType === "message") return sanitizeMessage(element);
  });
  return decoded;
}
function decode(data, customFromBuffer = fromBuffer) {
  const decoded = customFromBuffer(data);
  if (decoded.oscType === "bundle") {
    return sanitizeBundle(decoded);
  } else if (decoded.oscType === "message") {
    return sanitizeMessage(decoded);
  } else {
    throw new Error("Malformed Packet");
  }
}
class Server extends EventEmitter {
  constructor(port, host = "127.0.0.1", cb) {
    super();
    if (typeof host === "function") {
      cb = host;
      host = "127.0.0.1";
    }
    if (!cb) cb = () => {
    };
    let decoded;
    this.port = port;
    this.host = host;
    this._sock = createSocket({
      type: "udp4",
      reuseAddr: true
    });
    this._sock.bind(port, host);
    this._sock.on("listening", () => {
      this.emit("listening");
      cb();
    });
    this._sock.on("message", (msg, rinfo) => {
      try {
        decoded = decode(msg);
      } catch (e) {
        const error = new Error(`can't decode incoming message: ${e.message}`);
        this.emit("error", error, rinfo);
        return;
      }
      if (decoded.elements) {
        this.emit("bundle", decoded, rinfo);
      } else if (decoded) {
        this.emit("message", decoded, rinfo);
        this.emit(decoded[0], decoded, rinfo);
      }
    });
  }
  close(cb) {
    this._sock.close(cb);
  }
}
class Client {
  constructor(host, port) {
    this.host = host;
    this.port = port;
    this._sock = createSocket({
      type: "udp4",
      reuseAddr: true
    });
  }
  close(cb) {
    this._sock.close(cb);
  }
  send(...args) {
    let message = args[0];
    let callback;
    if (typeof args[args.length - 1] === "function") {
      callback = args.pop();
    } else {
      callback = () => {
      };
    }
    if (message instanceof Array) {
      message = {
        address: message[0],
        args: message.splice(1)
      };
    }
    let mes;
    let buf;
    try {
      switch (typeof message) {
        case "object":
          buf = toBuffer(message);
          this._sock.send(buf, 0, buf.length, this.port, this.host, callback);
          break;
        case "string":
          mes = new Message(args[0]);
          for (let i = 1; i < args.length; i++) {
            mes.append(args[i]);
          }
          buf = toBuffer(mes);
          this._sock.send(buf, 0, buf.length, this.port, this.host, callback);
          break;
        default:
          throw new TypeError("That Message Just Doesn't Seem Right");
      }
    } catch (e) {
      if (e.code !== "ERR_SOCKET_DGRAM_NOT_RUNNING") throw e;
      const error = new ReferenceError("Cannot send message on closed socket.");
      error.code = e.code;
      callback(error);
    }
  }
}
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
let oscServer = null;
let oscClient = null;
protocol.registerSchemesAsPrivileged([
  { scheme: "media", privileges: { secure: true, supportFetchAPI: true, bypassCSP: true, stream: true } }
]);
function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: "#020617",
    // slate-950
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
ipcMain.handle("open-file-dialog", async () => {
  if (!win) return null;
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ["openFile"],
    filters: [
      { name: "Audio", extensions: ["mp3", "wav", "aac", "m4a", "aiff", "flac", "ogg"] }
    ]
  });
  if (canceled || filePaths.length === 0) {
    return null;
  }
  return filePaths[0];
});
ipcMain.on("set-x32-ip", (_, ip) => {
  if (oscClient) {
    oscClient = null;
  }
  if (oscServer) {
    oscServer.close();
    oscServer = null;
  }
  try {
    oscServer = new Server(0, "0.0.0.0", () => {
      var _a, _b;
      const port = (_b = (_a = oscServer == null ? void 0 : oscServer._sock) == null ? void 0 : _a.address()) == null ? void 0 : _b.port;
      console.log(`OSC Server listening on 0.0.0.0:${port}`);
    });
    oscServer.on("message", (msg, rinfo) => {
      console.log("Received OSC:", msg);
      if (win) {
        win.webContents.send("osc-message", msg, rinfo);
      }
    });
    oscServer.on("error", (err) => {
      console.error("OSC Server Error:", err);
    });
    oscClient = new Client(ip, 10023);
    oscClient._sock.close();
    oscClient._sock = oscServer._sock;
    console.log(`OSC Client configured to send to ${ip}:10023 using Server's socket`);
  } catch (err) {
    console.error("Failed to create OSC connection:", err);
  }
});
ipcMain.on("send-osc", (_, address, ...args) => {
  if (oscClient) {
    oscClient.send(address, ...args, (err) => {
      if (err) console.error("OSC Send Error:", err);
    });
  } else {
    console.warn("OSC Client not initialized. Call set-x32-ip first.");
  }
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
  if (oscServer) {
    oscServer.close();
    oscServer = null;
  }
  oscClient = null;
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  protocol.handle("media", (request) => {
    const url = request.url.slice("media://".length);
    const decodedUrl = decodeURIComponent(url);
    return net.fetch("file://" + decodedUrl);
  });
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
