module.exports = {
  development: {
    dialect: "sqlite",
    storage: "./database.db",
    logging: false
  },
  test: {
    dialect: "sqlite",
    storage: "./database-test.db",
    logging: false
  },
  production: {
    dialect: "sqlite",
    storage: "./database.db",
    logging: false
  }
};
