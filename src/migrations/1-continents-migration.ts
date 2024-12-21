import { DataTypes } from "sequelize";
import type { Migration } from "../runMigrations";

export const up: Migration = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().createTable("continents", {
    continentId: {
      field: "continent_id",
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      type: DataTypes.UUID,
    },
    continentCode: {
      field: "continent_code",
      type: DataTypes.STRING(2),
      unique: true,
    },
    continentName: {
      field: "continent_name",
      type: DataTypes.STRING(50),
      unique: true,
    },
  });
};

export const down: Migration = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().dropTable("continents");
};
