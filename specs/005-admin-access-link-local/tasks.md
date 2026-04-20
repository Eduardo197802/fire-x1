# Tasks 005 - Correcao do Link Administrativo Local

- [x] 1. Identificar erro real no log ao solicitar link administrativo.
- [x] 2. Ajustar `src/services/db.js` para preferir `DATABASE_URL`.
- [x] 3. Ajustar `src/config/config.cjs` para sequelize-cli aceitar `DATABASE_URL`.
- [x] 4. Ajustar `src/services/admin-access-link.js` para usar host local em requisicoes localhost.
- [x] 4.1 Registrar URL bruta do link em ambiente de desenvolvimento para desbloquear teste local quando SMTP externo falhar.
- [x] 5. Remover senha hardcoded de `migrate-financial.mjs` e `migrate2.mjs`.
- [x] 6. Criar script de reset local do PostgreSQL para execucao como Administrador.
- [x] 7. Validar conexao com PostgreSQL local.
- [x] 8. Validar criacao e aceite do link administrativo local.
- [ ] 8.1 Validar envio de e-mail pelo SMTP externo.
- [x] 9. Atualizar `CHANGELOG.md`.

## Pendencia Externa
O envio de e-mail pelo SMTP externo ainda falha com rejeicao do remetente `cadastro@firex1play.com.br` pelo provedor. O fluxo local fica desbloqueado pelo log `Admin access link dev url=...`.
