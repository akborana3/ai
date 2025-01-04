const express = require('express');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

// Endpoint to handle chat requests
app.post('/api/chat', async (req, res) => {
    const userMessage = req.body.query;

    try {
        // Read the prompt.text file (adjust the path if necessary)
        const prompt = fs.readFileSync(path.join(__dirname, 'prompt.text'), 'utf-8');

        // Prepare payload to send to Cloudflare API
        const payload = {
            messages: [
                {
                    role: 'system',
                    content: 'You are ChatGPT, a large language model that knows everything in detail. Answer in as many details as possible.',
                },
                {
                    role: 'user',
                    content: userMessage,
                }
            ]
        };

        // Send request to Cloudflare API
        const response = await fetch(
            'https://api.cloudflare.com/client/v4/accounts/183ecd46407b11442f4befcc6e2b695b/ai/run/@cf/meta/llama-3-8b-instruct',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer yAD-yqwlds52sZOPKgB1bk42aTnw83kcoiq54xu_'
                },
                body: JSON.stringify(payload)
            }
        );

        // Parse the response from Cloudflare API
        const data = await response.json();

        // Return the response from Cloudflare API to the client
        res.json(data);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
