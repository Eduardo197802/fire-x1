async function ensureColumn(queryInterface, tableName, columnName, definition) {
  const table = await queryInterface.describeTable(tableName);

  if (!table[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition);
    return;
  }

  await queryInterface.changeColumn(tableName, columnName, definition);
}

export async function up(queryInterface, Sequelize) {
  await ensureColumn(queryInterface, "users", "saldo", {
    type: Sequelize.DECIMAL(14, 2),
    allowNull: true,
    defaultValue: 0,
  });

  await ensureColumn(queryInterface, "pagamentos", "valor", {
    type: Sequelize.DECIMAL(14, 2),
    allowNull: true,
    defaultValue: 0,
  });
}

export async function down(queryInterface, Sequelize) {
  await ensureColumn(queryInterface, "users", "saldo", {
    type: Sequelize.FLOAT,
    allowNull: true,
    defaultValue: 0,
  });

  await ensureColumn(queryInterface, "pagamentos", "valor", {
    type: Sequelize.FLOAT,
    allowNull: true,
    defaultValue: 0,
  });
}
