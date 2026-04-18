import { down, up } from "@/migrations/006-alter-money-columns-to-decimal";

describe("migration 006 money columns", () => {
  const Sequelize = {
    DECIMAL: jest.fn((precision, scale) => ({ kind: "DECIMAL", precision, scale })),
    FLOAT: Symbol("FLOAT"),
  };

  beforeEach(() => {
    Sequelize.DECIMAL.mockClear();
  });

  it("adiciona pagamentos.valor quando o schema legado ainda nao possui a coluna", async () => {
    const queryInterface = {
      describeTable: jest
        .fn()
        .mockResolvedValueOnce({ saldo: { type: "FLOAT" } })
        .mockResolvedValueOnce({ id: { type: "INTEGER" } }),
      addColumn: jest.fn().mockResolvedValue(undefined),
      changeColumn: jest.fn().mockResolvedValue(undefined),
    };

    await up(queryInterface, Sequelize);

    expect(queryInterface.changeColumn).toHaveBeenCalledTimes(1);
    expect(queryInterface.changeColumn).toHaveBeenCalledWith(
      "users",
      "saldo",
      expect.objectContaining({
        type: { kind: "DECIMAL", precision: 14, scale: 2 },
        allowNull: true,
        defaultValue: 0,
      })
    );
    expect(queryInterface.addColumn).toHaveBeenCalledTimes(1);
    expect(queryInterface.addColumn).toHaveBeenCalledWith(
      "pagamentos",
      "valor",
      expect.objectContaining({
        type: { kind: "DECIMAL", precision: 14, scale: 2 },
        allowNull: true,
        defaultValue: 0,
      })
    );
  });

  it("faz rollback para FLOAT sem falhar quando a coluna ainda precisa ser criada", async () => {
    const queryInterface = {
      describeTable: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ valor: { type: "DECIMAL" } }),
      addColumn: jest.fn().mockResolvedValue(undefined),
      changeColumn: jest.fn().mockResolvedValue(undefined),
    };

    await down(queryInterface, Sequelize);

    expect(queryInterface.addColumn).toHaveBeenCalledWith(
      "users",
      "saldo",
      expect.objectContaining({
        type: Sequelize.FLOAT,
        allowNull: true,
        defaultValue: 0,
      })
    );
    expect(queryInterface.changeColumn).toHaveBeenCalledWith(
      "pagamentos",
      "valor",
      expect.objectContaining({
        type: Sequelize.FLOAT,
        allowNull: true,
        defaultValue: 0,
      })
    );
  });
});