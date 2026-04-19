export async function up(queryInterface) {
  const legacyViews = [
    "vw_caixa_plataforma_diario",
    "vw_saldo_caixa_plataforma",
    "vw_receita_plataforma_diaria",
    "vw_financeiro_por_usuario",
    "vw_relatorio_diario",
    "vw_extrato_consolidado",
    "vw_saldos_usuarios"
  ];

  for (const view of legacyViews) {
    await queryInterface.sequelize
      .query(`DROP VIEW IF EXISTS ${view};`)
      .catch(() => {});
  }

  // 1. Saldo atual por usuario (via tabela contas mantida pelo trigger)
  await queryInterface.sequelize.query(`
    DO $$
    DECLARE
      contas_fk TEXT;
    BEGIN
      SELECT
        CASE
          WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'contas' AND column_name = 'usuario_id'
          ) THEN 'usuario_id'
          WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'contas' AND column_name = 'user_id'
          ) THEN 'user_id'
          ELSE NULL
        END
      INTO contas_fk;

      IF contas_fk IS NULL THEN
        RAISE EXCEPTION 'Tabela contas sem coluna de relacionamento (usuario_id/user_id).';
      END IF;

      EXECUTE format(
        'CREATE OR REPLACE VIEW vw_saldos_usuarios AS
         SELECT
           u.id AS usuario_id,
           u.nome,
           u.email,
           COALESCE(c.saldo, 0) AS saldo_atual,
           c.atualizado_em
         FROM users u
         LEFT JOIN contas c ON c.%I = u.id',
        contas_fk
      );
    END
    $$;
  `);

  // 2. Extrato consolidado por usuario
  await queryInterface.sequelize.query(`
    DO $$
    DECLARE
      transacoes_fk TEXT;
    BEGIN
      SELECT
        CASE
          WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'transacoes' AND column_name = 'usuario_id'
          ) THEN 'usuario_id'
          WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'transacoes' AND column_name = 'user_id'
          ) THEN 'user_id'
          ELSE NULL
        END
      INTO transacoes_fk;

      IF transacoes_fk IS NULL THEN
        RAISE EXCEPTION 'Tabela transacoes sem coluna de relacionamento (usuario_id/user_id).';
      END IF;

      EXECUTE format(
        'CREATE OR REPLACE VIEW vw_extrato_consolidado AS
         SELECT
           t.id,
           t.%1$I AS usuario_id,
           u.nome,
           t.tipo,
           t.direcao,
           t.valor,
           t.status,
           t.referencia_externa,
           t.observacao,
           t.criado_em
         FROM transacoes t
         INNER JOIN users u ON u.id = t.%1$I',
        transacoes_fk
      );
    END
    $$;
  `);

  // 3. Relatorio diario de entradas e saidas
  await queryInterface.sequelize.query(`
    CREATE OR REPLACE VIEW vw_relatorio_diario AS
    SELECT
      DATE(criado_em) AS dia,
      SUM(CASE WHEN direcao = 'entrada' AND status = 'confirmado' THEN valor ELSE 0 END) AS total_entradas,
      SUM(CASE WHEN direcao = 'saida'   AND status = 'confirmado' THEN valor ELSE 0 END) AS total_saidas,
      SUM(
        CASE
          WHEN direcao = 'entrada' AND status = 'confirmado' THEN  valor
          WHEN direcao = 'saida'   AND status = 'confirmado' THEN -valor
          ELSE 0
        END
      ) AS liquido
    FROM transacoes
    GROUP BY DATE(criado_em)
    ORDER BY dia DESC;
  `);

  // 4. Resumo financeiro por usuario
  await queryInterface.sequelize.query(`
    DO $$
    DECLARE
      transacoes_fk TEXT;
    BEGIN
      SELECT
        CASE
          WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'transacoes' AND column_name = 'usuario_id'
          ) THEN 'usuario_id'
          WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'transacoes' AND column_name = 'user_id'
          ) THEN 'user_id'
          ELSE NULL
        END
      INTO transacoes_fk;

      IF transacoes_fk IS NULL THEN
        RAISE EXCEPTION 'Tabela transacoes sem coluna de relacionamento (usuario_id/user_id).';
      END IF;

      EXECUTE format(
        'CREATE OR REPLACE VIEW vw_financeiro_por_usuario AS
         SELECT
           u.id,
           u.nome,
           u.email,
           SUM(CASE WHEN t.direcao = ''entrada'' AND t.status = ''confirmado'' THEN t.valor ELSE 0 END) AS entradas,
           SUM(CASE WHEN t.direcao = ''saida''   AND t.status = ''confirmado'' THEN t.valor ELSE 0 END) AS saidas,
           SUM(
             CASE
               WHEN t.direcao = ''entrada'' AND t.status = ''confirmado'' THEN  t.valor
               WHEN t.direcao = ''saida''   AND t.status = ''confirmado'' THEN -t.valor
               ELSE 0
             END
           ) AS saldo_calculado
         FROM users u
         LEFT JOIN transacoes t ON t.%1$I = u.id
         GROUP BY u.id, u.nome, u.email
         ORDER BY u.nome',
        transacoes_fk
      );
    END
    $$;
  `);

  // 5. Receita diaria da plataforma via operacoes
  await queryInterface.sequelize.query(`
    CREATE OR REPLACE VIEW vw_receita_plataforma_diaria AS
    SELECT
      DATE(criado_em)            AS dia,
      SUM(valor_bruto)           AS valor_bruto_total,
      SUM(comissao_plataforma)   AS receita_plataforma,
      SUM(valor_liquido_usuario) AS valor_liquido_usuarios
    FROM operacoes
    WHERE status = 'confirmado'
    GROUP BY DATE(criado_em)
    ORDER BY dia DESC;
  `);

  // 6. Saldo unico do caixa da plataforma
  await queryInterface.sequelize.query(`
    CREATE OR REPLACE VIEW vw_saldo_caixa_plataforma AS
    SELECT
      COALESCE(SUM(
        CASE
          WHEN direcao = 'entrada' THEN  valor
          WHEN direcao = 'saida'   THEN -valor
          ELSE 0
        END
      ), 0) AS saldo_caixa
    FROM caixa_plataforma;
  `);

  // 7. Movimentacao do caixa por dia
  await queryInterface.sequelize.query(`
    CREATE OR REPLACE VIEW vw_caixa_plataforma_diario AS
    SELECT
      DATE(criado_em) AS dia,
      SUM(CASE WHEN direcao = 'entrada' THEN  valor ELSE 0 END) AS entradas,
      SUM(CASE WHEN direcao = 'saida'   THEN  valor ELSE 0 END) AS saidas,
      SUM(CASE WHEN direcao = 'entrada' THEN  valor ELSE -valor END) AS liquido
    FROM caixa_plataforma
    GROUP BY DATE(criado_em)
    ORDER BY dia DESC;
  `);
}

export async function down(queryInterface) {
  const views = [
    "vw_caixa_plataforma_diario",
    "vw_saldo_caixa_plataforma",
    "vw_receita_plataforma_diaria",
    "vw_financeiro_por_usuario",
    "vw_relatorio_diario",
    "vw_extrato_consolidado",
    "vw_saldos_usuarios"
  ];

  for (const view of views) {
    await queryInterface.sequelize
      .query(`DROP VIEW IF EXISTS ${view};`)
      .catch(() => {});
  }
}
