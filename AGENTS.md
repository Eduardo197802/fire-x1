# AGENTS

## Objetivo
Este arquivo define a metodologia operacional para execução de demandas no repositório com rastreabilidade, padronização documental e controle de progresso por spec.

## Estrutura Obrigatória na Raiz
- AGENTS.md
- project.md
- architecture.md
- CHANGELOG.md

## Estrutura de Specs
As especificações ficam em `specs/` no formato:

- `specs/NNN-feature/`

Onde:
- `NNN` é sequencial por ordem de pedido
- Inicia em `000`
- `feature` é um resumo curto e legível

## Arquivos por Spec
Obrigatórios:
- `spec.md`
- `plan.md`
- `tasks.md`

Condicional:
- `models.md` somente quando houver criação ou alteração de modelo de dados (payload, tabela, contrato de estrutura, template estrutural).

## Fluxo Operacional
1. Criar pasta da spec no padrão `NNN-feature`.
2. Documentar escopo em `spec.md`.
3. Definir estratégia em `plan.md`.
4. Derivar execução em `tasks.md`.
5. Criar `models.md` apenas quando aplicável.
6. Implementar código e testes com rastreabilidade para os itens de `tasks.md`.
7. Atualizar `CHANGELOG.md` ao final de cada entrega relevante.

## Regra de Confirmação por Etapa
- O trabalho avança por checkpoints.
- Após concluir um checkpoint, deve haver validação e confirmação do solicitante antes do próximo.

## Rastreabilidade
Toda alteração relevante deve poder ser rastreada por esta cadeia:

`spec.md -> plan.md -> tasks.md -> código/testes -> CHANGELOG.md`

## Coexistência com Estrutura Legada
A adoção do padrão `NNN-feature` não remove automaticamente estruturas legadas em `specs/features`, `specs/unit`, `specs/fixtures` e `specs/support`. Migrações do legado devem ser tratadas em specs dedicadas.
