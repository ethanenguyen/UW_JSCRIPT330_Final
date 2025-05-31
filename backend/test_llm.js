import { pipeline, TextStreamer } from "@huggingface/transformers";

// Allocate a pipeline for sentiment-analysis
const pipe = await pipeline('sentiment-analysis');

const out = await pipe('I love transformers!');
console.log(out)

// Create a text generation pipeline
const generator = await pipeline(
  "text-generation",
  // "onnx-community/Qwen2.5-Coder-0.5B-Instruct",
  // "onnx-community/TinyLlama-1.1B-Chat-v1.0-ONNX",
  "Xenova/TinyLlama-1.1B-Chat-v1.0",
// "onnx-community/Llama-3.2-3B-Instruct",
  { dtype: "q4" },
);

// Define the list of messages
const messages = [
  { role: "system", content: "You are a helpful travel assistant." },
  { role: "user", content:  "Write a travel plan for someone who visit Santorini, Greek in September." },
];

// Create text streamer
const streamer = new TextStreamer(generator.tokenizer, {
  skip_prompt: true,
  // Optionally, do something with the text (e.g., write to a textbox)
  // callback_function: (text) => { /* Do something with text */ },
})

// Generate a response
const result = await generator(messages, { max_new_tokens: 512, do_sample: false, streamer });

console.log(result);