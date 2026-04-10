# Spec 002 - PIX Deposito, Webhook e Saque

## Requisicao
Implementar recebimento e pagamento via PIX no site, com:
- deposito por QR Code dinamico
- confirmacao automatica por webhook
- saque via PIX

A integracao deve usar EfI Bank, com credenciais e certificado ja existentes no projeto.

## Objetivo
Entregar fluxo completo de carteira PIX no produto:
1. gerar cobranca PIX para deposito do usuario
2. confirmar pagamento automaticamente
3. creditar saldo do usuario
4. permitir saque via PIX com validacoes de seguranca

## O que adiciona ou corrige
- Substitui placeholder atual de PIX por integracao real de cobranca.
- Adiciona webhook para conciliacao automatica de pagamentos.
- Adiciona fluxo de saque PIX com validacao de saldo e rastreabilidade.
- Formaliza trilha de auditoria de transacoes financeiras.

## Escopo da Feature
- Criar endpoint de deposito PIX para gerar cobranca imediata e QR Code.
- Criar endpoint de webhook PIX para confirmar pagamentos.
- Criar endpoint de saque PIX para transferencia ao usuario.
- Persistir transacoes PIX no banco e atualizar saldo de forma transacional.
- Proteger fluxos com validacoes obrigatorias de seguranca.

## Modulos Impactados
- src/app/api/pix/gerar/route.js
- src/app/pix/gerar/route.js
- src/app/api/pix/webhook/route.js
- src/app/api/pix/saque/route.js
- src/services/db.js
- src/models/Pagamento.js
- src/models/User.js
- src/migrations/
- specs/features/
- specs/unit/

## Criterios de Aceite
1. Deposito gera cobranca PIX dinamica com txid e dados de QR Code.
2. Webhook processa pagamento recebido e credita saldo somente uma vez por txid.
3. Saque PIX valida saldo, chave do usuario e registra operacao.
4. Todas as operacoes financeiras ficam registradas com status rastreavel.
5. Testes cobrindo cenarios de sucesso e principais falhas passam.
6. Implementacao segue rastreabilidade spec.md -> plan.md -> tasks.md -> codigo/testes -> changelog.
