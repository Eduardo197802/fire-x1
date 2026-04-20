# Spec 005 - Correção do Link Administrativo Local

## Requisição
Corrigir o fluxo de solicitação de link administrativo para o e-mail informado no ambiente local.

## Objetivo
1. Garantir que a conexão do app use `DATABASE_URL` quando configurada.
2. Evitar que links gerados em `localhost` apontem para a URL pública.
3. Remover credenciais hardcoded dos scripts auxiliares de migração.
4. Facilitar diagnóstico quando o PostgreSQL local recusar autenticação.

## Escopo
- Ajustar conexão runtime em `src/services/db.js`.
- Ajustar configuração do sequelize-cli em `src/config/config.cjs`.
- Ajustar resolução de base URL em `src/services/admin-access-link.js`.
- Ajustar scripts `migrate-financial.mjs` e `migrate2.mjs` para ler `.env`.
- Criar script operacional para resetar a senha local do PostgreSQL lendo `DB_PASSWORD` do `.env`.

## Critérios de Aceite
1. O app prefere `DATABASE_URL` quando ela existir.
2. Solicitações locais geram links com host local da própria requisição.
3. Não há senha de banco hardcoded nos scripts alterados.
4. O erro restante, se houver, fica limitado à credencial do PostgreSQL local.
