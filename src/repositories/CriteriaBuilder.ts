import { Criteria } from "repositories/Criteria";

/**
 * @classdesc Enables building Criteria Objects to use within
 * a given Repository method to get or set data.
 * @example
 * const builder = new CriteriaBuilder()
 * const criteria = builder.add('some_id', someId, { [Op.eq]: someId })
 * .add('created_date', fromDate, { [Op.eq]: SOMEVALIDDATE })
 * .add('status', 'FAILURE', { [Op.ne]: 'FAILURE' })
 * .add('some_other_id', null, { [Op.ne]: null })
 * .build()
 * criteria.getCriteria() // { some_id:  { [Op.eq]: 1234 }, created_date: { [Op.eq]: 10/10/2021 } ...}
 */
export class CriteriaBuilder {
  private conditions: any[];

  constructor() {
    this.conditions = [];
  }

  /**
   * @param field: string
   * @param value: any
   * @param condition: { [Op.*]: any }
   * @returns {CriteriaBuilder}
   */
  add(field: string, value: any, condition: any) {
    this.conditions.push({ field, value, condition });
    return this;
  }

  /**
   * @returns {Criteria}
   */
  build() {
    return new Criteria(...this.conditions);
  }

  clean() {
    this.conditions = [];
  }
}
