import { DataTypes } from "sequelize";

export default function defineContaModel(sequelize) {
  return sequelize.define(
    "Conta",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        unique: true
      },
      saldo: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0
      },
      atualizado_em: {
        type: DataTypes.DATE,
        allowNull: false
      }
    },
    {
      tableName: "contas",
      timestamps: false
    }
  );
}
