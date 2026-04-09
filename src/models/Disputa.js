import { DataTypes, Sequelize } from "sequelize";

export default function defineDisputaModel(sequelize) {
  return sequelize.define(
    "Disputa",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      adversario_nome: DataTypes.TEXT,
      jogo: DataTypes.TEXT,
      valor_aposta: {
        type: DataTypes.FLOAT,
        defaultValue: 0
      },
      resultado: DataTypes.TEXT,
      premio: {
        type: DataTypes.FLOAT,
        defaultValue: 0
      },
      created_at: {
        type: DataTypes.TEXT,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      },
      origem: DataTypes.TEXT
    },
    {
      tableName: "disputas",
      timestamps: false
    }
  );
}