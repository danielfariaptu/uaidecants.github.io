const functions = require("firebase-functions/v2");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

// Inicializa o Firebase Admin
admin.initializeApp();

const db = admin.firestore();

const app = express();

app.use(cors({origin: true}));
app.use(express.json());

// Rota de teste
app.get("/", (req, res) => {
  res.send("API Uai Decants rodando com Firebase!");
});

const EMAILS_TEMPORARIOS = [
  "tempmail.com",
  "10minutemail.com",
  "mailinator.com",
  "guerrillamail.com",
  "yopmail.com",
  "getnada.com",
  "trashmail.com",
  "fakeinbox.com",
  "mintemail.com",
  "dispostable.com",
];

/**
 * Verifica se o e-mail é de domínio temporário.
 * @param {string} email
 * @return {boolean}
 */
function isEmailTemporario(email) {
  const partes = email.split("@");
  const dominio = partes.length > 1 ? partes[1].toLowerCase() : "";
  return EMAILS_TEMPORARIOS.some(
      (temp) => dominio === temp || dominio.endsWith("." + temp),
  );
}

app.post("/api/usuarios", async (req, res) =>{
  try {
    const {nome, email, senha} = req.body;
    if (!nome || !email || !senha) {
      return res.status(400).json({
        success: false,
        message: "Nome, email e senha são obrigatórios.",
      });
    }

    const snapshot = await db
        .collection("usuarios")
        .where("email", "==", email)
        .get();
    if (!snapshot.empty) {
      return res.status(409).json({
        success: false,
        message: "Email já cadastrado.",
      });
    }

    if (isEmailTemporario(email)) {
      return res.status(400).json({
        success: false,
        message: "Não é permitido usar e-mails temporários.",
      });
    }

    // Criptografa a senha
    const hash = await bcrypt.hash(senha, 10);

    // Salva usuário
    const usuario = {
      nome,
      email,
      senha: hash,
      criadoEm: new Date().toISOString(),
    };
    const docRef = await db.collection("usuarios").add(usuario);

    // Envia e-mail de boas-vindas
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_REMETENTE,
        pass: process.env.ARROZ,
      },
    });

    const html = `
      <div style="background:#fff; border-radius:12px; padding:32px;
        font-family:sans-serif; text-align:center;">
        <img
          src="https://drive.google.com/file/d/1NzJS7rqZxgDZKOUXa-GPS9OwKWJUF6bh/view?usp=drive_link"
          alt="Uai Decants"
          style="width:120px; margin-bottom:16px;"
        />
        <h2 style="color:#3498db;">Bem-vindo(a) à Uai Decants!</h2>
        <p>Olá, <strong>${nome}</strong>!</p>
        <p>
          Obrigado por criar sua conta. Agora você pode comprar decants
          dos melhores perfumes do Brasil!
        </p>
        <p style="margin:24px 0;">
          <a
            href="https://uaidecants.com.br"
            style="background:#27ae60; color:#fff; padding:12px 32px;
              border-radius:8px; text-decoration:none; font-weight:bold;"
          >
            Acessar Loja
          </a>
        </p>
        <hr style="margin:32px 0;">
        <p style="font-size:0.9em; color:#888;">
          Qualquer dúvida, fale conosco:<br>
          <a href="mailto:suporte@uaidecants.com.br">
            suporte@uaidecants.com.br
          </a><br>
          WhatsApp: (38) 99724-8602
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: "\"Uai Decants\" <suporte@uaidecants.com.br>",
      to: email,
      subject: "Bem-vindo(a) à Uai Decants!",
      html,
    });

    res.json({
      success: true,
      id: docRef.id,
      nome,
      email,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: "Nome, email e senha são obrigatórios.",
    });
  }
});

app.post("/login-admin-daniel-faria", async (req, res) => {
  const {senha} = req.body;
  const ADMIN_HASH = process.env.ADMIN_HASH;
  if (!ADMIN_HASH) {
    return res.status(500).json({
      success: false,
      message: "Hash do admin não configurado no ambiente.",
    });
  }
  const match = await bcrypt.compare(senha, ADMIN_HASH);
  if (match) {
    res.json({success: true});
  } else {
    res.status(401).json({
      success: false,
      message: "Senha incorreta",
    });
  }
});

// Cadastrar perfume
app.post("/api/perfumes", async (req, res) => {
  try {
    console.log("Dados recebidos:", req.body);
    const perfume = {...req.body, ativo: true};
    const docRef = await db.collection("perfumes").add(perfume);
    res.json({
      id: docRef.id,
      ...perfume,
    });
  } catch (err) {
    console.error("Erro ao cadastrar perfume:", err);
    res.status(500).json({error: err.message});
  }
});

// Listar perfumes (todos)
app.get("/api/perfumes", async (req, res) => {
  try {
    const snapshot = await db.collection("perfumes").get();
    const perfumes = [];
    snapshot.forEach((doc) => {
      perfumes.push({id: doc.id, ...doc.data()});
    });
    res.json(perfumes);
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// Listar perfumes ativos
app.get("/api/perfumes/ativos", async (req, res) => {
  try {
    const snapshot = await db
        .collection("perfumes")
        .where("ativo", "==", true)
        .get();
    const perfumes = [];
    snapshot.forEach((doc) => {
      perfumes.push({id: doc.id, ...doc.data()});
    });
    res.json(perfumes);
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// Editar perfume
app.put("/api/perfumes/:id", async (req, res) => {
  try {
    await db.collection("perfumes").doc(req.params.id).update(req.body);
    res.json({
      id: req.params.id,
      ...req.body,
    });
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// Excluir perfume
app.delete("/api/perfumes/:id", async (req, res) => {
  try {
    await db.collection("perfumes").doc(req.params.id).delete();
    res.json({success: true});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// Desativar perfume
app.post("/api/perfumes/:id/desativar", async (req, res) => {
  try {
    await db.collection("perfumes").doc(req.params.id).update({ativo: false});
    res.json({success: true});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// Ativar perfume
app.post("/api/perfumes/:id/ativar", async (req, res) => {
  try {
    await db.collection("perfumes").doc(req.params.id).update({ativo: true});
    res.json({success: true});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

exports.api = functions.https.onRequest({
  secrets: ["ADMIN_HASH", "ARROZ", "EMAIL_REMETENTE"],
}, app);
