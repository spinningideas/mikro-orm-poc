import {
  AnyEntity,
  EntityData,
  EntityRepository,
  FilterQuery,
  QueryOrderMap,
} from "@mikro-orm/core";
import { Criteria } from "./Criteria";
import RepositoryResult from "./RepositoryResult";
import RepositoryResultPaged from "./RepositoryResultPaged";

const DEFAULT_PAGE_SIZE = 10;

export class BaseRepository<T extends AnyEntity<T>> extends EntityRepository<T> {
  /**
   * Find one entity matching the given criteria
   */
  async findOneWhere(criteria: Criteria): Promise<RepositoryResult<T>> {
    try {
      const result = await this.findOne(criteria as FilterQuery<T>);
      return new RepositoryResult<T>(true, result, undefined);
    } catch (error) {
      return new RepositoryResult<T>(
        false,
        undefined,
        error instanceof Error ? error : new Error("Unknown error")
      );
    }
  }

  /**
   * Find all entities matching the given criteria
   */
  async findWhere(criteria: Criteria): Promise<RepositoryResult<T[]>> {
    try {
      const result = await this.find(criteria as FilterQuery<T>);
      return {
        success: true,
        data: result,
        errors: undefined,
      };
    } catch (error) {
      return {
        success: false,
        data: undefined,
        errors: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Find entities with pagination and sorting
   */
  async findWherePaginated(
    criteria: Criteria,
    pageNumber: number,
    pageSize: number,
    orderBy: keyof T,
    orderDesc: boolean
  ): Promise<RepositoryResultPaged<T, unknown>> {
    try {
      const limit = pageSize || DEFAULT_PAGE_SIZE;
      const offset = pageNumber ? pageNumber * limit : 0;

      const orderDirection = orderDesc ? "DESC" : "ASC";
      const orderByMap: QueryOrderMap = {
        [orderBy]: orderDirection,
      };

      const [result, total] = await this.findAndCount(
        criteria as FilterQuery<T>,
        {
          limit,
          offset,
          orderBy: orderByMap,
        }
      );

      return {
        success: true,
        data: result,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: pageNumber,
        errors: undefined,
      };
    } catch (error) {
      return {
        success: false,
        data: undefined,
        totalItems: 0,
        totalPages: 0,
        currentPage: pageNumber,
        errors: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Find all entities
   */
  async findAll(): Promise<RepositoryResult<T[]>> {
    try {
      const result = await this.findAll();
      return {
        success: true,
        data: result,
        errors: undefined,
      };
    } catch (error) {
      return {
        success: false,
        data: undefined,
        errors: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Count entities matching criteria
   */
  async countWhere(criteria?: Criteria): Promise<number> {
    return this.count(criteria as FilterQuery<T>);
  }

  /**
   * Create a new entity
   */
  async create(entity: EntityData<T>): Promise<RepositoryResult<T>> {
    try {
      const newEntity = this.create(entity);
      await this.getEntityManager().persistAndFlush(newEntity);
      return {
        success: true,
        data: newEntity,
        errors: undefined,
      };
    } catch (error) {
      return {
        success: false,
        data: undefined,
        errors: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Create multiple entities
   */
  async createMany(entities: EntityData<T>[]): Promise<RepositoryResult<T[]>> {
    try {
      const newEntities = entities.map(entity => this.create(entity));
      await this.getEntityManager().persistAndFlush(newEntities);
      return {
        success: true,
        data: newEntities,
        errors: undefined,
      };
    } catch (error) {
      return {
        success: false,
        data: undefined,
        errors: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Update entity matching criteria
   */
  async updateWhere(
    criteria: Criteria,
    entity: Partial<EntityData<T>>
  ): Promise<RepositoryResult<T>> {
    try {
      const existingEntity = await this.findOne(criteria as FilterQuery<T>);
      if (!existingEntity) {
        throw new Error("Entity not found");
      }

      this.getEntityManager().assign(existingEntity, entity);
      await this.getEntityManager().flush();

      return {
        success: true,
        data: existingEntity,
        errors: undefined,
      };
    } catch (error) {
      return {
        success: false,
        data: undefined,
        errors: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Update or create entity
   */
  async upsertWhere(
    criteria: Criteria,
    entity: EntityData<T>
  ): Promise<RepositoryResult<T>> {
    try {
      const existingEntity = await this.findOne(criteria as FilterQuery<T>);
      if (existingEntity) {
        return this.updateWhere(criteria, entity);
      } else {
        return this.create(entity);
      }
    } catch (error) {
      return {
        success: false,
        data: undefined,
        errors: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Delete entity matching criteria
   */
  async deleteWhere(criteria: Criteria): Promise<boolean> {
    try {
      const result = await this.nativeDelete(criteria as FilterQuery<T>);
      return result > 0;
    } catch {
      return false;
    }
  }
}
