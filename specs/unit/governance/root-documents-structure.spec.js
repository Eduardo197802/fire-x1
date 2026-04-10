const fs = require('fs');
const path = require('path');

describe('Governance root documents', () => {
  const projectRoot = path.resolve(__dirname, '..', '..', '..');

  it('should contain required governance files at repository root', () => {
    const requiredFiles = [
      'AGENTS.md',
      'project.md',
      'architecture.md',
      'CHANGELOG.md',
    ];

    requiredFiles.forEach((fileName) => {
      const absolutePath = path.join(projectRoot, fileName);
      expect(fs.existsSync(absolutePath)).toBe(true);
    });
  });
});
