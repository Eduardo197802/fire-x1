import { Sequelize } from "sequelize";
import { up as createUsersTable } from "../migrations/001-create-users-table.js";
import { up as createDisputasTable } from "../migrations/002-create-disputas-table.js";
import { up as createPagamentosTable } from "../migrations/003-create-pagamentos-table.js";
import { up as createFinancialModelTables } from "../migrations/010-create-financial-model-tables.js";
import { up as createSaldoTrigger } from "../migrations/011-create-saldo-trigger.js";
import { up as createFinancialViews } from "../migrations/012-create-financial-views.js";
import defineUserModel from "../models/User.js";
import defineDisputaModel from "../models/Disputa.js";
import definePagamentoModel from "../models/Pagamento.js";
import defineContaModel from "../models/Conta.js";
import defineTransacaoModel from "../models/Transacao.js";
import defineOperacaoModel from "../models/Operacao.js";
import defineCaixaPlataformaModel from "../models/CaixaPlataforma.js";

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value) {
  return String(value).toLowerCase() === "true";
}

const sequelize = new Sequelize({
  dialect: process.env.DB_DIALECT || "postgres",
  host: process.env.DB_HOST || "127.0.0.1",
  port: toNumber(process.env.DB_PORT, 5432),
  database: process.env.DB_NAME || "firex1_dev",
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  logging: false,
  dialectOptions: toBoolean(process.env.DB_SSL)
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : {},
});

const requiredUserColumns = {
  cpf: { type: Sequelize.TEXT, allowNull: true },
  data_nascimento: { type: Sequelize.TEXT, allowNull: true },
  celular: { type: Sequelize.TEXT, allowNull: true },
  chave_pix: { type: Sequelize.TEXT, allowNull: true },
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

const requiredPagamentoColumns = {
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
  amount: { type: Sequelize.DECIMAL(14, 2), allowNull: true },
  gateway: { type: Sequelize.TEXT, allowNull: true },
  external_reference: { type: Sequelize.TEXT, allowNull: true },
  txid: { type: Sequelize.TEXT, allowNull: true },
  efi_end_to_end_id: { type: Sequelize.TEXT, allowNull: true },
  chave_pix_destino: { type: Sequelize.TEXT, allowNull: true },
  descricao: { type: Sequelize.TEXT, allowNull: true },
  payload_br_code: { type: Sequelize.TEXT, allowNull: true },
  qr_code_imagem: { type: Sequelize.TEXT, allowNull: true },
  webhook_recebido_em: { type: Sequelize.TEXT, allowNull: true },
  processado_em: { type: Sequelize.TEXT, allowNull: true }
};

const User = defineUserModel(sequelize);
const Disputa = defineDisputaModel(sequelize);
const Pagamento = definePagamentoModel(sequelize);
const Conta = defineContaModel(sequelize);
const Transacao = defineTransacaoModel(sequelize);
const Operacao = defineOperacaoModel(sequelize);
const CaixaPlataforma = defineCaixaPlataformaModel(sequelize);

User.hasMany(Disputa, { foreignKey: "user_id", as: "disputas" });
Disputa.belongsTo(User, { foreignKey: "user_id", as: "user" });

User.hasMany(Pagamento, { foreignKey: "user_id", as: "pagamentos" });
Pagamento.belongsTo(User, { foreignKey: "user_id", as: "user" });

Disputa.hasMany(Pagamento, { foreignKey: "disputa_id", as: "pagamentos" });
Pagamento.belongsTo(Disputa, { foreignKey: "disputa_id", as: "disputa" });

User.hasOne(Conta, { foreignKey: "user_id", as: "conta" });
Conta.belongsTo(User, { foreignKey: "user_id", as: "usuario" });

User.hasMany(Transacao, { foreignKey: "user_id", as: "transacoes" });
Transacao.belongsTo(User, { foreignKey: "user_id", as: "usuario" });

User.hasMany(Operacao, { foreignKey: "user_id", as: "operacoes" });
Operacao.belongsTo(User, { foreignKey: "user_id", as: "usuario" });

const shouldBootstrapSchema = toBoolean(process.env.DB_BOOTSTRAP_SCHEMA);

const initPromise = (async () => {
  await sequelize.authenticate();

  if (!shouldBootstrapSchema) {
    return;
  }

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

  await createFinancialModelTables(queryInterface, Sequelize);
  await createSaldoTrigger(queryInterface, Sequelize);
  await createFinancialViews(queryInterface, Sequelize);

  const usersColumns = await queryInterface.describeTable("users");

  for (const [columnName, definition] of Object.entries(requiredUserColumns)) {
    if (!usersColumns[columnName]) {
      await queryInterface.addColumn("users", columnName, definition);
    }
  }

  const pagamentosColumns = await queryInterface.describeTable("pagamentos");

  for (const [columnName, definition] of Object.entries(requiredPagamentoColumns)) {
    if (!pagamentosColumns[columnName]) {
      await queryInterface.addColumn("pagamentos", columnName, definition);
    }
  }
})();

const db = {
  sequelize,
  User,
  Disputa,
  Pagamento,
  Conta,
  Transacao,
  Operacao,
  CaixaPlataforma,
  init: initPromise
};

export default db;
export { sequelize, User, Disputa, Pagamento, Conta, Transacao, Operacao, CaixaPlataforma, initPromise as init };
