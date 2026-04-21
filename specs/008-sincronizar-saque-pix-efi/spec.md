# Spec 008 - Sincronizar Saque PIX Efi

## Requisicao
Permitir confirmar saques PIX que ficaram em `em_processamento` apos a Efi aceitar a solicitacao inicial.

## Objetivo
Consultar a Efi para saques PIX pendentes e atualizar o status local conforme a liquidacao real.

## Escopo
- Consultar status de envio PIX por `endToEndId`.
- Atualizar saque pendente para `concluido` quando a Efi confirmar liquidacao.
- Atualizar saque pendente para `falha` e devolver saldo quando a Efi rejeitar/cancelar.
- Expor endpoint administrativo para executar a sincronizacao sob autenticacao admin.

## Criterios de Aceite
1. Saques `em_processamento` podem ser sincronizados com a Efi.
2. Saque confirmado registra transacao financeira de saida uma unica vez.
3. Saque rejeitado devolve saldo ao usuario e marca pagamento como `falha`.
4. Endpoint admin exige sessao administrativa valida.
