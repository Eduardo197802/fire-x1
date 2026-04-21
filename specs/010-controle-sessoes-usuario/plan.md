# Plano - Controle de Sessoes de Usuario

## Checkpoint 1 - Modelo
- Criar tabela `user_sessions` ou colunas equivalentes de controle.
- Registrar `user_id`, `session_id`, `criado_em`, `expira_em`, `revogado_em`, `user_agent` e `ip_hash`.

## Checkpoint 2 - Autenticacao
- Incluir `sessionId` no token.
- Persistir sessao no login.
- Validar `sessionId` em `authenticateUserRequest`.

## Checkpoint 3 - Logout e Testes
- Revogar sessao no logout.
- Cobrir concorrencia de login e token antigo.
