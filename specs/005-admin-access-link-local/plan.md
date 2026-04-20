# Plan 005 - Correção do Link Administrativo Local

## Estratégia
1. Diagnosticar a falha do endpoint de solicitação de link pelo log do Next.
2. Corrigir a configuração de banco para aceitar `DATABASE_URL`.
3. Corrigir a geração de links administrativos em ambiente local.
4. Remover segredo hardcoded de scripts auxiliares.
5. Validar com teste de configuração e tentativa de conexão.

## Riscos
- A senha real do serviço PostgreSQL local pode estar diferente do `.env`.
- A rota retorna mensagem neutra por segurança, então a validação deve observar log/DB.
