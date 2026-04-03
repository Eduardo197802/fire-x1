require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.get("/confirmacao", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "confirmacao.html"));
});

app.use("/user", require("./routes/user"));
app.use("/pix", require("./routes/pix"));

app.listen(3000, () => {
  console.log("🔥 Fire X1 rodando");
});