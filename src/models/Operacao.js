import { DataTypes } from "sequelize";

export default function defineOperacaoModel(sequelize) {
  return sequelize.define(
    "Operacao",
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
      valor_bruto: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false
      },
      comissao_plataforma: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0
      },
      valor_liquido_usuario: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "confirmado"
      },
      criado_em: {
        type: DataTypes.DATE,
        allowNull: false
      }
    },
    {
      tableName: "operacoes",
      timestamps: false
    }
  );
}
