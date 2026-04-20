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

  // Dropar tudo
  try {
    const views = ["vw_caixa_plataforma_diario","vw_saldo_caixa_plataforma","vw_receita_plataforma_diaria","vw_financeiro_por_usuario","vw_relatorio_diario","vw_extrato_consolidado","vw_saldos_usuarios"];
    for (const view of views) await client.query(`DROP VIEW IF EXISTS ${view} CASCADE;`).catch(()=>{});
    await client.query(`DROP TRIGGER IF EXISTS tg_transacoes_recalcular_saldo ON transacoes CASCADE;`).catch(()=>{});
    await client.query(`DROP FUNCTION IF EXISTS trg_transacoes_recalcular_saldo();`).catch(()=>{});
    await client.query(`DROP FUNCTION IF EXISTS fn_recalcular_saldo_conta(BIGINT);`).catch(()=>{});
    await client.query(`DROP TABLE IF EXISTS caixa_plataforma;`).catch(()=>{});
    await client.query(`DROP TABLE IF EXISTS operacoes;`).catch(()=>{});
    await client.query(`DROP TABLE IF EXISTS transacoes;`).catch(()=>{});
    await client.query(`DROP TABLE IF EXISTS contas;`).catch(()=>{});
  } catch(e) {}

  await client.query(`CREATE TABLE contas (id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL UNIQUE REFERENCES users(id), saldo NUMERIC(14,2) NOT NULL DEFAULT 0, atualizado_em TIMESTAMP NOT NULL DEFAULT NOW());`);
  console.log("✓ contas");
  
  await client.query(`CREATE TABLE transacoes (id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id), tipo VARCHAR(30) NOT NULL, direcao VARCHAR(10) NOT NULL, valor NUMERIC(14,2) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'confirmado', referencia_externa VARCHAR(100), observacao TEXT, criado_em TIMESTAMP NOT NULL DEFAULT NOW());`);
  await client.query(`CREATE INDEX idx_t_user ON transacoes(user_id); CREATE INDEX idx_t_status ON transacoes(status);`);
  console.log("✓ transacoes");
  
  await client.query(`CREATE TABLE operacoes (id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id), valor_bruto NUMERIC(14,2) NOT NULL, comissao_plataforma NUMERIC(14,2) NOT NULL DEFAULT 0, valor_liquido_usuario NUMERIC(14,2) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'confirmado', criado_em TIMESTAMP NOT NULL DEFAULT NOW());`);
  console.log("✓ operacoes");
  
  await client.query(`CREATE TABLE caixa_plataforma (id BIGSERIAL PRIMARY KEY, tipo VARCHAR(30) NOT NULL, valor NUMERIC(14,2) NOT NULL, direcao VARCHAR(10) NOT NULL, observacao TEXT, criado_em TIMESTAMP NOT NULL DEFAULT NOW());`);
  console.log("✓ caixa_plataforma");

  await client.query(`CREATE FUNCTION fn_recalcular_saldo_conta(p_user_id BIGINT) RETURNS VOID LANGUAGE plpgsql AS $$ DECLARE v_saldo NUMERIC(14,2); BEGIN SELECT COALESCE(SUM(CASE WHEN status='confirmado' AND direcao='entrada' THEN valor WHEN status='confirmado' AND direcao='saida' THEN -valor ELSE 0 END),0) INTO v_saldo FROM transacoes WHERE user_id=p_user_id; INSERT INTO contas (user_id,saldo,atualizado_em) VALUES (p_user_id,v_saldo,NOW()) ON CONFLICT (user_id) DO UPDATE SET saldo=EXCLUDED.saldo; END; $$;`);
  await client.query(`CREATE FUNCTION trg_transacoes_recalcular_saldo() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN IF TG_OP='DELETE' THEN PERFORM fn_recalcular_saldo_conta(OLD.user_id); RETURN OLD; ELSE PERFORM fn_recalcular_saldo_conta(NEW.user_id); RETURN NEW; END IF; END; $$;`);
  await client.query(`CREATE TRIGGER tg_transacoes_recalcular_saldo AFTER INSERT OR UPDATE OR DELETE ON transacoes FOR EACH ROW EXECUTE FUNCTION trg_transacoes_recalcular_saldo();`);
  console.log("✓ trigger");

  await client.query(`CREATE VIEW vw_saldos_usuarios AS SELECT u.id,u.nome,u.email,COALESCE(c.saldo,0) AS saldo,c.atualizado_em FROM users u LEFT JOIN contas c ON c.user_id=u.id;`);
  console.log("✓ views");

  const res = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('contas','transacoes','operacoes','caixa_plataforma');`);
  console.log("\n✅ Checkpoint 1 OK!");
  console.log("Tabelas criadas:", res.rows.map(r=>r.tablename).join(", "));
  await client.end();
}

run().catch(e => { console.error("❌", e.message); process.exit(1); });
