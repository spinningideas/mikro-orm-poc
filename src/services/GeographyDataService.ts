import Continent from "@/db/models/Continent";
import Country from "@/db/models/Country";
import type { IBaseRepository } from "@/db/repositories/IBaseRepository";
import type { IRepositoryProvider } from "@/db/repositories/providers/IRepositoryProvider";
import { getRepositoryProvider } from "@/db/repositories/providers/provider";
import { Pagination } from "@/types/Pagination";
import type ApiSearchRequest from "@/types/ApiSearchRequest";

/**
 * Service layer over the continent and country tables. Routes call this
 * service instead of constructing repositories directly, so persistence
 * details stay behind the repository seam and handlers only deal with
 * HTTP concerns (params, status codes, response shape).
 *
 * Repositories are resolved through IRepositoryProvider, lazily per call —
 * the provider binds the request-scoped EntityManager at resolution time,
 * and tests can swap the whole persistence layer via
 * setRepositoryProvider() regardless of when the service was constructed.
 */
export class GeographyDataService {
  constructor(private readonly provider?: IRepositoryProvider) {}

  private get db(): IRepositoryProvider {
    return this.provider ?? getRepositoryProvider();
  }

  private get continents(): IBaseRepository<Continent> {
    return this.db.repoFor(Continent);
  }

  private get countries(): IBaseRepository<Country> {
    return this.db.repoFor(Country);
  }

  /**
   * Returns all continents
   */
  async getContinents(): Promise<Continent[]> {
    return this.continents.findAll();
  }

  /**
   * Returns all countries on a continent identified by its continent code
   * (e.g. "NA"), or null when the continent code is unknown
   */
  async getCountriesByContinentCode(
    continentCode: string
  ): Promise<Country[] | null> {
    const continent = await this.continents.findOneWhere({ continentCode });
    if (!continent) {
      return null;
    }
    return this.countries.findWhere({ continent: { continentCode } });
  }

  /**
   * Returns a paged, sorted set of countries on a continent identified by
   * its continent code, or null when the continent code is unknown
   */
  async getCountriesByContinentCodePaged(
    continentCode: string,
    pageNumber: number = 1,
    pageSize: number = 10,
    orderBy?: keyof Country,
    orderDesc: boolean | string = "ASC"
  ): Promise<{ total: number; data: Country[]; pagination: Pagination } | null> {
    const continent = await this.continents.findOneWhere({ continentCode });
    if (!continent) {
      return null;
    }
    return this.countries.findWherePagedSorted(
      { continentId: continent.continentId },
      pageNumber,
      pageSize,
      orderBy,
      orderDesc
    );
  }

  /**
   * Searches countries by term/fields with pagination and sorting
   */
  async searchCountries(
    request: ApiSearchRequest
  ): Promise<{ total: number; data: Country[]; pagination: Pagination }> {
    const {
      searchTerm,
      searchField,
      pageNumber,
      pageSize,
      sortBy,
      sortByDirection,
    } = request;

    return this.countries.search(
      searchField?.length ? searchField : ["countryName"],
      searchTerm,
      sortBy ?? "countryName",
      sortByDirection ?? "ASC",
      pageSize ?? 10,
      pageNumber ?? 1
    );
  }

  /**
   * Returns a single country identified by its country code (e.g. "US"),
   * or null when no match exists
   */
  async getCountryByCode(countryCode: string): Promise<Country | null> {
    return this.countries.findOneWhere({ countryCode });
  }
}

export default GeographyDataService;
