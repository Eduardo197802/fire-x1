const express = require("express");
const router = express.Router();
const db = require("../db");

router.post("/gerar", (req, res) => {
  const userId = Number(req.body.userId);

  if (!userId) {
    return res.status(400).json({ error: "Usuário inválido para gerar Pix." });
  }

  db.get(
    "SELECT conta_liberada FROM users WHERE id = ?",
    [userId],
    (selectError, user) => {
      if (selectError) {
        return res.status(500).json({ error: "Erro ao validar a conta para o Pix." });
      }

      if (!user) {
        return res.status(404).json({ error: "Conta não encontrada." });
      }

      if (!user.conta_liberada) {
        return res.status(403).json({
          error: "Confirme sua conta por e-mail ou SMS antes de liberar o uso total da plataforma."
        });
      }

      res.json({
        imagem: "https://via.placeholder.com/200"
      });
    }
  );
});

module.exports = router;