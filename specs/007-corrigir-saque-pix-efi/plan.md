# Plano - Corrigir Saque PIX Efi

## Estrategia
1. Usar os erros gravados em `pagamentos.descricao` para identificar o contrato rejeitado pela Efi.
2. Conferir o exemplo local do SDK `gn-api-sdk-node` para `pixSend`.
3. Extrair a montagem do request de saque para uma funcao testavel.
4. Corrigir `sendPixWithdraw` para enviar pagador e favorecido conforme contrato.
5. Executar testes focados no saque PIX.

## Riscos
- A API real da Efi pode exigir configuracao operacional adicional da conta para envio PIX.
- O ambiente de servidor ainda precisa estar com `EFI_PIX_KEY`, certificado e credenciais corretos.

## Validacao
- Teste unitario do contrato do payload.
- Teste de feature do endpoint de saque ja existente.
