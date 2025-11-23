import { protocol as k, ipcMain as d, app as m, BrowserWindow as R, net as x, dialog as E } from "electron";
import { fileURLToPath as N } from "node:url";
import f from "node:path";
import { createSocket as C } from "node:dgram";
import { EventEmitter as $ } from "node:events";
const S = {
  s: "string",
  f: "float",
  i: "integer",
  b: "blob"
};
class w {
  constructor(e, n) {
    this.type = e, this.value = n;
  }
}
class L {
  constructor(e, ...n) {
    this.oscType = "message", this.address = e, this.args = n;
  }
  append(e) {
    let n;
    switch (typeof e) {
      case "object":
        if (e instanceof Array)
          e.forEach((o) => this.append(o));
        else if (e.type)
          S[e.type] && (e.type = S[e.type]), this.args.push(e);
        else
          throw new Error(`don't know how to encode object ${e}`);
        break;
      case "number":
        Math.floor(e) === e ? n = new w("integer", e) : n = new w("float", e);
        break;
      case "string":
        n = new w("string", e);
        break;
      case "boolean":
        n = new w("boolean", e);
        break;
      default:
        throw new Error(`don't know how to encode ${e}`);
    }
    n && this.args.push(n);
  }
}
function p(t) {
  const e = t + "\0", n = 4 - e.length % 4;
  return e + "\0".repeat(n === 4 ? 0 : n);
}
function B(t, e) {
  let n = e;
  for (; n < t.length && t[n] !== 0; )
    n++;
  const o = t.subarray(e, n).toString("utf8"), s = Math.ceil((n - e + 1) / 4) * 4;
  return { value: o, offset: e + s };
}
function g(t) {
  const e = Buffer.alloc(4);
  return e.writeInt32BE(t, 0), e;
}
function v(t, e) {
  return { value: t.readInt32BE(e), offset: e + 4 };
}
function y(t) {
  const e = Buffer.alloc(4);
  return e.writeFloatBE(t, 0), e;
}
function V(t, e) {
  return { value: t.readFloatBE(e), offset: e + 4 };
}
function I(t) {
  const e = t.length, n = g(e), o = 4 - e % 4, s = Buffer.alloc(o === 4 ? 0 : o);
  return Buffer.concat([n, t, s]);
}
function z(t, e) {
  const n = v(t, e), o = n.value, s = t.subarray(n.offset, n.offset + o), a = 4 - o % 4, r = n.offset + o + (a === 4 ? 0 : a);
  return { value: s, offset: r };
}
function W(t) {
  const e = Buffer.alloc(8);
  if (typeof t == "number") {
    const n = Math.floor(t), o = Math.floor((t - n) * 4294967296);
    e.writeUInt32BE(n + 2208988800, 0), e.writeUInt32BE(o, 4);
  } else
    e.writeUInt32BE(0, 0), e.writeUInt32BE(1, 4);
  return e;
}
function G(t, e) {
  const n = t.readUInt32BE(e), o = t.readUInt32BE(e + 4);
  let s;
  if (n === 0 && o === 1)
    s = 0;
  else {
    const a = n - 2208988800, r = o / 4294967296;
    s = a + r;
  }
  return { value: s, offset: e + 8 };
}
function q(t) {
  const e = Buffer.alloc(4);
  if (Buffer.isBuffer(t)) {
    if (t.length !== 4)
      throw new Error("MIDI message must be exactly 4 bytes");
    t.copy(e);
  } else if (typeof t == "object" && t !== null)
    e.writeUInt8(t.port || 0, 0), e.writeUInt8(t.status || 0, 1), e.writeUInt8(t.data1 || 0, 2), e.writeUInt8(t.data2 || 0, 3);
  else
    throw new Error("MIDI value must be a 4-byte Buffer or object with port, status, data1, data2 properties");
  return e;
}
function J(t, e) {
  if (e + 4 > t.length)
    throw new Error("Not enough bytes for MIDI message");
  return { value: t.subarray(e, e + 4), offset: e + 4 };
}
function K(t) {
  if (typeof t == "object" && t.type && t.value !== void 0)
    switch (t.type) {
      case "i":
      case "integer":
        return { tag: "i", data: g(t.value) };
      case "f":
      case "float":
        return { tag: "f", data: y(t.value) };
      case "s":
      case "string":
        return { tag: "s", data: Buffer.from(p(t.value)) };
      case "b":
      case "blob":
        return { tag: "b", data: I(t.value) };
      case "d":
      case "double":
        return { tag: "f", data: y(t.value) };
      case "T":
      case "boolean":
        return t.value ? { tag: "T", data: Buffer.alloc(0) } : { tag: "F", data: Buffer.alloc(0) };
      case "m":
      case "midi":
        return { tag: "m", data: q(t.value) };
      default:
        throw new Error(`Unknown argument type: ${t.type}`);
    }
  switch (typeof t) {
    case "number":
      return Number.isInteger(t) ? { tag: "i", data: g(t) } : { tag: "f", data: y(t) };
    case "string":
      return { tag: "s", data: Buffer.from(p(t)) };
    case "boolean":
      return t ? { tag: "T", data: Buffer.alloc(0) } : { tag: "F", data: Buffer.alloc(0) };
    default:
      if (Buffer.isBuffer(t))
        return { tag: "b", data: I(t) };
      throw new Error(`Don't know how to encode argument: ${t}`);
  }
}
function H(t, e, n) {
  switch (t) {
    case "i":
      return v(e, n);
    case "f":
      return V(e, n);
    case "s":
      return B(e, n);
    case "b":
      return z(e, n);
    case "T":
      return { value: !0, offset: n };
    case "F":
      return { value: !1, offset: n };
    case "N":
      return { value: null, offset: n };
    case "m":
      return J(e, n);
    default:
      throw new Error(`I don't understand the argument code ${t}`);
  }
}
function _(t) {
  return t.oscType === "bundle" ? O(t) : M(t);
}
function M(t) {
  const e = p(t.address), n = Buffer.from(e), o = t.args.map(K), s = "," + o.map((i) => i.tag).join(""), a = Buffer.from(p(s)), r = o.map((i) => i.data);
  return Buffer.concat([n, a, ...r]);
}
function O(t) {
  const e = p("#bundle"), n = Buffer.from(e), o = W(t.timetag), s = t.elements.map((a) => {
    let r;
    a.oscType === "bundle" ? r = O(a) : r = M(a);
    const i = g(r.length);
    return Buffer.concat([i, r]);
  });
  return Buffer.concat([n, o, ...s]);
}
function P(t) {
  return t.length >= 8 && t.subarray(0, 8).toString() === "#bundle\0" ? X(t) : Q(t);
}
function Q(t) {
  let e = 0;
  const n = B(t, e), o = n.value;
  e = n.offset;
  const s = B(t, e), a = s.value;
  if (e = s.offset, !a.startsWith(","))
    throw new Error("Malformed Packet");
  const r = a.slice(1), i = [];
  for (const h of r) {
    const T = H(h, t, e);
    i.push({ value: T.value }), e = T.offset;
  }
  return {
    oscType: "message",
    address: o,
    args: i
  };
}
function X(t) {
  let e = 8;
  const n = G(t, e), o = n.value;
  e = n.offset;
  const s = [];
  for (; e < t.length; ) {
    const a = v(t, e), r = a.value;
    e = a.offset;
    const i = t.subarray(e, e + r), h = P(i);
    s.push(h), e += r;
  }
  return {
    oscType: "bundle",
    timetag: o,
    elements: s
  };
}
function U(t) {
  const e = [];
  return e.push(t.address), t.args.forEach((n) => {
    e.push(n.value);
  }), e;
}
function j(t) {
  return t.elements = t.elements.map((e) => {
    if (e.oscType === "bundle") return j(e);
    if (e.oscType === "message") return U(e);
  }), t;
}
function Y(t, e = P) {
  const n = e(t);
  if (n.oscType === "bundle")
    return j(n);
  if (n.oscType === "message")
    return U(n);
  throw new Error("Malformed Packet");
}
class Z extends $ {
  constructor(e, n = "127.0.0.1", o) {
    super(), typeof n == "function" && (o = n, n = "127.0.0.1"), o || (o = () => {
    });
    let s;
    this.port = e, this.host = n, this._sock = C({
      type: "udp4",
      reuseAddr: !0
    }), this._sock.bind(e, n), this._sock.on("listening", () => {
      this.emit("listening"), o();
    }), this._sock.on("message", (a, r) => {
      try {
        s = Y(a);
      } catch (i) {
        const h = new Error(`can't decode incoming message: ${i.message}`);
        this.emit("error", h, r);
        return;
      }
      s.elements ? this.emit("bundle", s, r) : s && (this.emit("message", s, r), this.emit(s[0], s, r));
    });
  }
  close(e) {
    this._sock.close(e);
  }
}
class ee {
  constructor(e, n) {
    this.host = e, this.port = n, this._sock = C({
      type: "udp4",
      reuseAddr: !0
    });
  }
  close(e) {
    this._sock.close(e);
  }
  send(...e) {
    let n = e[0], o;
    typeof e[e.length - 1] == "function" ? o = e.pop() : o = () => {
    }, n instanceof Array && (n = {
      address: n[0],
      args: n.splice(1)
    });
    let s, a;
    try {
      switch (typeof n) {
        case "object":
          a = _(n), this._sock.send(a, 0, a.length, this.port, this.host, o);
          break;
        case "string":
          s = new L(e[0]);
          for (let r = 1; r < e.length; r++)
            s.append(e[r]);
          a = _(s), this._sock.send(a, 0, a.length, this.port, this.host, o);
          break;
        default:
          throw new TypeError("That Message Just Doesn't Seem Right");
      }
    } catch (r) {
      if (r.code !== "ERR_SOCKET_DGRAM_NOT_RUNNING") throw r;
      const i = new ReferenceError("Cannot send message on closed socket.");
      i.code = r.code, o(i);
    }
  }
}
const A = f.dirname(N(import.meta.url));
process.env.APP_ROOT = f.join(A, "..");
const b = process.env.VITE_DEV_SERVER_URL, ae = f.join(process.env.APP_ROOT, "dist-electron"), F = f.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = b ? f.join(process.env.APP_ROOT, "public") : F;
let c, l = null, u = null;
k.registerSchemesAsPrivileged([
  { scheme: "media", privileges: { secure: !0, supportFetchAPI: !0, bypassCSP: !0, stream: !0 } }
]);
function D() {
  c = new R({
    width: 1200,
    height: 800,
    backgroundColor: "#020617",
    // slate-950
    icon: f.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: f.join(A, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0,
      webSecurity: !0
    }
  }), c.webContents.on("did-finish-load", () => {
    c == null || c.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), b ? c.loadURL(b) : c.loadFile(f.join(F, "index.html"));
}
d.handle("open-file-dialog", async () => {
  if (!c) return null;
  const { canceled: t, filePaths: e } = await E.showOpenDialog(c, {
    properties: ["openFile"],
    filters: [
      { name: "Audio", extensions: ["mp3", "wav", "aac", "m4a", "aiff", "flac", "ogg"] }
    ]
  });
  return t || e.length === 0 ? null : e[0];
});
d.handle("show-save-dialog", async () => {
  if (!c) return null;
  const { canceled: t, filePath: e } = await E.showSaveDialog(c, {
    title: "Save Show",
    defaultPath: "MyShow.json",
    filters: [
      { name: "Maestro Show", extensions: ["json"] }
    ]
  });
  return t || !e ? null : e;
});
d.handle("save-file", async (t, e, n) => {
  try {
    return await (await import("node:fs/promises")).writeFile(e, n, "utf-8"), { success: !0 };
  } catch (o) {
    return console.error("Failed to save file:", o), { success: !1, error: String(o) };
  }
});
d.handle("show-open-dialog", async () => {
  if (!c) return null;
  const { canceled: t, filePaths: e } = await E.showOpenDialog(c, {
    title: "Open Show",
    properties: ["openFile"],
    filters: [
      { name: "Maestro Show", extensions: ["json"] }
    ]
  });
  if (t || e.length === 0)
    return null;
  const n = e[0];
  try {
    const s = await (await import("node:fs/promises")).readFile(n, "utf-8");
    return { filePath: n, content: s };
  } catch (o) {
    return console.error("Failed to read file:", o), null;
  }
});
d.on("set-x32-ip", (t, e) => {
  u && (u = null), l && (l.close(), l = null);
  try {
    l = new Z(0, "0.0.0.0", () => {
      var o, s;
      const n = (s = (o = l == null ? void 0 : l._sock) == null ? void 0 : o.address()) == null ? void 0 : s.port;
      console.log(`OSC Server listening on 0.0.0.0:${n}`);
    }), l.on("message", (n, o) => {
      console.log("Received OSC:", n), c && c.webContents.send("osc-message", n, o);
    }), l.on("error", (n) => {
      console.error("OSC Server Error:", n);
    }), u = new ee(e, 10023), u._sock.close(), u._sock = l._sock, console.log(`OSC Client configured to send to ${e}:10023 using Server's socket`);
  } catch (n) {
    console.error("Failed to create OSC connection:", n);
  }
});
d.on("send-osc", (t, e, ...n) => {
  u ? u.send(e, ...n, (o) => {
    o && console.error("OSC Send Error:", o);
  }) : console.warn("OSC Client not initialized. Call set-x32-ip first.");
});
m.on("window-all-closed", () => {
  process.platform !== "darwin" && (m.quit(), c = null), l && (l.close(), l = null), u = null;
});
m.on("activate", () => {
  R.getAllWindows().length === 0 && D();
});
m.whenReady().then(() => {
  k.handle("media", (t) => {
    const e = t.url.slice(8), n = decodeURIComponent(e);
    return x.fetch("file://" + n);
  }), D();
});
export {
  ae as MAIN_DIST,
  F as RENDERER_DIST,
  b as VITE_DEV_SERVER_URL
};
