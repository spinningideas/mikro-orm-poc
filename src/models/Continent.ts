import { Entity, Property, PrimaryKey, Unique } from '@mikro-orm/core';
import { v4 } from 'uuid';

@Entity({ tableName: 'continents' })
export class Continent {
  @PrimaryKey()
  @Property({ fieldName: 'continent_id' })
  continentId: string = v4();

  @Property({ fieldName: 'continent_code', length: 2 })
  @Unique()
  continentCode!: string;

  @Property({ fieldName: 'continent_name', length: 50 })
  continentName!: string;

  constructor(continentCode: string, continentName: string) {
    this.continentCode = continentCode;
    this.continentName = continentName;
  }
}

export default Continent;
