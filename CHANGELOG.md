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
- Corrigido o fluxo de `Adicionar crédito`: o CTA da dashboard agora navega para `conta/adicionar-fundo` em `src/app/dashboard/DashboardClient.js`.
- Implementada a acao do botao `Gerar deposito` em `src/app/conta/[slug]/ContaPageClient.js`, com validacao de valor, chamada `POST /api/pix/gerar` e exibicao de QR Code/codigo Pix no frontend.
- Adicionado fallback de geracao local de QR Code em `src/app/conta/[slug]/ContaPageClient.js` para exibir o QR mesmo quando a API PIX retornar apenas o codigo copia-e-cola.
- Corrigida a configuracao de producao do certificado Efí com `EFI_CERT_PATH` absoluto no servidor, eliminando ambiguidade de diretório e limpando o risco operacional de erro recorrente de certificado em novos deploys.
- Ajustada a migration `006-alter-money-columns-to-decimal.js` para tolerar schemas legados onde `pagamentos.valor` ou `users.saldo` ainda nao existam, adicionando a coluna antes do `changeColumn` quando necessario.
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
- Novo endpoint `GET /api/pix/total-recebido` com hardening em camadas: sessao valida, allowlist de operadores por `PIX_TOTAL_ALLOWED_USER_IDS`, token operacional via header `x-pix-total-token` com comparacao em tempo constante, rate limit por IP+usuario e retorno sem cache (`Cache-Control: no-store`).
- Endpoint de total PIX passou a exigir operador com `conta_liberada = 1` e `two_factor_enabled = 1` antes de executar a consulta agregada de depositos `creditado`.
- Cobertura de seguranca adicionada em `specs/features/pix/total-recebido.spec.js` para cenarios 503/401/403/429 e sucesso 200.

## 2026-04-19
- Fluxo de deposito PIX na aba `adicionar-fundo` passou a expirar em 5 minutos no frontend, com contador em tela e redirecionamento automatico para a dashboard ao fim do prazo em `src/app/conta/[slug]/ContaPageClient.js`.
- Adicionado polling de confirmacao de pagamento via novo endpoint `GET /api/pix/status` para encerrar o fluxo assim que o deposito for creditado e retornar para a dashboard com saldo atualizado.
- Criado endpoint seguro `src/app/api/pix/status/route.js` com autenticacao de sessao vinculada ao usuario, rate limit por IP+usuario, consulta restrita por `txid` + `tipo=deposito` + `metodo=pix` e resposta `no-store`.
- Dashboard ajustada para buscar dados com `cache: no-store` em `src/app/dashboard/DashboardClient.js`, evitando saldo antigo apos redirecionamento.
- Testes adicionados e validados para status PIX em `specs/features/pix/status.spec.js`.
- Dashboard passou a exibir toast contextual no retorno do fluxo PIX (`creditado`, `expirado`, `sessao-invalida`) com autoclose e limpeza de query params em `src/app/dashboard/DashboardClient.js`.

## 2026-04-19 (Fase 2 - Spec 004)
- Implementado o Checkpoint 1 da Spec 004 no banco de produção: 4 tabelas financeiras (`contas`, `transacoes`, `operacoes`, `caixa_plataforma`) com constraints, índices, trigger e 7 views.
- Tabela `contas` armazena saldo derivado de `transacoes` confirmadas, atualizada automaticamente por trigger para auditabilidade imutável.
- Tabela `transacoes` registra todas as movimentações financeiras (DEPOSITO, SAQUE, CREDITO_MANUAL, DEBITO_MANUAL, CONSUMO, PAGAMENTO_USUARIO, COMISSAO_PLATAFORMA, ESTORNO, TAXA) com status (pendente, confirmado, cancelado) e referência externa (txid PIX, requestId).
- Tabela `operacoes` armazena comissões por operação com constraint de integridade: `valor_bruto = comissao_plataforma + valor_liquido_usuario`.
- Tabela `caixa_plataforma` mantém caixa interno separado de saldo de usuários para rastreabilidade de fluxos.
- Function `fn_recalcular_saldo_conta(user_id)` implementada para recalcular saldo via SUM de `transacoes` com status confirmado, diferenciando entrada e saída.
- Trigger `tg_transacoes_recalcular_saldo` disparado AFTER INSERT/UPDATE/DELETE em `transacoes` para garantir que `contas.saldo` nunca fique desatualizado independente de qual camada escreveu.
- 7 views de relatório criadas: `vw_saldos_usuarios`, `vw_extrato_consolidado`, `vw_relatorio_diario`, `vw_financeiro_por_usuario`, `vw_receita_plataforma_diaria`, `vw_saldo_caixa_plataforma`, `vw_caixa_plataforma_diario`.
- Criados modelos Sequelize `src/models/Conta.js`, `src/models/Transacao.js`, `src/models/Operacao.js`, `src/models/CaixaPlataforma.js` com relacionamentos ao `User`.
- Implementado serviço financeiro em `src/services/financeiro.js` com 3 funções públicas: `registrarTransacao()`, `registrarOperacao()`, `registrarCaixaPlataforma()` com validações e logging.
- Atualizado `src/services/db.js` para registrar novos modelos e suas associações one-to-one e one-to-many com `User`.
- Testes iniciais adicionados em `specs/features/financeiro/fase2-modelos.spec.js` para validar estrutura de modelos e validações de serviço.

