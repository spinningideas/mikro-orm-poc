import { Pagination } from "@/types/Pagination";
import type ApiResponse from "@/types/ApiResponse";
import type { CriteriaShape } from "@/db/repositories/Criteria";

/**
 * Neutral payload type for creating entities — callers supply a partial
 * model; the adapter maps it to whatever the ORM requires.
 */
export type NewEntityData<M> = Partial<M>;

/**
 * Neutral options for findOneWhere.
 */
export interface FindOneOptions<M> {
  /** bypass the identity map and reload from the database */
  refresh?: boolean;
  /** relations to eagerly load */
  populate?: (keyof M | string)[];
}

/**
 * Neutral options for findWhere.
 */
export interface FindManyOptions<M> {
  orderBy?: keyof M | string;
  orderDesc?: boolean | string;
  limit?: number;
  offset?: number;
  /** relations to eagerly load */
  populate?: (keyof M | string)[];
}

/**
 * Neutral options for upsertWhere.
 */
export interface UpsertOptions<M> {
  /** fields that determine conflict/uniqueness for the upsert */
  fields?: (keyof M | string)[];
}

/**
 * @summary Port interface that encapsulates repositories for entities with
 * all basic persistence methods needed. Code should reference and implement
 * against this interface to abstract away the implementation specific
 * details (hexagonal architecture "port"). Concrete adapters such as
 * MikroOrmBaseRepository implement this contract, and consumers depend on
 * the interface so implementations can be swapped (e.g. fakes in tests).
 *
 * The port is ORM-neutral: criteria are expressed as CriteriaShape objects
 * (see Criteria.ts) and payload/option types are the neutral aliases above —
 * no @mikro-orm types appear in these signatures.
 */
export interface IBaseRepository<M> {
  /**
   * Clear all records from the entity table
   */
  clear(): Promise<void>;

  /**
   * Given a query object returns a single model (of type M) instance
   * including all its associations, or null when no match exists
   */
  findOneWhere(
    criteria: CriteriaShape<M>,
    options?: FindOneOptions<M>
  ): Promise<M | null>;

  /**
   * Given a query object returns a list of models (of type M) instances
   * including all its associations
   */
  findWhere(criteria: CriteriaShape<M>, options?: FindManyOptions<M>): Promise<M[]>;

  /**
   * Given a criteria returns paged set of items that match the criteria
   * with sorting and full Pagination metadata
   */
  findWherePagedSorted(
    criteria: CriteriaShape<M>,
    pageNumber?: number,
    pageSize?: number,
    orderBy?: keyof M | string,
    orderDesc?: boolean | string
  ): Promise<{ total: number; data: M[]; pagination: Pagination }>;

  /**
   * Paginate query returning ApiResponse structure
   */
  paginate(
    criteria: CriteriaShape<M>,
    pageNumber?: number,
    pageSize?: number,
    orderBy?: keyof M | string,
    orderDesc?: boolean | string
  ): Promise<ApiResponse<M[]>>;

  /**
   * Search records by a property value with pagination and sorting
   * @param parameterName The field name (or array of field names) to search on;
   *   multiple fields are matched with OR semantics
   * @param parameterValue The search term / substring
   * @param sortBy The field to sort by (optional)
   * @param order Sort order (DESC / ASC / true / false / 1 / -1) (optional)
   * @param pageSize Number of records per page (optional)
   * @param pageNumber 1-based page number (optional)
   */
  search(
    parameterName: keyof M | string | Array<keyof M | string>,
    parameterValue: string,
    sortBy?: keyof M | string,
    order?: number | string | boolean,
    pageSize?: number,
    pageNumber?: number
  ): Promise<{ total: number; data: M[]; pagination: Pagination }>;

  /**
   * Returns all records for the entity
   */
  findAll(): Promise<M[]>;

  /**
   * Returns the number of records matching the criteria
   */
  countWhere(criteria: CriteriaShape<M>): Promise<number>;

  /**
   * Persists a new instance given model data to database.
   * Returns the created instance.
   */
  createNew(data: NewEntityData<M>): Promise<M>;

  /**
   * "Upserts" given model to database. If a record matching the criteria
   * exists it is UPDATED, else a new record is CREATED.
   * Returns the upserted instance.
   */
  upsertWhere(
    criteria: CriteriaShape<M>,
    entityOrData?: M | NewEntityData<M>,
    options?: UpsertOptions<M>
  ): Promise<M>;

  /**
   * Persists updates for the record matching given criteria via a
   * tracked load-modify-flush update.
   * Returns the updated instance, or null when criteria matched nothing.
   */
  updateWhere(
    criteria: CriteriaShape<M>,
    entity: Partial<M>,
    options?: { partial?: boolean }
  ): Promise<M | null>;

  /**
   * Performs a single UPDATE statement for records matching the criteria
   * (no entity loading/tracking).
   * Returns the number of updated records.
   */
  nativeUpdateWhere(criteria: CriteriaShape<M>, patch: Partial<M>): Promise<number>;

  /**
   * Performs physical delete of given model in database.
   * Returns the number of deleted records.
   */
  deleteWhere(criteria: CriteriaShape<M>): Promise<number>;

  /**
   * Runs `work` inside a database transaction shared by every repository
   * call inside `work` (the adapter binds the transactional context to the
   * ambient request context).
   */
  transactional<R>(work: () => Promise<R>): Promise<R>;
}
