import { randomUUID } from "node:crypto";
import Pagination from "@/types/Pagination";
import type ApiResponse from "@/types/ApiResponse";
import type {
  FindManyOptions,
  FindOneOptions,
  IBaseRepository,
  NewEntityData,
  UpsertOptions,
} from "@/db/repositories/IBaseRepository";
import type { CriteriaShape } from "@/db/repositories/Criteria";
import type {
  EntityRef,
  IRepositoryProvider,
} from "@/db/repositories/providers/IRepositoryProvider";

const isOperatorMap = (v: unknown): v is Record<string, unknown> =>
  !!v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  !(v instanceof Date) &&
  Object.keys(v as Record<string, unknown>).every((k) => k.startsWith("$"));

const likeMatch = (
  pattern: string,
  value: string,
  insensitive: boolean
): boolean => {
  const rx = new RegExp(
    "^" +
      pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*") +
      "$",
    insensitive ? "i" : ""
  );
  return rx.test(value);
};

const fieldMatch = (value: unknown, condition: unknown): boolean => {
  if (Array.isArray(condition)) {
    // array shorthand = $in
    return condition.includes(value);
  }
  if (condition instanceof Date) {
    return +new Date(value as any) === +condition;
  }
  if (isOperatorMap(condition)) {
    return Object.entries(condition as Record<string, any>).every(([op, arg]) => {
      const v = value as any;
      switch (op) {
        case "$eq":
          return v === arg;
        case "$ne":
          return v !== arg;
        case "$in":
          return Array.isArray(arg) && arg.includes(v);
        case "$nin":
          return !Array.isArray(arg) || !arg.includes(v);
        case "$gt":
          return v > arg;
        case "$gte":
          return v >= arg;
        case "$lt":
          return v < arg;
        case "$lte":
          return v <= arg;
        case "$like":
          return likeMatch(String(arg), String(v), false);
        case "$ilike":
          return likeMatch(String(arg), String(v), true);
        default:
          throw new Error(`Unsupported criteria operator: ${op}`);
      }
    });
  }
  if (condition && typeof condition === "object") {
    // nested relation criteria — match against the related row's fields
    return (
      value != null &&
      typeof value === "object" &&
      matchesRow(
        value as Record<string, unknown>,
        condition as Record<string, unknown>
      )
    );
  }
  return value === condition;
};

const matchesRow = (
  row: Record<string, unknown>,
  shape: Record<string, unknown>
): boolean =>
  Object.entries(shape).every(([key, cond]) => {
    if (cond === undefined) {
      return true;
    }
    if (key === "$and") {
      return (cond as Record<string, unknown>[]).every((c) =>
        matchesRow(row, c)
      );
    }
    if (key === "$or") {
      return (cond as Record<string, unknown>[]).some((c) =>
        matchesRow(row, c)
      );
    }
    if (key === "$not") {
      return !matchesRow(row, cond as Record<string, unknown>);
    }
    return fieldMatch(row[key], cond);
  });

/**
 * Mirrors ORM behavior where a FK column (e.g. `user_id`, read as `userId`)
 * is owned by a relation prop (`user`): when a row carries a relation
 * object with a PK, derive `{prop}Id` so criteria on the FK field match.
 */
const flattenRelations = (
  row: Record<string, unknown>
): Record<string, unknown> => {
  const out = { ...row };
  for (const [k, v] of Object.entries(row)) {
    if (v && typeof v === "object" && !(v instanceof Date) && !Array.isArray(v)) {
      const pk = Object.keys(v as Record<string, unknown>).find(
        (key) => key === "id" || key.endsWith("Id")
      );
      if (pk && out[`${k}Id`] === undefined) {
        out[`${k}Id`] = (v as Record<string, unknown>)[pk];
      }
    }
  }
  return out;
};

const buildPagination = (
  pageSize: number,
  pageNumber: number,
  total: number
): Pagination => {
  const totalPages = Math.ceil(total / pageSize);
  return {
    pageSize,
    pageNumber,
    totalResults: total,
    totalPages,
    resultsExist: total > 0,
    hasPreviousPage: pageNumber > 1,
    hasNextPage: totalPages > pageNumber,
  };
};

/**
 * In-memory fake implementing IBaseRepository. Interprets the same
 * CriteriaShape DSL as the Mikro adapter, so fake-backed tests exercise the
 * real contract. `fields`/`populate` are ignored (fakes return full rows —
 * deliberate, per migration plan Q6); `queryRaw` serves canned results
 * stubbed via the provider.
 */
