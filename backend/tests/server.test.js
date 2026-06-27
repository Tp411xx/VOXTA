const request = require("supertest");
const assert = require("assert");
const app = require("../server");

describe("GET /api/ping", () => {
  it("responds with backend health", async function () {
    const res = await request(app)
      .get("/api/ping")
      .set("Accept", "application/json");

    assert.equal(res.status, 200);
    assert.equal(res.type, "application/json");
    assert.equal(res.body.message, "Backend OK !");
  });
});

describe("GET /404", () => {
  it("responds with a 404", async function () {
    const res = await request(app)
      .get("/404")
      .set("Accept", "application/json");

    assert.equal(res.status, 404);
  });
});
