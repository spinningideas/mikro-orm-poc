import {
  EntityData,
  FilterQuery,
  RequiredEntityData,
  UpsertOptions,
} from "@mikro-orm/core";
import { Pagination } from "../../types/Pagination";
import type ApiResponse from "../../types/ApiResponse";

/**
 * @summary Port interface that encapsulates repositories for entities with
 * all basic persistence methods needed. Code should reference and implement
 * against this interface to abstract away the implementation specific
 * details (hexagonal architecture "port"). Concrete adapters such as
 * MikroOrmBaseRepository implement this contract, and consumers depend on
 * the interface so implementations can be swapped (e.g. fakes in tests).
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
  findOneWhere(criteria: FilterQuery<M>): Promise<M | null>;

  /**
   * Given a query object returns a list of models (of type M) instances
   * including all its associations
   */
  findWhere(criteria: FilterQuery<M>): Promise<M[]>;

  /**
   * Given a criteria returns paged set of items that match the criteria
   * with sorting and full Pagination metadata
   */
  findWherePagedSorted(
    criteria: FilterQuery<M>,
    pageNumber?: number,
    pageSize?: number,
    orderBy?: keyof M | string,
    orderDesc?: boolean | string
  ): Promise<{ total: number; data: M[]; pagination: Pagination }>;

  /**
   * Paginate query returning ApiResponse structure
   */
  paginate(
    criteria: FilterQuery<M>,
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
  countWhere(criteria: FilterQuery<M>): Promise<number>;

  /**
   * Persists a new instance given model data to database.
   * Returns the created instance.
   */
  createNew(data: RequiredEntityData<M>): Promise<M>;

  /**
   * "Upserts" given model to database. If a record matching the criteria
   * exists it is UPDATED, else a new record is CREATED.
   * Returns the upserted instance.
   */
  upsertWhere<Fields extends string = any>(
    criteria: FilterQuery<M>,
    entityOrData?: M | EntityData<M>,
    options?: UpsertOptions<M, Fields>
  ): Promise<M>;

  /**
   * Persists updates for given model to database.
   * Returns the results of each updated instance of the model.
   */
  updateWhere(
    criteria: FilterQuery<M>,
    entity: Partial<M>,
    options?: { partial?: boolean }
  ): Promise<M>;

  /**
   * Performs physical delete of given model in database.
   * Returns the number of deleted records.
   */
  deleteWhere(criteria: FilterQuery<M>): Promise<number>;
}
