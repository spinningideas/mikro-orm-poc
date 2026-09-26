import { MikroORM } from "@mikro-orm/core";
import Country from "@/db/models/Country";
import MikroOrmBaseRepository from "@/db/repositories/mikro-orm/MikroOrmBaseRepository";

/**
 * Repository for the countries table. Extends the base repository with
 * query methods that are specific to the country data set and are not
 * part of IBaseRepository.
 */
export class CountryRepository extends MikroOrmBaseRepository<Country> {
  constructor(orm: MikroORM) {
    super(orm, Country);
  }

  /**
   * Find all countries on a continent by its continent code (e.g. "NA").
   * Filters through the continent relation so no separate continent
   * lookup is required.
   */
  async findByContinentCode(continentCode: string): Promise<Country[]> {
    return this.find({ continent: { continentCode } });
  }

  /**
   * Find all countries that use a given currency code (e.g. "EUR")
   */
  async findByCurrencyCode(currencyCode: string): Promise<Country[]> {
    return this.find({ currencyCode });
  }

  /**
   * Find countries with a population of at least minPopulation,
   * sorted by population (DESC by default)
   */
  async findByMinPopulation(
    minPopulation: number,
    order: "ASC" | "DESC" = "DESC"
  ): Promise<Country[]> {
    return this.find(
      { population: { $gte: minPopulation } },
      { orderBy: { population: order } }
    );
  }
}

export default CountryRepository;
