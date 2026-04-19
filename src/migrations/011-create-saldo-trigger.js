export async function up(queryInterface) {
  // Limpa artefatos legados para evitar conflito de assinatura/nome de parametro em CREATE OR REPLACE FUNCTION.
  await queryInterface.sequelize.query(`
    DROP TRIGGER IF EXISTS tg_transacoes_recalcular_saldo ON transacoes;
  `);

  await queryInterface.sequelize.query(`
    DROP FUNCTION IF EXISTS trg_transacoes_recalcular_saldo();
  `);

  await queryInterface.sequelize.query(`
    DROP FUNCTION IF EXISTS fn_recalcular_saldo_conta(BIGINT);
  `);

  // Function que recalcula e faz upsert em contas para um dado usuario_id
  await queryInterface.sequelize.query(`
    CREATE OR REPLACE FUNCTION fn_recalcular_saldo_conta(p_usuario_id BIGINT)
    RETURNS VOID
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_saldo NUMERIC(14,2);
    BEGIN
      SELECT COALESCE(SUM(
        CASE
          WHEN status = 'confirmado' AND direcao = 'entrada' THEN valor
          WHEN status = 'confirmado' AND direcao = 'saida'   THEN -valor
          ELSE 0
        END
      ), 0)
      INTO v_saldo
      FROM transacoes
      WHERE usuario_id = p_usuario_id;

      INSERT INTO contas (usuario_id, saldo, atualizado_em)
      VALUES (p_usuario_id, v_saldo, NOW())
      ON CONFLICT (usuario_id)
      DO UPDATE SET
        saldo        = EXCLUDED.saldo,
        atualizado_em = NOW();
    END;
    $$;
  `);

  // Funcao usada pelo trigger
  await queryInterface.sequelize.query(`
    CREATE OR REPLACE FUNCTION trg_transacoes_recalcular_saldo()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    BEGIN
      IF TG_OP = 'DELETE' THEN
        PERFORM fn_recalcular_saldo_conta(OLD.usuario_id);
        RETURN OLD;
      ELSE
        PERFORM fn_recalcular_saldo_conta(NEW.usuario_id);
        RETURN NEW;
      END IF;
    END;
    $$;
  `);

  // Trigger na tabela transacoes
  await queryInterface.sequelize.query(`
    CREATE TRIGGER tg_transacoes_recalcular_saldo
    AFTER INSERT OR UPDATE OR DELETE ON transacoes
    FOR EACH ROW
    EXECUTE FUNCTION trg_transacoes_recalcular_saldo();
  `);
}

export async function down(queryInterface) {
  await queryInterface.sequelize.query(
    `DROP TRIGGER IF EXISTS tg_transacoes_recalcular_saldo ON transacoes;`
  ).catch(() => {});

  await queryInterface.sequelize.query(
    `DROP FUNCTION IF EXISTS trg_transacoes_recalcular_saldo();`
  ).catch(() => {});

  await queryInterface.sequelize.query(
    `DROP FUNCTION IF EXISTS fn_recalcular_saldo_conta(BIGINT);`
  ).catch(() => {});
}
