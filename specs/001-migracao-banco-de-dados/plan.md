# Plan - Spec 001 (SQLite -> PostgreSQL)

## Estrategia de Implementacao
A migracao sera executada em checkpoints curtos, com validacao a cada passo e aprovacao do solicitante antes de avancar.

## Tecnologias e Ferramentas
- Sequelize migrations
- PostgreSQL
- pg e pg-hstore
- Jest para testes automatizados

## Planejamento Passo a Passo
1. Checkpoint 1 - Documentacao e baseline
- Criar a spec 001 com spec.md, plan.md e tasks.md.
- Criar teste para validar existencia da estrutura da spec 001.

2. Checkpoint 2 - Diagnostico tecnico da migracao de engine
- Mapear uso atual de SQLite em runtime, config e scripts.
- Definir o alvo exato da migracao para PostgreSQL.
- Atualizar tasks com escopo tecnico aprovado.

Resultado do Checkpoint 2:
- Baseline confirmado: schema com users, disputas e pagamentos via migrations 001-003.
- Gap confirmado: status de migrations `down` no sequelize-cli, enquanto bootstrap em runtime garante criacao de tabelas.
- Gap confirmado: acoplamento direto a SQLite em `src/services/db.js` e `src/config/config.cjs`.
- Alvo definido:
	1) configurar Sequelize para PostgreSQL por variaveis de ambiente;
	2) ajustar sequelize-cli para migrations no PostgreSQL;
	3) eliminar dependencia obrigatoria de SQLite no runtime.
- models.md nao e necessario nesta spec porque nao ha alteracao de modelo de dados no novo escopo.

3. Checkpoint 3 - Implementacao da migracao
- Adicionar dependencias do PostgreSQL.
- Ajustar configuracao de conexao no runtime e no sequelize-cli.
- Criar estrategia de bootstrap de schema compatibilizada com PostgreSQL.
- Criar testes unitarios/integrais da mudanca.

4. Checkpoint 4 - Validacao final e fechamento
- Executar testes de migracao e regressao.
- Atualizar CHANGELOG com resumo da entrega.
- Revisar rastreabilidade completa da spec.

## Regra de models.md
- models.md sera criado somente se houver criacao ou modificacao de modelo de dados/payload/estrutura.
- Nesta spec, no escopo atual, models.md nao e necessario.