## 2026-04-19 (Fase 3 - Spec 004)
- Integrado registro de transações financeiras no webhook PIX: após creditar pagamento, chama `registrarTransacao()` com tipo=DEPOSITO, direcao=entrada, status=confirmado.
- Integrado registro de transações financeiras no endpoint de saque PIX: após concluir saque, chama `registrarTransacao()` com tipo=SAQUE, direcao=saida, status=confirmado.
- Ambas as integrações usam pattern best-effort com try/catch isolado: falha no registro de transação nunca reverte crédito do usuário ou débito da conta.
- Webhook PIX passa `referencia_externa=txid` e saque PIX passa `referencia_externa=requestId` para rastreabilidade cruzada com modelo legado `pagamentos`.
- Novos imports do serviço `financeiro.js` adicionados em ambos os endpoints: `registrarTransacao`.
- Testes iniciais para Fase 3 adicionados em `specs/features/financeiro/fase3-pix-integracao.spec.js` com mocks de falhas best-effort.

## 2026-04-19 (Fase 4 - Spec 004)
- Novo serviço de autenticação de administrador em `src/services/admin-auth.js` com pattern de 4 camadas: validação de sessão, allowlist de operadores, token operacional, atributos do usuário (conta_liberada + 2FA).
- Variáveis de ambiente: `ADMIN_FINANCEIRO_ALLOWED_USER_IDS` (lista separada por vírgula) e `ADMIN_FINANCEIRO_API_TOKEN` (token operacional).
- Novo endpoint `GET /api/admin/financeiro/resumo`: retorna resumo financeiro (total_entradas, total_saidas, liquido, receita_plataforma, custos, lucro_liquido) com autenticação obrigatória.
- Novo endpoint `GET /api/admin/financeiro/diario`: retorna relatório diário com filtro de período (parâmetros de, ate em YYYY-MM-DD), agrupa transações por data com qtd e totais.
- Novo endpoint `GET /api/admin/financeiro/usuarios`: retorna dados financeiros por usuário (saldo atual, total_entradas, total_saidas), suporta parâmetro limite (default 20, max 100).
- Novo endpoint `GET /api/admin/financeiro/caixa`: retorna movimentações de caixa da plataforma com filtro de período, inclui saldo_caixa calculado (entradas - saidas).
- Todos os 4 endpoints exigem sessão válida, ID do usuário na allowlist, token administrativo com timing-safe comparison, conta liberada e 2FA habilitado.
- Testes estruturais adicionados em `specs/features/admin/financeiro.spec.js` para validar autenticação, validação de entrada e estrutura de respostas (a ser completado com dados mockados).

## 2026-04-19 (Fase 5 - Spec 004 - Testes Finais)
- Testes expandidos para webhook PIX + transações em `specs/features/pix/webhook-transacao.spec.js` com 3 suites (registrarTransacao é chamado com campos corretos, falha não altera status do pagamento, validação de entrada).
- Testes expandidos para saque PIX + transações em `specs/features/pix/saque-transacao.spec.js` com 3 suites (registrarTransacao é chamado com campos corretos, falha não reverte saldo, validação de entrada e ordenação).
- Testes expandidos para endpoints admin em `specs/features/admin/financeiro.spec.js` com 7 suites (autenticação e autorização, validação de entrada, estrutura de respostas para resumo/diário/usuários/caixa, integração com dados financeiros).
- Todos os testes usam mocks Jest com validação de chamadas de função, estrutura de dados e lógica de cálculo.
- Cobertura total de 4 Fases em Spec 004 (infraestrutura DB, modelos e serviço, integração PIX, API admin) com 1 Checkpoint final de validação.

## Resumo Executivo - Spec 004 - Modelo Financeiro Completo
**Status**: ✅ Completada com sucesso em 2026-04-19

**Entregas**:
- 3 migrations SQL (010, 011, 012) criando 4 tabelas financeiras, trigger com função PostgreSQL, 7 views de relatório.
- 4 modelos Sequelize (Conta, Transacao, Operacao, CaixaPlataforma) com BIGINT PKs e DECIMAL(14,2) para valores monetários.
- Serviço financeiro (src/services/financeiro.js) com 3 funções validadas (registrarTransacao, registrarOperacao, registrarCaixaPlataforma).
- Integração best-effort com webhook PIX (DEPOSITO) e saque PIX (SAQUE) sem bloquear operações em caso de falha no registro.
- 4 endpoints admin autenticados (resumo, diário, usuários, caixa) com 4 camadas de segurança (sessão, allowlist, token operacional, atributos do usuário).
- 31 casos de teste estruturais e funcionais cobrindo autenticação, validação, estrutura de respostas, cálculos financeiros e integração.

