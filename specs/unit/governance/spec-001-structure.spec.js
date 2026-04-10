const fs = require('fs');
const path = require('path');

describe('Spec 001 structure', () => {
  const projectRoot = path.resolve(__dirname, '..', '..', '..');

  it('should contain required files in specs/001-migracao-banco-de-dados', () => {
    const specFolder = path.join(projectRoot, 'specs', '001-migracao-banco-de-dados');

    const requiredFiles = [
      'spec.md',
      'plan.md',
      'tasks.md',
    ];

    expect(fs.existsSync(specFolder)).toBe(true);

    requiredFiles.forEach((fileName) => {
      const absolutePath = path.join(specFolder, fileName);
      expect(fs.existsSync(absolutePath)).toBe(true);
    });
  });
});
