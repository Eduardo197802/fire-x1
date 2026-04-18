export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("users", {
    id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    nome: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    email: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    saldo: {
      type: Sequelize.DECIMAL(14, 2),
      allowNull: true,
      defaultValue: 0
    },
    cpf: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    data_nascimento: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    celular: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    senha_hash: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    aceitou_termos: {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    criado_em: {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
    },
    canal_verificacao: {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: "email"
    },
    codigo_verificacao: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    codigo_expira_em: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    conta_verificada: {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    conta_liberada: {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    reset_codigo: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    reset_expira_em: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    two_factor_enabled: {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    two_factor_destination: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    two_factor_code: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    two_factor_expires_at: {
      type: Sequelize.TEXT,
      allowNull: true
    }
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable("users");
}
