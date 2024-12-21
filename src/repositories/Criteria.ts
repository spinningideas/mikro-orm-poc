/**
 * @classdesc Criteria class used to build complex queries that equates
 * to standard "where" clause.
 * Must be instantiated as an object the following general structure:
 * { field: string, value: any, condition: { [Op.*]: * }
 * Op stands for sequelize operator symbol
 * @example
 * const criteria = new Criteria([{ field: 'some_id', value: 1234, condition: { [Op.eq]: 1234 }])
 * criteria.getCriteria() // -> { some_id: { [Op.eq] : 1234 } }
 * await myRepository.findAllWhere(criteria) // -> [{ some_id: 1234 }]
 */
export class Criteria {
  private condition: any;

  constructor(...conditions: any) {
    const condition = {} as any;
    Object.values(conditions).forEach((val: any) => {
      if (!this.isEmpty(val.value)) {
        condition[val.field] = val.condition;
      }
    });
    this.condition = condition;
  }

  getCriteria() {
    return this.condition;
  }

  /**
   * @private
   * @param value
   * @returns {boolean}
   */
  isEmpty(value: any) {
    if (Array.isArray(value)) {
      return value.length < 1;
    }
    return value === undefined || value === "";
  }
}
