export async function up(sequelize) {
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
}
