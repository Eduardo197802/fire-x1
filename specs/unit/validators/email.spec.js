/**
 * SPEC: Validadores de e-mail
 *
 * Os validators abaixo estão atualmente embutidos em
 * src/app/api/user/[...slug]/route.js como funções privadas.
 *
 * Ao extraí-los para src/utils/validators.js e exportá-los,
 * os imports comentados passarão a funcionar e estes specs
 * poderão ser executados.
 *
 * Extração esperada:
 *   export const isValidEmail = (value) => { ... }
 *   export const isDisposableEmail = (value) => { ... }
 *   export const maskEmail = (email) => { ... }
 */

// import { isValidEmail, isDisposableEmail, maskEmail } from "@/utils/validators";

describe("isValidEmail", () => {
  it.todo("aceita e-mail válido simples (usuario@dominio.com)");
  it.todo("aceita e-mail com subdomínio (usuario@sub.dominio.com.br)");
  it.todo("rejeita string vazia");
  it.todo("rejeita e-mail sem @");
  it.todo("rejeita e-mail sem domínio após @");
  it.todo("rejeita e-mail com espaços internos");
  it.todo("normaliza para minúsculas antes de validar");
});

describe("isDisposableEmail", () => {
  it.todo("bloqueia mailinator.com");
  it.todo("bloqueia yopmail.com");
  it.todo("bloqueia guerrillamail.com");
  it.todo("permite gmail.com");
  it.todo("permite outlook.com");
  it.todo("permite hotmail.com");
});

describe("maskEmail", () => {
  it.todo("oculta parte do local-part mantendo 2 primeiros caracteres");
  it.todo("preserva o domínio intacto");
  it.todo("retorna o valor original quando formato é inválido");
});
