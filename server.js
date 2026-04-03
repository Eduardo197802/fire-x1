require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const next = require("next");

const port = Number(process.env.PORT || 3000);
const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

async function startServer() {
  await nextApp.prepare();

  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.static("public"));

  app.use("/user", require("./routes/user"));
  app.use("/pix", require("./routes/pix"));

  app.all(/^\/_next(?:\/.*)?$/, (req, res) => handle(req, res));
  app.all(/^\/dashboard(?:\/.*)?$/, (req, res) => handle(req, res));

  app.listen(port, () => {
    console.log(`🔥 Fire X1 rodando em http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error("Erro ao iniciar aplicação:", error);
  process.exit(1);
});