# Arquitetura

## Visão Geral
Aplicação full stack baseada em Next.js com App Router, rotas de API no próprio projeto, persistência local em SQLite via Sequelize e testes automatizados com Jest.

## Stack
- Frontend e Backend: Next.js (App Router)
- UI: React
- Banco de dados: SQLite
- ORM: Sequelize
- Email transacional: Nodemailer
- Testes: Jest

## Estrutura de Pastas
- `src/app/`: páginas e rotas API
- `src/app/api/`: endpoints HTTP do backend
- `src/models/`: modelos de dados
- `src/migrations/`: versionamento de schema
- `src/seeders/`: dados de inicialização
- `src/services/`: serviços de infraestrutura
- `specs/features/`: testes de fluxo legados
- `specs/unit/`: testes unitários legados
- `specs/fixtures/`: dados auxiliares para testes
- `specs/support/`: utilitários de suporte a testes
- `specs/NNN-feature/`: documentação e execução de novas demandas

## Fluxos Gerais de Operação
1. Cliente acessa interface em `src/app/`.
2. A interface aciona rotas em `src/app/api/`.
3. Rotas processam regras de negócio e persistem dados via Sequelize.
4. Serviços de infraestrutura (email e DB) suportam operações assíncronas e integrações.
5. Testes validam comportamento funcional e regras críticas.

## Diretrizes de Evolução
- Novas demandas devem começar por spec em `specs/NNN-feature/`.
- `models.md` é criado apenas quando houver alteração de modelo de dados.
- A estrutura legada de testes permanece ativa até eventual plano de migração.

## Riscos Técnicos Conhecidos
- Fluxos de autenticação e sessão ainda exigem padronização completa.
- Integração PIX precisa validação de cenário real de ponta a ponta.
- Validações de domínio devem permanecer centralizadas e cobertas por testes.
