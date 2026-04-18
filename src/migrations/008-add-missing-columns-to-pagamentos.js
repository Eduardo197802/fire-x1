export async function up(queryInterface, Sequelize) {
  const table = await queryInterface.describeTable("pagamentos");

  const columnsToAdd = {
    tipo: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    metodo: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    origem: {
      type: Sequelize.TEXT,
      allowNull: true
    }
  };

  for (const [name, config] of Object.entries(columnsToAdd)) {
    if (!table[name]) {
      await queryInterface.addColumn("pagamentos", name, config);
    }
  }
}

export async function down(queryInterface) {
  const table = await queryInterface.describeTable("pagamentos");

  for (const name of ["tipo", "metodo", "origem"]) {
    if (table[name]) {
      await queryInterface.removeColumn("pagamentos", name);
    }
  }
}
