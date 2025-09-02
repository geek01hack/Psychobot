const { downloadMediaMessage, generateWAMessageFromContent, proto } = require("@whiskeysockets/baileys");
const fs = require("fs");

module.exports = {
    name: "sticker",
    run: async ({ sock, msg }) => {
        const from = msg.key.remoteJid;

        // Vérifie si c'est une image
        const imageMessage = msg.message?.imageMessage || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
        if (!imageMessage) {
            return sock.sendMessage(from, { text: "❌ Réponds à une image pour créer un sticker !" });
        }

        try {
            // Télécharge l'image
            const buffer = await downloadMediaMessage(
                { message: imageMessage },
                "buffer",
                {},
                { logger: require("pino")({ level: "silent" }) }
            );

            // Envoie le sticker
            await sock.sendMessage(from, {
                sticker: buffer
            });

        } catch (err) {
            console.error("Erreur sticker:", err);
            await sock.sendMessage(from, { text: "❌ Impossible de créer le sticker." });
        }
    }
};