const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());

// index principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.use("/icons", express.static(path.join(__dirname, "public", "icons")));

app.use("/zpp", express.static(path.join(__dirname, "modules/zpp/public")));
app.use("/zpp", require("./modules/zpp/routes"));

app.use("/outFull", require("./modules/outFull/serverOutFull"));

app.listen(3000, () => {
  console.log("Sistema completo rodando na 3000");
});