export class InMemoryRepository<T extends object>
  implements IBaseRepository<T> {
  constructor(
    private readonly entity: EntityRef<T>,
    private readonly store: Map<EntityRef<any>, any[]>
  ) {}

  private rows(): T[] {
    let rows = this.store.get(this.entity);
    if (!rows) {
      rows = [];
      this.store.set(this.entity, rows);
    }
    return rows as T[];
  }

  /** PK name per DataModel convention `{entity}Id`, falling back to `id`. */
  private pkName(): string {
    const row = this.rows()[0] as Record<string, unknown> | undefined;
    const key = row && Object.keys(row).find((k) => k === "id" || k.endsWith("Id"));
    if (key) {
      return key;
    }
    const name = this.entity.name;
    return `${name.charAt(0).toLowerCase()}${name.slice(1)}Id`;
  }

  private sortRows(rows: T[], orderBy?: keyof T | string, desc?: boolean): T[] {
    if (!orderBy) {
      return rows;
    }
    const dir = desc ? -1 : 1;
    return [...rows].sort((a: any, b: any) => {
      const av = a[orderBy];
      const bv = b[orderBy];
      if (av === bv) {
        return 0;
      }
      return (av > bv ? 1 : -1) * dir;
    });
  }

  private static isDesc(order?: boolean | string | number): boolean {
    if (order === undefined) {
      return false;
    }
    if (typeof order === "boolean") {
      return order;
    }
    if (typeof order === "number") {
      return order === -1;
    }
    const o = order.toLowerCase();
    return o === "desc" || o === "true" || o === "-1";
  }

  async clear(): Promise<void> {
    this.store.set(this.entity, []);
  }

  async findOneWhere(
    criteria: CriteriaShape<T>,
    _options?: FindOneOptions<T>
  ): Promise<T | null> {
    return (
      this.rows().find((r) =>
        matchesRow(r as Record<string, unknown>, criteria as Record<string, unknown>)
      ) ?? null
    );
  }

  async findWhere(
    criteria: CriteriaShape<T>,
    options?: FindManyOptions<T>
  ): Promise<T[]> {
    let rows = this.rows().filter((r) =>
      matchesRow(r as Record<string, unknown>, criteria as Record<string, unknown>)
    );
    rows = this.sortRows(rows, options?.orderBy, InMemoryRepository.isDesc(options?.orderDesc));
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? rows.length;
    return rows.slice(offset, offset + limit);
  }

  async findWherePagedSorted(
    criteria: CriteriaShape<T>,
    pageNumber: number = 1,
    pageSize: number = 10,
    orderBy?: keyof T | string,
    orderDesc: boolean | string = "ASC"
  ): Promise<{ total: number; data: T[]; pagination: Pagination }> {
    if (pageNumber <= 0) {
      pageNumber = 1;
    }
    if (pageSize <= 0) {
      pageSize = 10;
    }
    const all = this.sortRows(
      this.rows().filter((r) =>
        matchesRow(r as Record<string, unknown>, criteria as Record<string, unknown>)
      ),
      orderBy,
      InMemoryRepository.isDesc(orderDesc)
    );
    const offset = (pageNumber - 1) * pageSize;
    return {
      total: all.length,
      data: all.slice(offset, offset + pageSize),
      pagination: buildPagination(pageSize, pageNumber, all.length),
    };
  }

  async paginate(
    criteria: CriteriaShape<T>,
    pageNumber: number = 1,
    pageSize: number = 10,
    orderBy?: keyof T | string,
    orderDesc: boolean | string = "ASC"
  ): Promise<ApiResponse<T[]>> {
    const { data, pagination } = await this.findWherePagedSorted(
      criteria,
      pageNumber,
      pageSize,
      orderBy,
      orderDesc
    );
    return { success: true, status: 200, data, pagination };
  }

  async search(
    parameterName: keyof T | string | Array<keyof T | string>,
    parameterValue: string,
    sortBy?: keyof T | string,
    order: number | string | boolean = "ASC",
    pageSize: number = 10,
    pageNumber: number = 1
  ): Promise<{ total: number; data: T[]; pagination: Pagination }> {
    const fields = Array.isArray(parameterName) ? parameterName : [parameterName];
    const criteria = {
      $or: fields.map((field) => ({
        [field]: { $ilike: `%${parameterValue}%` },
      })),
    } as CriteriaShape<T>;
    return this.findWherePagedSorted(
      criteria,
      pageNumber,
      pageSize,
      sortBy,
      InMemoryRepository.isDesc(order) ? "DESC" : "ASC"
    );
  }

  async findAll(): Promise<T[]> {
    return [...this.rows()];
  }

  async countWhere(criteria: CriteriaShape<T>): Promise<number> {
    return this.rows().filter((r) =>
      matchesRow(r as Record<string, unknown>, criteria as Record<string, unknown>)
    ).length;
  }

  async createNew(data: NewEntityData<T>): Promise<T> {
    const row = flattenRelations(data as Record<string, unknown>) as T;
    const pk = this.pkName();
    if ((row as Record<string, unknown>)[pk] === undefined) {
      (row as Record<string, unknown>)[pk] = randomUUID();
    }
    this.rows().push(row);
    return row;
  }

  async upsertWhere(
    criteria: CriteriaShape<T>,
    entityOrData?: Partial<T>,
    _options?: UpsertOptions<T>
  ): Promise<T> {
    const existing = await this.findOneWhere(criteria);
    if (!existing) {
      return this.createNew({
        ...(criteria as Record<string, unknown>),
        ...(entityOrData as Record<string, unknown>),
      } as NewEntityData<T>);
    }
    if (entityOrData) {
      Object.assign(
        existing,
        flattenRelations(entityOrData as Record<string, unknown>)
      );
    }
    return existing;
  }

  async updateWhere(
    criteria: CriteriaShape<T>,
    entity: Partial<T>,
    _options?: { partial?: boolean }
  ): Promise<T | null> {
    const existing = await this.findOneWhere(criteria);
    if (!existing) {
      return null;
    }
    Object.assign(existing, flattenRelations(entity as Record<string, unknown>));
    return existing;
  }

  async nativeUpdateWhere(
    criteria: CriteriaShape<T>,
    patch: Partial<T>
  ): Promise<number> {
    let count = 0;
    for (const row of this.rows()) {
      if (matchesRow(row as Record<string, unknown>, criteria as Record<string, unknown>)) {
        Object.assign(row, flattenRelations(patch as Record<string, unknown>));
        count++;
      }
    }
    return count;
  }

  async save(entity: T): Promise<T> {
    const rows = this.rows();
    const pk = this.pkName();
    const id = (entity as Record<string, unknown>)[pk];
    const idx = rows.findIndex(
      (r) => r === entity || ((r as any)[pk] !== undefined && (r as any)[pk] === id)
    );
    if (idx >= 0) {
      rows[idx] = entity;
    } else {
      rows.push(entity);
    }
    return entity;
  }

  async saveAll(entities: T[]): Promise<T[]> {
    for (const e of entities) {
      await this.save(e);
    }
    return entities;
  }

  reference(id: string): T {
    return { [this.pkName()]: id } as T;
  }

  async deleteWhere(criteria: CriteriaShape<T>): Promise<number> {
    const rows = this.rows();
    const remaining = rows.filter(
      (r) =>
        !matchesRow(r as Record<string, unknown>, criteria as Record<string, unknown>)
    );
    this.store.set(this.entity, remaining);
    return rows.length - remaining.length;
  }

  /** No real transaction — fakes just run the work. */
  async transactional<R>(work: () => Promise<R>): Promise<R> {
    return work();
  }
}

/**
 * In-memory adapter for IRepositoryProvider. Shares one store across repos
 * resolved from the same provider instance — create a fresh provider per
 * test to isolate state.
 */
export class InMemoryRepositoryProvider implements IRepositoryProvider {
  private readonly store = new Map<EntityRef<any>, any[]>();
  private readonly rawStubs = new Map<string, unknown[]>();

  repoFor<T extends object>(entity: EntityRef<T>): IBaseRepository<T> {
    return new InMemoryRepository<T>(entity, this.store);
  }

  /**
   * Serves canned results keyed by exact SQL string — stub via
   * stubRaw(sql, rows) in tests.
   */
  async queryRaw<R = unknown>(sql: string, _params?: unknown[]): Promise<R[]> {
    return (this.rawStubs.get(sql) ?? []) as R[];
  }

  /** Test hook: seed the canned result for an exact SQL string. */
  stubRaw(sql: string, rows: unknown[]): void {
    this.rawStubs.set(sql, rows);
  }

  async transactional<R>(work: () => Promise<R>): Promise<R> {
    return work();
  }
}

export default InMemoryRepositoryProvider;
