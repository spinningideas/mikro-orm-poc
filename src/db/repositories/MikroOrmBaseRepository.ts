import {
  AnyEntity,
  EntityData,
  EntityManager,
  EntityRepository,
  FilterQuery,
  FindOptions,
  MikroORM,
  QueryOrderMap,
  RequiredEntityData,
  UpsertOptions,
} from "@mikro-orm/core";

export class MikroOrmBaseRepository<
  T extends AnyEntity<T>
> extends EntityRepository<T> {
  constructor(private readonly orm: MikroORM, entity?: new () => T) {
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
  async createNew<Convert extends boolean = false>(
    data: EntityData<T>,
    options?: { convert?: Convert; partial: true; manual?: true }
  ): Promise<T> {
    const newEntity = super.create(data, options);
    await this.orm.em.persistAndFlush(newEntity);
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
        this.orm.em.assign(entity, entityOrData as T);
      }
      await this.orm.em.persistAndFlush(entity);
      return entity;
    } else {
      if (entityOrData) {
        this.orm.em.assign(existingEntity, entityOrData as T);
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

    this.orm.em.assign(existingEntity, entity as T);
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
