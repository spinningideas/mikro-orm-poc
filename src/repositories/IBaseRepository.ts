import { Criteria } from "repositories/Criteria";
import RepositoryResult from "repositories/RepositoryResult";
import RepositoryResultPaged from "repositories/RepositoryResultPaged";

/**
 * @summary Interface that encapsulates repositories for entities with
 * all basic persistence methods needed. Code should reference and implement against
 * this interface to abstract away the implementation specific details.
 * The use of "where" criteria allows for flexibility to query and get/set data
 * using needed critieria.
 */
export interface IBaseRepository<M> {
  /**
   * Given a query object returns a single model (of type M) instance including all its associations
   * @param criteria: {fields}
   * @returns {Promise<*|RepositoryResult}
   */
  findOneWhere(criteria: Criteria): RepositoryResult<M>;
  /**
   * Given a query object Returns a list of models (of type M) instances including all its associations
   * @param criteria: {fields}
   * @returns {Promise<*|RepositoryResult<M[]>}
   */
  findWhere(criteria: Criteria): RepositoryResult<M[]>;
  /**
   * Given a criteria returns paged set of items that match the criteria,
   * the total pages, the total items and the current page
   * If no order attribute is given it will use the database default
   * @param criteria
   * @param pageNumber
   * @param pageSize
   * @param orderBy
   * @param orderDesc
   * @returns {Promise<{totalItems: *, totalPages: number, rows: *, currentPage: number}>}
   */
  findWherePaginated(
    criteria: Criteria,
    pageNumber: number,
    pageSize: number,
    orderBy: string,
    orderDesc: boolean
  ): Promise<RepositoryResultPaged<M, unknown>>;

  findAll(): RepositoryResult<M[]>;
  countWhere(criteria: Criteria): RepositoryResult<number>;
  // search(
  //   parameterName: string,
  //   parameterValue: string,
  //   sortBy: string,
  //   order: number,
  //   pageSize: number,
  //   pageNumber: number
  // ): RepositoryResult<M[]>;
  /**
   * Persists a new instance given model to database.
   * Returns the created instance of the model in the response "data".
   * @param model
   * @returns {RepositoryResult<M>}
   */
  create(model: M): RepositoryResult<M>;
  /**
   * Persists collection of given model to database.
   * Returns the results of each created instance of the model.
   * @param model
   * @returns {RepositoryResult<M>}
   */
  createMany(models: M[]): RepositoryResult<M[]>;
  /**
   * Persists updates for given model to database.
   * Returns the results of each updated instance of the model.
   * @param criteria
   * @param model
   * @returns {RepositoryResult<M>}
   */
  updateWhere(criteria: Criteria, model: M): RepositoryResult<M>;
  /**
   * "Upserts" given model to database. If no model identifier provided then a
   * new record is CREATED else the model that matches the criteria is UPDATED.
   * Returns the results of each updated instance of the model.
   * @param criteria
   * @param model
   * @returns {RepositoryResult<M>}
   */
  upsertWhere(criteria: Criteria, model: M): RepositoryResult<M>;
  /**
   * Performs physical delete of given model in database.
   * Returns the results of the operation performed against the instance of the model.
   * @param criteria
   * @returns {RepositoryResult<M>}
   */
  deleteWhere(criteria: Criteria): RepositoryResult<M>;
  /**
   * Performs logical or "soft" delete of given model in database.
   * Returns the results of the operation performed against the instance of the model.
   * @param criteria
   * @returns {RepositoryResult<M>}
   */
  deleteLogicalWhere(criteria: Criteria): RepositoryResult<M>;
}
