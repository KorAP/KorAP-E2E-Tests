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
        
        // If a screenshot path is provided, try to embed it. The data URI is
        // base64 (~33% overhead), so a PNG quickly blows past the message size
        // limit. Use JPEG (much smaller for UI screenshots) and step the width
        // down until the embedded message fits, keeping the largest that does.
        if (screenshotPath && fs.existsSync(screenshotPath)) {
            try {
                const candidateWidths = [800, 640, 520, 420, 320, 240];
                let embedded = null;
                let lastSize = 0;

                for (const width of candidateWidths) {
                    const resizedBuffer = await sharp(screenshotPath)
                        .resize(width, null, { // maintain aspect ratio
                            withoutEnlargement: true,
                            fit: 'inside'
                        })
                        .jpeg({ quality: 72, mozjpeg: true })
                        .toBuffer();

                    const dataUri = `data:image/jpeg;base64,${resizedBuffer.toString('base64')}`;
                    const messageWithImage = `${message}\n\n![Screenshot](${dataUri})`;
                    lastSize = messageWithImage.length;

                    if (messageWithImage.length <= MAX_MESSAGE_LENGTH) {
                        embedded = messageWithImage;
                        console.log(`Screenshot embedded at width ${width}px (message size: ${messageWithImage.length} chars)`);
                        break;
                    }
                }

                if (embedded) {
                    fullMessage = embedded;
                } else {
                    console.log(`Screenshot too large to embed even at smallest size (${lastSize} chars), sending text-only notification`);
                    fullMessage = `${message}\n\n_Screenshot available locally but too large to embed_`;
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
