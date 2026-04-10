const fs = require('fs');
const path = require('path');

describe('Governance documentation consistency', () => {
  const projectRoot = path.resolve(__dirname, '..', '..', '..');

  function readRelative(filePath) {
    return fs.readFileSync(path.join(projectRoot, filePath), 'utf8');
  }

  it('should keep models.md as conditional across governance docs', () => {
    const agents = readRelative('AGENTS.md');
    const architecture = readRelative('architecture.md');
    const spec000 = readRelative(path.join('specs', '000-repository-documentation-structure', 'spec.md'));

    expect(agents).toContain('models.md');
    expect(agents).toContain('somente quando houver criação ou alteração de modelo de dados');

    expect(architecture).toContain('models.md');
    expect(architecture).toContain('apenas quando houver alteração de modelo de dados');

    expect(spec000).toContain('Definir models.md como condicional');
  });

  it('should keep legacy specs coexistence explicitly documented', () => {
    const agents = readRelative('AGENTS.md');
    const changelog = readRelative('CHANGELOG.md');

    expect(agents).toContain('não remove automaticamente estruturas legadas');
    expect(changelog).toContain('coexistência com a estrutura legada de testes');
  });
});
