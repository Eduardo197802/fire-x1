const fs = require('fs');
const path = require('path');

describe('Spec 002 structure', () => {
  const projectRoot = path.resolve(__dirname, '..', '..', '..');

  it('should contain required files in specs/002-pix-deposito-webhook-saque', () => {
    const specFolder = path.join(projectRoot, 'specs', '002-pix-deposito-webhook-saque');

    const requiredFiles = [
      'spec.md',
      'plan.md',
      'tasks.md',
      'models.md',
    ];

    expect(fs.existsSync(specFolder)).toBe(true);

    requiredFiles.forEach((fileName) => {
      const absolutePath = path.join(specFolder, fileName);
      expect(fs.existsSync(absolutePath)).toBe(true);
    });
  });
});
