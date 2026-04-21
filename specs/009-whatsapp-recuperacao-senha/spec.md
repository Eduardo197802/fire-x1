# Spec 009 - WhatsApp e Recuperacao de Senha

## Requisicao
Integrar WhatsApp Business ao envio de mensagens operacionais, priorizando API oficial Cloud API da Meta ou provedor homologado, e integrar o fluxo completo de recuperacao de senha via WhatsApp na interface.

Numero disponivel para integracao: `+55 21 99960-6391`.

## Objetivo
Substituir o dispatcher atual/placeholder de SMS por canal WhatsApp, mantendo a estrutura de eventos de envio ja existente e habilitando recuperacao de senha via WhatsApp.

## Escopo
- Criar servico de envio WhatsApp com provider configuravel.
- Reaproveitar eventos atuais de codigo de verificacao/recuperacao.
- Criar opcao de solicitacao de recuperacao por WhatsApp no frontend.
- Ajustar backend de recuperacao de senha para aceitar canal `whatsapp`.
- Registrar falhas de envio sem expor tokens ou codigos sensiveis.

## Fora de Escopo
- Uso de APIs nao oficiais em producao.
- Criacao de templates reais na Meta; os nomes/ids devem ser configurados por ambiente.
- Alteracao do fluxo de e-mail ja existente, exceto fallback/convivencia.

## Criterios de Aceite
1. O backend possui abstracao de envio por WhatsApp sem depender de API nao oficial.
2. Recuperacao de senha permite solicitar codigo via WhatsApp quando o usuario possui celular cadastrado.
3. O frontend possui formulario claro para solicitar e validar recuperacao via WhatsApp.
4. Ausencia de configuracao WhatsApp retorna erro operacional controlado.
5. Testes cobrem sucesso, configuracao ausente e usuario sem celular.
