const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Ensure media directory exists
const mediaDir = path.join(__dirname, 'media');
if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir);
}

// Initialize WhatsApp client with Puppeteer options
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Load session data if it exists
if (fs.existsSync(process.env.SESSION_FILE_PATH)) {
    const sessionData = require(process.env.SESSION_FILE_PATH);
    client.initialize({ session: sessionData });
} else {
    client.initialize();
}

// Event listener for incoming messages
client.on('message', async message => {
    const command = message.body.split(' ')[0].toLowerCase();

    switch (command) {
        case '!save':
            await saveOneViewMedia(message);
            break;
        case '!help':
            client.sendMessage(message.from, 'Available commands: !save, !hello, !info, ...');
            break;
        case '!hello':
            client.sendMessage(message.from, 'Hello! How can I assist you today?');
            break;
        case '!info':
            client.sendMessage(message.from, 'This is a WhatsApp bot created using Node.js.');
            break;
        // Add more commands as needed
        default:
            client.sendMessage(message.from, 'Unknown command. Type !help for a list of commands.');
    }
});

// Function to save one-view media
async function saveOneViewMedia(message) {
    if (message.hasMedia) {
        const media = await message.downloadMedia();
        const filePath = `${mediaDir}/${message.id.id}.${media.mimetype.split('/')[1]}`;
        fs.writeFileSync(filePath, media.data, { encoding: 'base64' });
        client.sendMessage(message.from, 'Media saved successfully!');
    } else {
        client.sendMessage(message.from, 'No media to save.');
    }
}

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Initialize the client
client.initialize();
