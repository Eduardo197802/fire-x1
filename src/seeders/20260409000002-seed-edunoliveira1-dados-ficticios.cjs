const bcrypt = require("bcryptjs");

const ORIGIN = "seed_edunoliveira1";
const TARGET_EMAIL = "edunoliveira1@gmail.com";
const TARGET_PASSWORD = "Firex@123";

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
const roundMoney = (value) => Math.round(value * 100) / 100;

const carteiraMovimentos = [
  {
    tipo: "deposito_pix",
    valor: 1200,
    status: "concluido",
    metodo: "pix",
    created_at: daysAgo(14)
  },
  {
    tipo: "deposito_pix",
    valor: 650,
    status: "concluido",
    metodo: "pix",
    created_at: daysAgo(10)
  },
  {
    tipo: "bonus_promocional",
    valor: 75,
    status: "concluido",
    metodo: "campanha",
    created_at: daysAgo(9)
  }
];

const disputasBase = [
  {
    adversario_nome: "RafaX1",
    jogo: "EA FC 25",
    valor_aposta: 35,
    resultado: "ganhou",
    premio: 66,
    created_at: daysAgo(8)
  },
  {
    adversario_nome: "BraboDoCS",
    jogo: "CS2",
    valor_aposta: 50,
    resultado: "perdeu",
    premio: 0,
    created_at: daysAgo(7)
  },
  {
    adversario_nome: "LendaFF",
    jogo: "Free Fire",
    valor_aposta: 80,
    resultado: "ganhou",
    premio: 152,
    created_at: daysAgo(6)
  },
  {
    adversario_nome: "NinaRush",
    jogo: "Valorant",
    valor_aposta: 25,
    resultado: "ganhou",
    premio: 47.5,
    created_at: daysAgo(4)
  },
  {
    adversario_nome: "TicoPro",
    jogo: "Rocket League",
    valor_aposta: 60,
    resultado: "perdeu",
    premio: 0,
    created_at: daysAgo(3)
  },
  {
    adversario_nome: "CapitaGG",
    jogo: "Fortnite",
    valor_aposta: 45,
    resultado: "ganhou",
    premio: 85.5,
    created_at: daysAgo(2)
  }
];

const saldoCalculado = roundMoney(
  carteiraMovimentos.reduce((total, movimento) => total + Number(movimento.valor || 0), 0) +
    disputasBase.reduce(
      (total, disputa) => total + (disputa.resultado === "ganhou" ? Number(disputa.premio || 0) : -Number(disputa.valor_aposta || 0)),
      0
    )
);

const targetUser = {
  nome: "Eduardo Oliveira",
  email: TARGET_EMAIL,
  saldo: saldoCalculado,
  cpf: "52998224725",
  data_nascimento: "1994-08-12",
  celular: "11991234567",
  aceitou_termos: 1,
  criado_em: daysAgo(45),
  canal_verificacao: "email",
  conta_verificada: 1,
  conta_liberada: 1,
  two_factor_enabled: 1,
  two_factor_destination: TARGET_EMAIL,
  two_factor_code: null,
  two_factor_expires_at: null,
  codigo_verificacao: null,
  codigo_expira_em: null,
  reset_codigo: null,
  reset_expira_em: null
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const passwordHash = bcrypt.hashSync(TARGET_PASSWORD, 10);
    const DisputaModel = queryInterface.sequelize.define(
      "SeedDisputaEduNoliveira1",
      {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: Sequelize.INTEGER,
        adversario_nome: Sequelize.TEXT,
        jogo: Sequelize.TEXT,
        valor_aposta: Sequelize.FLOAT,
        resultado: Sequelize.TEXT,
        premio: Sequelize.FLOAT,
        created_at: Sequelize.TEXT,
        origem: Sequelize.TEXT
      },
      { tableName: "disputas", timestamps: false }
    );

    const transaction = await queryInterface.sequelize.transaction();

    try {
      const existingUserId = await queryInterface.rawSelect(
        "users",
        {
          where: { email: TARGET_EMAIL },
          transaction
        },
        ["id"]
      );

      const userPayload = {
        ...targetUser,
        senha_hash: passwordHash
      };

      if (!existingUserId) {
        await queryInterface.bulkInsert("users", [userPayload], { transaction });
      } else {
        await queryInterface.bulkUpdate("users", userPayload, { id: existingUserId }, { transaction });
      }

      const userId = await queryInterface.rawSelect(
        "users",
        {
          where: { email: TARGET_EMAIL },
          transaction
        },
        ["id"]
      );

      if (!userId) {
        throw new Error("Nao foi possivel localizar o usuario alvo apos a seed.");
      }

      await queryInterface.bulkDelete("pagamentos", { user_id: userId, origem: ORIGIN }, { transaction });
      await queryInterface.bulkDelete("disputas", { user_id: userId, origem: ORIGIN }, { transaction });

      const disputaRows = disputasBase.map((disputa) => ({
        user_id: userId,
        adversario_nome: disputa.adversario_nome,
        jogo: disputa.jogo,
        valor_aposta: disputa.valor_aposta,
        resultado: disputa.resultado,
        premio: disputa.premio,
        created_at: disputa.created_at,
        origem: ORIGIN
      }));

      const createdDisputas = [];

      for (const disputa of disputaRows) {
        const createdDisputa = await DisputaModel.create(disputa, { transaction });
        createdDisputas.push(createdDisputa.get({ plain: true }));
      }

      const pagamentoRows = [
        ...carteiraMovimentos.map((movimento) => ({
          user_id: userId,
          disputa_id: null,
          tipo: movimento.tipo,
          valor: movimento.valor,
          status: movimento.status,
          metodo: movimento.metodo,
          created_at: movimento.created_at,
          origem: ORIGIN
        })),
        ...createdDisputas.map((disputa) => ({
          user_id: userId,
          disputa_id: disputa.id,
          tipo: disputa.resultado === "ganhou" ? "credito_premiacao" : "debito_aposta",
          valor: disputa.resultado === "ganhou" ? disputa.premio : disputa.valor_aposta,
          status: "concluido",
          metodo: "carteira",
          created_at: disputa.created_at,
          origem: ORIGIN
        }))
      ];

      if (pagamentoRows.length > 0) {
        await queryInterface.bulkInsert("pagamentos", pagamentoRows, { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const userId = await queryInterface.rawSelect(
        "users",
        {
          where: { email: TARGET_EMAIL },
          transaction
        },
        ["id"]
      );

      if (userId) {
        await queryInterface.bulkDelete("pagamentos", { user_id: userId, origem: ORIGIN }, { transaction });
        await queryInterface.bulkDelete("disputas", { user_id: userId, origem: ORIGIN }, { transaction });
      } else {
        await queryInterface.bulkDelete("pagamentos", { origem: ORIGIN }, { transaction });
        await queryInterface.bulkDelete("disputas", { origem: ORIGIN }, { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};