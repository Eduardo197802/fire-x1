import { resolveAdminAccessBaseUrl } from "@/services/admin-access-link";

const originalEnv = { ...process.env };

const makeRequest = ({ host = "localhost:3000", proto = "http" } = {}) => ({
  headers: new Headers({
    host,
    "x-forwarded-proto": proto
  })
});

describe("resolveAdminAccessBaseUrl", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.ADMIN_APP_BASE_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.APP_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("usa dominio publico quando producao esta configurada com localhost", () => {
    process.env.NODE_ENV = "production";
    process.env.ADMIN_APP_BASE_URL = "http://localhost:3000";

    expect(resolveAdminAccessBaseUrl(makeRequest())).toBe("https://firex1play.com.br");
  });

  it("usa dominio publico quando a requisicao de producao chega com host local", () => {
    process.env.NODE_ENV = "production";

    expect(resolveAdminAccessBaseUrl(makeRequest({ host: "localhost:3000" }))).toBe(
      "https://firex1play.com.br"
    );
  });

  it("mantem host local em desenvolvimento", () => {
    process.env.NODE_ENV = "development";

    expect(resolveAdminAccessBaseUrl(makeRequest({ host: "localhost:3000" }))).toBe(
      "http://localhost:3000"
    );
  });

  it("respeita URL publica configurada", () => {
    process.env.NODE_ENV = "production";
    process.env.ADMIN_APP_BASE_URL = "https://firex1play.com.br/";

    expect(resolveAdminAccessBaseUrl(makeRequest({ host: "localhost:3000" }))).toBe(
      "https://firex1play.com.br"
    );
  });
});
