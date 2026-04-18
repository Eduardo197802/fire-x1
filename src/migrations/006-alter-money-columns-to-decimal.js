export async function up(queryInterface, Sequelize) {
  await queryInterface.changeColumn("users", "saldo", {
    type: Sequelize.DECIMAL(14, 2),
    allowNull: true,
    defaultValue: 0,
  });

  await queryInterface.changeColumn("pagamentos", "valor", {
    type: Sequelize.DECIMAL(14, 2),
    allowNull: true,
    defaultValue: 0,
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.changeColumn("users", "saldo", {
    type: Sequelize.FLOAT,
    allowNull: true,
    defaultValue: 0,
  });

  await queryInterface.changeColumn("pagamentos", "valor", {
    type: Sequelize.FLOAT,
    allowNull: true,
    defaultValue: 0,
  });
}
