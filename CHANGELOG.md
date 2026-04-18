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
- Concluida a Spec 003 em `specs/003-ajuste-data-nascimento-mobile/` com correcao visual do campo `Data de nascimento` no mobile.
- Padronizado o input `type="date"` no modal de cadastro da home em `src/app/page.module.css`, alinhando dimensoes e comportamento com os demais campos.

## 2026-04-18
- Endurecida a autenticacao de sessao com cookie HttpOnly `firex1_session` no login e logout por servidor em `src/app/api/user/[...slug]/route.js`.
- Endpoints protegidos agora aceitam sessao por cookie assinado no servidor via `src/services/session-auth.js`, reduzindo exposicao de token em `localStorage`.
- Dashboard e perfil foram ajustados para consumir sessao por cookie, mantendo apenas dados publicos do usuario no cliente.
- Endpoints financeiros PIX (`gerar`, `saque`, `webhook`) receberam rate limit em memoria via `src/services/rate-limit.js`.
- Operacoes monetarias criticas de PIX passaram a usar arredondamento por centavos via `src/services/money.js`.
- Modelos e migrations base de `users.saldo` e `pagamentos.valor` foram preparados para `DECIMAL(14,2)` e criada a migration `006-alter-money-columns-to-decimal.js` para rollout controlado.
- Rotas sensiveis de conta (`alterar-senha`, `seguranca/acesso`, `2fa/cadastrar`, `2fa/ativar`, `2fa/desativar` e `notificacoes/aposta`) agora exigem sessao autenticada vinculada ao `userId` da operacao e possuem rate limit nas acoes criticas.
- Suite validada apos endurecimento: `specs/features/auth/login.spec.js`, `specs/features/conta/dashboard.spec.js`, `specs/features/pix/deposito.spec.js`, `specs/features/pix/saque.spec.js` e `specs/features/pix/webhook.spec.js`.
- Rotas publicas de verificacao de conta protegidas por rate limit de IP: `verificar` (10/10min), `reenviar-codigo` (5/10min), `recuperar-senha/solicitar` (5/15min) e `recuperar-senha/redefinir` (10/10min) via helper `enforcePublicRouteRateLimit`.
- Testes de 429 adicionados em `specs/features/auth/verificacao.spec.js` com mock do `consumeRateLimit`.
