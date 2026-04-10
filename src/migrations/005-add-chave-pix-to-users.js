export async function up(queryInterface, Sequelize) {
  const table = await queryInterface.describeTable("users");

  if (!table.chave_pix) {
    await queryInterface.addColumn("users", "chave_pix", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  }
}

export async function down(queryInterface) {
  const table = await queryInterface.describeTable("users");

  if (table.chave_pix) {
    await queryInterface.removeColumn("users", "chave_pix");
  }
}
