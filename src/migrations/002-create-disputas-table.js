export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("disputas", {
    id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    user_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id"
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE"
    },
    adversario_nome: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    jogo: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    valor_aposta: {
      type: Sequelize.FLOAT,
      allowNull: true,
      defaultValue: 0
    },
    resultado: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    premio: {
      type: Sequelize.FLOAT,
      allowNull: true,
      defaultValue: 0
    },
    created_at: {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
    },
    origem: {
      type: Sequelize.TEXT,
      allowNull: true
    }
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable("disputas");
}