import { DataTypes } from "sequelize";
import type { Migration } from "../runMigrations";

export const up: Migration = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().createTable("countries", {
    countryId: {
      field: "country_id",
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUID,
      type: DataTypes.UUID,
    },
    countryName: {
      field: "country_name",
      type: DataTypes.STRING(100),
      unique: true,
    },
    countryCode: {
      field: "country_code",
      type: DataTypes.STRING(2),
    },
    countryCode3: {
      field: "country_code3",
      type: DataTypes.STRING(3),
    },
    capital: {
      field: "capital",
      type: DataTypes.STRING(100),
    },
    continentId: {
      field: "continent_id",
      type: DataTypes.UUID,
      references: {
        model: {
          tableName: "continents",
        },
        key: "continent_id",
      },
      allowNull: false,
    },
    area: {
      field: "area",
      type: DataTypes.INTEGER,
    },
    population: {
      field: "population",
      type: DataTypes.INTEGER,
    },
    latitude: {
      field: "latitude",
      type: DataTypes.DECIMAL(10, 6),
    },
    longitude: {
      field: "longitude",
      type: DataTypes.DECIMAL(10, 6),
    },
    currencyCode: {
      field: "currency_code",
      type: DataTypes.STRING(3),
    },
    currencyName: {
      field: "currency_name",
      type: DataTypes.STRING(50),
    },
    languages: {
      field: "languages",
      type: DataTypes.STRING(255),
    },
  });
};

export const down: Migration = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().dropTable("countries");
};
