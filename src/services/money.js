const MONEY_SCALE = 100;

export const normalizeAmount = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.round(numericValue * MONEY_SCALE) / MONEY_SCALE;
};

export const toCents = (value) => Math.round(normalizeAmount(value) * MONEY_SCALE);

export const fromCents = (valueInCents) => normalizeAmount(Number(valueInCents || 0) / MONEY_SCALE);

export const addMoney = (left, right) => fromCents(toCents(left) + toCents(right));

export const subtractMoney = (left, right) => fromCents(toCents(left) - toCents(right));

export const isPositiveAmount = (value) => toCents(value) > 0;
