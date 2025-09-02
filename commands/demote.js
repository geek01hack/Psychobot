module.exports = {
    name: "demote",
    run: async ({ sock, msg, args }) => {
        const from = msg.key.remoteJid;

        // Vérifie que c’est un groupe
        if (!from.endsWith("@g.us")) {
            return sock.sendMessage(from, { text: "❌ Cette commande ne fonctionne que dans un groupe." });
        }

        // Vérifie qu’un numéro est fourni
        if (!args[0]) {
            return sock.sendMessage(from, { text: "❌ Merci de fournir le numéro à rétrograder." });
        }

        // Nettoyage du numéro et création du JID
        const user = args[0].replace(/\D/g, "") + "@s.whatsapp.net";

        try {
            await sock.groupParticipantsUpdate(from, [user], "demote");
            await sock.sendMessage(from, { text: `✅ ${args[0]} n’est plus admin.` });
        } catch (err) {
            console.error("Erreur demote:", err);
            await sock.sendMessage(from, { text: "❌ Impossible de rétrograder cet utilisateur." });
        }
    }
};