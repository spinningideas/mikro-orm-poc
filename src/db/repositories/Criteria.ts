/**
 * ORM-neutral query criteria DSL used by IBaseRepository ("port" types).
 * Services express queries as plain CriteriaShape objects; each persistence
 * adapter (e.g. MikroOrmBaseRepository, a future Drizzle adapter, or an
 * in-memory fake) translates them into its own query representation.
 *
 * The `$op` naming is the DSL's own contract — it intentionally mirrors
 * common Mongo/MikroORM operator names so adapters map them mechanically,
 * but the supported set is defined here, not by any ORM.
 */

/**
 * Comparison operators supported by the criteria DSL.
 *   $eq/$ne   equality / inequality
 *   $in/$nin  membership in a value list
 *   $gt/$gte/$lt/$lte  range comparisons (numbers, dates)
 *   $like/$ilike       substring match, case-sensitive / case-insensitive
 */
export type CriteriaOperator =
  | "$eq"
  | "$ne"
  | "$in"
  | "$nin"
  | "$gt"
  | "$gte"
  | "$lt"
  | "$lte"
  | "$like"
  | "$ilike";

/**
 * Condition for a single field:
 *   - a scalar or null            → equality ($eq)
 *   - an array                    → membership ($in)
 *   - an operator map             → { $ilike: "%x%" }, { $gte: n }, ...
 *   - a nested CriteriaShape      → relation path, e.g. { user: { userId } }
 */
export type FieldCondition<M, K extends keyof M = keyof M> =
  | M[K]
  | M[K][]
  | null
  | { [O in CriteriaOperator]?: M[K] | M[K][] | string | null }
  | CriteriaShape<NonNullable<M[K]>>;

/**
 * Plain-object query criteria: field conditions are ANDed together;
 * $and/$or take arrays of CriteriaShape, $not negates a CriteriaShape.
 */
export type CriteriaShape<M> = {
  [K in keyof M]?: FieldCondition<M, K>;
} & {
  $and?: CriteriaShape<M>[];
  $or?: CriteriaShape<M>[];
  $not?: CriteriaShape<M>;
};

/**
 * One declarative field filter. The builder skips entries whose `value`
 * is empty (undefined, "", or an empty array) so optional filters can be
 * listed without conditional plumbing.
 */
export interface FieldCriterion<M, K extends keyof M = keyof M> {
  field: K;
  /** the raw filter input — used only to decide whether to include the entry */
  value: M[K] | "" | undefined;
  /** the condition applied to `field` when `value` is non-empty */
  condition: FieldCondition<M, K>;
}

/**
 * Fluent builder for CriteriaShape. Optional filters are listed
 * declaratively and auto-skipped when their value is empty:
 *
 * @example
 * const criteria = new Criteria<Employee>()
 *   .and(
 *     { field: "organizationId", value: orgId, condition: orgId },
 *     { field: "status", value: status, condition: status },
 *   )
 *   .or(
 *     { field: "email", value: term, condition: { $ilike: `%${term}%` } },
 *     { field: "firstName", value: term, condition: { $ilike: `%${term}%` } },
 *   )
 *   .getCriteria();
 * await repo.findWhere(criteria);
 */
export class Criteria<M extends object = Record<string, unknown>> {
  private condition: CriteriaShape<M> = {} as CriteriaShape<M>;

  constructor(...conditions: FieldCriterion<M>[]) {
    this.and(...conditions);
  }

  /** Adds field filters that are ANDed with the existing condition. */
  and(...conditions: FieldCriterion<M>[]): this {
    conditions.forEach((val) => {
      if (!this.isEmpty(val.value)) {
        (this.condition as Record<string, unknown>)[val.field as string] =
          val.condition;
      }
    });
    return this;
  }

  /**
   * Adds field filters ORed together. Entries with empty values are
   * skipped; if none survive, no $or clause is added.
   */
  or(...conditions: FieldCriterion<M>[]): this {
    const branches = conditions
      .filter((c) => !this.isEmpty(c.value))
      .map(
        (c) => ({ [c.field]: c.condition }) as CriteriaShape<M>
      );
    if (branches.length > 0) {
      this.condition.$or = [...(this.condition.$or ?? []), ...branches];
    }
    return this;
  }

  /** Adds a negated CriteriaShape ($not). */
  not(criteria: CriteriaShape<M>): this {
    this.condition.$not = criteria;
    return this;
  }

  getCriteria(): CriteriaShape<M> {
    return this.condition;
  }

  private isEmpty(value: unknown): boolean {
    if (Array.isArray(value)) {
      return value.length < 1;
    }
    return value === undefined || value === "";
  }
}
