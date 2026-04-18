/**
 * specs/support/request-factory.js
 *
 * Cria instâncias de NextRequest e o objeto `context` esperados pelos
 * route handlers do Next.js App Router.
 *
 * Uso:
 *   const req  = makePostRequest('/api/user/login', { email, senha })
 *   const ctx  = makeContext(['login'])
 *   const res  = await POST(req, ctx)
 */
import { NextRequest } from "next/server";

/**
 * Cria um NextRequest POST com corpo JSON.
 * @param {string} path - Caminho da URL (ex: '/api/user/login')
 * @param {object} body - Dados do corpo da requisição
 * @returns {NextRequest}
 */
export const makePostRequest = (path, body = {}) =>
  new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const makePostRequestWithHeaders = (path, body = {}, headers = {}) =>
  new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

/**
 * Cria um NextRequest GET.
 * @param {string} path - Caminho da URL (ex: '/api/user/dashboard/1')
 * @returns {NextRequest}
 */
export const makeGetRequest = (path) =>
  new NextRequest(`http://localhost${path}`, { method: "GET" });

export const makeGetRequestWithHeaders = (path, headers = {}) =>
  new NextRequest(`http://localhost${path}`, {
    method: "GET",
    headers,
  });

/**
 * Cria o contexto de rota com params como Promise (Next.js 15+).
 * @param {string[]} slugParts - Segmentos do slug (ex: ['login'] ou ['dashboard', '1'])
 * @returns {{ params: Promise<{ slug: string[] }> }}
 */
export const makeContext = (slugParts) => ({
  params: Promise.resolve({ slug: slugParts }),
});

/**
 * Lê o corpo JSON de uma NextResponse.
 * @param {Response} response
 * @returns {Promise<object>}
 */
export const readJson = (response) => response.json();
