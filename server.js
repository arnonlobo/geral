const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

// --- ALTERAÇÃO AQUI ---
// Tenta pegar a porta do ambiente (Contabo/PM2), senão usa 3001
const PORT = process.env.PORT || 3001;

const DATA_FILE = path.join(__dirname, "database.json"); // Arquivo onde os dados serão salvos

// Garante que o arquivo de dados existe
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({}), "utf8");
}

const mimeTypes = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpg",
  ".ico": "image/x-icon",
};

const server = http.createServer((req, res) => {
  // Adiciona cabeçalhos CORS para evitar problemas
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // --- ROTA 1: Servir o Front-End (index.html) ---
  if (pathname === "/" || pathname === "/index.html") {
    fs.readFile(path.join(__dirname, "index.html"), (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end("Erro ao carregar index.html");
      } else {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(data);
      }
    });
  }
  // --- ROTA 2: API para Ler Dados (GET) ---
  else if (pathname === "/api/data" && req.method === "GET") {
    const { date, type } = parsedUrl.query;

    fs.readFile(DATA_FILE, "utf8", (err, data) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Erro ao ler banco de dados" }));
        return;
      }

      try {
        const db = JSON.parse(data);
        const key = `${date}_${type}`;
        const records = db[key] || [];

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(records));
      } catch (parseError) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: "Banco de dados corrompido" }));
      }
    });
  }
  // --- ROTA 3: API para Salvar Dados (POST) ---
  else if (pathname === "/api/save" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        const { date, type, data } = payload;
        const key = `${date}_${type}`;

        const currentData = fs.existsSync(DATA_FILE)
          ? JSON.parse(fs.readFileSync(DATA_FILE, "utf8"))
          : {};
        currentData[key] = data;

        fs.writeFileSync(
          DATA_FILE,
          JSON.stringify(currentData, null, 2),
          "utf8"
        );

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            message: "Dados salvos no VPS com sucesso!",
          })
        );
      } catch (e) {
        console.error(e);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: false,
            message: "Erro interno no servidor",
          })
        );
      }
    });
  }
  // --- Servir Arquivos Estáticos ---
  else {
    res.writeHead(404);
    res.end("Não encontrado");
  }
});

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta: ${PORT}`);
  console.log(`Acesse: http://SEU_IP_VPS:${PORT}`);
});
