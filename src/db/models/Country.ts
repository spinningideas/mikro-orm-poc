import {
  Entity,
  Property,
  PrimaryKey,
  ManyToOne,
  Unique,
} from "@mikro-orm/decorators/legacy";
import { PrimaryKeyProp } from "@mikro-orm/core";
import { v4 } from "uuid";
import { Continent } from "@/db/models/Continent";

@Entity({ tableName: "countries", schema: "public" })
export class Country {
  [PrimaryKeyProp]?: 'countryId';

  @PrimaryKey()
  @Property({ fieldName: "country_id" })
  countryId: string = v4();

  @Property({ fieldName: "country_code", length: 2 })
  @Unique()
  countryCode!: string;

  @Property({ fieldName: "country_code3", length: 3 })
  @Unique()
  countryCode3!: string;

  @Property({ fieldName: "country_name", length: 100 })
  @Unique()
  countryName!: string;

  @Property({ fieldName: "capital", length: 100, nullable: true })
  capital?: string | null;

  @Property({ fieldName: "continent_id" })
  continentId!: string;

  @ManyToOne(() => Continent, { nullable: true })
  continent?: Continent;

  @Property({ fieldName: "area", type: "integer", nullable: true })
  area?: number | null;

  @Property({ fieldName: "population", type: "integer", nullable: true })
  population?: number | null;

  @Property({ fieldName: "latitude", type: "decimal", scale: 6, nullable: true })
  latitude?: number | null;

  @Property({ fieldName: "longitude", type: "decimal", scale: 6, nullable: true })
  longitude?: number | null;

  @Property({ fieldName: "currency_code", length: 3, nullable: true })
  currencyCode?: string | null;

  @Property({ fieldName: "currency_name", length: 100, nullable: true })
  currencyName?: string | null;

  @Property({ fieldName: "languages", length: 100, nullable: true })
  languages?: string | null;

  constructor(
    countryId: string,
    countryCode: string,
    countryCode3: string,
    countryName: string,
    continentId: string,
    capital?: string | null,
    area?: number | null,
    population?: number | null,
    latitude?: number | null,
    longitude?: number | null,
    currencyCode?: string | null,
    currencyName?: string | null,
    languages?: string | null
  ) {
    this.countryId = countryId;
    this.countryCode = countryCode;
    this.countryCode3 = countryCode3;
    this.countryName = countryName;
    this.continentId = continentId;
    this.capital = capital || null;
    this.area = area || null;
    this.population = population || null;
    this.latitude = latitude || null;
    this.longitude = longitude || null;
    this.currencyCode = currencyCode || null;
    this.currencyName = currencyName || null;
    this.languages = languages || null;
  }
}

export default Country;
