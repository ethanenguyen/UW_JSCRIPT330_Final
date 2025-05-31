const request = require("supertest");
// const cheerio = require('cheerio');

const server = require("./server");
// const testUtils = require('../test-utils');
// const Weather = require('../models/weather');

describe("/server", () => {

  describe("GET /", () => {
    it("should return a message about RAG", async () => {
      const res = await request(server).get("/");
      expect(res.statusCode).toEqual(200);
      const $ = cheerio.load(res.text);

      const text = $.text();
      expect(text).toContain('RAG Chatbot Backend is running!');
    });
  });

  describe("POST /embedding", () => {
    it("should return embeddings for valid text", async () => {
      const mockEmbeddings = [0.1, 0.2, 0.3]; // Sample embeddings
      getEmbeddings.mockResolvedValue(mockEmbeddings);
  
      const response = await request(app).post("/embedding").send({ text: "Hello World!" });
  
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ embeddings: mockEmbeddings });
    });
  
    it("should return 500 error if embeddings retrieval fails", async () => {
      getEmbeddings.mockRejectedValue(new Error("Embedding retrieval failed"));
  
      const response = await request(app).post("/embedding").send({ text: "test text" });
  
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: "Error processing your request" });
    });
  });

  // describe("GET /embedding", () => {
  //   it("should return weather for provided location", async () => {
  //     const res = await request(server).get("/weather/location?name=Home");
  //     expect(res.statusCode).toEqual(200);
  //     const $ = cheerio.load(res.text);

  //   });

  //   it("should error page if no matching place", async () => {
  //     const res = await request(server).get("/weather/location?name=Other");
  //     expect(res.statusCode).toEqual(404);
  //     const $ = cheerio.load(res.text);

  //     const text = $.text();
  //     expect(text).toContain('The weather for Other is not available');

  //     const link = $('a');
  //     expect(link.prop('href')).toEqual("/weather");
  //     expect(link.text()).toContain("Go Back");
  //   });

  //   it("should redirect back to weather landing if no name provided", async () => {
  //     const res = await request(server).get("/weather/location?name=");
  //     expect(res.statusCode).toEqual(302);
  //     expect(res.headers.location).toEqual("/weather");
  //   });
  });
