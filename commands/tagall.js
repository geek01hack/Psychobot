module.exports = {
    name: "tagall",
    run: async ({ sock, msg }) => {
        const from = msg.key.remoteJid;

        // Vérifie que c’est bien un groupe
        if (!from.endsWith("@g.us")) {
            return sock.sendMessage(from, { text: "❌ Cette commande ne fonctionne que dans un groupe." });
        }

        const groupMetadata = await sock.groupMetadata(from);
        const participants = groupMetadata.participants.map(p => p.id);

        await sock.sendMessage(from, {
            text: "📢 Mention spéciale à tous !",
            mentions: participants
        });
    }
};