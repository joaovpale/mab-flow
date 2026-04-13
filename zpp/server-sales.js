const express = require("express");
const multer = require("multer");
const AdmZip = require("adm-zip");
const fs = require("fs");
const path = require("path");
const app = express();
app.use(express.static("zpp/public"));
app.use(express.json());

const upload = multer({ dest: "zpp/uploads/" });
const uploadFull = multer({ dest: "zpp/uploadsFull/" });

const QUEUE_FILE = "zpp/queue.json";
const QUEUE_FILEFULL = "zpp/queueFull.json";

// carregar fila
function loadQueue() {
  try {
    if (!fs.existsSync(QUEUE_FILE)) return [];

    const data = fs.readFileSync(QUEUE_FILE, "utf-8");

    if (!data) return [];

    return JSON.parse(data);

  } catch (err) {
    console.error("Erro ao carregar fila:", err);
    return [];
  }
}

function loadQueueFull() {
  try {
    if (!fs.existsSync(QUEUE_FILEFULL)) return [];

    const data = fs.readFileSync(QUEUE_FILEFULL, "utf-8");

    if (!data) return [];

    return JSON.parse(data);

  } catch (err) {
    console.error("Erro ao carregar fila:", err);
    return [];
  }
}

// salvar fila
function saveQueue(queue) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

function saveQueueFull(queue) {
  fs.writeFileSync(QUEUE_FILEFULL, JSON.stringify(queue, null, 2));
}

// enviar pra impressora USB
const { exec } = require("child_process");

