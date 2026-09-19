import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { configureDatabase } from "../src/app";
import Database from "../src/db/Database";
import MikroOrmBaseRepository from "../src/db/repositories/MikroOrmBaseRepository";
import Continent from "../src/db/models/Continent";
import Country from "../src/db/models/Country";

describe("Repository Search Tests", () => {
  let db: any;
  let continentRepo: MikroOrmBaseRepository<Continent>;
  let countryRepo: MikroOrmBaseRepository<Country>;

  beforeAll(async () => {
    await configureDatabase();
    db = await Database.init();
    continentRepo = new MikroOrmBaseRepository<Continent>(db, Continent);
    countryRepo = new MikroOrmBaseRepository<Country>(db, Country);
  });

  afterAll(async () => {
    await Database.close();
  });

  describe("Continent search", () => {
    it("searches continent by substring in continentName (case-insensitive)", async () => {
      const result = await continentRepo.search("continentName", "america");
      expect(result.total).toBe(2);
      expect(result.data.map((c) => c.continentName)).toEqual(
        expect.arrayContaining(["North America", "South America"])
      );
    });

    it("searches continent with sorting DESC", async () => {
      const result = await continentRepo.search(
        "continentName",
        "america",
        "continentName",
        "DESC"
      );
      expect(result.total).toBe(2);
      expect(result.data[0].continentName).toBe("South America");
      expect(result.data[1].continentName).toBe("North America");
    });

    it("searches continent by continentCode", async () => {
      const result = await continentRepo.search("continentCode", "EU");
      expect(result.total).toBe(1);
      expect(result.data[0].continentName).toBe("Europe");
    });

    it("returns empty array for non-matching term", async () => {
      const result = await continentRepo.search("continentName", "Atlantis");
      expect(result.total).toBe(0);
      expect(result.data).toEqual([]);
    });
  });

  describe("Country search", () => {
    it("searches countries by countryName substring", async () => {
      const result = await countryRepo.search("countryName", "United");
      expect(result.total).toBeGreaterThanOrEqual(1);
      const names = result.data.map((c) => c.countryName);
      expect(names).toContain("United States");
    });

    it("searches countries with pagination", async () => {
      const pageSize = 5;
      const resultPage1 = await countryRepo.search(
        "countryName",
        "a",
        "countryName",
        "ASC",
        pageSize,
        1
      );
      expect(resultPage1.total).toBeGreaterThan(pageSize);
      expect(resultPage1.data.length).toBe(pageSize);

      const resultPage2 = await countryRepo.search(
        "countryName",
        "a",
        "countryName",
        "ASC",
        pageSize,
        2
      );
      expect(resultPage2.data.length).toBe(pageSize);
      expect(resultPage1.data[0].countryName).not.toBe(
        resultPage2.data[0].countryName
      );
    });

    it("searches countries by capital city", async () => {
      const result = await countryRepo.search("capital", "Washington");
      expect(result.total).toBe(1);
      expect(result.data[0].countryName).toBe("United States");
      expect(result.data[0].countryCode).toBe("US");
    });

    it("searches countries by currencyCode", async () => {
      const result = await countryRepo.search("currencyCode", "EUR");
      expect(result.total).toBeGreaterThan(0);
      result.data.forEach((country) => {
        expect(country.currencyCode).toBe("EUR");
      });
    });
  });
});
