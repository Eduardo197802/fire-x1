import { Sequelize } from "sequelize";
import { up as createUsersTable } from "../migrations/001-create-users-table";
import { up as createDisputasTable } from "../migrations/002-create-disputas-table";
import { up as createPagamentosTable } from "../migrations/003-create-pagamentos-table";
import defineUserModel from "../models/User";
import defineDisputaModel from "../models/Disputa";
import definePagamentoModel from "../models/Pagamento";

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./database.db",
  logging: false
});

const requiredUserColumns = {
  cpf: { type: Sequelize.TEXT, allowNull: true },
  data_nascimento: { type: Sequelize.TEXT, allowNull: true },
  celular: { type: Sequelize.TEXT, allowNull: true },
  senha_hash: { type: Sequelize.TEXT, allowNull: true },
  aceitou_termos: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
  criado_em: { type: Sequelize.TEXT, allowNull: true, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
  canal_verificacao: { type: Sequelize.TEXT, allowNull: true, defaultValue: "email" },
  codigo_verificacao: { type: Sequelize.TEXT, allowNull: true },
  codigo_expira_em: { type: Sequelize.TEXT, allowNull: true },
  conta_verificada: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
  conta_liberada: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
  reset_codigo: { type: Sequelize.TEXT, allowNull: true },
  reset_expira_em: { type: Sequelize.TEXT, allowNull: true },
  two_factor_enabled: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
  two_factor_destination: { type: Sequelize.TEXT, allowNull: true },
  two_factor_code: { type: Sequelize.TEXT, allowNull: true },
  two_factor_expires_at: { type: Sequelize.TEXT, allowNull: true }
};

const User = defineUserModel(sequelize);
const Disputa = defineDisputaModel(sequelize);
const Pagamento = definePagamentoModel(sequelize);

User.hasMany(Disputa, { foreignKey: "user_id", as: "disputas" });
Disputa.belongsTo(User, { foreignKey: "user_id", as: "user" });

User.hasMany(Pagamento, { foreignKey: "user_id", as: "pagamentos" });
Pagamento.belongsTo(User, { foreignKey: "user_id", as: "user" });

Disputa.hasMany(Pagamento, { foreignKey: "disputa_id", as: "pagamentos" });
Pagamento.belongsTo(Disputa, { foreignKey: "disputa_id", as: "disputa" });

const initPromise = (async () => {
  await sequelize.authenticate();

  const queryInterface = sequelize.getQueryInterface();
  const tableNames = await queryInterface.showAllTables();
  const normalizedTableNames = tableNames.map((tableName) =>
    typeof tableName === "string" ? tableName : tableName.tableName || tableName.name
  );

  if (!normalizedTableNames.includes("users")) {
    await createUsersTable(queryInterface, Sequelize);
  }

  if (!normalizedTableNames.includes("disputas")) {
    await createDisputasTable(queryInterface, Sequelize);
  }

  if (!normalizedTableNames.includes("pagamentos")) {
    await createPagamentosTable(queryInterface, Sequelize);
  }

  const usersColumns = await queryInterface.describeTable("users");

  for (const [columnName, definition] of Object.entries(requiredUserColumns)) {
    if (!usersColumns[columnName]) {
      await queryInterface.addColumn("users", columnName, definition);
    }
  }
})();

const db = {
  sequelize,
  User,
  Disputa,
  Pagamento,
  init: initPromise
};

export default db;
export { sequelize, User, Disputa, Pagamento, initPromise as init };
