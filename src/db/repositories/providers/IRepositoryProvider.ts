import type { IBaseRepository } from "@/db/repositories/IBaseRepository";

/**
 * Neutral entity reference — the entity class itself. Works for ORM
 * adapters (MikroORM EntityName) and for in-memory fakes alike.
 */
export type EntityRef<T extends object> = new (...args: any[]) => T;

/**
 * @summary Provider port ("composition root" contract): hands out
 * repositories per entity. Services resolve repositories through
 * getRepositoryProvider().repoFor(Entity) so the adapter (MikroORM,
 * Drizzle, in-memory fake) can be swapped in one place.
 */
export interface IRepositoryProvider {
  /**
   * Repository for the given entity. When the entity is registered in the
   * adapter's domain-repo registry (e.g. Country → CountryRepository), the
   * domain repository is returned — cast to the domain type when its
   * custom methods are needed.
   */
  repoFor<T extends object>(entity: EntityRef<T>): IBaseRepository<T>;

  /**
   * Raw SQL escape hatch for report/dataset-style queries that have no
   * entity mapping (e.g. datasetService). Adapters return driver rows;
   * fakes return canned results. Prefer repoFor for entity work.
   */
  queryRaw<R = unknown>(sql: string, params?: unknown[]): Promise<R[]>;

  /**
   * Runs `work` inside a database transaction shared by every repository
   * resolved inside `work` (adapters bind the transactional context to the
   * ambient request context).
   */
  transactional<R>(work: () => Promise<R>): Promise<R>;
}
