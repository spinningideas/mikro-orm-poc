import { Entity, Property, PrimaryKey, ManyToOne, Unique } from '@mikro-orm/core';
import { v4 } from 'uuid';
import { Continent } from './Continent';

@Entity({ tableName: 'countries' })
export class Country {
  @PrimaryKey()
  @Property({ fieldName: 'country_id' })
  countryId: string = v4();

  @Property({ fieldName: 'country_code', length: 2 })
  @Unique()
  countryCode!: string;

  @Property({ fieldName: 'country_code3', length: 3 })
  @Unique()
  countryCode3!: string;

  @Property({ fieldName: 'country_name', length: 100 })
  @Unique()
  countryName!: string;

  @Property({ fieldName: 'capital', length: 100 })
  capital: string;

  @Property({ fieldName: 'continent_id' })
  continentId!: string;

  @ManyToOne(() => Continent)
  continent!: Continent;

  @Property({ fieldName: 'area', type: 'integer' })
  area: number;

  @Property({ fieldName: 'population', type: 'integer' })
  population: number;

  @Property({ fieldName: 'latitude', type: 'decimal', scale: 6 })
  latitude: number;

  @Property({ fieldName: 'longitude', type: 'decimal', scale: 6 })
  longitude: number;

  @Property({ fieldName: 'currency_code', length: 3 })
  currencyCode: string;

  @Property({ fieldName: 'currency_name', length: 100 })
  currencyName: string;

  @Property({ fieldName: 'languages', length: 100 })
  languages: string;

  constructor(countryCode: string, countryCode3: string, countryName: string, continentId: string) {
    this.countryCode = countryCode;
    this.countryCode3 = countryCode3;
    this.countryName = countryName;
    this.continentId = continentId;
  }
}
