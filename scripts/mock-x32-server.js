import { Server, Client } from 'node-osc';

const PORT = 10023;

// Create a server to listen on 10023
const server = new Server(PORT, '0.0.0.0', () => {
    console.log(`[Mock X32] Server listening on 0.0.0.0:${PORT}`);
});

// We need a client to send replies.
// However, Client creates its own socket.
// We want to reply from the SAME socket (10023) so the App (which expects replies from 10023) accepts them.
// We will create a Client and swap its socket.
// Host/Port will be updated dynamically per message.
const replyClient = new Client('127.0.0.1', 3000); // Initial dummy values
replyClient.close(); // Close the socket it created
replyClient._sock = server._sock; // Use the server's socket

// Track subscribers (IP:Port)
const subscribers = new Set();

server.on('message', (msg, rinfo) => {
    const address = msg[0];
    const args = msg.slice(1);

    // Skip logging for /meters to avoid spam
    if (address !== '/meters') {
        console.log(`[Mock X32] Received from ${rinfo.address}:${rinfo.port}:`, address, args);
    }

    // Handle /xremote (Subscription)
    if (address === '/xremote') {
        const key = `${rinfo.address}:${rinfo.port}`;
        if (!subscribers.has(key)) {
            console.log(`[Mock X32] New subscriber: ${key}`);
            subscribers.add(key);
        }
    }

    // Handle /meters
    if (address === '/meters' && args[0] === '/meters/1') {
        // Generate 32 random float values (Input channels)
        // Pack them into a Buffer (Little Endian)
        // 32 channels * 4 bytes = 128 bytes
        const buffer = Buffer.alloc(128);
        for (let i = 0; i < 32; i++) {
            // Random level between 0.0 and 0.8
            const level = Math.random() * 0.8;
            buffer.writeFloatLE(level, i * 4);
        }

        // Reply to sender
        replyClient.host = rinfo.address;
        replyClient.port = rinfo.port;

        // The reply address for meters/1 request is /meters/1
        // node-osc requires explicit type for Buffer
        replyClient.send('/meters/1', { type: 'blob', value: buffer }, (err) => {
            if (err) console.error(`[Mock X32] Meter send error to ${rinfo.address}:${rinfo.port}:`, err);
        });
    }

    // Handle Fader/Mute queries if needed (Echo for now)
    // /ch/01/mix/fader -> reply with /ch/01/mix/fader <val>
});

// Periodic "Console Activity"
// Move Channel 1 fader up and down
let faderValue = 0.0;
let direction = 0.05;

setInterval(() => {
    // Update fader value
    faderValue += direction;
    if (faderValue >= 1.0) {
        faderValue = 1.0;
        direction = -0.05;
    } else if (faderValue <= 0.0) {
        faderValue = 0.0;
        direction = 0.05;
    }

    // Send update to all subscribers
    for (const sub of subscribers) {
        const [host, port] = sub.split(':');
        // Update client target
        replyClient.host = host;
        replyClient.port = parseInt(port);

        // Send fader update
        // Address: /ch/01/mix/fader
        replyClient.send('/ch/01/mix/fader', faderValue, (err) => {
            if (err) console.error(`[Mock X32] Send error to ${sub}:`, err);
        });
    }

    if (subscribers.size > 0) {
        // console.log(`[Mock X32] Broadcasted Ch 1 Fader: ${faderValue.toFixed(2)}`);
    }
}, 200); // Every 200ms

console.log('[Mock X32] Mock Server Running. Waiting for /xremote...');
