import { DataTypes } from "sequelize";

export default function defineTransacaoModel(sequelize) {
  return sequelize.define(
    "Transacao",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      tipo: {
        type: DataTypes.STRING(30),
        allowNull: false
      },
      direcao: {
        type: DataTypes.STRING(10),
        allowNull: false
      },
      valor: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "confirmado"
      },
      referencia_externa: {
        type: DataTypes.STRING(100),
        allowNull: true
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
      tableName: "transacoes",
      timestamps: false
    }
  );
}