function sendToPrinter(path) {
  return new Promise((resolve, reject) => {
    exec(`sudo tee /dev/usb/lp0 < "${path}"`, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function sendToPrinterFull(path) {
  return new Promise((resolve, reject) => {
    exec(`sudo tee /dev/usb/lp1 < "${path}"`, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function gerarId() {
  const agora = new Date();
  const dd = String(agora.getDate()).padStart(2, "0");
  const mm = String(agora.getMonth() + 1).padStart(2, "0");
  const yy = String(agora.getFullYear()).slice(-2);
  const hh = String(agora.getHours()).padStart(2, "0");
  const min = String(agora.getMinutes()).padStart(2, "0");
  const ss = String(agora.getSeconds()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 5);
  return `${dd}${mm}${yy}-${hh}${min}${ss}-${rand}`;
}


app.post("/upload", upload.single("file"), (req, res) => {
  try {
    const filePath = req.file.path;
    const fileName = req.file.originalname;

    let queue = loadQueue();

    if (fileName.endsWith(".txt")) {
      const id = gerarId();
      const newPath = path.join("zpp/extracted", `${id}.txt`);

      fs.renameSync(filePath, newPath);

      queue.push({
        id: id,
        name: `${id}.txt`,
        status: "pending"
      });

      saveQueue(queue);
      return res.send("TXT adicionado à fila");
    }

    if (fileName.endsWith(".zpl")) {
      const id = gerarId();
      const newPath = path.join("zpp/extracted", `${id}.zpl`);

      fs.renameSync(filePath, newPath);

      queue.push({
        id: id,
        name: `${id}.zpl`,
        status: "pending"
      });

      saveQueue(queue);
      return res.send("TXT adicionado à fila");
    }

    if (fileName.endsWith(".zip")) {
      const zip = new AdmZip(filePath);
      const extractPath = "zpp/extracted/";

      zip.extractAllTo(extractPath, true);

      const files = fs.readdirSync(extractPath);
      const txtFiles = files.filter(f => f.endsWith(".txt"));

      if (txtFiles.length === 0) {
        return res.status(400).send("Nenhum TXT encontrado");
      }

      txtFiles.forEach(file => {
        const id = gerarId();

        const oldPath = path.join(extractPath, file);
        const newPath = path.join(extractPath, `${id}.txt`);

        fs.renameSync(oldPath, newPath);

        queue.push({
          id: id,
          name: `${id}.txt`,
          status: "pending"
        });
      });

      saveQueue(queue);
      return res.send("ZIP processado e adicionado à fila");
    }

    // 👉 CASO inválido
    res.status(400).send("Formato não suportado");

  } catch (err) {
    console.error(err);
    res.status(500).send("Erro");
  }
});

app.post("/uploadFull", uploadFull.single("file"), (req, res) => {
  try {
    const filePath = req.file.path;
    const fileName = req.file.originalname;

    let queue = loadQueueFull();

    if (fileName.endsWith(".txt")) {
      const id = gerarId();
      const newPath = path.join("zpp/extractedFull", `${id}.txt`);

      fs.renameSync(filePath, newPath);

      queue.push({
        id: id,
        name: `${id}.txt`,
        status: "pending"
      });

      saveQueueFull(queue);
      return res.send("TXT adicionado à fila");
    }

    if (fileName.endsWith(".zpl")) {
      const id = gerarId();
      const newPath = path.join("zpp/extractedFull", `${id}.zpl`);

      fs.renameSync(filePath, newPath);

      queue.push({
        id: id,
        name: `${id}.zpl`,
        status: "pending"
      });

      saveQueueFull(queue);
      return res.send("TXT adicionado à fila");
    }

    if (fileName.endsWith(".zip")) {
      const zip = new AdmZip(filePath);
      const extractPath = "zpp/extractedFull/";

      zip.extractAllTo(extractPath, true);

      const files = fs.readdirSync(extractPath);
      const txtFiles = files.filter(f => f.endsWith(".txt"));

      if (txtFiles.length === 0) {
        return res.status(400).send("Nenhum TXT encontrado");
      }

      txtFiles.forEach(file => {
        const id = gerarId();

        const oldPath = path.join(extractPath, file);
        const newPath = path.join(extractPath, `${id}.txt`);

        fs.renameSync(oldPath, newPath);

        queue.push({
          id: id,
          name: `${id}.txt`,
          status: "pending"
        });
      });

      saveQueueFull(queue);
      return res.send("ZIP processado e adicionado à fila");
    }

    // 👉 CASO inválido
    res.status(400).send("Formato não suportado");

  } catch (err) {
    console.error(err);
    res.status(500).send("Erro");
  }
});


app.get("/queue", (req, res) => {
  const queue = loadQueue();
  res.json(queue.filter(item => item.status === "pending"));
});

app.get("/queueFull", (req, res) => {
  const queue = loadQueueFull();
  res.json(queue.filter(item => item.status === "pending"));
});


// 🖨️ imprimir item
app.post("/print/:id", (req, res) => {
  let queue = loadQueue();

  const item = queue.find(i => i.id === req.params.id);

  if (!item) return res.status(404).send("Não encontrado");

  console.log("ID recebido:", req.params.id);
  console.log("Fila:", queue);

  sendToPrinter(`zpp/extracted/${item.name}`)
    .then(() => {
      item.status = "printed";
      saveQueue(queue);
      res.json({ success: true });
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: err.message });
    });
});

function fullParametros(filePath) {
  const fs = require("fs");
  let content = fs.readFileSync(filePath, "utf8");
  const linhas = content.split("\n");

  if (
    linhas[0]?.includes("^XA^CI28") &&
    linhas[1]?.includes("^LH0,0")
  ) {
    const novasLinhas = [
      "^XA^CI28",
      "^PW650",
      "^LL300",
      "^LT10",
      "^LH0,0"
    ];

    linhas.splice(0, 2, ...novasLinhas);
    const novoConteudo = linhas.join("\n");
    fs.writeFileSync(filePath, novoConteudo, "utf8");
  }
}

app.post("/printFull/:id", (req, res) => {
  let queue = loadQueueFull();

  const item = queue.find(i => i.id === req.params.id);

  if (!item) return res.status(404).send("Não encontrado");

  const filePath = `zpp/extractedFull/${item.name}`;

  try {
    fullParametros(filePath);
  } catch (err) {
    console.error("Erro ao ajustar ZPL:", err);
    return res.status(500).send("Erro ao ajustar arquivo");
  }

  console.log("ID recebido:", req.params.id);
  console.log("Fila:", queue);

  sendToPrinterFull(`zpp/extractedFull/${item.name}`)
    .then(() => {
      item.status = "printed";
      saveQueueFull(queue);
      res.json({ success: true });
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: err.message });
    });
});

app.post("/clear", (req, res) => {
  const fs = require("fs");
  const path = require("path");

  const base = "/home/admin/mab-flow/zfpp";

  try {
      fs.rmSync(path.join(base, "extracted"), { recursive: true, force: true });
      fs.mkdirSync(path.join(base, "extracted"), { recursive: true });

      fs.rmSync(path.join(base, "uploads"), { recursive: true, force: true });
      fs.mkdirSync(path.join(base, "uploads"), { recursive: true });

      fs.writeFileSync(path.join(base, "queue.json"), "[]");

      res.send("Limpo com sucesso");
  } catch (err) {
      console.error(err);
      res.status(500).send("Erro ao limpar");
  }
});

app.post("/clearFull", (req, res) => {
  const fs = require("fs");
  const path = require("path");

  const base = "/home/admin/mab-flow/zfpp";

  try {
      fs.rmSync(path.join(base, "extractedFull"), { recursive: true, force: true });
      fs.mkdirSync(path.join(base, "extractedFull"), { recursive: true });

      fs.rmSync(path.join(base, "uploadsFull"), { recursive: true, force: true });
      fs.mkdirSync(path.join(base, "uploadsFull"), { recursive: true });

      fs.writeFileSync(path.join(base, "queueFull.json"), "[]");

      res.send("Limpo com sucesso");
  } catch (err) {
      console.error(err);
      res.status(500).send("Erro ao limpar");
  }
});

app.listen(3000, () => console.log("Rodando!"));