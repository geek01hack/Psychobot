module.exports = {
    name: "audio",
    run: async ({ sock, msg }) => {
        const from = msg.key.remoteJid;
        await sock.sendMessage(from, {
            audio: { url: "./fichier.mp3" },
            mimetype: "audio/mp4",
            ptt: true
        });
    }
};
