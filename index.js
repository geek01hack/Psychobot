const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");
const QRCode = require("qrcode");
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("baileys");
const P = require("pino");

const BOT_NAME = "Psycho-Bot";

// Variables globales
let latestQR = null;
let botUser = null;
let sock;
let startTime = new Date();

// === Fonction pour démarrer le bot ===
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info");
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: P({ level: "silent" })
    });

    sock.ev.on("connection.update", async (update) => {
        const { connection, qr, lastDisconnect } = update;

        if (qr) {
            latestQR = qr;
            botUser = null;
            console.log("[QR] Nouveau QR généré.");
            broadcastQR();
        }

        if (connection === "open") {
            latestQR = null;
            botUser = sock.user;
            console.log("✅ Bot connecté :", botUser);
            broadcastQR();
        }

        if (connection === "close") {
            const shouldReconnect = (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut);
            console.log("⚠️ Déconnexion, reconnexion :", shouldReconnect);
            if (shouldReconnect) startBot();
        }
    });

    sock.ev.on("creds.update", saveCreds);
}

// === Fonction broadcast WebSocket ===
function broadcastQR() {
    const data = { qr: null, user: botUser };
    if (latestQR) {
        QRCode.toDataURL(latestQR).then(img => {
            data.qr = img;
            wss.clients.forEach(c => c.send(JSON.stringify(data)));
        }).catch(() => {
            wss.clients.forEach(c => c.send(JSON.stringify(data)));
        });
    } else {
        wss.clients.forEach(c => c.send(JSON.stringify(data)));
    }
}

// === Serveur Web + WS ===
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.get("/", (req, res) => {
    res.send({
        status: "online",
        botName: BOT_NAME,
        uptime: ((new Date() - startTime) / 1000) + "s",
        connected: botUser ? true : false,
        user: botUser
    });
});

app.get("/qr", (req, res) => {
    res.send(`
        <html>
        <head>
            <title>Connexion ${BOT_NAME}</title>
            <style>
                body { display:flex; justify-content:center; align-items:center; height:100vh; flex-direction:column; font-family:sans-serif; background:#f2f2f2; }
                .card { background:#fff; padding:30px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.15); text-align:center; }
                img { width:300px; height:300px; margin:20px; }
                #status { font-size:18px; margin-top:10px; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>📲 Connexion ${BOT_NAME}</h2>
                <img id="qrImg" style="display:none;" />
                <p id="status">⏳ En attente...</p>
            </div>
            <script>
                const qrImg = document.getElementById('qrImg');
                const status = document.getElementById('status');
                const ws = new WebSocket("ws://" + location.host);

                ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    if (data.qr) {
                        qrImg.style.display = "block";
                        qrImg.src = data.qr;
                        status.innerText = "Scannez le QR pour connecter le bot";
                    } else if (data.user) {
                        qrImg.style.display = "none";
                        status.innerText = "✅ Bot connecté : " + data.user.id;
                    } else {
                        status.innerText = "⏳ En attente du QR...";
                    }
                };
            </script>
        </body>
        </html>
    `);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`[WebServer] Démarré sur port ${PORT}`);
    startBot();
});