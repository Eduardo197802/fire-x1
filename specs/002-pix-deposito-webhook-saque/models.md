# Models - Spec 002

## Motivo da Existencia deste Arquivo
Este arquivo e necessario nesta spec porque ha alteracao de modelo de dados para suportar transacoes PIX com idempotencia e rastreabilidade.

## Estrutura Atual Relevante
- Tabela users possui saldo.
- Tabela pagamentos possui tipo, valor, status, metodo e origem.

## Evolucao Proposta
Ajustar tabela pagamentos para suportar ciclo completo de PIX sem criar tabela paralela nesta etapa.

### Novos campos em pagamentos
- txid (text, unico, null inicialmente)
- efi_end_to_end_id (text, null)
- chave_pix_destino (text, null)
- descricao (text, null)
- payload_br_code (text, null)
- qr_code_imagem (text, null)
- webhook_recebido_em (text, null)
- processado_em (text, null)

### Convencao de uso
- tipo: deposito | saque
- metodo: pix
- status:
  - pendente
  - confirmado
  - creditado
  - em_processamento
  - concluido
  - falha
  - cancelado

## Regras de Integridade
- txid deve ser unico quando presente.
- webhook de deposito deve ser idempotente por txid.
- saldo so pode ser creditado uma vez para o mesmo txid.
- saque nao pode prosseguir com saldo insuficiente.

## Fluxo de Estados (Maquina de Estados)
### Deposito PIX
1. pendente -> confirmado: webhook recebido e validado.
2. confirmado -> creditado: credito efetivado em saldo e transacao finalizada.
3. pendente -> falha: expiracao, rejeicao ou inconsistencia de validacao.

### Saque PIX
1. em_processamento -> concluido: provedor confirma pagamento.
2. em_processamento -> falha: erro de envio ou rejeicao pelo provedor.
3. em_processamento -> cancelado: cancelamento administrativo antes da liquidacao.

## Regras de Idempotencia por Operacao
### Deposito (webhook)
- Chave de idempotencia: txid.
- Se transacao ja estiver em estado creditado, ignorar novo evento e retornar sucesso idempotente.
- Atualizacao de saldo e status devem ocorrer na mesma transacao de banco.

### Saque
- Chave de idempotencia: identificador interno da requisicao de saque.
- Reenvio da mesma requisicao nao deve gerar novo debito.
- Erro apos debito deve registrar falha e manter trilha para compensacao.

## Regras de Seguranca de Saque
- Chave PIX usada no saque deve ser previamente cadastrada pelo usuario.
- Nao permitir informar chave diferente no momento da requisicao de saque.
- Valor de saque deve ser maior que zero e menor ou igual ao saldo disponivel.
- Conta do usuario deve estar liberada para operacoes financeiras.
- Todas as tentativas (sucesso/falha) devem ser registradas para auditoria.

## Observacoes
- Em uma fase futura pode ser criada tabela dedicada de transacoes financeiras.
- Nesta entrega manteremos compatibilidade com modelo atual de pagamentos.
