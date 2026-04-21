# Spec 011 - Solicitacao de Alteracao de Chave PIX

## Requisicao
Criar formulario para solicitacao de mudanca de chave PIX, integrado a fluxo de atendimento/Fale Conosco, com validacao ou aprovacao administrativa antes da alteracao.

## Objetivo
Permitir que usuario solicite alteracao de chave PIX sem alterar diretamente o dado sensivel, mantendo auditoria e aprovacao admin.

## Escopo
- Criar formulario de solicitacao no perfil/conta.
- Persistir solicitacoes de alteracao de PIX.
- Criar area admin para aprovar/rejeitar solicitacoes.
- Alterar `users.chave_pix` somente apos aprovacao admin.

## Criterios de Aceite
1. Usuario com chave ja cadastrada consegue abrir solicitacao.
2. Solicitacao registra chave atual, nova chave, motivo e status.
3. Admin pode aprovar ou rejeitar.
4. Aprovacao atualiza a chave PIX e registra auditoria.
