export async function up(queryInterface, Sequelize) {
  const tables = await queryInterface.showAllTables();
  const normalize = (t) => (typeof t === "string" ? t : t.tableName || t.name || "");
  const existing = new Set(tables.map(normalize));

  // -- contas ----------------------------------------------------------------
  if (!existing.has("contas")) {
    await queryInterface.createTable("contas", {
      id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      usuario_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        unique: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      saldo: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0
      },
      atualizado_em: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()")
      }
    });
  }

  // -- transacoes ------------------------------------------------------------
  if (!existing.has("transacoes")) {
    await queryInterface.createTable("transacoes", {
      id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      usuario_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      tipo: {
        type: Sequelize.STRING(30),
        allowNull: false
      },
      direcao: {
        type: Sequelize.STRING(10),
        allowNull: false
      },
      valor: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: "confirmado"
      },
      referencia_externa: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      observacao: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      criado_em: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()")
      }
    });

    await queryInterface.addConstraint("transacoes", {
      fields: ["tipo"],
      type: "check",
      name: "chk_transacoes_tipo",
      where: {
        tipo: [
          "DEPOSITO",
          "SAQUE",
          "CREDITO_MANUAL",
          "DEBITO_MANUAL",
          "CONSUMO",
          "PAGAMENTO_USUARIO",
          "COMISSAO_PLATAFORMA",
          "ESTORNO",
          "TAXA"
        ]
      }
    });

    await queryInterface.addConstraint("transacoes", {
      fields: ["direcao"],
      type: "check",
      name: "chk_transacoes_direcao",
      where: { direcao: ["entrada", "saida"] }
    });

    await queryInterface.addConstraint("transacoes", {
      fields: ["status"],
      type: "check",
      name: "chk_transacoes_status",
      where: { status: ["pendente", "confirmado", "cancelado"] }
    });

    await queryInterface.addConstraint("transacoes", {
      fields: ["valor"],
      type: "check",
      name: "chk_transacoes_valor_positivo",
      where: Sequelize.literal("valor >= 0")
    });

    await queryInterface.addIndex("transacoes", ["usuario_id"], { name: "idx_transacoes_usuario" });
    await queryInterface.addIndex("transacoes", ["status"], { name: "idx_transacoes_status" });
    await queryInterface.addIndex("transacoes", ["criado_em"], { name: "idx_transacoes_criado_em" });
    await queryInterface.addIndex("transacoes", ["tipo"], { name: "idx_transacoes_tipo" });
  }

  // -- operacoes -------------------------------------------------------------
  if (!existing.has("operacoes")) {
    await queryInterface.createTable("operacoes", {
      id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      usuario_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      valor_bruto: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false
      },
      comissao_plataforma: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0
      },
      valor_liquido_usuario: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: "confirmado"
      },
      criado_em: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()")
      }
    });

    await queryInterface.addConstraint("operacoes", {
      fields: ["status"],
      type: "check",
      name: "chk_operacoes_status",
      where: { status: ["pendente", "confirmado", "cancelado"] }
    });

    await queryInterface.addConstraint("operacoes", {
      fields: ["valor_bruto"],
      type: "check",
      name: "chk_operacoes_valor_bruto",
      where: Sequelize.literal("valor_bruto >= 0")
    });

    await queryInterface.addConstraint("operacoes", {
      fields: ["comissao_plataforma"],
      type: "check",
      name: "chk_operacoes_comissao",
      where: Sequelize.literal("comissao_plataforma >= 0")
    });

    await queryInterface.addConstraint("operacoes", {
      fields: ["valor_liquido_usuario"],
      type: "check",
      name: "chk_operacoes_liquido",
      where: Sequelize.literal("valor_liquido_usuario >= 0")
    });

    await queryInterface.addConstraint("operacoes", {
      fields: ["valor_bruto", "comissao_plataforma", "valor_liquido_usuario"],
      type: "check",
      name: "chk_operacoes_valores_consistentes",
      where: Sequelize.literal("valor_bruto = comissao_plataforma + valor_liquido_usuario")
    });

    await queryInterface.addIndex("operacoes", ["usuario_id"], { name: "idx_operacoes_usuario" });
    await queryInterface.addIndex("operacoes", ["criado_em"], { name: "idx_operacoes_criado_em" });
  }

  // -- caixa_plataforma ------------------------------------------------------
  if (!existing.has("caixa_plataforma")) {
    await queryInterface.createTable("caixa_plataforma", {
      id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      tipo: {
        type: Sequelize.STRING(30),
        allowNull: false
      },
      valor: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false
      },
      direcao: {
        type: Sequelize.STRING(10),
        allowNull: false
      },
      observacao: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      criado_em: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()")
      }
    });

    await queryInterface.addConstraint("caixa_plataforma", {
      fields: ["direcao"],
      type: "check",
      name: "chk_caixa_direcao",
      where: { direcao: ["entrada", "saida"] }
    });

    await queryInterface.addConstraint("caixa_plataforma", {
      fields: ["valor"],
      type: "check",
      name: "chk_caixa_valor_positivo",
      where: Sequelize.literal("valor >= 0")
    });

    await queryInterface.addIndex("caixa_plataforma", ["criado_em"], { name: "idx_caixa_criado_em" });
  }
}

export async function down(queryInterface) {
  await queryInterface.dropTable("caixa_plataforma").catch(() => {});
  await queryInterface.dropTable("operacoes").catch(() => {});
  await queryInterface.dropTable("transacoes").catch(() => {});
  await queryInterface.dropTable("contas").catch(() => {});
}
