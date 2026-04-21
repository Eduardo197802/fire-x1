# Spec 012 - Admin Depositos com Erro

## Requisicao
Criar funcionalidade no painel administrativo para buscar depositos por codigo/comprovante enviado pelo usuario, validar manualmente a transacao, adicionar credito manual apos conferencia e manter historico/log da acao.

## Objetivo
Dar suporte operacional a depositos PIX com erro, divergencia ou webhook ausente, sem perder auditoria.

## Escopo
- Buscar deposito por txid, codigo copia-e-cola, valor, usuario ou referencia informada.
- Registrar analise manual.
- Permitir credito manual ao usuario apos conferencia.
- Manter log de admin, data, motivo, valor e referencia.

## Criterios de Aceite
1. Admin encontra depositos pendentes/falhos por filtros operacionais.
2. Admin pode registrar validacao manual com justificativa.
3. Credito manual atualiza saldo/transacao financeira com referencia.
4. Acoes ficam auditaveis.
