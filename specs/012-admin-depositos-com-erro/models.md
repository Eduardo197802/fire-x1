# Models - Admin Depositos com Erro

## admin_financial_actions

- `id`: bigint, primary key
- `admin_id`: bigint, obrigatorio
- `user_id`: bigint, opcional
- `tipo`: text, exemplo `CREDITO_MANUAL_DEPOSITO`
- `valor`: decimal, opcional
- `referencia`: text, opcional
- `motivo`: text, obrigatorio
- `metadata`: json/text, opcional
- `criado_em`: timestamp

## Regras
- Credito manual deve criar transacao `CREDITO_MANUAL` ou `DEPOSITO` conforme decisao operacional.
- Toda acao exige admin autenticado e justificativa.
