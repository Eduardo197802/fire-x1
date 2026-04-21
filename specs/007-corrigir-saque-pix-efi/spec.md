# Spec 007 - Corrigir Saque PIX Efi

## Requisicao
Diagnosticar e corrigir falha no saque PIX em producao/servidor.

## Diagnostico
Os registros recentes de saque em `pagamentos.descricao` indicaram rejeicao da Efi no endpoint de envio PIX:
- `idEnvio` deve ser alfanumerico com 1 a 35 caracteres.
- O payload nao pode conter propriedades fora do contrato.
- O payload deve conter a propriedade obrigatoria `favorecido`.

## Objetivo
Corrigir o payload enviado para a Efi no saque PIX, preservando idempotencia, debito/reversao de saldo e rastreabilidade existentes.

## Escopo
- Ajustar a montagem do corpo de `pixSend`.
- Garantir que a chave PIX pagadora seja a chave configurada da conta Efi.
- Garantir que a chave PIX favorecida seja a chave cadastrada pelo usuario.
- Adicionar teste de contrato do payload de saque.

## Fora de Escopo
- Alterar modelo de dados.
- Alterar fluxo de deposito ou webhook.
- Trocar credenciais, certificado ou configuracao de ambiente.

## Criterios de Aceite
1. `sendPixWithdraw` monta payload com `pagador.chave` e `favorecido.chave`.
2. `idEnvio` continua sanitizado no padrao aceito pela Efi.
3. Testes de saque PIX e contrato de payload passam.
4. `CHANGELOG.md` registra a correcao.
