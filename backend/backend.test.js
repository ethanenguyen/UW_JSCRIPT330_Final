const request = require("supertest");
const cheerio = require('cheerio');

const server = require("./server");

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
      const mockEmbeddings = [0.4, 0.5, 0.8]; // Sample embeddings
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

describe("POST /chat", () => {
  let mockDb, mockCollection;

  beforeAll(() => {
    mockDb = { collection: jest.fn(() => mockCollection) };
    mockCollection = {
      aggregate: jest.fn(async () => [
        {
          pdfFileName: "example.pdf",
          sentence: "This is relevant context.",
          pageNumber: 5,
        },
      ]),
    };
    client.db = jest.fn(() => mockDb);
  });

  test("should return a response when RAG is enabled", async () => {
    const response = await request(app)
      .post("/chat")
      .send({ message: "What is AI?", rag: true });

    expect(response.statusCode).toBe(200);
    expect(response.text).toContain("example.pdf, page 5");
  });

  test("should return a response when RAG is disabled", async () => {
    const response = await request(app)
      .post("/chat")
      .send({ message: "What is AI?", rag: false });

    expect(response.statusCode).toBe(200);
    expect(response.text).toContain("I don't know");
  });

  test("should handle errors gracefully", async () => {
    mockCollection.aggregate.mockRejectedValueOnce(new Error("DB Error"));

    const response = await request(app)
      .post("/chat")
      .send({ message: "Test error", rag: true });

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe("Error processing your message");
  });
});

  });
