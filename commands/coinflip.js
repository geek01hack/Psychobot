module.exports = {
    name: "coinflip",
    run: async ({ sock, msg }) => {
        const result = Math.random() > 0.5 ? "Pile 🪙" : "Face 🪙";
        await sock.sendMessage(msg.key.remoteJid, { text: `Résultat : ${result}` });
    }
};
