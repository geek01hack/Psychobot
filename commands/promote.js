module.exports = {
    name: "promote",
    run: async ({ sock, msg, args }) => {
        const from = msg.key.remoteJid;

        // Vérifie que c’est bien un groupe
        if (!from.endsWith("@g.us")) {
            return sock.sendMessage(from, { text: "❌ Cette commande ne fonctionne que dans un groupe." });
        }

        // Vérifie qu’un numéro est fourni
        if (!args[0]) {
            return sock.sendMessage(from, { text: "❌ Merci de fournir le numéro à promouvoir." });
        }

        // Nettoyage du numéro et création du JID
        const user = args[0].replace(/\D/g, "") + "@s.whatsapp.net";

        try {
            await sock.groupParticipantsUpdate(from, [user], "promote");
            await sock.sendMessage(from, { text: `✅ ${args[0]} a été promu admin !` });
        } catch (err) {
            console.error("Erreur promotion:", err);
            await sock.sendMessage(from, { text: "❌ Impossible de promouvoir cet utilisateur." });
        }
    }
};