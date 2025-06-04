const express = require("express");
const authRoutes = require("./auth"); // Import auth.js
const jwt = require('jsonwebtoken');
const app = express();
const { MongoClient } = require("mongodb"); // Import MongoDB client
// const { PredictionServiceClient } = aiplatform.v1;
// const { helpers } = aiplatform;
const config = require("./config.json");
// const mongoose = require("mongoose");
// MongoDB connection string - adjust in the config.json file
const mongoUri = config.mongoDB.mongoUri;
const client = new MongoClient(mongoUri);
const dbName = config.mongoDB.dbName;
const collectionName = config.mongoDB.collectionName;
const mongoose = require("mongoose");

class MyEmbeddingPipeline {
  static task = 'feature-extraction';
  // static model = 'Xenova/all-MiniLM-L6-v2';
  static model = 'Xenova/bge-m3';
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      // Dynamically import the Transformers.js library
      let { pipeline, env } = await import('@huggingface/transformers');

      // NOTE: Uncomment this to change the cache directory
      // env.cacheDir = './.cache';

      this.instance = pipeline(this.task, this.model, { progress_callback });
    }

    return this.instance;
  }
}

class MyChatPipeline {
  static task = 'text-generation';
  // static model = 'onnx-community/Qwen2.5-Coder-0.5B-Instruct';
  // static model = 'onnx-community/TinyLlama-1.1B-Chat-v1.0-ONNX';
  static model =   "Xenova/TinyLlama-1.1B-Chat-v1.0";
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      // Dynamically import the Transformers.js library
      let { pipeline, env } = await import('@huggingface/transformers');

      // NOTE: Uncomment this to change the cache directory
      // env.cacheDir = './.cache';

      this.instance = pipeline(
        "text-generation",
        "onnx-community/TinyLlama-1.1B-Chat-v1.0-ONNX",
        { dtype: "q4" },
      );
    }

    return this.instance;
  }
}

MyChatPipeline.getInstance();

MyEmbeddingPipeline.getInstance();

// const predictionServiceClient = new PredictionServiceClient(clientOptions);

let history = [];
let lastRag = false;

// Extracts floating point numbers from a nested JSON structure.
function extractFloatsFromJson(jsonData) {
  let floats = []; // Store extracted floats.

  // Loop through jsonData to reach deeply nested `values`.
  jsonData.forEach((item) => {
    const values =
      item.structValue.fields.embeddings.structValue.fields.values.listValue
        .values;

    // Extract and add `numberValue` to floats if present.
    values.forEach((valueItem) => {
      if (valueItem.kind === "numberValue") {
        floats.push(valueItem.numberValue);
      }
    });
  });

  return floats; // Return collected floats.
}

// Asynchronously fetches embeddings for given text using a local model.
async function getEmbeddings(text) {

  let response;
  const encoder = await MyEmbeddingPipeline.getInstance();
  response = await encoder(text, { pooling: 'mean', normalize: true });
  const embeddings = response.data;

  // Convert object to array and format values
  const formattedArray = Object.values(embeddings);
  // Send the JSON response
  // result = JSON.stringify(predictions);
  // console.log(predictions)
  return formattedArray;

  // async function loadModel() {
  //     const sentenceEncoder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  //     return sentenceEncoder;
  // }

  // let encoder = await loadModel();

  // async function generateEmbeddings(encoder, sentences) {
  //   const embeddings = await encoder(sentences, { pooling: 'mean', normalize: true });
  //   return embeddings;
  // }

  // const response = await generateEmbeddings(encoder, text);
  // Extract the embeddings from the response data.
  
  // Prepare the input instance with the text content.
  // const instance = { content: text };
  // const instanceValue = helpers.toValue(instance); // Convert to expected format.
  // const instances = [instanceValue]; // Wrap in an array for the API request.

  // Set prediction parameters.
  // const parameter = {
  //   temperature: 0, // Controls randomness.
  //   maxOutputTokens: 256, // Maximum length of the generated text.
  //   topP: 0, // Nucleus sampling: selects the smallest set of tokens cumulatively.
  //   topK: 1, // Top-k sampling: selects the top k probabilities.
  // };
  // const parameters = helpers.toValue(parameter); // Convert to expected format.

  // Construct the request object.
  // const request = {
  //   endpoint,
  //   instances,
  //   parameters,
  // };

  // Perform the predict request to the API.
  // const [response] = await predictionServiceClient.predict(request);
  // const predictions = response.predictions; // Extract predictions.

  // Extract and return floats from the predictions JSON.
  // return extractFloatsFromJson(predictions);
}

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.sendStatus(401);
    }
    const token = authHeader.split(' ')[1];
    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        req.user = user;
        next();
    } catch (error) {
        return res.sendStatus(401);
    }
}

app.use(express.json());
const cors = require("cors");
app.use(cors());

app.get("/", (req, res) => {
  res.status(200).send("RAG Chatbot Backend is running!");
});

app.use("/auth", authRoutes); // Use authentication routes

