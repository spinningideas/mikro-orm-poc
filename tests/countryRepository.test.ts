import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { configureDatabase } from "../src/app";
import Database from "../src/db/Database";
import CountryRepository from "../src/db/repositories/CountryRepository";
import MikroOrmBaseRepository from "../src/db/repositories/MikroOrmBaseRepository";
import Continent from "../src/db/models/Continent";

describe("CountryRepository Tests", () => {
  let db: any;
  let countryRepo: CountryRepository;
  let continentRepo: MikroOrmBaseRepository<Continent>;

  beforeAll(async () => {
    await configureDatabase();
    db = await Database.init();
    countryRepo = new CountryRepository(db);
    continentRepo = new MikroOrmBaseRepository<Continent>(db, Continent);
  });

  afterAll(async () => {
    await Database.close();
  });

  it("findByContinentCode returns only countries on that continent", async () => {
    const naContinent = await continentRepo.findOneWhere({
      continentCode: "NA",
    });
    expect(naContinent).toBeDefined();

    const results = await countryRepo.findByContinentCode("NA");
    expect(results.length).toBeGreaterThan(0);
    results.forEach((c) => {
      expect(c.continentId).toBe(naContinent!.continentId);
    });
    expect(results.map((c) => c.countryName)).toContain("United States");
  });

  it("findByContinentCode returns empty array for unknown continent", async () => {
    const results = await countryRepo.findByContinentCode("XX");
    expect(results).toEqual([]);
  });

  it("findByCurrencyCode returns only countries using that currency", async () => {
    const results = await countryRepo.findByCurrencyCode("EUR");
    expect(results.length).toBeGreaterThan(0);
    results.forEach((c) => {
      expect(c.currencyCode).toBe("EUR");
    });
  });

  it("findByMinPopulation returns countries sorted by population DESC", async () => {
    const minPopulation = 100_000_000;
    const results = await countryRepo.findByMinPopulation(minPopulation);
    expect(results.length).toBeGreaterThan(0);
    results.forEach((c) => {
      expect(c.population).toBeGreaterThanOrEqual(minPopulation);
    });
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].population!).toBeGreaterThanOrEqual(
        results[i].population!
      );
    }
  });

  it("still exposes base repository methods", async () => {
    const us = await countryRepo.findOneWhere({ countryCode: "US" });
    expect(us).toBeDefined();
    expect(us!.countryName).toBe("United States");
  });
});
