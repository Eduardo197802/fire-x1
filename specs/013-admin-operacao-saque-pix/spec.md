# Spec 013 - Admin Operacao Saque e PIX

## Requisicao
Criar funcionalidade administrativa para tratamento de problemas com saque e PIX, incluindo visualizacao de solicitacoes de saque, analise manual, aprovacao, rejeicao/correcao, reprocessamento de transacoes com erro e logs.

## Objetivo
Transformar o acompanhamento de saque PIX em fluxo operacional administravel, reduzindo dependencia de console/logs.

## Escopo
- Listar saques por status, usuario, valor e periodo.
- Exibir detalhes da requisicao e retorno da Efi.
- Permitir sincronizar/reprocessar saques pendentes.
- Permitir rejeicao manual com devolucao de saldo quando aplicavel.
- Registrar log de todas as acoes administrativas.

## Criterios de Aceite
1. Admin visualiza saques `em_processamento`, `concluido` e `falha`.
2. Admin pode sincronizar saque pendente com a Efi.
3. Admin pode rejeitar/corrigir saque com justificativa.
4. Reprocessamento e correcoes mantem historico auditavel.
