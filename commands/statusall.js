module.exports = {
    name: "statusall",
    description: "Marque vus tous les statuts et envoie une réaction automatique 👍",
    adminOnly: false,
    run: async ({ sock, msg }) => {
        const from = msg.key.remoteJid;

        // La commande doit être exécutée dans ton chat privé
        if (from !== sock.user.id.split(":")[0] + "@s.whatsapp.net") {
            return sock.sendMessage(from, { text: "❌ Cette commande ne peut être exécutée que dans ton chat personnel." });
        }

        try {
            // Récupère les statuts (ils sont dans la 'chats' collection de Baileys)
            const chats = Object.values(await sock.chats);
            const statusChat = chats.find(c => c.id === "status@broadcast");

            if (!statusChat || !statusChat.messages) {
                return sock.sendMessage(from, { text: "ℹ️ Aucun statut trouvé." });
            }

            // Parcourt tous les statuts
            for (const [key, statusMsg] of Object.entries(statusChat.messages)) {
                const jid = statusMsg.key.participant;
                const id = statusMsg.key.id;

                // Marquer comme lu
                await sock.readMessages([statusMsg.key]);

                // Réagir avec un like 👍
                await sock.sendMessage(jid, {
                    react: {
                        text: "👍", // Emoji de réaction
                        key: statusMsg.key
                    }
                });

                console.log(`✅ Statut vu et liké de : ${jid}`);
            }

            sock.sendMessage(from, { text: "✅ Tous les statuts ont été vus et likés 👍" });
        } catch (err) {
            console.error(err);
            sock.sendMessage(from, { text: "❌ Erreur lors du traitement des statuts." });
        }
    }
};