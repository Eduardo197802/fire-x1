# Projeto FireX1

## Visão do Projeto
O FireX1 é uma aplicação web com foco em autenticação segura, verificação de conta, gestão de área logada, operações de pagamento e fluxo de PIX.

## Domínios Funcionais
- Autenticação: login e registro
- Verificação de conta: confirmação com código e janela de expiração
- Segurança: validações de dados e regras de acesso
- Conta e dashboard: visualização e operação de dados do usuário
- Pagamentos e PIX: fluxo de geração e uso em operações financeiras

## Regras Críticas Confirmadas
- Conta deve estar verificada para fluxo normal de login.
- Conta deve estar liberada para operações de PIX.
- CPF, telefone e data de nascimento devem passar validações de consistência.
- Usuário deve atender regra de maioridade no cadastro.
- Código de verificação possui limite de tempo para validade.

## Regras Críticas que Devem Ser Sempre Validadas em Código e Testes
- Regras de bloqueio de acesso por status da conta.
- Regras de integridade de dados de cadastro.
- Regras de segurança de autenticação e verificação.
- Regras de autorização para operações financeiras.

## Lacunas que Exigem Decisão de Produto
- Orquestração completa do fluxo de 2FA.
- Regras finais de integração PIX em ambiente real.
- Política de sessão e persistência de autenticação no cliente.

## Princípio de Implementação
Toda entrega funcional deve nascer de uma spec no padrão `specs/NNN-feature` e manter aderência às regras críticas descritas neste documento.
