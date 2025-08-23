const functions = require("firebase-functions/v2");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const cookie = require("cookie");


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

async function autenticarUsuario(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const idToken = authHeader && authHeader.split("Bearer ")[1];
    if (!idToken) {
      return res.status(401).json({ success: false, message: "Token ausente." });
    }
    const decoded = await admin.auth().verifyIdToken(idToken);
    if (!decoded.email_verified) {
      return res.status(403).json({ success: false, message: "Verifique seu e-mail." });
    }
    req.usuario = decoded; // opcional: passa dados do usuário para a rota
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Token inválido." });
  }
}

async function registrarLogAdmin(acao, detalhes) {
  await db.collection("logs_admin").add({
    acao,
    detalhes,
    timestamp: new Date().toISOString(),
  });
}

function autenticarAdmin(req, res, next) {
  const cookies = cookie.parse(req.headers.cookie || "");
  if (cookies.adminAuth === "true") {
    return next();
  }
  return res.status(401).json({ success: false, message:
    "Acesso restrito ao admin." });
}

app.post("/logout-admin", (req, res) => {
  res.setHeader("Set-Cookie", cookie.serialize("adminAuth", "", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  }));
  res.json({success: true});
});

app.post("/api/protected", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const idToken = authHeader && authHeader.split("Bearer ")[1];
    if (!idToken) {
      return res.status(401).json({success: false, message:
        "Token ausente."});
    }
    const decoded = await admin.auth().verifyIdToken(idToken);
    if (!decoded.email_verified) {
      return res.status(403).json({success: false, message:
        "Verifique seu e-mail."});
    }
    // Usuário autenticado e verificado
    res.json({success: true, message: "Acesso permitido."});
  } catch (err) {
    res.status(401).json({success: false, message: "Token inválido."});
  }
});

app.post("/api/usuarios", async (req, res) => {
  try {
    const {nome, email, senha} = req.body;
    if (!nome || !email || !senha) {
      return res.status(400).json({
        success: false,
        message: "Nome, email e senha são obrigatórios.",
      });
    }

    // Verifica se já existe no Firestore
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

    // Cria usuário no Firebase Auth
    try {
      await admin.auth().createUser({
        email,
        password: senha,
        displayName: nome,
      });
    } catch (error) {
      console.error("Erro ao criar usuário no Firebase Auth:", error);
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    // Gera link de verificação de e-mail
    const link = await admin.auth().generateEmailVerificationLink(email);

    // Envia e-mail de verificação
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
          Obrigado por criar sua conta.<br>
          <b>Antes de acessar, confirme seu e-mail:</b>
        </p>
        <p style="margin:24px 0;">
          <a
            href="${link}"
            style="background:#27ae60; color:#fff; padding:12px 32px;
              border-radius:8px; text-decoration:none; font-weight:bold;"
          >
            Confirmar E-mail
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
      subject: "Confirme seu e-mail na Uai Decants!",
      html,
    });

    // Criptografa a senha
    const hash = await bcrypt.hash(senha, 10);

    // Salva usuário no Firestore
    const usuario = {
      nome,
      email,
      senha: hash,
      criadoEm: new Date().toISOString(),
      emailVerificado: false, // controle extra se quiser
    };
    const docRef = await db.collection("usuarios").add(usuario);

    res.json({
      success: true,
      id: docRef.id,
      nome,
      email,
      message: "Conta criada! Verifique seu e-mail antes de acessar.",
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: "Erro ao criar conta.",
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
    // Gera cookie seguro
    res.setHeader("Set-Cookie", cookie.serialize("adminAuth", "true", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60, // 1 hora
    }));
    res.json({success: true});
  } else {
    res.status(401).json({
      success: false,
      message: "Senha incorreta",
    });
  }
});

// Cadastrar perfume
app.post("/api/perfumes", autenticarAdmin, async (req, res) => {

  try {
    console.log("Dados recebidos:", req.body);
    const perfume = {...req.body, ativo: true};
    const docRef = await db.collection("perfumes").add(perfume);
    await registrarLogAdmin("cadastrar_perfume", {id: docRef.id, ...perfume});
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
app.put("/api/perfumes/:id", autenticarAdmin, async (req, res) => {
  try {
    await db.collection("perfumes").doc(req.params.id).update(req.body);
    await registrarLogAdmin("editar_perfume", {id: req.params.id, ...req.body});
    res.json({
      id: req.params.id,
      ...req.body,
    });
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// Excluir perfume
app.delete("/api/perfumes/:id", autenticarAdmin, async (req, res) => {
  try {
    await db.collection("perfumes").doc(req.params.id).delete();
    await registrarLogAdmin("excluir_perfume", {id: req.params.id});
    res.json({success: true});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// Desativar perfume
app.post("/api/perfumes/:id/desativar", autenticarAdmin, async (req, res) => {
  try {
    await db.collection("perfumes").doc(req.params.id).update({ativo: false});
    await registrarLogAdmin("desativar_perfume", {id: req.params.id});
    res.json({success: true});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// Ativar perfume
app.post("/api/perfumes/:id/ativar", autenticarAdmin, async (req, res) => {
  try {
    await db.collection("perfumes").doc(req.params.id).update({ativo: true});
    await registrarLogAdmin("ativar_perfume", {id: req.params.id});
    res.json({success: true});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

exports.api = functions.https.onRequest({
  secrets: ["ADMIN_HASH", "ARROZ", "EMAIL_REMETENTE"],
}, app);
