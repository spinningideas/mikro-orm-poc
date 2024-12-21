import {
  AnyEntity,
  EntityData,
  EntityRepository,
  FilterQuery,
  FindOptions,
  MikroORM,
  QueryOrderMap,
} from "@mikro-orm/core";

export class MikroOrmRepositoryBasic<
  T extends AnyEntity<T>
> extends EntityRepository<T> {
  constructor(private readonly orm: MikroORM, entity: new () => T) {
    super(orm.em, entity);
  }

  /**
   * Clear all records from the entity table
   */
  async clear(): Promise<void> {
    await this.nativeDelete({});
  }

  /**
   * Get all records in the table
   */
  async findAll(): Promise<T[]> {
    return this.findAll();
  }

  /**
   * Find records matching given criteria
   */
  async findWhere(criteria: FilterQuery<T>): Promise<T[]> {
    return this.find(criteria);
  }

  /**
   * Find records with pagination and sorting
   */
  async findWherePagedSorted(
    criteria: FilterQuery<T>,
    pageNumber: number,
    pageSize: number,
    orderBy: keyof T,
    orderDesc: boolean | string
  ): Promise<{ total: number; data: T[] }> {
    if (pageNumber <= 0) {
      pageNumber = 1;
    }

    const offset = (pageNumber - 1) * pageSize;
    const orderDirection =
      orderDesc === true ||
      orderDesc.toString().toLowerCase() === "true" ||
      orderDesc.toString().toLowerCase() === "desc"
        ? "DESC"
        : "ASC";

    const options: FindOptions<T> = {
      limit: pageSize,
      offset,
      orderBy: { [orderBy]: orderDirection } as QueryOrderMap<T>,
    };

    const [data, total] = await this.findAndCount(criteria, options);
    return { total, data };
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
  async create(entity: EntityData<T>): Promise<T> {
    const newEntity = this.create(entity);
    await this.orm.em.persistAndFlush(newEntity);
    return newEntity;
  }

  /**
   * Update or create a record based on criteria
   */
  async upsert(criteria: FilterQuery<T>, entity: EntityData<T>): Promise<T> {
    const existingEntity = await this.findOne(criteria);
    if (existingEntity) {
      return this.updateWhere(criteria, entity);
    } else {
      return this.create(entity);
    }
  }

  /**
   * Update records matching criteria
   */
  async updateWhere(
    criteria: FilterQuery<T>,
    entity: Partial<EntityData<T>>
  ): Promise<T> {
    const existingEntity = await this.findOne(criteria);
    if (!existingEntity) {
      throw new Error("Entity not found");
    }

    this.orm.em.assign(existingEntity, entity);
    await this.orm.em.flush();
    return existingEntity;
  }

  /**
   * Delete records matching criteria
   */
  async deleteWhere(criteria: FilterQuery<T>): Promise<number> {
    return this.nativeDelete(criteria);
  }
}
