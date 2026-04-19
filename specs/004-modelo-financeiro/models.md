# Models 004 - Modelo Financeiro Completo

## Motivo da Existencia
Este arquivo e necessario porque a spec cria 4 novas tabelas com contratos de estrutura precisos
e altera a forma como o saldo do usuario e calculado e persistido.

---

## Tabela: contas

Armazena o saldo derivado das transacoes confirmadas. Atualizada automaticamente por trigger.

| Coluna | Tipo | Constraint | Descricao |
|--------|------|-----------|-----------|
| id | BIGSERIAL | PK | Identificador unico |
| usuario_id | BIGINT | UNIQUE, NOT NULL, FK users(id) | Um registro por usuario |
| saldo | NUMERIC(14,2) | NOT NULL DEFAULT 0 | Saldo calculado por trigger |
| atualizado_em | TIMESTAMP | NOT NULL DEFAULT NOW() | Ultima atualizacao pelo trigger |

> Regra: nunca atualizar manualmente. O trigger recalcula a partir de `transacoes`.

---

## Tabela: transacoes

Registro imutavel de cada movimentacao financeira de usuario.

| Coluna | Tipo | Constraint | Descricao |
|--------|------|-----------|-----------|
| id | BIGSERIAL | PK | Identificador unico |
| usuario_id | BIGINT | NOT NULL, FK users(id) | Usuario da movimentacao |
| tipo | VARCHAR(30) | NOT NULL, CHECK lista | Tipo da transacao |
| direcao | VARCHAR(10) | NOT NULL, CHECK ('entrada','saida') | Sentido do dinheiro |
| valor | NUMERIC(14,2) | NOT NULL, CHECK >= 0 | Valor sempre positivo |
| status | VARCHAR(20) | NOT NULL DEFAULT 'confirmado' | pendente / confirmado / cancelado |
| referencia_externa | VARCHAR(100) | nullable | txid PIX, requestId, etc |
| observacao | TEXT | nullable | Descricao livre |
| criado_em | TIMESTAMP | NOT NULL DEFAULT NOW() | Data de criacao |

### Tipos validos (CHECK constraint)
- DEPOSITO
- SAQUE
- CREDITO_MANUAL
- DEBITO_MANUAL
- CONSUMO
- PAGAMENTO_USUARIO
- COMISSAO_PLATAFORMA
- ESTORNO
- TAXA

### Status validos
- pendente
- confirmado
- cancelado

### Como o saldo e calculado
```
saldo = SUM(valor WHERE direcao='entrada' AND status='confirmado')
      - SUM(valor WHERE direcao='saida'  AND status='confirmado')
```

---

## Tabela: operacoes

Registra comissoes e valor liquido por operacao que gera receita para a plataforma.

| Coluna | Tipo | Constraint | Descricao |
|--------|------|-----------|-----------|
| id | BIGSERIAL | PK | Identificador unico |
| usuario_id | BIGINT | NOT NULL, FK users(id) | Usuario da operacao |
| valor_bruto | NUMERIC(14,2) | NOT NULL, CHECK >= 0 | Valor total da operacao |
| comissao_plataforma | NUMERIC(14,2) | NOT NULL DEFAULT 0, CHECK >= 0 | Fatia da plataforma |
| valor_liquido_usuario | NUMERIC(14,2) | NOT NULL, CHECK >= 0 | Fatia do usuario |
| status | VARCHAR(20) | NOT NULL DEFAULT 'confirmado' | pendente / confirmado / cancelado |
| criado_em | TIMESTAMP | NOT NULL DEFAULT NOW() | Data da operacao |

> Regra de integridade: `valor_bruto = comissao_plataforma + valor_liquido_usuario` (CHECK constraint).

---

## Tabela: caixa_plataforma

Controla o caixa interno da plataforma, separado do saldo dos usuarios.

| Coluna | Tipo | Constraint | Descricao |
|--------|------|-----------|-----------|
| id | BIGSERIAL | PK | Identificador unico |
| tipo | VARCHAR(30) | NOT NULL | APORTE, COMISSAO, CUSTO, RETIRADA, etc |
| valor | NUMERIC(14,2) | NOT NULL, CHECK >= 0 | Valor sempre positivo |
| direcao | VARCHAR(10) | NOT NULL, CHECK ('entrada','saida') | Sentido do dinheiro |
| observacao | TEXT | nullable | Descricao livre |
| criado_em | TIMESTAMP | NOT NULL DEFAULT NOW() | Data do registro |

---

## Trigger: tg_transacoes_recalcular_saldo

Disparado AFTER INSERT OR UPDATE OR DELETE em `transacoes` FOR EACH ROW.
Chama `fn_recalcular_saldo_conta(usuario_id)` que faz UPSERT em `contas`.

```sql
-- Pseudocodigo do calculo dentro da function
SELECT COALESCE(SUM(
  CASE
    WHEN status = 'confirmado' AND direcao = 'entrada' THEN valor
    WHEN status = 'confirmado' AND direcao = 'saida' THEN -valor
    ELSE 0
  END
), 0) INTO v_saldo FROM transacoes WHERE usuario_id = p_usuario_id;

INSERT INTO contas (usuario_id, saldo, atualizado_em)
VALUES (p_usuario_id, v_saldo, NOW())
ON CONFLICT (usuario_id) DO UPDATE SET saldo = EXCLUDED.saldo, atualizado_em = NOW();
```

---

## Views de Relatorio

| View | Descricao |
|------|-----------|
| vw_saldos_usuarios | Saldo atual de cada usuario via JOIN contas |
| vw_extrato_consolidado | Todas as transacoes com nome do usuario |
| vw_relatorio_diario | Entradas, saidas e liquido por dia |
| vw_financeiro_por_usuario | Resumo por usuario (entradas, saidas, saldo calculado) |
| vw_receita_plataforma_diaria | Receita da plataforma por dia via operacoes |
| vw_saldo_caixa_plataforma | Saldo unico do caixa da plataforma |
| vw_caixa_plataforma_diario | Movimentacao do caixa por dia |

---

## Relacionamentos com Modelo Existente

- `contas.usuario_id` → `users.id` (Sequelize: User hasOne Conta)
- `transacoes.usuario_id` → `users.id` (Sequelize: User hasMany Transacao)
- `operacoes.usuario_id` → `users.id` (Sequelize: User hasMany Operacao)
- A tabela `pagamentos` continua existindo e o campo `users.saldo` e mantido durante esta spec.

---

## Coexistencia com Modelo Atual

Durante esta spec, as duas formas de saldo coexistem:
- `users.saldo` — atualizado pelos endpoints PIX (comportamento atual, mantido)
- `contas.saldo` — calculado por trigger sobre `transacoes` (novo, auditavel)

A remocao de `users.saldo` e migracao dos dados historicos de `pagamentos` para `transacoes`
sao escopo da **Spec 005 - Consolidacao do Modelo Financeiro**.
