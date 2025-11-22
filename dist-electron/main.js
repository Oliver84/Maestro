import { protocol, ipcMain, app, BrowserWindow, net, dialog } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createSocket } from "node:dgram";
import "node:events";
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
function writeInt32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeInt32BE(value, 0);
  return buffer;
}
function writeFloat32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeFloatBE(value, 0);
  return buffer;
}
function writeBlob(value) {
  const length = value.length;
  const lengthBuffer = writeInt32(length);
  const padding = 4 - length % 4;
  const paddingBuffer = Buffer.alloc(padding === 4 ? 0 : padding);
  return Buffer.concat([lengthBuffer, value, paddingBuffer]);
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
    oscClient.close();
  }
  try {
    oscClient = new Client(ip, 10023);
    console.log(`OSC Client connected to ${ip}:10023`);
  } catch (err) {
    console.error("Failed to create OSC client:", err);
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
  if (oscClient) {
    oscClient.close();
  }
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
