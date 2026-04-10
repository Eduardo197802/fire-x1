# Changelog

Todas as mudanças relevantes deste projeto devem ser registradas neste arquivo.

## 2026-04-10
- Adotada estrutura de governança documental na raiz do repositório com `AGENTS.md`, `project.md`, `architecture.md` e `CHANGELOG.md`.
- Definido padrão de specs por feature em `specs/NNN-feature/`, com obrigatoriedade de `spec.md`, `plan.md` e `tasks.md`.
- Definido `models.md` como arquivo condicional, criado somente quando houver criação ou alteração de modelo de dados.
- Definida coexistência com a estrutura legada de testes em `specs/features`, `specs/unit`, `specs/fixtures` e `specs/support`.
- Concluída a Spec 000 em `specs/000-repository-documentation-structure/` com `spec.md`, `plan.md` e `tasks.md`.
- Adicionados testes de governança para validar estrutura raiz, estrutura da spec 000 e consistência documental.
- Concluída a Spec 001 em `specs/001-migracao-banco-de-dados/` — migração de engine de banco SQLite para PostgreSQL.
- Substituído dialeto SQLite por PostgreSQL em `src/config/config.cjs` e `src/services/db.js`.
- Conexão do banco agora parametrizada via variáveis de ambiente (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`).
- Bootstrap automático de schema isolado pela flag `DB_BOOTSTRAP_SCHEMA` para evitar divergência com migrations formais.
- Dependências `pg` e `pg-hstore` adicionadas ao projeto.
- Concluída a Spec 002 em `specs/002-pix-deposito-webhook-saque/` com implementação de depósito, webhook e saque PIX.
- Implementado depósito PIX real em `src/app/api/pix/gerar/route.js` com geração de cobrança Efí e persistência de pagamento pendente.
- Implementado webhook PIX em `src/app/api/pix/webhook/route.js` com idempotência por `txid` e crédito transacional de saldo.
- Implementado saque PIX em `src/app/api/pix/saque/route.js` com validação de saldo, chave PIX cadastrada e idempotência por `requestId`.
- Criado serviço de integração PIX em `src/services/pix.js`.
- Evoluídos modelos e migrations para suporte PIX (`004-add-pix-columns-to-pagamentos.js` e `005-add-chave-pix-to-users.js`).
- Testes da feature PIX adicionados e validados: `specs/features/pix/deposito.spec.js`, `specs/features/pix/webhook.spec.js` e `specs/features/pix/saque.spec.js`.
