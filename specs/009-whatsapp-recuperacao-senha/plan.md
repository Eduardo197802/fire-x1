# Plano - WhatsApp e Recuperacao de Senha

## Checkpoint 1 - Contrato e Configuracao
- Definir variaveis `WHATSAPP_PROVIDER`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_TEMPLATE_RECUPERACAO`.
- Criar servico `src/services/whatsapp.js` com provider `meta-cloud`.
- Manter provider mock/desabilitado para desenvolvimento.

## Checkpoint 2 - Backend
- Integrar `sendVerificationMessage` ao canal `whatsapp`.
- Ajustar `POST /api/user/recuperar-senha/solicitar` para validar canal.
- Manter rate limit existente.

## Checkpoint 3 - Frontend
- Atualizar `src/app/recuperar-senha/page.js` com opcao WhatsApp.
- Exibir mascaramento do telefone quando aplicavel.

## Checkpoint 4 - Testes e Validacao
- Adicionar testes de recuperacao via WhatsApp.
- Validar fallback/erro quando a configuracao estiver ausente.
