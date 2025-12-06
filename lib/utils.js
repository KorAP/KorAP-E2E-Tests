const crypto = require('crypto');

const nc_talk_url = process.env.NC_TALK_URL || 'https://cloud.ids-mannheim.de';
const nc_talk_conversation = process.env.NC_TALK_CONVERSATION;
const nc_talk_secret = process.env.NC_TALK_SECRET;

// Function to send message to Nextcloud Talk
async function sendToNextcloudTalk(message, silent = false, screenshotPath = null) {
    if (!nc_talk_conversation || !nc_talk_secret) {
        return;
    }

    try {
        const axios = require('axios');
        const fs = require('fs');
        const sharp = require('sharp');
        
        let fullMessage = message;
        const MAX_MESSAGE_LENGTH = 32000; // Nextcloud Talk message size limit
        
        // If a screenshot path is provided, try to embed it
        if (screenshotPath && fs.existsSync(screenshotPath)) {
            try {
                // First, try to resize the image to reduce size
                const resizedBuffer = await sharp(screenshotPath)
                    .resize(800, null, { // Resize to max width of 800px, maintain aspect ratio
                        withoutEnlargement: true,
                        fit: 'inside'
                    })
                    .png({ quality: 80, compressionLevel: 9 })
                    .toBuffer();
                
                const base64Image = resizedBuffer.toString('base64');
                const dataUri = `data:image/png;base64,${base64Image}`;
                const messageWithImage = `${message}\n\n![Screenshot](${dataUri})`;
                
                // Check if the message with image fits within the limit
                if (messageWithImage.length <= MAX_MESSAGE_LENGTH) {
                    fullMessage = messageWithImage;
                    console.log(`Screenshot will be embedded (message size: ${messageWithImage.length} chars)`);
                } else {
                    console.log(`Screenshot too large (${messageWithImage.length} chars), sending text-only notification`);
                    fullMessage = `${message}\n\n_Screenshot available locally but too large to embed (${Math.round(messageWithImage.length / 1024)}KB)_`;
                }
            } catch (imageError) {
                console.error('Failed to process screenshot for Nextcloud Talk:', imageError.message);
                fullMessage = `${message}\n\n_Screenshot available locally but could not be processed_`;
            }
        }
        
        // Generate random header and signature
        const randomHeader = crypto.randomBytes(32).toString('hex');
        const messageToSign = randomHeader + fullMessage;
        const signature = crypto.createHmac('sha256', nc_talk_secret)
            .update(messageToSign)
            .digest('hex');

        // Send the message
        await axios.post(
            `${nc_talk_url}/ocs/v2.php/apps/spreed/api/v1/bot/${nc_talk_conversation}/message`,
            {
                message: fullMessage,
                silent: silent
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'OCS-APIRequest': 'true',
                    'X-Nextcloud-Talk-Bot-Random': randomHeader,
                    'X-Nextcloud-Talk-Bot-Signature': signature
                }
            }
        );
        console.log('Message sent to Nextcloud Talk successfully');
    } catch (error) {
        console.error('Failed to send message to Nextcloud Talk:', error.message);
    }
}

function ifConditionIt(title, condition, test) {
    if (typeof it !== 'function') {
        const { it } = require('mocha');
         return condition ? it(title, test) : it.skip(title + " (skipped)", test)
    }
    return condition ? it(title, test) : it.skip(title + " (skipped)", test)
}

module.exports = {
    sendToNextcloudTalk,
    ifConditionIt,
    nc_talk_conversation,
    nc_talk_secret 
};
