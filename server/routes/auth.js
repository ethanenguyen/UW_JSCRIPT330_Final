const express = require('express');
const auth = express.Router().use(express.json(), express.urlencoded({ extended: false }));
const { StreamChat } = require("stream-chat")

const chatServer = StreamChat.getInstance(
  process.env.STREAM_KEY,
  process.env.STREAM_SECRET
)

auth.post('/auth', async (req, res) => {
const { customerId } = await req.body;

await chatServer.upsertUser({  
  id: customerId,   
  role: 'admin'
});  

await chatServer.upsertUser({
  id: 'ai-support-bot', 
  name: "AI Support Bot",
  role: 'user'
});

try {
  const token = chatServer.createToken(customerId);
  res.json({ token })
} catch (error) {
  res.status(500).json({error: error})
}

});

module.exports = auth;