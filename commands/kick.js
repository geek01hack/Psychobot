module.exports = {
    name: "kick",
    description: "Exclut un ou plusieurs membres du groupe (usage : !kick <numéro(s)> ou !kick @membre(s))",
    adminOnly: true,
    run: async ({ sock, msg, args }) => {
        const from = msg.key.remoteJid;

        // Vérifie que c’est un groupe
        if (!from.endsWith("@g.us")) {
            return sock.sendMessage(from, { text: "❌ Cette commande ne fonctionne que dans un groupe." });
        }

        // Récupère les infos du groupe
        const groupMetadata = await sock.groupMetadata(from);

        // Auteur du message
        const sender = msg.key.participant || msg.participant || msg.key.remoteJid;

        // Numéro du bot
        const botNumber = sock.user.id.includes("@s.whatsapp.net") 
            ? sock.user.id 
            : sock.user.id.split(":")[0] + "@s.whatsapp.net";

        // Vérifie si le sender est admin
        const senderIsAdmin = groupMetadata.participants.some(
            p => p.id === sender && (p.admin === "admin" || p.admin === "superadmin")
        );

        // 🔎 Debug logs
        console.log("========== [DEBUG KICK] ==========");
        console.log("Sender      :", sender);
        console.log("BotNumber   :", botNumber);
        console.log("SenderIsAdmin :", senderIsAdmin);
        console.log("Group Admins :", groupMetadata.participants.filter(p => p.admin));
        console.log("==================================");

        // Autorisé si : sender est le bot OU sender est admin
        if (!(sender === botNumber || senderIsAdmin)) {
            return sock.sendMessage(from, { text: "❌ Tu dois être admin pour utiliser cette commande." });
        }

        // Vérifie si le bot est admin dans le groupe
        const botIsAdmin = groupMetadata.participants.some(
            p => p.id === botNumber && (p.admin === "admin" || p.admin === "superadmin")
        );

        if (!botIsAdmin) {
            return sock.sendMessage(from, {
                text: "❌ Je ne peux pas exclure de membres car je ne suis pas admin. Veuillez me promouvoir en admin pour utiliser cette commande."
            });
        }

        // Vérifie si l’utilisateur a mentionné quelqu’un
        if (!args.length && !msg.message.extendedTextMessage?.contextInfo?.mentionedJid) {
            return sock.sendMessage(from, { text: "❌ Mentionne le membre à exclure !" });
        }

        // Récupère les JIDs à exclure
        const toRemove = msg.message.extendedTextMessage?.contextInfo?.mentionedJid ||
                         args.map(num => num.includes("@") ? num : num + "@s.whatsapp.net");

        try {
            await sock.groupParticipantsUpdate(from, toRemove, "remove");
            sock.sendMessage(from, { text: `✅ Membre(s) exclu(s) avec succès !` });
        } catch (err) {
            sock.sendMessage(from, { text: "❌ Impossible d’exclure le(s) membre(s)." });
            console.error(err);
        }
    }
};