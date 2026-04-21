# Models - Solicitacao de Alteracao de Chave PIX

## pix_change_requests

- `id`: bigint, primary key
- `user_id`: bigint, obrigatorio
- `chave_pix_atual`: text
- `nova_chave_pix`: text, obrigatorio
- `motivo`: text
- `status`: text, `pendente`, `aprovada`, `rejeitada`, `cancelada`
- `admin_id`: bigint, opcional
- `admin_observacao`: text, opcional
- `criado_em`: timestamp
- `processado_em`: timestamp, opcional

## Auditoria
- A aprovacao deve registrar admin, data e observacao.
- A chave em `users.chave_pix` muda somente quando `status=aprovada`.
