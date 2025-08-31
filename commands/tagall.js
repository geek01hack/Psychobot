module.exports = {
    name: "tagall",
    run: async ({ sock, msg }) => {
        const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
        const participants = groupMetadata.participants.map(p => p.id);

        await sock.sendMessage(msg.key.remoteJid, {
            text: "📢 Mention spéciale à tous !",
            mentions: participants
        });
    }
};
