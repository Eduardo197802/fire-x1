export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("pagamentos", {
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
    disputa_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "disputas",
        key: "id"
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    },
    tipo: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    valor: {
      type: Sequelize.DECIMAL(14, 2),
      allowNull: true,
      defaultValue: 0
    },
    status: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    metodo: {
      type: Sequelize.TEXT,
      allowNull: true
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
  await queryInterface.dropTable("pagamentos");
}