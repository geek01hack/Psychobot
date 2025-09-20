// chipmunks.js
import makeWASocket, {
  useMultiFileAuthState,
  downloadContentFromMessage,
  jidNormalizedUser
} from "@whiskeysockets/baileys";
import fs from "fs";
import { spawn } from "child_process";
import path from "path";

const TMP_DIR = "./tmp_chipmunks";
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

// Fonction pour appliquer effet "Chipmunks"
function runChipmunksEffect(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    // Effet chipmunk = pitch + tempo rapide
    // On augmente le pitch d’environ +8 demi-tons et accélère tempo
    const ffmpegArgs = [
      "-y",
      "-i", inputPath,
      "-vn",
      "-af", "asetrate=44100*1.6,aresample=44100,atempo=0.9",
      "-c:a", "libopus",
      "-b:a", "64k",
      outputPath
    ];

    const ff = spawn("ffmpeg", ffmpegArgs);
    let stderr = "";
    ff.stderr.on("data", (d) => { stderr += d.toString(); });
    ff.on("close", (code) => {
      if (code === 0) return resolve();
      return reject(new Error("ffmpeg failed: " + stderr));
    });
  });
}

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState("session");
  const sock = makeWASocket({ auth: state, printQRInTerminal: true });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    try {
      const m = messages[0];
      if (!m.message) return;

      const body = (m.message.conversation
        || m.message.extendedTextMessage?.text
        || "").trim();

      if (!body) return;

      const from = m.key.remoteJid;

      if (!body.toLowerCase().startsWith("!chipmunks")) return;

      const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted) {
        await sock.sendMessage(from, { text: "Réponds à une note vocale avec `!chipmunks` pour la transformer." }, { quoted: m });
        return;
      }

      const mediaKey = quoted.audioMessage ? "audioMessage" : null;
      if (!mediaKey) {
        await sock.sendMessage(from, { text: "Le message cité ne contient pas d’audio/voice note." }, { quoted: m });
        return;
      }

      const stream = await downloadContentFromMessage(quoted[mediaKey], "audio");
      const buffers = [];
      for await (const chunk of stream) buffers.push(chunk);
      const buffer = Buffer.concat(buffers);

      const idShort = Date.now();
      const inputPath = path.join(TMP_DIR, `in_${idShort}.opus`);
      const outputPath = path.join(TMP_DIR, `out_${idShort}.opus`);

      fs.writeFileSync(inputPath, buffer);

      await sock.sendMessage(from, { text: "🎶 Transformation en Chipmunks..." }, { quoted: m });

      try {
        await runChipmunksEffect(inputPath, outputPath);

        const outBuffer = fs.readFileSync(outputPath);

        await sock.sendMessage(from, {
          audio: outBuffer,
          ptt: true
        }, { quoted: m });

        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
      } catch (err) {
        console.error("FFMPEG error:", err);
        await sock.sendMessage(from, { text: "Erreur FFMPEG : " + err.message }, { quoted: m });
      }
    } catch (err) {
      console.error("chipmunks handler error:", err);
    }
  });

  console.log("Chipmunks bot démarré ✅. Scanner le QR si nécessaire.");
}

start().catch(err => {
  console.error("Erreur du bot:", err);
});