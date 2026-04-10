const fs = require('fs');
const path = require('path');

describe('Spec 002 checkpoint 2 contract', () => {
  const projectRoot = path.resolve(__dirname, '..', '..', '..');

  function read(relativePath) {
    return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
  }

  it('should define state machine and idempotency rules for pix operations', () => {
    const models = read(path.join('specs', '002-pix-deposito-webhook-saque', 'models.md'));

    expect(models).toContain('Fluxo de Estados (Maquina de Estados)');
    expect(models).toContain('pendente -> confirmado');
    expect(models).toContain('confirmado -> creditado');
    expect(models).toContain('em_processamento -> concluido');
    expect(models).toContain('Chave de idempotencia: txid');
  });

  it('should define mandatory security rules for pix withdrawal', () => {
    const models = read(path.join('specs', '002-pix-deposito-webhook-saque', 'models.md'));

    expect(models).toContain('Regras de Seguranca de Saque');
    expect(models).toContain('Chave PIX usada no saque deve ser previamente cadastrada pelo usuario');
    expect(models).toContain('Valor de saque deve ser maior que zero e menor ou igual ao saldo disponivel');
  });
});
