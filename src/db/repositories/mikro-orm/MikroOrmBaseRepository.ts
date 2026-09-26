import {
  AnyEntity,
  EntityData,
  EntityManager,
  EntityName,
  EntityRepository,
  FilterQuery,
  FindOptions,
  MikroORM,
  QueryOrderMap,
  RequestContext,
  RequiredEntityData,
} from "@mikro-orm/core";
import { Pagination } from "@/types/Pagination";
import type ApiResponse from "@/types/ApiResponse";
import type {
  IBaseRepository,
  FindOneOptions,
  FindManyOptions,
  NewEntityData,
  UpsertOptions,
} from "@/db/repositories/IBaseRepository";
import type { CriteriaOperator, CriteriaShape } from "@/db/repositories/Criteria";

/** Operators the criteria DSL supports — validated in toFieldFilter. */
const SUPPORTED_OPERATORS: ReadonlySet<string> = new Set<CriteriaOperator>([
  "$eq",
  "$ne",
  "$in",
  "$nin",
  "$gt",
  "$gte",
  "$lt",
  "$lte",
  "$like",
  "$ilike",
]);

export class MikroOrmBaseRepository<T extends object>
  extends EntityRepository<T>
  implements IBaseRepository<T> {
  constructor(private readonly orm: MikroORM, entityName: EntityName<T>) {
    super(orm.em, entityName);
  }

  /**
   * Translates the port's ORM-neutral CriteriaShape into MikroORM's
   * FilterQuery. Scalars become $eq, arrays become $in, operator maps are
   * validated and passed through, plain objects recurse as nested relation
   * criteria, and $and/$or/$not combinators map recursively.
   */
  private toFilterQuery(criteria: CriteriaShape<T>): FilterQuery<T> {
    if (!criteria || typeof criteria !== "object") {
      return {} as FilterQuery<T>;
    }
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(
      criteria as Record<string, unknown>
    )) {
      if (key === "$and" || key === "$or") {
        out[key] = (value as CriteriaShape<T>[]).map((c) =>
          this.toFilterQuery(c)
        );
      } else if (key === "$not") {
        out[key] = this.toFilterQuery(value as CriteriaShape<T>);
      } else if (key.startsWith("$")) {
        throw new Error(`Unsupported criteria combinator: ${key}`);
      } else {
        out[key] = this.toFieldFilter(value);
      }
    }
    return out as FilterQuery<T>;
  }

  private toFieldFilter(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value;
    }
    if (Array.isArray(value)) {
      return { $in: value };
    }
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === "object") {
      // class instances (e.g. entity references) pass through as values
      if ((value as object).constructor !== Object) {
        return value;
      }
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length > 0 && entries.every(([k]) => k.startsWith("$"))) {
        for (const [op] of entries) {
          if (!SUPPORTED_OPERATORS.has(op)) {
            throw new Error(`Unsupported criteria operator: ${op}`);
          }
        }
        return value;
      }
      // nested relation criteria, e.g. { continent: { continentCode: "NA" } }
      return this.toFilterQuery(value as CriteriaShape<any>);
    }
    return value;
  }

  private toFindOptions(
    options?: FindManyOptions<T>
  ): Omit<FindOptions<T>, "using"> {
    if (!options) {
      return {};
    }
    const out: Omit<FindOptions<T>, "using"> = {};
    if (options.orderBy) {
      const isDesc =
        options.orderDesc === true ||
        (options.orderDesc ?? "").toString().toLowerCase() === "true" ||
        (options.orderDesc ?? "").toString().toLowerCase() === "desc";
      out.orderBy = {
        [options.orderBy]: isDesc ? "DESC" : "ASC",
      } as QueryOrderMap<T>;
    }
    if (options.limit !== undefined) {
      out.limit = options.limit;
    }
    if (options.offset !== undefined) {
      out.offset = options.offset;
    }
    if (options.populate) {
      out.populate = options.populate as any;
    }
    return out;
  }

  /**
   * Clear all records from the entity table
   */
  async clear(): Promise<void> {
    await this.nativeDelete({} as FilterQuery<T>);
  }

  /**
   * Find records matching given criteria
   */
  async findWhere(
    criteria: CriteriaShape<T>,
    options?: FindManyOptions<T>
  ): Promise<T[]> {
    return this.find(this.toFilterQuery(criteria), this.toFindOptions(options));
  }

  /**
   * Count records matching given criteria
   */
  async countWhere(criteria: CriteriaShape<T>): Promise<number> {
    return this.count(this.toFilterQuery(criteria));
  }

  /**
   * Find records with pagination and sorting, including Pagination object
   */
  async findWherePagedSorted(
    criteria: CriteriaShape<T>,
    pageNumber: number = 1,
    pageSize: number = 10,
    orderBy?: keyof T,
    orderDesc: boolean | string = "ASC"
  ): Promise<{ total: number; data: T[]; pagination: Pagination }> {
    if (pageNumber <= 0) {
      pageNumber = 1;
    }
    if (pageSize <= 0) {
      pageSize = 10;
    }

    const offset = (pageNumber - 1) * pageSize;
    const isDesc =
      orderDesc === true ||
      orderDesc.toString().toLowerCase() === "true" ||
      orderDesc.toString().toLowerCase() === "desc";
    const orderDirection = isDesc ? "DESC" : "ASC";

    // Omit "using" so findAndCount's Using generic defaults to never and
    // the where parameter resolves to plain FilterQuery<T>
    const options: Omit<FindOptions<T>, "using"> = {
      limit: pageSize,
      offset,
    };

    if (orderBy) {
      options.orderBy = { [orderBy]: orderDirection } as QueryOrderMap<T>;
    }

    const [data, total] = await this.findAndCount(
      this.toFilterQuery(criteria),
      options
    );
    const pagination = new Pagination(pageSize, pageNumber, total);
    return { total, data, pagination };
  }

  /**
   * Paginate query returning standard ApiResponse structure
   */
  async paginate(
    criteria: CriteriaShape<T>,
    pageNumber: number = 1,
    pageSize: number = 10,
    orderBy?: keyof T,
    orderDesc: boolean | string = "ASC"
  ): Promise<ApiResponse<T[]>> {
    const { data, pagination } = await this.findWherePagedSorted(
      criteria,
      pageNumber,
      pageSize,
      orderBy,
      orderDesc
    );
    return {
      success: true,
      status: 200,
      data,
      pagination,
    };
  }

  /**
   * Search records by a property value with pagination and sorting
   * @param parameterName The field name (or array of field names) to search on;
   *   multiple fields are matched with OR semantics
   * @param parameterValue The search term / substring
   * @param sortBy The field to sort by (optional)
   * @param order Sort order (DESC / ASC / true / false / 1 / -1) (optional, default ASC)
   * @param pageSize Number of records per page (optional, default 10)
   * @param pageNumber 1-based page number (optional, default 1)
   */
  async search(
    parameterName: keyof T | string | Array<keyof T | string>,
    parameterValue: string,
    sortBy?: keyof T | string,
    order: boolean | string | number = "ASC",
    pageSize: number = 10,
    pageNumber: number = 1
  ): Promise<{ total: number; data: T[]; pagination: Pagination }> {
    if (pageNumber <= 0) {
      pageNumber = 1;
    }
    if (pageSize <= 0) {
      pageSize = 10;
    }

    const offset = (pageNumber - 1) * pageSize;
    const isDesc =
      order === true ||
      order === -1 ||
      order === "desc" ||
      order === "DESC" ||
      order.toString().toLowerCase() === "true" ||
      order.toString().toLowerCase() === "desc";
    const orderDirection = isDesc ? "DESC" : "ASC";

    const fields = Array.isArray(parameterName)
      ? parameterName
      : [parameterName];
    const criteria = {
      $or: fields.map((field) => ({
        [field]: { $ilike: `%${parameterValue}%` },
      })),
    } as FilterQuery<T>;

    const options: Omit<FindOptions<T>, "using"> = {
      limit: pageSize,
      offset,
    };

    if (sortBy) {
      options.orderBy = { [sortBy]: orderDirection } as QueryOrderMap<T>;
    }

    const [data, total] = await this.findAndCount(criteria, options);
    const pagination = new Pagination(pageSize, pageNumber, total);
    return { total, data, pagination };
  }

  /**
   * Find one record matching criteria
   */
  async findOneWhere(
    criteria: CriteriaShape<T>,
    options?: FindOneOptions<T>
  ): Promise<T | null> {
    return this.findOne(this.toFilterQuery(criteria), {
      refresh: options?.refresh,
      populate: options?.populate as any,
    });
  }

  /**
   * Create a new record
   */
  async createNew(data: NewEntityData<T>): Promise<T> {
    const newEntity = super.create(data as unknown as RequiredEntityData<T>);
    await this.orm.em.persist(newEntity).flush();
    return newEntity;
  }

  /**
   * Update or create a record based on criteria
   */
  async upsertWhere(
    criteria: CriteriaShape<T>,
    entityOrData?: T | NewEntityData<T>,
    _options?: UpsertOptions<T>
  ): Promise<T> {
    if (!criteria) {
      throw new Error("criteria must be provided for upsert");
    }
    const existingEntity = await this.findOne(this.toFilterQuery(criteria));
    if (!existingEntity) {
      // Create a new instance of the entity having the required fields
      const entity = this.create({} as RequiredEntityData<T>);
      // Then assign the data to it
      if (entityOrData) {
        this.orm.em.assign(entity, entityOrData as any);
      }
      await this.orm.em.persist(entity).flush();
      return entity;
    } else {
      if (entityOrData) {
        this.orm.em.assign(existingEntity, entityOrData as any);
        await this.orm.em.flush();
      }
      return existingEntity;
    }
  }

  /**
   * Update the record matching criteria via a tracked load-modify-flush
   * update. Returns the updated entity, or null when criteria matched
   * nothing.
   */
  async updateWhere(
    criteria: CriteriaShape<T>,
    entity: Partial<T>,
    _options: { partial?: boolean } = { partial: true }
  ): Promise<T | null> {
    const existingEntity = await this.findOne(this.toFilterQuery(criteria));
    if (!existingEntity) {
      return null;
    }

    this.orm.em.assign(existingEntity, entity as any);
    await this.orm.em.flush();
    return existingEntity;
  }

  /**
   * Issue a single UPDATE for records matching criteria.
   * Returns the number of affected rows.
   */
  async nativeUpdateWhere(
    criteria: CriteriaShape<T>,
    patch: Partial<T>
  ): Promise<number> {
    return this.nativeUpdate(
      this.toFilterQuery(criteria),
      patch as EntityData<T>
    );
  }

  /**
   * Delete records matching criteria
   */
  async deleteWhere(criteria: CriteriaShape<T>): Promise<number> {
    return this.nativeDelete(this.toFilterQuery(criteria));
  }

  /**
   * Runs `work` inside a database transaction. The transactional EM is
   * bound into RequestContext so repository calls inside `work` share the
   * transaction.
   */
  async transactional<R>(work: () => Promise<R>): Promise<R> {
    return this.em.transactional((txEm) =>
      RequestContext.create(txEm, () => work())
    );
  }

  /**
   * Delete record for given entity
   */
  delete(entity: AnyEntity): EntityManager {
    return this.em.remove(entity);
  }
}

export default MikroOrmBaseRepository;
