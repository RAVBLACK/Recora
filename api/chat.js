module.exports = async function(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('Recora Backend is running on Vercel!');
  }

  try {
    const { model, messages, temperature } = req.body;
    
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'Groq API key is not configured.' });
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
    
    res.status(200).json({ reply: data.choices[0].message.content });
  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
