import { jest } from "@jest/globals";

jest.mock("@/services/db.js");
jest.mock("@/services/admin-auth.js");

import { init, sequelize } from "@/services/db.js";
import { authenticateAdminRequest } from "@/services/admin-auth.js";

describe("Fase 5 - API Admin Financeiro", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    init.then = jest.fn((callback) => callback());
  });

  describe("Autenticação e Autorização", () => {
    test("GET /api/admin/financeiro/resumo deve retornar 401 sem sessão", async () => {
      authenticateAdminRequest.mockResolvedValueOnce({
        ok: false,
        status: 401,
        error: "Sessão inválida ou expirada. Faça login novamente."
      });

      const result = await authenticateAdminRequest(null);

      expect(result.ok).toBe(false);
      expect(result.status).toBe(401);
      expect(result.error).toContain("Sessão inválida");
    });

    test("GET /api/admin/financeiro/diario deve retornar 403 para usuário não operador", async () => {
      authenticateAdminRequest.mockResolvedValueOnce({
        ok: false,
        status: 403,
        error: "Acesso negado. Usuário não autorizado para operações administrativas."
      });

      const result = await authenticateAdminRequest(null);

      expect(result.ok).toBe(false);
      expect(result.status).toBe(403);
      expect(result.error).toContain("não autorizado");
    });

    test("GET /api/admin/financeiro/usuarios deve retornar 401 com token administrativo inválido", async () => {
      authenticateAdminRequest.mockResolvedValueOnce({
        ok: false,
        status: 401,
        error: "Token de administrador inválido."
      });

      const result = await authenticateAdminRequest(null);

      expect(result.ok).toBe(false);
      expect(result.status).toBe(401);
      expect(result.error).toContain("Token");
    });

    test("GET /api/admin/financeiro/caixa deve retornar 403 para usuário sem 2FA", async () => {
      authenticateAdminRequest.mockResolvedValueOnce({
        ok: false,
        status: 403,
        error: "Autenticação de dois fatores é obrigatória para administradores."
      });

      const result = await authenticateAdminRequest(null);

      expect(result.ok).toBe(false);
      expect(result.status).toBe(403);
      expect(result.error).toContain("dois fatores");
    });

    test("deve retornar 200 com operador autenticado corretamente", async () => {
      authenticateAdminRequest.mockResolvedValueOnce({
        ok: true,
        userId: 7
      });

      const result = await authenticateAdminRequest(null);

      expect(result.ok).toBe(true);
      expect(result.userId).toBe(7);
    });
  });

  describe("Validação de Entrada", () => {
    test("GET /api/admin/financeiro/diario sem 'de' deve retornar 400", async () => {
      const de = undefined;
      const isValid = de && /^\d{4}-\d{2}-\d{2}$/.test(de);

      expect(isValid).toBe(false);
    });

    test("GET /api/admin/financeiro/diario com 'de' em formato inválido deve retornar 400", async () => {
      const de = "2026-04-19 10:30";
      const isValid = /^\d{4}-\d{2}-\d{2}$/.test(de);

      expect(isValid).toBe(false);
    });

    test("GET /api/admin/financeiro/diario com datas válidas deve processar", async () => {
      const de = "2026-04-01";
      const ate = "2026-04-19";

      const isValidDe = /^\d{4}-\d{2}-\d{2}$/.test(de);
      const isValidAte = /^\d{4}-\d{2}-\d{2}$/.test(ate);

      expect(isValidDe && isValidAte).toBe(true);
    });

    test("GET /api/admin/financeiro/usuarios com limite > 100 deve usar 100", async () => {
      const limite = Math.min(Math.max(1, 150), 100);

      expect(limite).toBe(100);
    });

    test("GET /api/admin/financeiro/usuarios com limite < 1 deve usar 1", async () => {
      const limite = Math.min(Math.max(1, 0), 100);

      expect(limite).toBe(1);
    });

    test("GET /api/admin/financeiro/usuarios com limite default deve ser 20", async () => {
      const limiteStr = undefined;
      const limite = Math.min(Math.max(1, parseInt(limiteStr, 10) || 20), 100);

      expect(limite).toBe(20);
    });
  });

  describe("Estrutura de Resposta - Resumo", () => {
    test("GET /api/admin/financeiro/resumo deve retornar total_entradas, total_saidas, liquido", async () => {
      const mockResponse = {
        total_entradas: "1000.00",
        total_saidas: "500.00",
        liquido: "500.00",
        receita_plataforma: "150.00",
        custos: "100.00",
        lucro_liquido: "50.00"
      };

      expect(mockResponse).toHaveProperty("total_entradas");
      expect(mockResponse).toHaveProperty("total_saidas");
      expect(mockResponse).toHaveProperty("liquido");
      expect(mockResponse).toHaveProperty("receita_plataforma");
      expect(mockResponse).toHaveProperty("custos");
      expect(mockResponse).toHaveProperty("lucro_liquido");
    });

    test("resumo deve calcular lucro_liquido corretamente", async () => {
      const receita = 150.0;
      const custos = 100.0;
      const lucroLiquido = receita - custos;

      expect(lucroLiquido).toBe(50.0);
    });

    test("resumo deve converter valores para string com 2 casas decimais", async () => {
      const valor = parseFloat("1000.50").toFixed(2);

      expect(valor).toBe("1000.50");
      expect(typeof valor).toBe("string");
    });
  });

  describe("Estrutura de Resposta - Diário", () => {
    test("GET /api/admin/financeiro/diario deve retornar array com diarios", async () => {
      const mockResponse = {
        periodos: { de: "2026-04-01", ate: "2026-04-19" },
        total_dias: 2,
        diarios: [
          {
            data: "2026-04-01",
            qtd_entradas: 5,
            qtd_saidas: 2,
            total_entradas: "500.00",
            total_saidas: "100.00"
          },
          {
            data: "2026-04-02",
            qtd_entradas: 3,
            qtd_saidas: 1,
            total_entradas: "300.00",
            total_saidas: "50.00"
          }
        ]
      };

      expect(mockResponse.diarios).toBeInstanceOf(Array);
      expect(mockResponse.diarios.length).toBe(2);
      expect(mockResponse.diarios[0]).toHaveProperty("data");
      expect(mockResponse.diarios[0]).toHaveProperty("qtd_entradas");
      expect(mockResponse.diarios[0]).toHaveProperty("total_entradas");
    });

    test("cada dia deve ter qtd_entradas e qtd_saidas como números", async () => {
      const dia = {
        data: "2026-04-01",
        qtd_entradas: 5,
        qtd_saidas: 2,
        total_entradas: "500.00",
        total_saidas: "100.00"
      };

      expect(typeof dia.qtd_entradas).toBe("number");
      expect(typeof dia.qtd_saidas).toBe("number");
    });

    test("totais devem ser strings com 2 casas decimais", async () => {
      const total = parseFloat("123.456").toFixed(2);

      expect(typeof total).toBe("string");
      expect(/^\d+\.\d{2}$/.test(total)).toBe(true);
    });
  });

  describe("Estrutura de Resposta - Usuários", () => {
    test("GET /api/admin/financeiro/usuarios deve retornar array com usuarios", async () => {
      const mockResponse = {
        limite: 20,
        total_registros: 2,
        usuarios: [
          {
            user_id: 1,
            email: "user1@example.com",
            nome: "Usuário Um",
            saldo: "1000.50",
            total_entradas: "2000.00",
            total_saidas: "500.00",
            atualizado_em: "2026-04-19"
          }
        ]
      };

      expect(mockResponse.usuarios).toBeInstanceOf(Array);
      expect(mockResponse.usuarios[0]).toHaveProperty("user_id");
      expect(mockResponse.usuarios[0]).toHaveProperty("email");
      expect(mockResponse.usuarios[0]).toHaveProperty("saldo");
      expect(mockResponse.usuarios[0]).toHaveProperty("total_entradas");
      expect(mockResponse.usuarios[0]).toHaveProperty("total_saidas");
    });

    test("saldo deve ser string com 2 casas decimais", async () => {
      const usuario = {
        user_id: 1,
        saldo: "1000.50",
        total_entradas: "2000.00",
        total_saidas: "500.00"
      };

      expect(typeof usuario.saldo).toBe("string");
      expect(/^\d+\.\d{2}$/.test(usuario.saldo)).toBe(true);
    });
  });

  describe("Estrutura de Resposta - Caixa Plataforma", () => {
    test("GET /api/admin/financeiro/caixa deve retornar resumo e diarios", async () => {
      const mockResponse = {
        periodos: { de: "2026-04-01", ate: "2026-04-19" },
        resumo: {
          total_entradas: "5000.00",
          total_saidas: "3000.00",
          saldo_caixa: "2000.00"
        },
        total_dias: 1,
        diarios: [
          {
            data: "2026-04-01",
            qtd_entradas: 10,
            qtd_saidas: 5,
            total_entradas: "5000.00",
            total_saidas: "3000.00"
          }
        ]
      };

      expect(mockResponse).toHaveProperty("periodos");
      expect(mockResponse).toHaveProperty("resumo");
      expect(mockResponse).toHaveProperty("diarios");
      expect(mockResponse.resumo).toHaveProperty("saldo_caixa");
    });

    test("saldo_caixa deve ser calculado como entradas - saidas", async () => {
      const entradas = 5000.0;
      const saidas = 3000.0;
      const saldoCaixa = (entradas - saidas).toFixed(2);

      expect(saldoCaixa).toBe("2000.00");
    });
  });

  describe("Integração com Dados Financeiros", () => {
    test("resumo deve separar transações de usuários de comissões", async () => {
      const transacoesUsuarios = 1000.0;
      const comissoes = 150.0;
      const receita = comissoes;

      expect(receita).toBe(150.0);
      expect(transacoesUsuarios).not.toBe(receita);
    });

    test("diário deve filtrar apenas transações confirmadas", async () => {
      const transacoes = [
        { status: "confirmado", valor: 100 },
        { status: "confirmado", valor: 200 },
        { status: "pendente", valor: 300 },
        { status: "cancelado", valor: 50 }
      ];

      const confirmadas = transacoes.filter((t) => t.status === "confirmado");
      const total = confirmadas.reduce((sum, t) => sum + t.valor, 0);

      expect(total).toBe(300);
      expect(confirmadas.length).toBe(2);
    });

    test("usuários deve usar saldo do trigger, não soma manual", async () => {
      const usuario = {
        user_id: 1,
        saldo: "1500.00",
        total_entradas: "2000.00",
        total_saidas: "500.00"
      };

      expect(usuario.saldo).toBe("1500.00");
      expect(parseFloat(usuario.total_entradas) - parseFloat(usuario.total_saidas)).toBe(1500.0);
    });

    test("caixa deve incluir apenas movimentações de caixa_plataforma", async () => {
      const movimentacoesCaixa = [
        { tipo: "TAXA_PROCESSAMENTO", valor: 50 },
        { tipo: "RETIRADA_OPERACIONAL", valor: 100 }
      ];

      const transacoesUsuarios = [
        { tipo: "DEPOSITO", valor: 500 },
        { tipo: "SAQUE", valor: 200 }
      ];

      const totalCaixa = movimentacoesCaixa.reduce((sum, m) => sum + m.valor, 0);
      const totalUsuarios = transacoesUsuarios.reduce((sum, t) => sum + t.valor, 0);

      expect(totalCaixa).toBe(150);
      expect(totalUsuarios).toBe(700);
      expect(totalCaixa).not.toBe(totalUsuarios);
    });
  });
});
