import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { configureDatabase } from "../src/app";
import Database from "../src/db/Database";
import MikroOrmBaseRepository from "../src/db/repositories/MikroOrmBaseRepository";
import Continent from "../src/db/models/Continent";
import Country from "../src/db/models/Country";
import { Pagination } from "../src/types/Pagination";

describe("Pagination Tests", () => {
  describe("Pagination Class Unit Tests", () => {
    it("calculates page count and navigation flags correctly for first page", () => {
      const p = new Pagination(10, 1, 47);
      expect(p.pageSize).toBe(10);
      expect(p.pageNumber).toBe(1);
      expect(p.totalResults).toBe(47);
      expect(p.totalPages).toBe(5);
      expect(p.resultsExist).toBe(true);
      expect(p.hasPreviousPage).toBe(false);
      expect(p.hasNextPage).toBe(true);
    });

    it("calculates navigation flags correctly for middle page", () => {
      const p = new Pagination(10, 3, 47);
      expect(p.pageNumber).toBe(3);
      expect(p.hasPreviousPage).toBe(true);
      expect(p.hasNextPage).toBe(true);
    });

    it("calculates navigation flags correctly for last page", () => {
      const p = new Pagination(10, 5, 47);
      expect(p.pageNumber).toBe(5);
      expect(p.hasPreviousPage).toBe(true);
      expect(p.hasNextPage).toBe(false);
    });

    it("handles zero results", () => {
      const p = new Pagination(10, 1, 0);
      expect(p.totalResults).toBe(0);
      expect(p.totalPages).toBe(0);
      expect(p.resultsExist).toBe(false);
      expect(p.hasPreviousPage).toBe(false);
      expect(p.hasNextPage).toBe(false);
    });

    it("handles exact page multiple boundary", () => {
      const p = new Pagination(10, 2, 20);
      expect(p.totalPages).toBe(2);
      expect(p.hasPreviousPage).toBe(true);
      expect(p.hasNextPage).toBe(false);
    });

    it("handles single-item page size (pageSize = 1)", () => {
      const p1 = new Pagination(1, 1, 3);
      expect(p1.totalPages).toBe(3);
      expect(p1.hasNextPage).toBe(true);

      const p3 = new Pagination(1, 3, 3);
      expect(p3.hasNextPage).toBe(false);
    });
  });

  describe("Repository Pagination Integration Tests", () => {
    let db: any;
    let countryRepo: MikroOrmBaseRepository<Country>;
    let continentRepo: MikroOrmBaseRepository<Continent>;

    beforeAll(async () => {
      await configureDatabase();
      db = await Database.init();
      countryRepo = new MikroOrmBaseRepository<Country>(db, Country);
      continentRepo = new MikroOrmBaseRepository<Continent>(db, Continent);
    });

    afterAll(async () => {
      await Database.close();
    });

    it("findWherePagedSorted returns records and pagination object for first page", async () => {
      const pageSize = 5;
      const result = await countryRepo.findWherePagedSorted(
        {},
        1,
        pageSize,
        "countryName",
        "ASC"
      );

      expect(result.data.length).toBe(pageSize);
      expect(result.total).toBeGreaterThan(pageSize);
      expect(result.pagination).toBeInstanceOf(Pagination);
      expect(result.pagination.pageNumber).toBe(1);
      expect(result.pagination.pageSize).toBe(pageSize);
      expect(result.pagination.totalResults).toBe(result.total);
      expect(result.pagination.hasPreviousPage).toBe(false);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.resultsExist).toBe(true);
    });

    it("findWherePagedSorted correctly navigates to subsequent pages", async () => {
      const pageSize = 5;
      const page1 = await countryRepo.findWherePagedSorted(
        {},
        1,
        pageSize,
        "countryName",
        "ASC"
      );
      const page2 = await countryRepo.findWherePagedSorted(
        {},
        2,
        pageSize,
        "countryName",
        "ASC"
      );

      expect(page2.data.length).toBe(pageSize);
      expect(page2.pagination.pageNumber).toBe(2);
      expect(page2.pagination.hasPreviousPage).toBe(true);
      expect(page1.data[0].countryId).not.toBe(page2.data[0].countryId);
    });

    it("paginate method returns standard ApiResponse structure", async () => {
      const response = await countryRepo.paginate(
        {},
        1,
        10,
        "countryName",
        "ASC"
      );

      expect(response.success).toBe(true);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data!.length).toBe(10);
      expect(response.pagination).toBeDefined();
      expect(response.pagination!.totalResults).toBeGreaterThan(10);
      expect(response.pagination!.pageSize).toBe(10);
      expect(response.pagination!.pageNumber).toBe(1);
    });

    it("search method includes pagination metadata", async () => {
      const result = await countryRepo.search(
        "countryName",
        "a",
        "countryName",
        "ASC",
        5,
        1
      );

      expect(result.pagination).toBeDefined();
      expect(result.pagination.pageSize).toBe(5);
      expect(result.pagination.pageNumber).toBe(1);
      expect(result.pagination.totalResults).toBe(result.total);
      expect(result.pagination.totalPages).toBe(Math.ceil(result.total / 5));
    });

    it("handles filtering by continent with pagination", async () => {
      const naContinent = await continentRepo.findOneWhere({
        continentCode: "NA",
      });
      expect(naContinent).toBeDefined();

      const result = await countryRepo.findWherePagedSorted(
        { continentId: naContinent!.continentId },
        1,
        10,
        "countryName",
        "ASC"
      );

      expect(result.total).toBeGreaterThan(0);
      expect(result.data.length).toBeLessThanOrEqual(10);
      result.data.forEach((c) => {
        expect(c.continentId).toBe(naContinent!.continentId);
      });
      expect(result.pagination.totalResults).toBe(result.total);
    });
  });
});
