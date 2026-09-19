import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app, configureDatabase } from "../src/app";
import Database from "../src/db/Database";

describe("API Tests", () => {
  beforeAll(async () => {
    const initialized = await configureDatabase();
    expect(initialized).toBe(true);
  });

  afterAll(async () => {
    await Database.close();
  });

  it("GET /continents - returns list of continents", async () => {
    const response = await request(app).get("/continents");
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it("GET /countries/:continentCode - returns countries for a given continent", async () => {
    const response = await request(app).get("/countries/NA");
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it("GET /countries/:continentCode/:pageNumber/:pageSize/:orderBy/:orderDesc - returns sorted paged countries DESC", async () => {
    const response = await request(app).get(
      "/countries/NA/1/10/countryName/DESC"
    );
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("total");
    expect(response.body).toHaveProperty("data");
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it("GET /countries/:continentCode/:pageNumber/:pageSize/:orderBy/:orderDesc - returns sorted paged countries ASC", async () => {
    const response = await request(app).get(
      "/countries/NA/1/10/countryName/ASC"
    );
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("total");
    expect(response.body).toHaveProperty("data");
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});
