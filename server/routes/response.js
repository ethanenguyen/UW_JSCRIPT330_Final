const express = require("express");
const response = express.Router().use(express.json(), express.urlencoded( { extended: false }))
const { supabase, openai } = require("../utils");

const handleQuery = async (query) => {
    const input = query.replace(/\n/g, ' ');

    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input,
    });

    const [{ embedding }] = embeddingResponse.data;

    const { data: documents, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: 10,
    });

    if (error) throw error;

    let contextText = '';

    contextText += documents
      .map((document) => `${document.content.trim()}---\n`)
      .join('');

    const messages = [
      {
        role: 'system',
        content: `You are a customer support bot for Stream, only ever answer
      truthfully and be as helpful as you can!`,
      },
      {
        role: 'user',
        content: `Context sections: "${contextText}" Question: "${query}"`,
      },
    ];

    const completion = await openai.chat.completions.create({
      messages,
      model: 'gpt-4,
      temperature: 0.8,
    });

    return completion.choices[0].message.content;
  }

response.post("/response", async (req, res) => {
    const { message } = req.body;
    const answer = await handleQuery(message);

    res.json({answer})

})

module.exports = response;