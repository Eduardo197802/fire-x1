# Plan 004 - Modelo Financeiro Completo

## Estrategia Geral
Adotar abordagem aditiva: as novas tabelas convivem com as existentes durante toda a spec.
A remocao de `pagamentos` e de `users.saldo` so ocorre em spec futura apos validacao em producao.

## Fases de Entrega

### Fase 1 - Banco de Dados (Checkpoint 1)
Criar as migrations que estabelecem o novo modelo sem alterar estrutura existente.

- Migration 010: tabelas `contas`, `transacoes`, `operacoes`, `caixa_plataforma` com constraints e indices.
- Migration 011: function `fn_recalcular_saldo_conta` e trigger `tg_transacoes_recalcular_saldo`.
- Migration 012: views de relatorio (`vw_saldos_usuarios`, `vw_extrato_consolidado`, `vw_relatorio_diario`, `vw_financeiro_por_usuario`, `vw_receita_plataforma_diaria`, `vw_saldo_caixa_plataforma`, `vw_caixa_plataforma_diario`).
- Validacao: executar migrations em ambiente de desenvolvimento e confirmar via psql.

### Fase 2 - Modelos Sequelize e Servico (Checkpoint 2)
Criar modelos Sequelize para as novas tabelas e um servico de registro de transacoes.

- `src/models/Conta.js`
- `src/models/Transacao.js`
- `src/models/Operacao.js`
- `src/models/CaixaPlataforma.js`
- `src/services/financeiro.js` com funcao `registrarTransacao({ userId, tipo, direcao, valor, referenciaExterna, observacao })`.
- Registrar novos modelos em `src/services/db.js`.

### Fase 3 - Integracao com Fluxo PIX (Checkpoint 3)
Conectar o registro de transacoes aos endpoints ja existentes sem quebrar o comportamento atual.

- Webhook PIX: apos creditar `users.saldo`, chamar `registrarTransacao` com `tipo=DEPOSITO, direcao=entrada`.
- Saque PIX concluido: apos debitar `users.saldo`, chamar `registrarTransacao` com `tipo=SAQUE, direcao=saida`.
- Erros no registro de transacao NAO devem reverter o credito/debito PIX ja efetivado (registro best-effort com log de erro).

### Fase 4 - API de Relatorio Admin (Checkpoint 4)
Criar endpoints autenticados para o painel do dono.

- `GET /api/admin/financeiro/resumo` — entradas, saidas, liquido, receita, custos, lucro.
- `GET /api/admin/financeiro/diario` — dados da `vw_relatorio_diario` com filtro de periodo.
- `GET /api/admin/financeiro/usuarios` — dados da `vw_financeiro_por_usuario`.
- `GET /api/admin/financeiro/caixa` — dados de `vw_caixa_plataforma_diario`.
- Todos os endpoints exigem autenticacao de sessao + perfil de operador autorizado (mesmo padrao da Spec 003 de total PIX).

### Fase 5 - Testes (Checkpoint 5)
Cobrir com testes unitarios os cenarios criticos.

- Registro de transacao no webhook apos credito PIX.
- Registro de transacao no saque PIX concluido.
- Erro no registro de transacao nao reverte o credito.
- Endpoints admin retornam 401 sem sessao e 403 para usuario comum.

## Decisoes de Design

### Por que nao remover `pagamentos` agora?
A tabela `pagamentos` tem dados existentes e o fluxo PIX depende dela para idempotencia por txid.
A coexistencia garante rollback seguro. Remocao e migracao dos dados historicos sao escopo de spec 005.

### Por que o trigger no banco e nao no aplicativo?
O trigger garante consistencia mesmo em acessos diretos ao banco (scripts de suporte, seeds, migrations).
O campo `contas.saldo` e sempre correto sem depender de qual camada fez a escrita.

### Por que registrarTransacao best-effort no PIX?
O credito do usuario e a operacao critica e ja esta protegida por transacao atomica no banco.
Falhar o registro na nova tabela nao deve prejudicar o usuario que pagou.
A inconsistencia sera detectavel por comparacao entre `pagamentos` e `transacoes` em auditoria.

## Riscos
| Risco | Mitigacao |
|-------|-----------|
| Trigger com bug reverte credito PIX | Registrar transacao FORA da transacao atomica do PIX |
| Migration falha em producao | Todas as migrations usam IF NOT EXISTS e sao idempotentes |
| View retorna dados de outro usuario | Filtros por usuario_id em todos os endpoints, nunca expor view diretamente |
| Overhead de trigger em volume alto | Aceitar nesta fase; avaliar desnormalizacao em spec futura |
