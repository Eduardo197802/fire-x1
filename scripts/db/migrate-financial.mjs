import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  host: process.env.DATABASE_URL ? undefined : process.env.DB_HOST || "localhost",
  port: process.env.DATABASE_URL ? undefined : Number(process.env.DB_PORT || 5432),
  database: process.env.DATABASE_URL ? undefined : process.env.DB_NAME || "firex1db",
  user: process.env.DATABASE_URL ? undefined : process.env.DB_USER || "postgres",
  password: process.env.DATABASE_URL ? undefined : process.env.DB_PASSWORD,
  ssl: String(process.env.DB_SSL || "false").toLowerCase() === "true" ? { rejectUnauthorized: false } : false,
});

async function run() {
  await client.connect();
  console.log("Conectado ao banco firex1db");

  // -- contas ----------------------------------------------------------------
  await client.query(`
    CREATE TABLE IF NOT EXISTS contas (
      id           BIGSERIAL PRIMARY KEY,
      user_id      BIGINT NOT NULL UNIQUE REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
      saldo        NUMERIC(14,2) NOT NULL DEFAULT 0,
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  console.log("Tabela contas: OK");

  // -- transacoes ------------------------------------------------------------
  await client.query(`
    CREATE TABLE IF NOT EXISTS transacoes (
      id                  BIGSERIAL PRIMARY KEY,
      user_id             BIGINT NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
      tipo                VARCHAR(30) NOT NULL CHECK (tipo IN ('DEPOSITO','SAQUE','CREDITO_MANUAL','DEBITO_MANUAL','CONSUMO','PAGAMENTO_USUARIO','COMISSAO_PLATAFORMA','ESTORNO','TAXA')),
      direcao             VARCHAR(10) NOT NULL CHECK (direcao IN ('entrada','saida')),
      valor               NUMERIC(14,2) NOT NULL CHECK (valor >= 0),
      status              VARCHAR(20) NOT NULL DEFAULT 'confirmado' CHECK (status IN ('pendente','confirmado','cancelado')),
      referencia_externa  VARCHAR(100),
      observacao          TEXT,
      criado_em           TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_transacoes_usuario   ON transacoes(user_id);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_transacoes_status    ON transacoes(status);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_transacoes_criado_em ON transacoes(criado_em);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_transacoes_tipo      ON transacoes(tipo);`);
  console.log("Tabela transacoes: OK");

  // -- operacoes -------------------------------------------------------------
  await client.query(`
    CREATE TABLE IF NOT EXISTS operacoes (
      id                    BIGSERIAL PRIMARY KEY,
      user_id               BIGINT NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
      valor_bruto           NUMERIC(14,2) NOT NULL CHECK (valor_bruto >= 0),
      comissao_plataforma   NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (comissao_plataforma >= 0),
      valor_liquido_usuario NUMERIC(14,2) NOT NULL CHECK (valor_liquido_usuario >= 0),
      status                VARCHAR(20) NOT NULL DEFAULT 'confirmado' CHECK (status IN ('pendente','confirmado','cancelado')),
      criado_em             TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT chk_operacoes_valores_consistentes CHECK (valor_bruto = comissao_plataforma + valor_liquido_usuario)
    );
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_operacoes_usuario   ON operacoes(user_id);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_operacoes_criado_em ON operacoes(criado_em);`);
  console.log("Tabela operacoes: OK");

  // -- caixa_plataforma ------------------------------------------------------
  await client.query(`
    CREATE TABLE IF NOT EXISTS caixa_plataforma (
      id         BIGSERIAL PRIMARY KEY,
      tipo       VARCHAR(30) NOT NULL,
      valor      NUMERIC(14,2) NOT NULL CHECK (valor >= 0),
      direcao    VARCHAR(10) NOT NULL CHECK (direcao IN ('entrada','saida')),
      observacao TEXT,
      criado_em  TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_caixa_criado_em ON caixa_plataforma(criado_em);`);
  console.log("Tabela caixa_plataforma: OK");

  // -- function + trigger ----------------------------------------------------
  await client.query(`
    CREATE OR REPLACE FUNCTION fn_recalcular_saldo_conta(p_user_id BIGINT)
    RETURNS VOID LANGUAGE plpgsql AS $$
    DECLARE v_saldo NUMERIC(14,2);
    BEGIN
      SELECT COALESCE(SUM(
        CASE
          WHEN status = 'confirmado' AND direcao = 'entrada' THEN  valor
          WHEN status = 'confirmado' AND direcao = 'saida'   THEN -valor
          ELSE 0
        END
      ), 0) INTO v_saldo FROM transacoes WHERE user_id = p_user_id;
      INSERT INTO contas (user_id, saldo, atualizado_em)
      VALUES (p_user_id, v_saldo, NOW())
      ON CONFLICT (user_id) DO UPDATE SET saldo = EXCLUDED.saldo, atualizado_em = NOW();
    END; $$;
  `);
  await client.query(`
    CREATE OR REPLACE FUNCTION trg_transacoes_recalcular_saldo()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_OP = 'DELETE' THEN PERFORM fn_recalcular_saldo_conta(OLD.user_id); RETURN OLD;
      ELSE PERFORM fn_recalcular_saldo_conta(NEW.user_id); RETURN NEW;
      END IF;
    END; $$;
  `);
  await client.query(`DROP TRIGGER IF EXISTS tg_transacoes_recalcular_saldo ON transacoes;`);
  await client.query(`
    CREATE TRIGGER tg_transacoes_recalcular_saldo
    AFTER INSERT OR UPDATE OR DELETE ON transacoes
    FOR EACH ROW EXECUTE FUNCTION trg_transacoes_recalcular_saldo();
  `);
  console.log("Trigger tg_transacoes_recalcular_saldo: OK");

  // -- views -----------------------------------------------------------------
  await client.query(`CREATE OR REPLACE VIEW vw_saldos_usuarios AS
    SELECT u.id AS usuario_id, u.nome, u.email, COALESCE(c.saldo,0) AS saldo_atual, c.atualizado_em
    FROM users u LEFT JOIN contas c ON c.user_id = u.id;`);
  await client.query(`CREATE OR REPLACE VIEW vw_extrato_consolidado AS
    SELECT t.id, t.user_id AS usuario_id, u.nome, t.tipo, t.direcao, t.valor, t.status, t.referencia_externa, t.observacao, t.criado_em
    FROM transacoes t INNER JOIN users u ON u.id = t.user_id;`);
  await client.query(`CREATE OR REPLACE VIEW vw_relatorio_diario AS
    SELECT DATE(criado_em) AS dia,
      SUM(CASE WHEN direcao='entrada' AND status='confirmado' THEN valor ELSE 0 END) AS total_entradas,
      SUM(CASE WHEN direcao='saida'   AND status='confirmado' THEN valor ELSE 0 END) AS total_saidas,
      SUM(CASE WHEN direcao='entrada' AND status='confirmado' THEN valor WHEN direcao='saida' AND status='confirmado' THEN -valor ELSE 0 END) AS liquido
    FROM transacoes GROUP BY DATE(criado_em) ORDER BY dia DESC;`);
  await client.query(`CREATE OR REPLACE VIEW vw_financeiro_por_usuario AS
    SELECT u.id, u.nome, u.email,
      SUM(CASE WHEN t.direcao='entrada' AND t.status='confirmado' THEN t.valor ELSE 0 END) AS entradas,
      SUM(CASE WHEN t.direcao='saida'   AND t.status='confirmado' THEN t.valor ELSE 0 END) AS saidas,
      SUM(CASE WHEN t.direcao='entrada' AND t.status='confirmado' THEN t.valor WHEN t.direcao='saida' AND t.status='confirmado' THEN -t.valor ELSE 0 END) AS saldo_calculado
    FROM users u LEFT JOIN transacoes t ON t.user_id = u.id
    GROUP BY u.id, u.nome, u.email ORDER BY u.nome;`);
  await client.query(`CREATE OR REPLACE VIEW vw_receita_plataforma_diaria AS
    SELECT DATE(criado_em) AS dia, SUM(valor_bruto) AS valor_bruto_total, SUM(comissao_plataforma) AS receita_plataforma, SUM(valor_liquido_usuario) AS valor_liquido_usuarios
    FROM operacoes WHERE status='confirmado' GROUP BY DATE(criado_em) ORDER BY dia DESC;`);
  await client.query(`CREATE OR REPLACE VIEW vw_saldo_caixa_plataforma AS
    SELECT COALESCE(SUM(CASE WHEN direcao='entrada' THEN valor WHEN direcao='saida' THEN -valor ELSE 0 END),0) AS saldo_caixa FROM caixa_plataforma;`);
  await client.query(`CREATE OR REPLACE VIEW vw_caixa_plataforma_diario AS
    SELECT DATE(criado_em) AS dia,
      SUM(CASE WHEN direcao='entrada' THEN valor ELSE 0 END) AS entradas,
      SUM(CASE WHEN direcao='saida'   THEN valor ELSE 0 END) AS saidas,
      SUM(CASE WHEN direcao='entrada' THEN valor ELSE -valor END) AS liquido
    FROM caixa_plataforma GROUP BY DATE(criado_em) ORDER BY dia DESC;`);
  console.log("Views (7): OK");

  // -- verificar resultado ---------------------------------------------------
  const res = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('contas','transacoes','operacoes','caixa_plataforma')
    ORDER BY tablename;
  `);
  console.log("\nTabelas criadas no banco:");
  res.rows.forEach(r => console.log("  ✓", r.tablename));

  await client.end();
  console.log("\nCheckpoint 1 concluido com sucesso!");
}

run().catch(err => {
  console.error("ERRO:", err.message);
  process.exit(1);
});
