# Plan - Spec 002

## Estrategia de Implementacao
A entrega sera feita por checkpoints com validacao automatizada e confirmacao do solicitante antes de avancar.

## Tecnologias e Ferramentas
- Next.js Route Handlers
- Sequelize
- PostgreSQL
- SDK EfI Bank (gerencianet)
- Jest

## Planejamento Passo a Passo
1. Checkpoint 1 - Estrutura da spec
- Criar spec.md, plan.md, tasks.md e models.md para a feature 002.
- Criar teste para validar estrutura da spec.

2. Checkpoint 2 - Contrato de dados e seguranca
- Definir modelagem de transacoes PIX e estados.
- Definir regras antifraude e idempotencia por txid.
- Definir validacoes de saque (saldo, chave, autorizacao).

Resultado do Checkpoint 2:
- Contrato de dados consolidado em models.md com campos adicionais de rastreabilidade PIX em pagamentos.
- Maquina de estados definida para deposito (pendente -> confirmado -> creditado) e saque (em_processamento -> concluido/falha/cancelado).
- Idempotencia definida por txid para webhook de deposito e por identificador interno para saque.
- Regra de seguranca confirmada: saque usa chave PIX previamente cadastrada e nao aceita alteracao no momento da solicitacao.

3. Checkpoint 3 - Deposito PIX
- Implementar endpoint de geracao de cobranca PIX.
- Persistir transacao com status inicial.
- Retornar payload consumivel no frontend (imagem QR / copia e cola / txid).

4. Checkpoint 4 - Webhook PIX
- Implementar endpoint webhook.
- Validar evento e conciliar por txid com idempotencia.
- Creditar saldo do usuario e atualizar status da transacao.

5. Checkpoint 5 - Saque PIX
- Implementar endpoint de saque com regras de seguranca.
- Debitar saldo de forma segura e registrar transacao.
- Tratar falhas e estados de processamento.

6. Checkpoint 6 - Validacao final
- Executar testes unitarios e de fluxo da feature.
- Atualizar CHANGELOG com fechamento da spec 002.

## Regras de Seguranca Obrigatorias
- Nunca confiar no valor vindo do cliente sem validacao.
- Garantir idempotencia no webhook para impedir credito duplicado.
- Nao permitir alterar chave PIX no momento do saque.
- Registrar eventos criticos para auditoria.
