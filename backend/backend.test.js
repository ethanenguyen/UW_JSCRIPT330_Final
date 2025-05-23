const request = require("supertest");
const cheerio = require('cheerio');

const server = require("../server");
const testUtils = require('../test-utils');
const Weather = require('../models/weather');

describe("/weather", () => {
  beforeAll(testUtils.connectDB);
  afterAll(testUtils.stopDB);

  beforeEach(async () => {
    await Weather.insertMany([
      { name: 'Place', temperature: 8 },
      { name: 'Home', temperature: 12 },
      { name: 'Beach', temperature: 15 }
    ])
  })

  afterEach(testUtils.clearDB);

  describe("GET /", () => {
    it("should return weather landing page with a form", async () => {
      const res = await request(server).get("/weather");
      expect(res.statusCode).toEqual(200);
      const $ = cheerio.load(res.text);
      const form = $('form');
      expect(form.prop('action')).toEqual('/weather/location');
      const input = form.find('input[type=text]');
      expect(input.length).toEqual(1)
      expect(input[0].attribs).toEqual({
        type: 'text',
        placeholder: 'Name',
        name: 'name'
      });
      const button = form.find('input[type=submit]');
      expect(button.length).toEqual(1);
    });
  });

  describe("GET /location", () => {
    it("should return weather for provided location", async () => {
      const res = await request(server).get("/weather/location?name=Home");
      expect(res.statusCode).toEqual(200);
      const $ = cheerio.load(res.text);

      const text = $.text();
      expect(text).toContain('The weather for Home is 12');
      
      const link = $('a');
      expect(link.prop('href')).toEqual("/weather");
      expect(link.text()).toContain("Go Back");
    });

    it("should error page if no matching place", async () => {
      const res = await request(server).get("/weather/location?name=Other");
      expect(res.statusCode).toEqual(404);
      const $ = cheerio.load(res.text);

      const text = $.text();
      expect(text).toContain('The weather for Other is not available');

      const link = $('a');
      expect(link.prop('href')).toEqual("/weather");
      expect(link.text()).toContain("Go Back");
    });

    it("should redirect back to weather landing if no name provided", async () => {
      const res = await request(server).get("/weather/location?name=");
      expect(res.statusCode).toEqual(302);
      expect(res.headers.location).toEqual("/weather");
    });
  });
});