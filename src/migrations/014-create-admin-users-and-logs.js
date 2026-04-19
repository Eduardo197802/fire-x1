export async function up(queryInterface, Sequelize) {
  const tables = await queryInterface.showAllTables();
  const normalize = (t) => (typeof t === "string" ? t : t.tableName || t.name || "");
  const existing = new Set(tables.map(normalize));

  if (!existing.has("usuarios_admin")) {
    await queryInterface.createTable("usuarios_admin", {
      id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      nome: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(150),
        allowNull: false,
        unique: true
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      primeiro_acesso: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      twofa_ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      twofa_segredo: {
        type: Sequelize.STRING(128),
        allowNull: true
      },
      criado_em: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()")
      }
    });

    await queryInterface.addIndex("usuarios_admin", ["email"], {
      name: "idx_usuarios_admin_email_unique",
      unique: true
    });

    await queryInterface.addIndex("usuarios_admin", ["ativo"], {
      name: "idx_usuarios_admin_ativo"
    });
  }

  if (!existing.has("admin_access_logs")) {
    await queryInterface.createTable("admin_access_logs", {
      id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      admin_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: "usuarios_admin", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      acao: {
        type: Sequelize.STRING(120),
        allowNull: false
      },
      detalhe: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      ip: {
        type: Sequelize.STRING(80),
        allowNull: true
      },
      criado_em: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()")
      }
    });

    await queryInterface.addIndex("admin_access_logs", ["admin_id"], {
      name: "idx_admin_access_logs_admin_id"
    });

    await queryInterface.addIndex("admin_access_logs", ["criado_em"], {
      name: "idx_admin_access_logs_criado_em"
    });
  }
}

export async function down(queryInterface) {
  await queryInterface.dropTable("admin_access_logs").catch(() => {});
  await queryInterface.dropTable("usuarios_admin").catch(() => {});
}
