# Tasks - Spec 001

## Checklist
- [x] Criar pasta specs/001-migracao-banco-de-dados
- [x] Criar spec.md da spec 001
- [x] Criar plan.md da spec 001
- [x] Criar tasks.md da spec 001
- [x] Criar teste de validacao da estrutura da spec 001
- [x] Executar teste da estrutura da spec 001
- [x] Mapear schema atual e definir alvo da migracao
- [x] Realinhar objetivo da spec para migracao SQLite -> PostgreSQL
- [x] Decidir se models.md sera necessario no novo escopo
- [x] Remover models.md por nao se aplicar ao escopo atual
- [x] Criar teste de validacao do diagnostico da migracao
- [x] Executar teste de validacao do diagnostico da migracao
- [x] Configurar conexao PostgreSQL no runtime
- [x] Configurar sequelize-cli para PostgreSQL
- [x] Ajustar bootstrap de schema para estrategia compativel com migrations
- [x] Implementar/ajustar testes de migracao
- [x] Executar testes finais
- [x] Atualizar CHANGELOG com fechamento da spec 001
- [x] Remover arquivos .db do disco (database.db e database-Eduardo-Desktop.db)

## Proximos Passos
1. Implementar configuracao PostgreSQL em `src/config/config.cjs` e `src/services/db.js`.
2. Adicionar dependencias do driver PostgreSQL e validar conexao.
3. Ajustar testes de migracao para garantir funcionamento no novo dialeto.
