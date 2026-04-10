require("dotenv").config();

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value) {
  return String(value).toLowerCase() === "true";
}

function buildConfig(prefix, defaults) {
  const host = process.env[`${prefix}_HOST`] || defaults.host;
  const port = toNumber(process.env[`${prefix}_PORT`], defaults.port);
  const database = process.env[`${prefix}_NAME`] || defaults.database;
  const username = process.env[`${prefix}_USER`] || defaults.username;
  const password = process.env[`${prefix}_PASSWORD`] || defaults.password;
  const sslEnabled = toBoolean(process.env[`${prefix}_SSL`]);

  return {
    dialect: "postgres",
    host,
    port,
    database,
    username,
    password,
    logging: false,
    dialectOptions: sslEnabled
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : {},
  };
}

module.exports = {
  development: buildConfig("DB", {
    host: "127.0.0.1",
    port: 5432,
    database: "firex1_dev",
    username: "postgres",
    password: "postgres",
  }),
  test: buildConfig("DB_TEST", {
    host: "127.0.0.1",
    port: 5432,
    database: "firex1_test",
    username: "postgres",
    password: "postgres",
  }),
  production: buildConfig("DB_PROD", {
    host: "127.0.0.1",
    port: 5432,
    database: "firex1_prod",
    username: "postgres",
    password: "postgres",
  }),
};
