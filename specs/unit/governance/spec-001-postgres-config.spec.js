const fs = require('fs');
const path = require('path');

describe('Spec 001 postgres configuration', () => {
  const projectRoot = path.resolve(__dirname, '..', '..', '..');

  function read(relativePath) {
    return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
  }

  it('should configure sequelize-cli environments with postgres dialect', () => {
    const config = read(path.join('src', 'config', 'config.cjs'));

    expect(config).toContain('dialect: "postgres"');
    expect(config).toContain('development: buildConfig("DB"');
    expect(config).toContain('test: buildConfig("DB_TEST"');
    expect(config).toContain('production: buildConfig("DB_PROD"');
  });

  it('should configure runtime database connection for postgres and gated bootstrap', () => {
    const dbService = read(path.join('src', 'services', 'db.js'));

    expect(dbService).toContain('const databaseUrl = String(process.env.DATABASE_URL || "").trim();');
    expect(dbService).toContain('new Sequelize(databaseUrl');
    expect(dbService).toContain('dialect: env("DB_DIALECT", "DB_PROD_DIALECT", "postgres")');
    expect(dbService).toContain('host: env("DB_HOST", "DB_PROD_HOST", "127.0.0.1")');
    expect(dbService).toContain('const shouldBootstrapSchema = toBoolean(process.env.DB_BOOTSTRAP_SCHEMA);');
    expect(dbService).toContain('if (!shouldBootstrapSchema) {');
  });

  it('should include postgres drivers in dependencies', () => {
    const packageJson = read('package.json');

    expect(packageJson).toContain('"pg":');
    expect(packageJson).toContain('"pg-hstore":');
  });
});
