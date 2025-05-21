import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";
// import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/hf_transformers";
// import { env, pipeline } from "@huggingface/transformers";
console.log("Hello World");


const model = new HuggingFaceTransformersEmbeddings({
  model: "Xenova/all-MiniLM-L6-v2",
});

/* Embed queries */
const res = await model.embedQuery(
  "What would be a good company name for a company that makes colorful socks?"
);
console.log({ res });

// Create a feature-extraction pipeline
// const extractor = await pipeline(
//   "feature-extraction",
//   "mixedbread-ai/mxbai-embed-xsmall-v1",
//   { device: "webgpu" },
// );

// // Compute embeddings
// const texts = ["Hello world!", "This is an example sentence."];
// const embeddings = await extractor(texts, { pooling: "mean", normalize: true });
// console.log(embeddings.tolist());


console.log("Hello World")

// const model = new HuggingFaceTransformersEmbeddings({
//   model: "Xenova/all-MiniLM-L6-v2",
// });


// // /* Embed queries */
// const res = await model.embedQuery(
//   "What would be a good company name for a company that makes colorful socks?"
// );
// // console.log({ res });
// // /* Embed documents */
// // const documentRes = await model.embedDocuments(["Hello world", "Bye bye"]);
// // console.log({ documentRes });