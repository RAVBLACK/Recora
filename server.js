const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post('/api/chat', async (req, res) => {
    try {
        const { model, messages, temperature } = req.body;
        
        if (!process.env.GROQ_API_KEY) {
            return res.status(500).json({ error: 'Groq API key is not configured on the server.' });
        }



        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model || 'llama-3.3-70b-versatile',
                messages: messages || [],
                temperature: temperature !== undefined ? temperature : 0.35
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            return res.status(response.status).json({ error: data.error?.message || 'Failed to fetch from Groq API' });
        }
        
        res.json({ reply: data.choices[0].message.content });
    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Serve frontend static files
app.use(express.static('frontend'));

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
