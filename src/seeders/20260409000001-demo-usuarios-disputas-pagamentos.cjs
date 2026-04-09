const bcrypt = require("bcryptjs");

const usersSeed = [
  {
    nome: "Eduardo Nogueira",
    email: "eduardo.seed@firex1.test",
    saldo: 1520.5,
    cpf: "12345678901",
    data_nascimento: "1995-03-18",
    celular: "11987654321",
    canal_verificacao: "email",
    conta_verificada: 1,
    conta_liberada: 1,
    two_factor_enabled: 1,
    two_factor_destination: "eduardo.seed@firex1.test"
  },
  {
    nome: "Mariana Souza",
    email: "mariana.seed@firex1.test",
    saldo: 890.2,
    cpf: "23456789012",
    data_nascimento: "1998-07-10",
    celular: "21976543210",
    canal_verificacao: "email",
    conta_verificada: 1,
    conta_liberada: 1,
    two_factor_enabled: 0,
    two_factor_destination: null
  },
  {
    nome: "Lucas Pereira",
    email: "lucas.seed@firex1.test",
    saldo: 2340.75,
    cpf: "34567890123",
    data_nascimento: "1992-11-02",
    celular: "31995432109",
    canal_verificacao: "email",
    conta_verificada: 1,
    conta_liberada: 1,
    two_factor_enabled: 1,
    two_factor_destination: "lucas.seed@firex1.test"
  },
  {
    nome: "Ana Ribeiro",
    email: "ana.seed@firex1.test",
    saldo: 430.0,
    cpf: "45678901234",
    data_nascimento: "2000-01-25",
    celular: "41994321098",
    canal_verificacao: "email",
    conta_verificada: 1,
    conta_liberada: 1,
    two_factor_enabled: 0,
    two_factor_destination: null
  }
];

const disputasBase = [
  { adversario_nome: "RafaX", jogo: "FIFA 24", valor_aposta: 50, resultado: "ganhou", premio: 95 },
  { adversario_nome: "Brabo99", jogo: "CS2", valor_aposta: 40, resultado: "perdeu", premio: 0 },
  { adversario_nome: "NinaPro", jogo: "Free Fire", valor_aposta: 35, resultado: "ganhou", premio: 66 },
  { adversario_nome: "Jota", jogo: "EA FC", valor_aposta: 25, resultado: "perdeu", premio: 0 },
  { adversario_nome: "MateusGG", jogo: "Valorant", valor_aposta: 75, resultado: "ganhou", premio: 142.5 },
  { adversario_nome: "LipeX1", jogo: "CS2", valor_aposta: 60, resultado: "perdeu", premio: 0 }
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const passwordHash = bcrypt.hashSync("Seed@123", 10);

    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS disputas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        adversario_nome TEXT,
        jogo TEXT,
        valor_aposta FLOAT DEFAULT 0,
        resultado TEXT,
        premio FLOAT DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        origem TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);

    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS pagamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        disputa_id INTEGER,
        tipo TEXT,
        valor FLOAT DEFAULT 0,
        status TEXT,
        metodo TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        origem TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(disputa_id) REFERENCES disputas(id)
      )
    `);

    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.bulkDelete("pagamentos", { origem: "seed_cli" }, { transaction });
      await queryInterface.bulkDelete("disputas", { origem: "seed_cli" }, { transaction });

      for (const user of usersSeed) {
        const existing = await queryInterface.sequelize.query(
          "SELECT id FROM users WHERE email = :email LIMIT 1",
          {
            replacements: { email: user.email },
            type: Sequelize.QueryTypes.SELECT,
            transaction
          }
        );

        if (existing.length === 0) {
          await queryInterface.bulkInsert(
            "users",
            [
              {
                nome: user.nome,
                email: user.email,
                saldo: user.saldo,
                cpf: user.cpf,
                data_nascimento: user.data_nascimento,
                celular: user.celular,
                senha_hash: passwordHash,
                aceitou_termos: 1,
                criado_em: new Date().toISOString(),
                canal_verificacao: user.canal_verificacao,
                conta_verificada: user.conta_verificada,
                conta_liberada: user.conta_liberada,
                two_factor_enabled: user.two_factor_enabled,
                two_factor_destination: user.two_factor_destination,
                two_factor_code: null,
                two_factor_expires_at: null
              }
            ],
            { transaction }
          );
        }
      }

      const seededUsers = await queryInterface.sequelize.query(
        "SELECT id, email FROM users WHERE email LIKE '%@firex1.test'",
        {
          type: Sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      const disputasRows = [];
      const pagamentosRows = [];
      let offsetDays = 1;

      for (const user of seededUsers) {
        for (const base of disputasBase) {
          disputasRows.push({
            user_id: user.id,
            adversario_nome: base.adversario_nome,
            jogo: base.jogo,
            valor_aposta: base.valor_aposta,
            resultado: base.resultado,
            premio: base.premio,
            created_at: new Date(Date.now() - offsetDays * 24 * 60 * 60 * 1000).toISOString(),
            origem: "seed_cli"
          });
          offsetDays += 1;
        }
      }

      if (disputasRows.length > 0) {
        await queryInterface.bulkInsert("disputas", disputasRows, { transaction });
      }

      const seededDisputas = await queryInterface.sequelize.query(
        "SELECT id, user_id, valor_aposta, resultado, premio FROM disputas WHERE origem = 'seed_cli'",
        {
          type: Sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      for (const disputa of seededDisputas) {
        pagamentosRows.push({
          user_id: disputa.user_id,
          disputa_id: disputa.id,
          tipo: disputa.resultado === "ganhou" ? "credito_premiacao" : "debito_aposta",
          valor: disputa.resultado === "ganhou" ? disputa.premio : disputa.valor_aposta,
          status: "concluido",
          metodo: "carteira",
          created_at: new Date().toISOString(),
          origem: "seed_cli"
        });
      }

      if (pagamentosRows.length > 0) {
        await queryInterface.bulkInsert("pagamentos", pagamentosRows, { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.bulkDelete("pagamentos", { origem: "seed_cli" }, { transaction });
      await queryInterface.bulkDelete("disputas", { origem: "seed_cli" }, { transaction });
      await queryInterface.sequelize.query(
        "DELETE FROM users WHERE email LIKE '%@firex1.test'",
        { transaction }
      );
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
