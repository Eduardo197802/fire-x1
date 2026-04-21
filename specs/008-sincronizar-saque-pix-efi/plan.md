# Plano - Sincronizar Saque PIX Efi

## Estrategia
1. Adicionar consulta `pixSendDetail` no servico PIX.
2. Criar servico de sincronizacao de saques pendentes.
3. Proteger chamada operacional por rota administrativa.
4. Cobrir os cenarios de liquidacao confirmada e rejeicao em testes.

## Validacao
- Testes focados de saque PIX.
- Teste unitario/feature do sincronizador.
