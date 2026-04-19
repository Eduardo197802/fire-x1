# Tasks 004 - Modelo Financeiro Completo

## Fase 1 - Banco de Dados

- [ ] 1.1 Criar `src/migrations/010-create-financial-model-tables.js`
  - Tabelas: `contas`, `transacoes`, `operacoes`, `caixa_plataforma`
  - Constraints: CHECK em tipo, direcao, status de cada tabela
  - CHECK em `operacoes`: `valor_bruto = comissao_plataforma + valor_liquido_usuario`
  - Indices: usuario, status, criado_em, tipo em cada tabela pertinente
  - Todas as instrucoes com IF NOT EXISTS para idempotencia

- [ ] 1.2 Criar `src/migrations/011-create-saldo-trigger.js`
  - Function `fn_recalcular_saldo_conta(p_usuario_id BIGINT)`
  - Trigger `tg_transacoes_recalcular_saldo` AFTER INSERT OR UPDATE OR DELETE em `transacoes`
  - Usar `CREATE OR REPLACE` para idempotencia
  - Incluir `DROP TRIGGER IF EXISTS` antes do `CREATE TRIGGER`

- [ ] 1.3 Criar `src/migrations/012-create-financial-views.js`
  - `vw_saldos_usuarios`
  - `vw_extrato_consolidado`
  - `vw_relatorio_diario`
  - `vw_financeiro_por_usuario`
  - `vw_receita_plataforma_diaria`
  - `vw_saldo_caixa_plataforma`
  - `vw_caixa_plataforma_diario`
  - Todas com `CREATE OR REPLACE VIEW`

- [ ] 1.4 Validar migrations no ambiente de desenvolvimento (executar runner local)

**Checkpoint 1**: migrations executam sem erro, tabelas e views existem no banco.

---

## Fase 2 - Modelos e Servico

- [ ] 2.1 Criar `src/models/Conta.js`
  - Campos: id, usuario_id (BIGINT unique), saldo (DECIMAL 14,2 default 0), atualizado_em
  - tableName: `contas`, timestamps: false

- [ ] 2.2 Criar `src/models/Transacao.js`
  - Campos: id, usuario_id, tipo, direcao, valor (DECIMAL 14,2), status (default confirmado),
    referencia_externa, observacao, criado_em
  - tableName: `transacoes`, timestamps: false

- [ ] 2.3 Criar `src/models/Operacao.js`
  - Campos: id, usuario_id, valor_bruto, comissao_plataforma (default 0), valor_liquido_usuario,
    status (default confirmado), criado_em
  - tableName: `operacoes`, timestamps: false

- [ ] 2.4 Criar `src/models/CaixaPlataforma.js`
  - Campos: id, tipo, valor, direcao, observacao, criado_em
  - tableName: `caixa_plataforma`, timestamps: false

- [ ] 2.5 Criar `src/services/financeiro.js`
  - Exportar `registrarTransacao({ userId, tipo, direcao, valor, referenciaExterna, observacao })`
  - Validar campos obrigatorios antes de inserir
  - Retornar o registro criado

- [ ] 2.6 Registrar os 4 novos modelos em `src/services/db.js`
  - Importar e definir associacoes com `User`

**Checkpoint 2**: modelos criados, servico exportado, db.js atualizado.

---

## Fase 3 - Integracao PIX

- [ ] 3.1 Atualizar `src/app/api/pix/webhook/route.js`
  - Apos `Pagamento.update({ status: "creditado" })` (fora da transacao atomica), chamar `registrarTransacao`
  - tipo: `DEPOSITO`, direcao: `entrada`, referencia_externa: txid
  - Envolver em try/catch isolado para nao reverter credito em caso de falha

- [ ] 3.2 Atualizar `src/app/api/pix/saque/route.js`
  - Apos `Pagamento.update({ status: "concluido" })`, chamar `registrarTransacao`
  - tipo: `SAQUE`, direcao: `saida`, referencia_externa: requestId
  - Envolver em try/catch isolado

**Checkpoint 3**: deposito e saque registram transacao; falha no registro nao impede o usuario de receber/sacar.

---

## Fase 4 - API Admin

- [ ] 4.1 Criar `src/app/api/admin/financeiro/resumo/route.js`
  - GET autenticado (sessao + allowlist de operadores igual a Spec 003)
  - Retornar: total_entradas, total_saidas, liquido, receita_plataforma, custos, lucro_liquido

- [ ] 4.2 Criar `src/app/api/admin/financeiro/diario/route.js`
  - GET com query params `de` e `ate` (datas no formato YYYY-MM-DD)
  - Consultar `vw_relatorio_diario` com filtro de periodo

- [ ] 4.3 Criar `src/app/api/admin/financeiro/usuarios/route.js`
  - GET com query param `limite` (default 20, max 100)
  - Consultar `vw_financeiro_por_usuario`

- [ ] 4.4 Criar `src/app/api/admin/financeiro/caixa/route.js`
  - GET com query params `de` e `ate`
  - Consultar `vw_caixa_plataforma_diario`

**Checkpoint 4**: endpoints respondem com dados corretos; 401 sem sessao; 403 para usuario comum.

---

## Fase 5 - Testes

- [ ] 5.1 Criar `specs/features/pix/webhook-transacao.spec.js`
  - Cenario: webhook creditado chama `registrarTransacao` com campos corretos
  - Cenario: falha em `registrarTransacao` nao altera status do pagamento

- [ ] 5.2 Criar `specs/features/pix/saque-transacao.spec.js`
  - Cenario: saque concluido chama `registrarTransacao` com campos corretos
  - Cenario: falha em `registrarTransacao` nao reverte saldo do usuario

- [ ] 5.3 Criar `specs/features/admin/financeiro.spec.js`
  - Cenario: 401 sem sessao
  - Cenario: 403 para usuario nao operador
  - Cenario: resumo retorna estrutura correta com dados mockados

**Checkpoint 5**: todos os testes passam.

---

## Entrega Final
- [ ] Atualizar CHANGELOG.md com resumo da spec 004
- [ ] Confirmar que nenhuma coluna ou tabela existente foi removida
