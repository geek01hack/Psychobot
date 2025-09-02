// index.js
const makeWASocket = require("@whiskeysockets/baileys").default;
const { useSingleFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const { makeInMemoryStore } = require("@whiskeysockets/baileys/lib/Stores/inMemory");
const P = require("pino");
const fs = require("fs");
const path = require("path");

const store = makeInMemoryStore({ logger: P({ level: "silent" }) });

// Auth automatique
const { state, saveState } = useSingleFileAuthState(path.resolve(__dirname, 'auth_info.json'));

// Préfixe des commandes
const PREFIX = "!";

// Chargement dynamique des commandes
const commands = new Map();
const commandFiles = fs.existsSync(path.join(__dirname, "commands"))
    ? fs.readdirSync(path.join(__dirname, "commands")).filter(f => f.endsWith(".js"))
    : [];

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (command.name) commands.set(command.name, command);
}

// Numéro (facultatif, utilisé seulement pour info)
const PHONE_NUMBER = "237696814391";

async function startBot() {
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: P({ level: "silent" }),
        auth: state,
        printQRInTerminal: false
    });

    // Sauvegarde automatique
    sock.ev.on("creds.update", saveState);

    // Lier le store
    store.bind(sock.ev);

    // Gestion des messages entrants
    sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0];
        if (!msg.key.fromMe && msg.message?.conversation) {
            const text = msg.message.conversation;
            if (text.startsWith(PREFIX)) {
                const args = text.slice(PREFIX.length).trim().split(/ +/);
                const cmdName = args.shift().toLowerCase();
                const command = commands.get(cmdName);
                if (command) {
                    try {
                        await command.run({ sock, msg, args });
                    } catch (err) {
                        console.error(err);
                        await sock.sendMessage(msg.key.remoteJid, { text: "Erreur lors de l'exécution de la commande." });
                    }
                }
            }
        }
    });

    // Gestion de la connexion
    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log("Connexion fermée, reconnect ?", shouldReconnect);
            if (shouldReconnect) startBot();
        } else if (connection === "open") {
            console.log("Connecté au compte WhatsApp !");
        }
    });
}

startBot().catch(console.error);