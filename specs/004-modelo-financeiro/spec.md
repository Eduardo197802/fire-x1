# Spec 004 - Modelo Financeiro Completo

## Requisicao
Migrar o modelo de dados financeiro atual (saldo direto em `users`, transacoes em `pagamentos`) para uma arquitetura estruturada com controle de caixa da plataforma, auditoria completa e suporte a relatorios por periodo.

## Objetivo
1. Substituir o campo `saldo` direto em `users` por uma conta derivada de transacoes.
2. Criar trilha de auditoria financeira imutavel por usuario.
3. Separar receita da plataforma do saldo dos usuarios.
4. Habilitar relatorios de entradas, saidas, lucro liquido e caixa da plataforma.
5. Manter compatibilidade com o fluxo PIX ja existente (deposito, webhook, saque).

## O que adiciona ou corrige
- Cria tabela `contas` como projecao do saldo derivado de transacoes.
- Cria tabela `transacoes` como registro imutavel de cada movimentacao financeira.
- Cria tabela `operacoes` para capturar comissoes e valor liquido por operacao.
- Cria tabela `caixa_plataforma` para controle do caixa interno.
- Cria trigger PostgreSQL para manter `contas.saldo` sincronizado com `transacoes`.
- Cria views de relatorio (saldos, extrato, diario, financeiro, receita, caixa).
- Adapta fluxo PIX para registrar em `transacoes` alem de `pagamentos`.

## Escopo da Feature
- Migration para criacao das novas tabelas com constraints e indices.
- Migration para criacao do trigger e function de recalculo de saldo.
- Migration para criacao das views de relatorio.
- Adaptacao do webhook PIX para registrar transacao de entrada ao creditar.
- Adaptacao do saque PIX para registrar transacao de saida ao debitar.
- API de relatorio financeiro para o admin (autenticada por perfil de operador).
- Nao remover `pagamentos` e `users.saldo` nesta entrega para rollback seguro.

## Modulos Impactados
- src/migrations/ (novas migrations 010 a 013)
- src/app/api/pix/webhook/route.js
- src/app/api/pix/saque/route.js
- src/services/db.js (novos modelos Conta, Transacao, Operacao, CaixaPlataforma)
- src/models/ (novos arquivos)
- src/app/api/admin/financeiro/ (novos endpoints de relatorio)

## Criterios de Aceite
1. As 4 novas tabelas existem no banco com constraints e indices.
2. Trigger mantem `contas.saldo` sincronizado automaticamente apos cada INSERT/UPDATE/DELETE em `transacoes`.
3. Deposito PIX creditado registra transacao `DEPOSITO / entrada / confirmado`.
4. Saque PIX concluido registra transacao `SAQUE / saida / confirmado`.
5. Views de relatorio retornam dados corretos sem expor informacoes de outros usuarios.
6. Endpoints de relatorio exigem autenticacao de operador autorizado.
7. Tabelas e colunas existentes nao sao removidas para permitir rollback.
8. Testes cobrindo registro de transacao no webhook e no saque passam.
