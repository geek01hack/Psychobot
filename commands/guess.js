module.exports = {
    name: "guess",
    run: async ({ sock, msg }) => {
        const random = Math.floor(Math.random() * 10) + 1;
        await sock.sendMessage(msg.key.remoteJid, { text: "🎲 Devine un nombre entre 1 et 10 !" });
        setTimeout(() => {
            sock.sendMessage(msg.key.remoteJid, { text: `✅ Réponse : ${random}` });
        }, 5000);
    }
};
