/**
 * SPEC: Validadores de CPF
 *
 * Extração esperada para src/utils/validators.js:
 *   export const isValidCpf = (value) => { ... }
 */

// import { isValidCpf } from "@/utils/validators";

describe("isValidCpf", () => {
  it.todo("aceita CPF válido com máscara (529.982.247-25)");
  it.todo("aceita CPF válido sem formatação (52998224725)");
  it.todo("rejeita sequência de dígitos repetidos (111.111.111-11)");
  it.todo("rejeita CPF com comprimento incorreto");
  it.todo("rejeita string vazia");
  it.todo("rejeita CPF com dígito verificador errado");
});
