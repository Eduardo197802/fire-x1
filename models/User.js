import { DataTypes, Sequelize } from "sequelize";

export default function defineUserModel(sequelize) {
  return sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      nome: DataTypes.TEXT,
      email: DataTypes.TEXT,
      saldo: {
        type: DataTypes.FLOAT,
        defaultValue: 0
      },
      cpf: DataTypes.TEXT,
      data_nascimento: DataTypes.TEXT,
      celular: DataTypes.TEXT,
      senha_hash: DataTypes.TEXT,
      aceitou_termos: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      criado_em: {
        type: DataTypes.TEXT,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      },
      canal_verificacao: {
        type: DataTypes.TEXT,
        defaultValue: "email"
      },
      codigo_verificacao: DataTypes.TEXT,
      codigo_expira_em: DataTypes.TEXT,
      conta_verificada: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      conta_liberada: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      reset_codigo: DataTypes.TEXT,
      reset_expira_em: DataTypes.TEXT
    },
    {
      tableName: "users",
      timestamps: false
    }
  );
}
