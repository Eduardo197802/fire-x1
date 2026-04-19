export async function up(queryInterface, Sequelize) {
  const tables = await queryInterface.showAllTables();
  const normalize = (t) => (typeof t === "string" ? t : t.tableName || t.name || "");
  const existing = new Set(tables.map(normalize));

  if (!existing.has("admin_access_links")) {
    await queryInterface.createTable("admin_access_links", {
      id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      email: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      token_hash: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      expira_em: {
        type: Sequelize.DATE,
        allowNull: false
      },
      usado: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      criado_em: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()")
      }
    });

    await queryInterface.addIndex("admin_access_links", ["email"], {
      name: "idx_admin_access_links_email"
    });
    await queryInterface.addIndex("admin_access_links", ["expira_em"], {
      name: "idx_admin_access_links_expira_em"
    });
    await queryInterface.addIndex("admin_access_links", ["usado"], {
      name: "idx_admin_access_links_usado"
    });
  }
}

export async function down(queryInterface) {
  await queryInterface.dropTable("admin_access_links").catch(() => {});
}
