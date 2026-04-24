const express = require("express");
const path = require("path");
const router = express.Router();
const multer = require("multer");
const AdmZip = require("adm-zip");
const fs = require("fs");
const BASE_PATH = path.join(__dirname);
const QUEUE_FILE = path.join(BASE_PATH, "queue.json");
const QUEUE_FILEFULL = path.join(BASE_PATH, "queueFull.json");
const EXTRACTED_PATH = path.join(BASE_PATH, "extracted");
const EXTRACTED_FULL_PATH = path.join(BASE_PATH, "extractedFull");
const upload = multer({ dest: path.join(BASE_PATH, "uploads") });
const uploadFull = multer({ dest: path.join(BASE_PATH, "uploadsFull") });
fs.mkdirSync(EXTRACTED_PATH, { recursive: true });
fs.mkdirSync(EXTRACTED_FULL_PATH, { recursive: true });

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


router.post("/upload", upload.single("file"), (req, res) => {
  try {
    const filePath = req.file.path;
    const fileName = req.file.originalname;

    let queue = loadQueue();

    if (fileName.endsWith(".txt")) {
      const id = gerarId();
      const newPath = path.join(EXTRACTED_PATH, `${id}.txt`);

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
      const newPath = path.join(EXTRACTED_PATH, `${id}.zpl`);

      fs.renameSync(filePath, newPath);

      queue.push({
        id: id,
        name: `${id}.zpl`,
        status: "pending"
      });

      saveQueue(queue);
      return res.send("ZPL adicionado à fila");
    }

    if (fileName.endsWith(".zip")) {
      const zip = new AdmZip(filePath);

      zip.extractAllTo(EXTRACTED_PATH, true);

      const files = fs.readdirSync(EXTRACTED_PATH);
      const txtFiles = files.filter(f => f.endsWith(".txt"));
      const zplFiles = files.filter(f => f.endsWith(".zpl"));

      if (txtFiles.length === 0 && zplFiles.length === 0) {
        return res.status(400).send("Nenhum TXT encontrado");
      }

      txtFiles.forEach(file => {
        const id = gerarId();
        const oldPath = path.join(EXTRACTED_PATH, file);
        const newPath = path.join(EXTRACTED_PATH, `${id}.txt`);

        fs.renameSync(oldPath, newPath);

        queue.push({
          id: id,
          name: `${id}.txt`,
          status: "pending"
        });
      }) 

      zplFiles.forEach(file => {
        const id = gerarId();
        const oldPath = path.join(EXTRACTED_PATH, file);
        const newPath = path.join(EXTRACTED_PATH, `${id}.zpl`);

        fs.renameSync(oldPath, newPath);

        queue.push({
          id: id,
          name: `${id}.zpl`,
          status: "pending"
        });
      });

      saveQueue(queue);
      loadQueue()
      return res.send("ZIP processado e adicionado à fila");
    }

    // 👉 CASO inválido
    res.status(400).send("Formato não suportado");

  } catch (err) {
    console.error(err);
    res.status(500).send("Erro");
  }
});

router.post("/uploadFull", uploadFull.single("file"), (req, res) => {
  try {
    const filePath = req.file.path;
    const fileName = req.file.originalname;

    let queue = loadQueueFull();

    if (fileName.endsWith(".txt")) {
      const id = gerarId();
      const newPath = path.join(EXTRACTED_FULL_PATH, `${id}.txt`);

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
      const newPath = path.join(EXTRACTED_FULL_PATH, `${id}.zpl`);

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

      zip.extractAllTo(EXTRACTED_FULL_PATH, true);

      const files = fs.readdirSync(EXTRACTED_FULL_PATH);
      const txtFiles = files.filter(f => f.endsWith(".txt"));

      if (txtFiles.length === 0) {
        return res.status(400).send("Nenhum TXT encontrado");
      }

      txtFiles.forEach(file => {
        const id = gerarId();

        const oldPath = path.join(EXTRACTED_FULL_PATH, file);
        const newPath = path.join(EXTRACTED_FULL_PATH, `${id}.txt`);

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


router.get("/queue", (req, res) => {
  const queue = loadQueue();
  res.json(queue.filter(item => item.status === "pending"));
});

router.get("/queueFull", (req, res) => {
  const queue = loadQueueFull();
  res.json(queue.filter(item => item.status === "pending"));
});

router.post("/print/:id", (req, res) => {
  let queue = loadQueue();

  const item = queue.find(i => i.id === req.params.id);

  if (!item) return res.status(404).send("Não encontrado");

  console.log("ID recebido:", req.params.id);
  console.log("Fila:", queue);

  sendToPrinter(path.join(EXTRACTED_PATH, item.name))
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

router.post("/printFull/:id", (req, res) => {
  let queue = loadQueueFull();

  const item = queue.find(i => i.id === req.params.id);

  if (!item) return res.status(404).send("Não encontrado");

  const filePath = path.join(EXTRACTED_FULL_PATH, item.name);

  try {
    fullParametros(filePath);
  } catch (err) {
    console.error("Erro ao ajustar ZPL:", err);
    return res.status(500).send("Erro ao ajustar arquivo");
  }

  console.log("ID recebido:", req.params.id);
  console.log("Fila:", queue);

  sendToPrinterFull(path.join(EXTRACTED_FULL_PATH, item.name))
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

router.post("/clear", (req, res) => {

  try {
      fs.rmSync(path.join(BASE_PATH, "extracted"), { recursive: true, force: true });
      fs.mkdirSync(path.join(BASE_PATH, "extracted"), { recursive: true });

      fs.rmSync(path.join(BASE_PATH, "uploads"), { recursive: true, force: true });
      fs.mkdirSync(path.join(BASE_PATH, "uploads"), { recursive: true });

      fs.writeFileSync(path.join(BASE_PATH, "queue.json"), "[]");

      res.send("Limpo com sucesso");
  } catch (err) {
      console.error(err);
      res.status(500).send("Erro ao limpar");
  }
});

router.post("/clearFull", (req, res) => {

  try {
      fs.rmSync(path.join(BASE_PATH, "extractedFull"), { recursive: true, force: true });
      fs.mkdirSync(path.join(BASE_PATH, "extractedFull"), { recursive: true });

      fs.rmSync(path.join(BASE_PATH, "uploadsFull"), { recursive: true, force: true });
      fs.mkdirSync(path.join(BASE_PATH, "uploadsFull"), { recursive: true });

      fs.writeFileSync(path.join(BASE_PATH, "queueFull.json"), "[]");

      res.send("Limpo com sucesso");
  } catch (err) {
      console.error(err);
      res.status(500).send("Erro ao limpar");
  }
});

// sales
router.get("/sales-labels", (req, res) => {
  res.sendFile(path.join(__dirname, "public/zpp-shopee-sales.html"));
});

// full labels
router.get("/full-labels", (req, res) => {
  res.sendFile(path.join(__dirname, "public/zpp-full-labels.html"));
});

module.exports = router;