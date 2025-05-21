const fs = require("fs");
const pdfParse = require("pdf-parse");
const axios = require("axios");
const { MongoClient } = require("mongodb");
const config = require("./config.json");

const directoryPath = "./pdfs"; // Directory where your PDF files are stored
const embeddingEndpoint = `http://localhost:${config.port}/embedding`;

const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
// const{ CharacterTextSplitter } = require("langchain/textsplitters")

// MongoDB client
const client = new MongoClient(config.mongoDB.mongoUri);
const dbName = config.mongoDB.dbName;
const collectionName = config.mongoDB.collectionName;

// console.log(output.data);
// output.data will be a Float32Array containing the embeddings
// 
// Read the PDF files from the pdfs directory
async function readPDFsAndEmbed(directoryPath) {
  try {
    await client.connect();
    console.log("Connected successfully to MongoDB server");
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const files = fs
    .readdirSync(directoryPath)
    .filter((file) => file.endsWith(".json") || file.endsWith(".pdfx") || file.endsWith(".txtx"));

    // Initialize the RecursiveCharacterTextSplitter
    let textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1024, // Maximum size of each chunk
      chunkOverlap: 128, // Overlap between chunks
    });
    
    // Process the pdf files
    for (const file of files) {
      console.log(`Processing file: ${file}`);
      const filePath = `${directoryPath}/${file}`;
      const dataBuffer = fs.readFileSync(filePath);
      let textData = "";
      let chunks = "";
      if (file.endsWith(".json")) {
        const data = JSON.parse(dataBuffer);
        textData = Object.values(data).map(entry => 
          `In ${entry.Year}, ${entry.Artist} from ${entry.Country} entered this song ${entry.Song} in ${entry.Language} to Eurovision held in ${entry['Host City']}. The lyrics of the song is following ${entry['Lyrics translation']}. `
        ).join('\n\n');

        // console.log(textData)
        // sentences = textData.split(". ");
        // textSplitter = new CharacterTextSplitter({
        //   chunkSize: 1024, // Maximum size of each chunk
        //   chunkOverlap: 128, // Overlap between chunks
        // });
        
      }
      else if (file.endsWith(".pdf"))  {
        // Assuming each sentences is separated by ". "
        const content = await pdfParse(dataBuffer);
        textData = content.text;
        // sentences = textData.text.split(". ");
      }
      else {
        textData = fs.readFileSync(filePath, 'utf8'); 
        // sentences = dataBuffer.split('. ').map(sentence => sentence.trim()).filter(sentence => sentence.length > 0);
        // console.log('File contents:\n', textData);

      }
      
      // Split the text into chunks
      chunks = await textSplitter.createDocuments([textData]);
      // Initialize pageNumber to 1 at the start.
      let pageNumber = 1;

      // Iterate over each sentence in the chunks array.
      for (const chunk of chunks) {
        const sentence = chunk.pageContent
        // console.log(sentence)
        // Make an asynchronous POST request to the embedding endpoint with the current sentence.
        // The sentence is JSON stringified before sending.
        const response = await axios.post(embeddingEndpoint, {
          text: JSON.stringify(sentence),
        });

        // Extract the embeddings from the response data.
        const embedding = response.data.embeddings;

        // Insert a new document into the MongoDB collection with the sentence, its embedding,
        // the current PDF file name, and the current page number.
        await collection.insertOne({
          pdfFileName: file, // The name of the PDF file being processed.
          sentence, // The current sentence being processed.
          pageNumber, // The page number where the sentence was found.
          embedding, // The embedding of the current sentence.
        });

        // Check if the sentence contains the page separator "\n\n".
        // If so, increment the pageNumber variable to indicate a new page.
        if (/\n\n/.test(sentence)) {
          pageNumber++;
        }
      }
    }

    console.log("All PDFs processed and embeddings stored.");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

readPDFsAndEmbed(directoryPath);
