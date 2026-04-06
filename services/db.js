import { DataTypes, QueryTypes, Sequelize } from "sequelize";

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

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nome: DataTypes.TEXT,
    email: DataTypes.TEXT,
    saldo: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    cpf: DataTypes.TEXT,
    data_nascimento: DataTypes.TEXT,
    celular: DataTypes.TEXT,
    senha_hash: DataTypes.TEXT,
    aceitou_termos: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    criado_em: {
      type: DataTypes.TEXT,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
    },
    canal_verificacao: {
      type: DataTypes.TEXT,
      defaultValue: "email"
    },
    codigo_verificacao: DataTypes.TEXT,
    codigo_expira_em: DataTypes.TEXT,
    conta_verificada: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    conta_liberada: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    reset_codigo: DataTypes.TEXT,
    reset_expira_em: DataTypes.TEXT
  },
  {
    tableName: "users",
    timestamps: false
  }
);

const initPromise = (async () => {
  await sequelize.authenticate();

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT,
      email TEXT,
      saldo REAL DEFAULT 0,
      cpf TEXT,
      data_nascimento TEXT,
      celular TEXT,
      senha_hash TEXT,
      aceitou_termos INTEGER DEFAULT 0,
      criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
      canal_verificacao TEXT DEFAULT 'email',
      codigo_verificacao TEXT,
      codigo_expira_em TEXT,
      conta_verificada INTEGER DEFAULT 0,
      conta_liberada INTEGER DEFAULT 0,
      reset_codigo TEXT,
      reset_expira_em TEXT
    )
  `);

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
