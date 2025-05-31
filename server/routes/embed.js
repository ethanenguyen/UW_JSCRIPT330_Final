const express = require('express')
const embed = express.Router().use(express.json(), express.urlencoded({ extended: false }));
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { CheerioWebBaseLoader } = require('@langchain/community/document_loaders/web/cheerio');

const { supabase, openai } = require("../utils");

async function storeEmbeddings() {
    const loader = new CheerioWebBaseLoader(
      'https://getstream.io/chat/docs/react/'
    );
    const docs = await loader.load();

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const chunks = await textSplitter.splitDocuments(docs);

    const promises = chunks.map(async (chunk) => {
      const cleanChunk = chunk.pageContent.replace(/\n/g, ' ');

      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: cleanChunk,
      });

      const [{ embedding }] = embeddingResponse.data;

      const { error } = await supabase.from('documents').insert({
        content: cleanChunk,
        embedding,
      });

      if (error) {
        throw error;
      }
    });

    await Promise.all(promises);
  }

embed.post("/embed", async (req, res) => {

    try {
        await storeEmbeddings();
        res.status(200).json({ message: 'Successfully Embedded' });
    }catch (error) {
        res.status(500).json({
            message: 'Error occurred',
        });
    }

});

module.exports = embed;