app.post("/embedding", async (req, res) => {
  const text = req.body.text;

  try {
    // Attempt to get embeddings for the provided text
    const embeddings = await getEmbeddings(text);

    res.json({ embeddings: embeddings }); // Return embeddings

  } catch (error) {
    console.error("Error getting embeddings:", error);

    // Respond with a 500 Internal Server Error status code and error message
    res.status(500).json({ message: "Error processing your request" });
  }
});

// Endpoint for handling chat messages, dynamically responding based on RAG status.
app.post("/chat", authMiddleware, async (req, res) => {
  const userMessage = req.body.message; // Extract user message from request body.
  const rag = req.body.rag; // Extract RAG status.
  let prompt; // Initialize prompt variable for later use.

  // Reset history if RAG status has changed since last message.
  if (lastRag !== rag) {
    history = [];
    lastRag = rag;
  }

  // Add user's message to history.
  history.push({
    author: "user",
    content: userMessage,
  });

  try {
    if (rag) {
      console.log(userMessage);
      // RAG enabled: Use embeddings to find relevant responses.
      const embeddings = await getEmbeddings(userMessage);

      // Define MongoDB db and collection and set up aggregation pipeline for vector search.
      const db = client.db(dbName);
      const collection = db.collection(collectionName);

      const pipeline = [
        {
          $vectorSearch: {
            index: "vector_index",
            path: "embedding",
            queryVector: embeddings,
            numCandidates: 200,
            limit: 1,
          },
        },
      ];    
      const aggregationResponse = await collection
        .aggregate(pipeline)
        .toArray();
      console.log(aggregationResponse);

      // Check if aggregation returned results and prepare prompt accordingly.
      if (aggregationResponse.length > 0) {
        const { pdfFileName, sentence, pageNumber } = aggregationResponse[0];
        const cleanedText = sentence.replace(/['"]/g, '');

        // mongoContext = `You are a helpful chatbot.  Your job is to answer question based on the relevant context, always tell the user the name of the file and the page number as part of your answer: ${cleanedText} from ${pdfFileName}, page ${pageNumber}.`;
        mongoContext = `You are an assistant for question-answering tasks. Use the following retrieved context to answer the question. If you don't know the answer, just say that you don't know.  Always cite the name of the source and the page number as part of your answer
        Question: ${userMessage}
        Context: ${cleanedText} from ${pdfFileName}, page ${pageNumber}
        Answer:`

        // prompt = {
        //   context: mongoContext,
        //   examples: [
        //     // Add any examples if needed
        //   ],
        //   messages: history,
        // };

        prompt = [
          { role: "system", content: mongoContext},
           { role: "user", content:  userMessage },
        ];

      } else {
        // Handle case where no aggregation results are found.
        console.error("No results from vector search");
        res.status(500).json({ message: "No results from vector search" });
      }
    } else {
      // RAG disabled: Prepare a general-purpose prompt.
      prompt = [
        { role: "system", content: `You are a helpful chatbot, you are not allowed to lie or make stuff up. 
          If you can't find the information the user is looking for say "I don't know" `},
         { role: "user", content:  userMessage },
      ];
    }

    // Define the list of messages
    // prompt = [
    //   { role: "system", content: `You are a helpful chatbot, you are not allowed to lie or make stuff up. RAG is off. 
    //     If you can't find the information the user is looking for say "I don't know" `},
    //    { role: "user", content:  userMessage },
    // ];

    // console.log(history);
    console.log(prompt);

    // Create text streamer
    const generator = await MyChatPipeline.getInstance();
    let {TextStreamer} = await import('@huggingface/transformers');

    const streamer = new TextStreamer(generator.tokenizer, {
      skip_prompt: true,

      callback_function: (chunk) => {
        res.write(chunk); // Ensure proper streaming with newline
      },

    })

    // Generate a response
    // const response = await generator(prompt_test, { max_new_tokens: 512, do_sample: false, streamer });
    // Generate a response
    const output = await generator(prompt, { max_new_tokens: 512, do_sample: false, streamer });
    console.log(output[0].generated_text.at(-1).content);
    const botTextResponse = output[0].generated_text.at(-1).content;

    history.push({
      author: "system",
      content: botTextResponse,
    });


    res.end(); // Signal completion of streaming

  } catch (error) {
    console.error("Error processing chat message:", error);
    res.status(500).json({ message: "Error processing your message" });
  }
});

// Connect to MongoDB when the server starts
async function connectToMongoDB() {
  dbClient = new MongoClient(mongoUri);
  try {
    await dbClient.connect();
    console.log("Connected successfully to MongoDB Atlas");
  } catch (error) {
    console.error("Could not connect to MongoDB:", error);
    process.exit(1); // Exit if the database connection cannot be established
  }
}

// Start server and connect to MongoDB
connectToMongoDB().then(() => {
  app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
  });
});


mongoose
  .connect("mongodb://127.0.0.1/llm-rag", {})
  .then(() => {console.log('Connect to local MongoDb')})
  .catch((e) => {
    console.error(`Failed to connect to Local MongoDb server:`, e);
  });

// Gracefully handle shutdown and close MongoDB connection
process.on("SIGINT", async () => {
  await dbClient.close();
  console.log("MongoDB connection closed");
  process.exit(0);
});
