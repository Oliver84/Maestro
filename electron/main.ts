import { app, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { Client, Server } from 'node-osc'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
// We use a bidirectional setup:
// 1. A Server to listen on a random port (0.0.0.0:0)
// 2. A Client to send messages, but it MUST share the same socket as the Server
//    so that the X32 replies to the correct port.
let oscServer: Server | null = null;
let oscClient: Client | null = null;

// Register the custom protocol BEFORE the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { secure: true, supportFetchAPI: true, bypassCSP: true, stream: true } }
])

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#020617', // slate-950
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// File Dialog IPC Handler
ipcMain.handle('open-file-dialog', async () => {
  if (!win) return null;
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [
      { name: 'Audio', extensions: ['mp3', 'wav', 'aac', 'm4a', 'aiff', 'flac', 'ogg'] }
    ]
  });
  if (canceled || filePaths.length === 0) {
    return null;
  }
  return filePaths[0];
});

// OSC IPC Handlers
ipcMain.on('set-x32-ip', (_, ip: string) => {
  // Clean up existing connections
  if (oscClient) {
    // We don't need to close oscClient's socket because we're using oscServer's socket
    // But we should probably nullify it
    oscClient = null;
  }
  if (oscServer) {
    oscServer.close();
    oscServer = null;
  }

  try {
    // 1. Create Server (Listener) on random port
    oscServer = new Server(0, '0.0.0.0', () => {
      // Access private _sock property to get the bound port
      // @ts-ignore
      const port = oscServer?._sock?.address()?.port;
      console.log(`OSC Server listening on 0.0.0.0:${port}`);
    });

    // 2. Handle Incoming Messages
    oscServer.on('message', (msg, rinfo) => {
      console.log('Received OSC:', msg);
      if (win) {
        win.webContents.send('osc-message', msg, rinfo);
      }
    });

    oscServer.on('error', (err) => {
      console.error('OSC Server Error:', err);
    });

    // 3. Create Client (Sender)
    // We init it with dummy port, but we will swap the socket immediately
    oscClient = new Client(ip, 10023);

    // 4. Swap the socket!
    // Close the socket created by Client
    // @ts-ignore
    oscClient._sock.close();
    // Assign Server's socket to Client
    // @ts-ignore
    oscClient._sock = oscServer._sock;

    console.log(`OSC Client configured to send to ${ip}:10023 using Server's socket`);

  } catch (err) {
    console.error('Failed to create OSC connection:', err);
  }
});

ipcMain.on('send-osc', (_, address: string, ...args: any[]) => {
  if (oscClient) {
    oscClient.send(address, ...args, (err: Error | null) => {
      if (err) console.error('OSC Send Error:', err);
    });
  } else {
    console.warn('OSC Client not initialized. Call set-x32-ip first.');
  }
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
  if (oscServer) {
    oscServer.close();
    oscServer = null;
  }
  // oscClient shares the socket, so it's effectively closed too
  oscClient = null;
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  // Handle media:// requests
  protocol.handle('media', (request) => {
    const url = request.url.slice('media://'.length)
    // Decode the URL to handle spaces and special characters properly
    const decodedUrl = decodeURIComponent(url)

    // In Windows, path might look like /C:/Users... which is fine for file://
    // In Mac/Linux, path starts with /, so media:///Users... becomes /Users...

    // Using net.fetch with file:// protocol is the standard way to serve files
    return net.fetch('file://' + decodedUrl)
  })

  createWindow()
})
