# Spec 010 - Controle de Sessoes de Usuario

## Requisicao
Implementar limite de sessoes simultaneas por usuario, com regra inicial recomendada de uma sessao ativa por vez.

## Objetivo
Impedir que a mesma conta mantenha sessoes concorrentes sem controle, reduzindo risco operacional e abuso.

## Escopo
- Criar persistencia de sessao ativa por usuario.
- Invalidar sessoes antigas quando novo login ocorrer.
- Validar sessao em rotas protegidas contra o registro ativo.
- Permitir evolucao futura para controle por dispositivo.

## Regra Inicial
- `1` sessao ativa por usuario.
- Novo login invalida sessoes anteriores.

## Criterios de Aceite
1. Login cria/atualiza registro de sessao ativa.
2. Token antigo passa a ser recusado apos novo login.
3. Logout invalida a sessao ativa correspondente.
4. Testes cobrem login concorrente e acesso com sessao antiga.