**Riscos Mitigados**:
- Trigger com bug: transações registradas FORA da transação atômica do PIX com try/catch isolado.
- Inconsistência de dados: trigger no banco recalcula saldo automaticamente para qualquer escrita.
- Acesso não autorizado: 4 camadas de autenticação em endpoints admin, nenhuma dados expostos sem autorização.
- Perda de dados: todas as migrations com IF NOT EXISTS, idempotentes, com reversão segura.

**Decisões de Design Confirmadas**:
- Coexistência com tabela `pagamentos`: novo modelo convive com legado para rollback seguro; remoção em spec futura.
- Registros best-effort: falha no registro de transação não reverte crédito/débito PIX já efetivado.
- Saldo no banco via trigger: evita divergências entre aplicativo e BD; sempre correto em acessos diretos.

**Próximas Ações Recomendadas**:
- Monitorar volume de transações em produção; avaliar desnormalização se overhead de trigger for alto.
- Após 1 mês de operação, migrar dados históricos de `pagamentos` para `transacoes` e deprecar coluna (Spec 005).
- Expandir endpoints admin com autenticação de 2FA (já validada), exportação PDF/Excel (Spec 004 mencionava, descopo neste checkpoint).

## 2026-04-19 (Fase 6 - Hardening Login Admin)
- Implementado fluxo de autenticação administrativa em duas etapas com `POST /api/admin/auth/login` (senha forte + envio de código 2FA por e-mail) e `POST /api/admin/auth/verify` (validação do código e liberação de sessão admin).
- Criado `src/services/admin-session.js` com cookies HttpOnly `firex1_admin_pending` (curta duração) e `firex1_admin_session` (sessão administrativa), ambos assinados por HMAC e com `SameSite=Strict`.
- Adicionados endpoints `GET /api/admin/auth/session` e `POST /api/admin/auth/logout` para validação de sessão ativa e encerramento seguro.
- `src/services/admin-auth.js` evoluído para aceitar sessão admin autenticada por 2FA sem exigir token manual no frontend, mantendo fallback legado com token operacional para compatibilidade.
- Página `src/app/admin/financeiro/AdminFinanceiroClient.js` refatorada para exibir tela de login admin + etapa de código 2FA e liberar relatórios automaticamente após autenticação.
- Estilos da UI admin atualizados em `src/app/admin/financeiro/page.module.css` para novo fluxo de acesso seguro.
- Risco residual: rate limit está em memória de processo (`src/services/rate-limit.js`), exigindo backend compartilhado (Redis) em cenário multi-instância para proteção distribuída.

## 2026-04-19 (Fase 7 - Centralizacao Admin com Abas)
- Criado layout compartilhado em `src/app/admin/layout.js` com navegação por abas para todas as áreas administrativas.
- Implementado componente cliente de abas em `src/app/admin/AdminTabs.js` com destaque de rota ativa.
- Adicionado redirecionamento de entrada em `src/app/admin/page.js` para `admin/financeiro`.
- Criadas novas páginas base dentro de admin: `usuarios`, `pix`, `transacoes`, `caixa`, `seguranca` e `relatorios`.
- Adicionados estilos comuns para seções administrativas em `src/app/admin/section.module.css` e estilos de navegação em `src/app/admin/layout.module.css`.

## 2026-04-19 (Fase 8 - Pendencias Admin Seguro)
- Implementado endpoint `GET /api/admin/auth/session` em `src/app/api/admin/auth/session/route.js` para validar sessão administrativa por cookie e liberar dados do operador autenticado.
- Implementado endpoint `POST /api/admin/auth/request-link` em `src/app/api/admin/auth/request-link/route.js` com resposta neutra anti-enumeração e rate limit de 3 requisições por minuto por IP.
- Implementado fluxo de consumo de link temporário em `GET /admin/acesso/[token]` (`src/app/admin/acesso/[token]/route.js`) com uso único do token e criação de sessão pendente.
- Adicionado serviço `src/services/admin-access-link.js` para geração de token seguro (`crypto.randomBytes`), armazenamento por hash SHA-256 e validação de autorização do administrador antes do envio.
- Adicionada migration `src/migrations/013-create-admin-access-links.js` para tabela `admin_access_links` com índices por e-mail, expiração e uso.
- Serviço de e-mail evoluído em `src/services/email.js` com envio de link administrativo (`sendAdminAccessLinkEmail`).
