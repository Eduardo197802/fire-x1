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
        type: DataTypes.DECIMAL(14, 2),
        defaultValue: 0
      },
      status: DataTypes.TEXT,
      metodo: DataTypes.TEXT,
      gateway: DataTypes.TEXT,
      txid: DataTypes.TEXT,
      efi_end_to_end_id: DataTypes.TEXT,
      chave_pix_destino: DataTypes.TEXT,
      descricao: DataTypes.TEXT,
      payload_br_code: DataTypes.TEXT,
      qr_code_imagem: DataTypes.TEXT,
      webhook_recebido_em: DataTypes.TEXT,
      processado_em: DataTypes.TEXT,
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