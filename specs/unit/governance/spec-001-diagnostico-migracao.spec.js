const fs = require('fs');
const path = require('path');

describe('Spec 001 migration diagnosis', () => {
  const projectRoot = path.resolve(__dirname, '..', '..', '..');

  function read(relativePath) {
    return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
  }

  it('should document migration target from sqlite to postgresql', () => {
    const spec = read(path.join('specs', '001-migracao-banco-de-dados', 'spec.md'));

    expect(spec).toContain('Diagnostico Tecnico do Estado Atual');
    expect(spec).toContain('Alvo da Migracao (Checkpoint 2)');
    expect(spec).toContain('Decisao sobre models.md');
    expect(spec).toContain('SQLite -> PostgreSQL');
    expect(spec).toContain('Substituir dependencia de SQLite por PostgreSQL');
    expect(spec).toContain('`models.md` nao e necessario nesta spec no escopo atual');
  });
});
