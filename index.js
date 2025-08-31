const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const fs = require("fs");
const path = require("path");
const P = require("pino");

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("session");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        logger: P({ level: "silent" }),
        printQRInTerminal: true,
        auth: state,
        version
    });

    // Charger automatiquement toutes les commandes
    const commands = new Map();
    const commandFiles = fs.readdirSync(path.join(__dirname, "commands")).filter(f => f.endsWith(".js"));

    for (const file of commandFiles) {
        const cmd = require(`./commands/${file}`);
        commands.set(cmd.name, cmd);
    }

    // 📌 Gestion des messages
    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;
        const from = msg.key.remoteJid;

        let body = "";
        if (msg.message.conversation) body = msg.message.conversation;
        else if (msg.message.extendedTextMessage) body = msg.message.extendedTextMessage.text;

        if (!body.startsWith("!")) return;

        const args = body.slice(1).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const command = commands.get(commandName);

        if (command) {
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
            if (text !== "👍🏾") return;

            const msg = await sock.loadMessage(key.remoteJid, key.id);
            if (!msg) return;

            let mediaMessage = null;

            if (msg.message?.imageMessage) {
                mediaMessage = msg.message.imageMessage;
            } else if (msg.message?.videoMessage) {
                mediaMessage = msg.message.videoMessage;
            } else if (msg.message?.viewOnceMessageV2) {
                const innerMsg = msg.message.viewOnceMessageV2.message;
                if (innerMsg.imageMessage) mediaMessage = innerMsg.imageMessage;
                else if (innerMsg.videoMessage) mediaMessage = innerMsg.videoMessage;
            }

            if (!mediaMessage) return;

            const buffer = await sock.downloadMediaMessage(msg);

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
                startBot();
            } else {
                console.log("❌ Déconnecté définitivement.");
            }
        } else if (connection === "open") {
            console.log("✅ Psycho-Bot connecté !");
        }
    });

    sock.ev.on("creds.update", saveCreds);
}

startBot();
