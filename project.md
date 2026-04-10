# Projeto FireX1

## Visão do Projeto
O FireX1 é uma aplicação web que fornece o serviço de disputas apostadas para jogos online, isso é, permite aos jogadores de diversos jogos criar uma disputa na qual ambos colocam dinheiro e quem ganhar, leva tudo.

A plataforma conta também com um sistema de contestação, isso é, como os jogadores são responsáveis por declarar quem ganhou, pode ocorrer de um jogador ser mau intencionado e falar que ganhou quando na verdade perdeu, para isso existe tal sistema, no qual o jogador pode contestar o resultado da disputa, fornecendo provas de quem de fato ganhou e assim a decisão e o prêmio ser revertido. 

Além disso, a plataforma possui um hub de disputas, isso é, um local na plataforma no qual ele pode encontrar disputas públicas, isso é, uma disputa que um jogador criou na qual qualquer um pode entrar e disputar. Esse tipo de disputa deve ser reaproveitável, não precisando criar uma nova a cada finalização da anterior.

Fora isso, a plataforma deve conter as features comuns a qualquer plataforma online, como contas, autenticação e permissão, segurança de dados e operação, dashboards, painéis administrativos ( Configuração de variáveis da plataforma, audioria, adminstração de usuários ) e de suporte.

## Domínios Funcionais
- Autenticação: login e registro
- Verificação de conta: confirmação com código e janela de expiração
- Segurança: validações de dados e regras de acesso
- Conta e dashboard: visualização e operação de dados do usuário
- Disputas: Criação e execução de disputas públicas e privadas mediante pagamento.
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
- Usuário deve pagar antes de participar da disputa.

## Lacunas que Exigem Decisão de Produto
- Orquestração completa do fluxo de 2FA.
- Regras finais de integração PIX em ambiente real.
- Política de sessão e persistência de autenticação no cliente.

## Princípio de Implementação
Toda entrega funcional deve nascer de uma spec no padrão `specs/NNN-feature` e manter aderência às regras críticas descritas neste documento.
