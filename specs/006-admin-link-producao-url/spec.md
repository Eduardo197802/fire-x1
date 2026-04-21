# Spec 006 - URL Publica do Link Administrativo em Producao

## Requisicao
Corrigir o link de acesso administrativo enviado por e-mail no site em producao.

## Problema
O e-mail de acesso administrativo chegou com URL local:

`http://localhost:3000/admin/acesso/:token`

No ambiente publico, o link deve apontar para:

`https://firex1play.com.br/admin/acesso/:token`

## Objetivo
Garantir que links administrativos enviados em producao nunca usem host local, mesmo quando a variavel de ambiente de URL base estiver ausente ou configurada incorretamente como `localhost`.

## Escopo
- Ajustar `src/services/admin-access-link.js`.
- Cobrir a resolucao da URL base por teste unitario.
- Atualizar `CHANGELOG.md`.

## Criterios de Aceite
1. Em producao, `ADMIN_APP_BASE_URL=http://localhost:3000` deve resultar em `https://firex1play.com.br`.
2. Em producao, requisicoes com `host=localhost:3000` devem resultar em `https://firex1play.com.br`.
3. Em desenvolvimento local, requisicoes `localhost` continuam usando a URL local.
4. URLs publicas configuradas continuam sendo respeitadas.
