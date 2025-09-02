module.exports = {
    name: "kick",
    run: async ({ sock, msg, args }) => {
        const from = msg.key.remoteJid;

        // Vérifie que c’est un groupe
        if (!from.endsWith("@g.us")) {
            return sock.sendMessage(from, { text: "❌ Cette commande ne fonctionne que dans un groupe." });
        }

        // Vérifie qu’un numéro est fourni
        if (!args[0]) {
            return sock.sendMessage(from, { text: "❌ Merci de fournir le numéro à exclure." });
        }

        // Nettoyage du numéro et création du JID
        const user = args[0].replace(/\D/g, "") + "@s.whatsapp.net";

        try {
            await sock.groupParticipantsUpdate(from, [user], "remove");
            await sock.sendMessage(from, { text: `✅ ${args[0]} a été exclu du groupe !` });
        } catch (err) {
            console.error("Erreur kick:", err);
            await sock.sendMessage(from, { text: "❌ Impossible d’exclure cet utilisateur." });
        }
    }
};