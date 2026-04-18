export async function up(queryInterface, Sequelize) {
  const table = await queryInterface.describeTable("pagamentos");

  if (!table.disputa_id) {
    await queryInterface.addColumn("pagamentos", "disputa_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "disputas",
        key: "id"
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });
  }
}

export async function down(queryInterface) {
  const table = await queryInterface.describeTable("pagamentos");

  if (table.disputa_id) {
    await queryInterface.removeColumn("pagamentos", "disputa_id");
  }
}