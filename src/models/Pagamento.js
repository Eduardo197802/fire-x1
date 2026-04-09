import { DataTypes, Sequelize } from "sequelize";

export default function definePagamentoModel(sequelize) {
  return sequelize.define(
    "Pagamento",
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
      disputa_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      tipo: DataTypes.TEXT,
      valor: {
        type: DataTypes.FLOAT,
        defaultValue: 0
      },
      status: DataTypes.TEXT,
      metodo: DataTypes.TEXT,
      created_at: {
        type: DataTypes.TEXT,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      },
      origem: DataTypes.TEXT
    },
    {
      tableName: "pagamentos",
      timestamps: false
    }
  );
}