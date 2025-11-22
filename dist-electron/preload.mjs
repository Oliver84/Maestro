"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  },
  // Custom API
  setX32Ip: (ip) => electron.ipcRenderer.send("set-x32-ip", ip),
  sendOsc: (address, ...args) => electron.ipcRenderer.send("send-osc", address, ...args),
  selectAudioFile: () => electron.ipcRenderer.invoke("open-file-dialog")
});
