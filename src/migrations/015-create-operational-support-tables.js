export async function up(queryInterface, Sequelize) {
  const tables = await queryInterface.showAllTables();
  const normalize = (table) => (typeof table === "string" ? table : table.tableName || table.name || "");
  const existing = new Set(tables.map(normalize));

  if (!existing.has("pix_change_requests")) {
    await queryInterface.createTable("pix_change_requests", {
      id: { type: Sequelize.BIGINT, allowNull: false, autoIncrement: true, primaryKey: true },
      user_id: { type: Sequelize.BIGINT, allowNull: false, references: { model: "users", key: "id" } },
      chave_pix_atual: { type: Sequelize.TEXT, allowNull: true },
      nova_chave_pix: { type: Sequelize.TEXT, allowNull: false },
      motivo: { type: Sequelize.TEXT, allowNull: true },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: "pendente" },
      admin_id: { type: Sequelize.BIGINT, allowNull: true },
      admin_observacao: { type: Sequelize.TEXT, allowNull: true },
      criado_em: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      processado_em: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex("pix_change_requests", ["user_id"], { name: "idx_pix_change_requests_user" });
    await queryInterface.addIndex("pix_change_requests", ["status"], { name: "idx_pix_change_requests_status" });
  }

  if (!existing.has("admin_financial_actions")) {
    await queryInterface.createTable("admin_financial_actions", {
      id: { type: Sequelize.BIGINT, allowNull: false, autoIncrement: true, primaryKey: true },
      admin_id: { type: Sequelize.BIGINT, allowNull: false },
      user_id: { type: Sequelize.BIGINT, allowNull: true },
      tipo: { type: Sequelize.STRING(60), allowNull: false },
      valor: { type: Sequelize.DECIMAL(14, 2), allowNull: true },
      referencia: { type: Sequelize.TEXT, allowNull: true },
      motivo: { type: Sequelize.TEXT, allowNull: false },
      metadata: { type: Sequelize.TEXT, allowNull: true },
      criado_em: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    });
    await queryInterface.addIndex("admin_financial_actions", ["admin_id"], { name: "idx_admin_fin_actions_admin" });
    await queryInterface.addIndex("admin_financial_actions", ["user_id"], { name: "idx_admin_fin_actions_user" });
    await queryInterface.addIndex("admin_financial_actions", ["tipo"], { name: "idx_admin_fin_actions_tipo" });
  }

  if (!existing.has("user_sessions")) {
    await queryInterface.createTable("user_sessions", {
      id: { type: Sequelize.BIGINT, allowNull: false, autoIncrement: true, primaryKey: true },
      user_id: { type: Sequelize.BIGINT, allowNull: false, references: { model: "users", key: "id" } },
      session_id: { type: Sequelize.STRING(80), allowNull: false, unique: true },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: "ativa" },
      user_agent: { type: Sequelize.TEXT, allowNull: true },
      ip_hash: { type: Sequelize.STRING(128), allowNull: true },
      criado_em: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      expira_em: { type: Sequelize.DATE, allowNull: false },
      revogado_em: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex("user_sessions", ["user_id", "status"], { name: "idx_user_sessions_user_status" });
  }
}

export async function down(queryInterface) {
  await queryInterface.dropTable("user_sessions").catch(() => {});
  await queryInterface.dropTable("admin_financial_actions").catch(() => {});
  await queryInterface.dropTable("pix_change_requests").catch(() => {});
}
