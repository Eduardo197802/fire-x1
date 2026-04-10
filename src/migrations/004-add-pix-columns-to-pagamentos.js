const PIX_COLUMNS = {
  txid: { type: "TEXT", allowNull: true },
  efi_end_to_end_id: { type: "TEXT", allowNull: true },
  chave_pix_destino: { type: "TEXT", allowNull: true },
  descricao: { type: "TEXT", allowNull: true },
  payload_br_code: { type: "TEXT", allowNull: true },
  qr_code_imagem: { type: "TEXT", allowNull: true },
  webhook_recebido_em: { type: "TEXT", allowNull: true },
  processado_em: { type: "TEXT", allowNull: true },
};

export async function up(queryInterface, Sequelize) {
  const table = await queryInterface.describeTable("pagamentos");

  for (const [name, config] of Object.entries(PIX_COLUMNS)) {
    if (!table[name]) {
      await queryInterface.addColumn("pagamentos", name, {
        type: Sequelize[config.type],
        allowNull: config.allowNull,
      });
    }
  }
}

export async function down(queryInterface) {
  const table = await queryInterface.describeTable("pagamentos");

  for (const name of Object.keys(PIX_COLUMNS)) {
    if (table[name]) {
      await queryInterface.removeColumn("pagamentos", name);
    }
  }
}
