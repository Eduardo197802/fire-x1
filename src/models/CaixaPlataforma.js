import { DataTypes } from "sequelize";

export default function defineCaixaPlataformaModel(sequelize) {
  return sequelize.define(
    "CaixaPlataforma",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
      },
      tipo: {
        type: DataTypes.STRING(30),
        allowNull: false
      },
      valor: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false
      },
      direcao: {
        type: DataTypes.STRING(10),
        allowNull: false
      },
      observacao: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      criado_em: {
        type: DataTypes.DATE,
        allowNull: false
      }
    },
    {
      tableName: "caixa_plataforma",
      timestamps: false
    }
  );
}
