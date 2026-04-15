const express = require("express");
const path = require("path");
const router = express.Router();
const fs = require("fs");

router.use(express.json());
router.use(require("cors")());

const FILE = path.join(__dirname, "codesFull.csv");

router.get("/data", (req, res) => {
  const data = fs.readFileSync(FILE, "utf-8");
  res.send(data);
});

router.post("/save", (req, res) => {
  fs.writeFileSync(FILE, req.body.csv);
  res.send({ ok: true });
});

router.get("/home", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "codesManager.html"));
});

module.exports = router;