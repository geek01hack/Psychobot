module.exports = {
    name: "pp",
    run: async ({ sock, msg, args }) => {
        const from = msg.key.remoteJid;
        let jid;

        // Si on répond à quelqu'un
        if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
            jid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        } else if (args[0]) {
            // Ou si on fournit le numéro
            jid = args[0].replace(/\D/g, "") + "@s.whatsapp.net";
        } else {
            // Sinon photo de profil du sender
            jid = msg.key.participant || msg.key.remoteJid;
        }

        try {
            const url = await sock.profilePictureUrl(jid, "image");
            await sock.sendMessage(from, { image: { url }, caption: "📸 Photo de profil en haute résolution" });
        } catch (err) {
            console.error("Erreur PP:", err);
            await sock.sendMessage(from, { text: "❌ Impossible de récupérer la photo de profil." });
        }
    }
};