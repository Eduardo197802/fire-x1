export async function up(queryInterface, Sequelize) {
  const table = await queryInterface.describeTable("pagamentos");

  if (!table.user_id) {
    await queryInterface.addColumn("pagamentos", "user_id", {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id"
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE"
    });
  }
}

export async function down(queryInterface) {
  const table = await queryInterface.describeTable("pagamentos");

  if (table.user_id) {
    await queryInterface.removeColumn("pagamentos", "user_id");
  }
}
