/**
 * SPEC: Validadores de data de nascimento
 *
 * Extração esperada para src/utils/validators.js:
 *   export const isAdult = (dateString) => { ... }
 *   export const isFutureBirthDate = (dateString) => { ... }
 */

// import { isAdult, isFutureBirthDate } from "@/utils/validators";

describe("isAdult", () => {
  it.todo("retorna true para data que resulte em idade >= 18");
  it.todo("retorna false para data que resulte em idade < 18");
  it.todo("considera o dia exato do aniversário como maioridade atingida");
  it.todo("retorna false para string inválida");
});

describe("isFutureBirthDate", () => {
  it.todo("retorna false para data no passado");
  it.todo("retorna true para data futura");
  it.todo("retorna true para string inválida (data inválida = futuro por segurança)");
});
