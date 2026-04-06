import { QueryTypes, Sequelize } from "sequelize";
import { up as createUsersTable } from "../migrations/001-create-users-table";
import defineUserModel from "../models/User";

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./database.db",
  logging: false
});

const requiredColumns = [
  { name: "cpf", definition: "cpf TEXT" },
  { name: "data_nascimento", definition: "data_nascimento TEXT" },
  { name: "celular", definition: "celular TEXT" },
  { name: "senha_hash", definition: "senha_hash TEXT" },
  { name: "aceitou_termos", definition: "aceitou_termos INTEGER DEFAULT 0" },
  { name: "criado_em", definition: "criado_em TEXT DEFAULT CURRENT_TIMESTAMP" },
  { name: "canal_verificacao", definition: "canal_verificacao TEXT DEFAULT 'email'" },
  { name: "codigo_verificacao", definition: "codigo_verificacao TEXT" },
  { name: "codigo_expira_em", definition: "codigo_expira_em TEXT" },
  { name: "conta_verificada", definition: "conta_verificada INTEGER DEFAULT 0" },
  { name: "conta_liberada", definition: "conta_liberada INTEGER DEFAULT 0" },
  { name: "reset_codigo", definition: "reset_codigo TEXT" },
  { name: "reset_expira_em", definition: "reset_expira_em TEXT" }
];

const User = defineUserModel(sequelize);

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

  const columns = await sequelize.query("PRAGMA table_info(users)", {
    type: QueryTypes.SELECT
  });

  const existingColumns = new Set(columns.map((column) => column.name));

  for (const column of requiredColumns) {
    if (!existingColumns.has(column.name)) {
      await sequelize.query(`ALTER TABLE users ADD COLUMN ${column.definition}`);
    }
  }
})();

const withCallback = (promise, callback, context = {}) => {
  promise
    .then((result) => {
      if (typeof callback === "function") {
        callback.call(context, null, result);
      }
    })
    .catch((error) => {
      if (typeof callback === "function") {
        callback.call(context, error);
      }
    });
};

const db = {
  sequelize,
  User,
  init: initPromise,
  get(sql, params = [], callback) {
    withCallback(
      (async () => {
        await initPromise;
        const rows = await sequelize.query(sql, {
          replacements: params,
          type: QueryTypes.SELECT
        });
        return rows[0];
      })(),
      callback
    );
  },
  all(sql, params = [], callback) {
    withCallback(
      (async () => {
        await initPromise;
        return sequelize.query(sql, {
          replacements: params,
          type: QueryTypes.SELECT
        });
      })(),
      callback
    );
  },
  run(sql, params = [], callback) {
    const context = { lastID: undefined, changes: 0 };

    withCallback(
      (async () => {
        await initPromise;
        const [result, metadata] = await sequelize.query(sql, {
          replacements: params
        });

        context.lastID = metadata?.lastID ?? result?.lastID;
        context.changes = metadata?.changes ?? 0;

        return undefined;
      })(),
      callback,
      context
    );
  }
};

export default db;
export { sequelize, User, initPromise as init };
