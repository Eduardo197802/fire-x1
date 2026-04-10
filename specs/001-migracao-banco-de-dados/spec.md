# Spec 001 - Migracao SQLite para PostgreSQL

## Requisicao
Migrar a base de dados do projeto de SQLite para PostgreSQL com seguranca, rastreabilidade e validacao por testes.

## Objetivo
Definir e implementar a estrategia de migracao de engine de banco (SQLite -> PostgreSQL) sem quebrar funcionalidades existentes, preservando integridade dos dados e compatibilidade com os fluxos atuais.

## O que adiciona ou corrige
- Adiciona um plano estruturado para troca de engine de banco.
- Corrige dependencia de SQLite no runtime e na configuracao de ambiente.
- Formaliza validacoes de conectividade, migrations e regressao funcional por etapa.

## Escopo da Feature
- Levantar estado atual da configuracao e uso de SQLite no projeto.
- Definir alvo tecnico da migracao para PostgreSQL (config, conexao, migrations e bootstrap).
- Implementar ajustes de infraestrutura para rodar com PostgreSQL em desenvolvimento e testes.
- Validar compatibilidade com models, rotas e scripts existentes.
- Executar testes para garantir estabilidade apos a troca de engine.

## Modulos Impactados
- src/config/config.cjs
- src/services/db.js
- package.json
- .env
- src/migrations/
- specs/unit/
- specs/features/

## Diagnostico Tecnico do Estado Atual
- Existem 3 migrations versionadas: 001 users, 002 disputas, 003 pagamentos.
- O status do sequelize-cli indica migrations como `down`, embora a aplicacao crie tabelas via bootstrap em `src/services/db.js`.
- Hoje o banco depende de SQLite em `src/services/db.js` com `dialect: "sqlite"` e `storage: "./database.db"`.
- O arquivo `src/config/config.cjs` tambem esta orientado para SQLite nos ambientes.
- Essa estrategia limita portabilidade e dificulta alinhamento com ambientes produtivos baseados em PostgreSQL.

## Alvo da Migracao (Checkpoint 2)
1. Substituir dependencia de SQLite por PostgreSQL na inicializacao do Sequelize e configuracoes de ambiente.
2. Parametrizar conexao por variaveis de ambiente (host, porta, database, usuario, senha, ssl quando aplicavel).
3. Garantir que migrations do sequelize-cli funcionem contra PostgreSQL.
4. Remover acoplamento de criacao automatica de schema no bootstrap ou isola-lo por ambiente para evitar divergencia.
5. Preservar estrutura de tabelas users, disputas e pagamentos sem alterar regra de negocio nesta etapa.

## Decisao sobre models.md
- `models.md` nao e necessario nesta spec no escopo atual, pois a migracao e de engine (infraestrutura) e nao de modelo de dados.

## Criterios de Aceite
1. Projeto conecta em PostgreSQL com sucesso em ambiente local de desenvolvimento.
2. Migrations executam com sucesso no PostgreSQL via sequelize-cli.
3. Fluxos criticos continuam funcionais apos a troca de engine.
4. Testes de validacao da migracao passam.
5. Arquivos `database.db` e `database-Eduardo-Desktop.db` removidos do disco.
6. Toda alteracao fica rastreavel via spec.md -> plan.md -> tasks.md -> codigo/testes -> changelog.
