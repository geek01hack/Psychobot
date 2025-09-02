const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeInMemoryStore,
    downloadMediaMessage
} = require("@whiskeysockets/baileys");

const fs = require("fs");
const path = require("path");
const P = require("pino");

// === Store JSON pour mémoriser les messages ===
const store = makeInMemoryStore({ logger: P({ level: "silent" }) });
if (fs.existsSync("./baileys_store.json")) store.readFromFile("./baileys_store.json");

// Sauvegarde et nettoyage toutes les 10s
setInterval(() => {
    try {
        Object.keys(store.messages).forEach(jid => {
            const messages = store.messages[jid];
            if (messages.length > 5000) store.messages[jid] = messages.slice(-5000);
        });
        store.writeToFile("./baileys_store.json");
    } catch (err) {
        console.error("Erreur sauvegarde store:", err);
    }
}, 10_000);

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("session");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        logger: P({ level: "silent" }),
        printQRInTerminal: true,
        auth: state,
        version
    });

    // Lier le store au socket
    store.bind(sock.ev);

    // Charger automatiquement toutes les commandes
    const commands = new Map();
    const commandFiles = fs.readdirSync(path.join(__dirname, "commands")).filter(f => f.endsWith(".js"));
    for (const file of commandFiles) {
        const cmd = require(`./commands/${file}`);
        if (cmd && typeof cmd.run === "function") commands.set(cmd.name, cmd);
    }

    // 📌 Gestion des messages
    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || !msg.key.remoteJid) return;

        const from = msg.key.remoteJid;
        let body = "";

        if (msg.message.conversation) body = msg.message.conversation;
        else if (msg.message.extendedTextMessage) body = msg.message.extendedTextMessage.text;

        if (!body.startsWith("!")) return;

        const args = body.slice(1).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const command = commands.get(commandName);

        if (command && typeof command.run === "function") {
            try {
                await command.run({ sock, msg, args });
            } catch (err) {
                console.error("Erreur commande:", err);
                await sock.sendMessage(from, { text: "❌ Erreur lors de l’exécution de la commande." });
            }
        }
    });

    // 📌 Réaction 👍🏾 → extraction de médias (y compris vue unique)
    sock.ev.on("messages.reaction", async (reaction) => {
        try {
            const { key, text } = reaction;
            if (!key || !text) return;

            const allowedReactions = ["👍🏾"]; // Tu peux ajouter plus d'emojis si tu veux
            if (!allowedReactions.includes(text)) return;

            const msg = await store.loadMessage(key.remoteJid, key.id);
            if (!msg) return;

            let mediaMessage = null;
            if (msg.message?.imageMessage) mediaMessage = msg.message.imageMessage;
            else if (msg.message?.videoMessage) mediaMessage = msg.message.videoMessage;
            else if (msg.message?.viewOnceMessageV2) {
                const innerMsg = msg.message.viewOnceMessageV2.message;
                if (innerMsg.imageMessage) mediaMessage = innerMsg.imageMessage;
                else if (innerMsg.videoMessage) mediaMessage = innerMsg.videoMessage;
            }

            if (!mediaMessage) return;

            const buffer = await downloadMediaMessage(msg.message, "buffer", {}, { logger: P({ level: "silent" }) });
            const reactor = reaction.key.participant || reaction.key.remoteJid;

            await sock.sendMessage(reactor, {
                [mediaMessage.mimetype.startsWith("video/") ? "video" : "image"]: buffer,
                caption: "✅ Média extrait grâce à ta réaction 👍🏾"
            });
        } catch (e) {
            console.error("Erreur réaction extract:", e);
        }
    });

    // 📌 Connexion
    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                console.log("[BOT] Reconnexion en cours...");
                startBot();
            } else {
                console.log("❌ Déconnecté définitivement.");
            }
        } else if (connection === "open") {
            console.log(`[BOT] Psycho-Bot connecté ✅ à ${new Date().toLocaleString()}`);
        }
    });

    sock.ev.on("creds.update", saveCreds);
}

startBot();