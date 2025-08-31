module.exports = {
    name: "kick",
    run: async ({ sock, msg, args }) => {
        if (!msg.key.remoteJid.endsWith("@g.us")) return;
        const user = args[0]?.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        await sock.groupParticipantsUpdate(msg.key.remoteJid, [user], "remove");
    }
};
