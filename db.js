const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./database.db");

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

db.serialize(() => {
  db.run(`
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

  db.all("PRAGMA table_info(users)", (error, columns) => {
    if (error) {
      console.error("Erro ao verificar colunas da tabela users:", error.message);
      return;
    }

    const existingColumns = new Set(columns.map((column) => column.name));

    requiredColumns.forEach((column) => {
      if (!existingColumns.has(column.name)) {
        db.run(`ALTER TABLE users ADD COLUMN ${column.definition}`);
      }
    });
  });
});

module.exports = db;