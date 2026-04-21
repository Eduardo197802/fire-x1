# Models - Controle de Sessoes de Usuario

## user_sessions

- `id`: bigint, primary key
- `user_id`: bigint, obrigatorio
- `session_id`: text, obrigatorio, unico por sessao
- `status`: text, valores `ativa`, `revogada`, `expirada`
- `user_agent`: text, opcional
- `ip_hash`: text, opcional
- `criado_em`: timestamp
- `expira_em`: timestamp
- `revogado_em`: timestamp, opcional

## Regra de Negocio
- Apenas uma sessao `ativa` por `user_id`.
- Novo login revoga sessoes anteriores do mesmo usuario.
