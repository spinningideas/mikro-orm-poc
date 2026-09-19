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
  RequiredEntityData,
  UpsertOptions,
} from "@mikro-orm/core";
import { Pagination } from "../../types/Pagination";
import type ApiResponsePaged from "../../types/ApiResponsePaged";

export class MikroOrmBaseRepository<
  T extends object
> extends EntityRepository<T> {
  constructor(private readonly orm: MikroORM, entityName: EntityName<T>) {
    super(orm.em, entityName);
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
  async findWhere(criteria: FilterQuery<T>): Promise<T[]> {
    return this.find(criteria);
  }

  /**
   * Find records with pagination and sorting, including Pagination object
   */
  async findWherePagedSorted(
    criteria: FilterQuery<T>,
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

    const options: FindOptions<T> = {
      limit: pageSize,
      offset,
    };

    if (orderBy) {
      options.orderBy = { [orderBy]: orderDirection } as QueryOrderMap<T>;
    }

    const [data, total] = await this.findAndCount(criteria, options);
    const pagination = new Pagination(pageSize, pageNumber, total);
    return { total, data, pagination };
  }

  /**
   * Paginate query returning standard ApiResponsePaged structure
   */
  async paginate(
    criteria: FilterQuery<T>,
    pageNumber: number = 1,
    pageSize: number = 10,
    orderBy?: keyof T,
    orderDesc: boolean | string = "ASC"
  ): Promise<ApiResponsePaged<T[]>> {
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
   * @param parameterName The field name to search on
   * @param parameterValue The search term / substring
   * @param sortBy The field to sort by (optional)
   * @param order Sort order (DESC / ASC / true / false / 1 / -1) (optional, default ASC)
   * @param pageSize Number of records per page (optional, default 10)
   * @param pageNumber 1-based page number (optional, default 1)
   */
  async search(
    parameterName: keyof T | string,
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

    const criteria = {
      [parameterName]: { $ilike: `%${parameterValue}%` },
    } as FilterQuery<T>;

    const options: FindOptions<T> = {
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
  async findOneWhere(criteria: FilterQuery<T>): Promise<T | null> {
    return this.findOne(criteria);
  }

  /**
   * Create a new record
   */
  async createNew(data: RequiredEntityData<T>): Promise<T> {
    const newEntity = super.create(data);
    await this.orm.em.persist(newEntity).flush();
    return newEntity;
  }

  /**
   * Update or create a record based on criteria
   */
  async upsertWhere<Fields extends string = any>(
    criteria: FilterQuery<T>,
    entityOrData?: T | EntityData<T>,
    options?: UpsertOptions<T, Fields>
  ): Promise<T> {
    if (!criteria) {
      throw new Error("criteria must be provided for upsert");
    }
    const existingEntity = await this.findOne(criteria);
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
   * Update records matching criteria
   */
  async updateWhere(
    criteria: FilterQuery<T>,
    entity: Partial<T>,
    options: { partial?: boolean } = { partial: true }
  ): Promise<T> {
    const existingEntity = await this.findOne(criteria);
    if (!existingEntity) {
      throw new Error("Entity not found");
    }

    this.orm.em.assign(existingEntity, entity as any);
    await this.orm.em.flush();
    return existingEntity;
  }

  /**
   * Delete records matching criteria
   */
  async deleteWhere(criteria: FilterQuery<T>): Promise<number> {
    return this.nativeDelete(criteria);
  }

  /**
   * Delete record for given entity
   */
  delete(entity: AnyEntity): EntityManager {
    return this.em.remove(entity);
  }
}

export default MikroOrmBaseRepository;
