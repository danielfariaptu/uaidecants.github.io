function createApp() {
  const express = require("express");
  const cors = require("cors");

  // Lazy init do Admin
  let admin;
  let db;
  function ensureInit() {
    if (!admin) {
      admin = require("firebase-admin");
      admin.initializeApp({storageBucket: "uaidecants.appspot.com"});
      db = admin.firestore();
    }
  }

  const ADMINS = ["danielfari4@gmail.com"];
  const EMAILS_TEMPORARIOS = [
    "tempmail.com", "10minutemail.com", "mailinator.com", "guerrillamail.com",
    "yopmail.com", "getnada.com", "trashmail.com", "fakeinbox.com", "mintemail.com", "dispostable.com",
  ];

  function isEmailTemporario(email) {
    const partes = email.split("@");
    const dominio = partes.length > 1 ? partes[1].toLowerCase() : "";
    return EMAILS_TEMPORARIOS.some((t) => dominio === t || dominio.endsWith("." + t));
  }

  async function registrarLogAdmin(acao, detalhes) {
    await db.collection("logs_admin").add({acao, detalhes, timestamp: new Date().toISOString()});
  }

  async function autenticarAdminJWT(req, res, next) {
    try {
      const authHeader = req.headers.authorization || "";
      const m = authHeader.match(/^Bearer\s+(.+)$/i);
      const idToken = m ? m[1] : null;
      if (!idToken) return res.status(401).json({success: false, message: "Token ausente."});
      const decoded = await admin.auth().verifyIdToken(idToken);
      if (!ADMINS.includes(decoded.email)) {
        return res.status(403).json({success: false, message: "Acesso restrito ao admin."});
      }
      req.user = decoded;
      next();
    } catch (err) {
      console.error("Auth error:", err);
      return res.status(401).json({success: false, message: "Token inválido."});
    }
  }

  const app = express();

  app.use(cors({
    origin: [
      "http://127.0.0.1:5173", "http://localhost:5173", "https://localhost:5173",
      "https://uaidecants.web.app", "https://www.uaidecants.com.br", "https://uaidecants.com.br",
      "http://127.0.0.1:5000", "https://127.0.0.1:5173",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }));

  // Inicializa Admin na primeira requisição atendida
  app.use((req, _res, next) => {
    ensureInit(); next();
  });

  app.use(express.json({limit: "2mb"}));

  app.get("/", (_req, res) => res.send("API Uai Decants rodando com Firebase!"));
  app.post("/logout-admin", (_req, res) => res.json({success: true}));

  app.post("/usuarios", async (req, res) => {
    try {
      const {nome, email, senha} = req.body;
      if (!nome || !email || !senha) return res.status(400).json({success: false, message: "Nome, email e senha são obrigatórios."});

      const snapshot = await db.collection("usuarios").where("email", "==", email).get();
      if (!snapshot.empty) return res.status(409).json({success: false, message: "Email já cadastrado."});

      if (isEmailTemporario(email)) return res.status(400).json({success: false, message: "Não é permitido usar e-mails temporários."});

      try {
        await admin.auth().createUser({email, password: senha, displayName: nome});
      } catch (error) {
        console.error("Erro ao criar usuário no Firebase Auth:", error); return res.status(400).json({success: false, message: error.message});
      }

      const link = await admin.auth().generateEmailVerificationLink(email);

      const nodemailer = require("nodemailer");
      const bcrypt = require("bcryptjs");

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {user: process.env.EMAIL_REMETENTE, pass: process.env.ARROZ},
      });

      const html = `
        <div style="background:#fff; border-radius:12px; padding:32px; font-family:sans-serif; text-align:center;">
          <img src="https://drive.google.com/uc?export=view&id=1NzJS7rqZxgDZKOUXa-GPS9OwKWJUF6bh" alt="Uai Decants" style="width:120px; margin-bottom:16px;" />
          <h2 style="color:#3498db;">Bem-vindo(a) à Uai Decants!</h2>
          <p>Olá, <strong>${nome}</strong>!</p>
          <p>Obrigado por criar sua conta.<br><b>Antes de acessar, confirme seu e-mail:</b></p>
          <p style="margin:24px 0;">
            <a href="${link}" style="background:#27ae60; color:#fff; padding:12px 32px; border-radius:8px; text-decoration:none; font-weight:bold;">Confirmar E-mail</a>
          </p>
          <hr style="margin:32px 0;">
          <p style="font-size:0.9em; color:#888;">
            Qualquer dúvida, fale conosco:<br>
            <a href="mailto:suporte@uaidecants.com.br">suporte@uaidecants.com.br</a><br>
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

      const hash = await bcrypt.hash(senha, 10);

      const usuario = {nome, email, senha: hash, criadoEm: new Date().toISOString(), emailVerificado: false};
      const docRef = await db.collection("usuarios").add(usuario);

      res.json({success: true, id: docRef.id, nome, email, message: "Conta criada! Verifique seu e-mail antes de acessar."});
    } catch (err) {
      console.error("Erro /usuarios:", err);
      res.status(400).json({success: false, message: "Erro ao criar conta."});
    }
  });

  app.get("/admin-check", autenticarAdminJWT, (_req, res) => res.json({success: true}));

  app.post("/perfumes", autenticarAdminJWT, async (req, res) => {
    try {
      const {imagem, ...resto} = req.body;
      const perfume = {...resto, imagem: imagem || null, ativo: true};
      const docRef = await db.collection("perfumes").add(perfume);
      await registrarLogAdmin("cadastrar_perfume", {id: docRef.id, ...perfume});
      res.json({id: docRef.id, ...perfume});
    } catch (err) {
      console.error("Erro ao cadastrar perfume:", err);
      res.status(500).json({error: err.message});
    }
  });

  app.get("/perfumes", async (_req, res) => {
    try {
      const snapshot = await db.collection("perfumes").get();
      const perfumes = [];
      snapshot.forEach((doc) => perfumes.push({id: doc.id, ...doc.data()}));
      res.json(perfumes);
    } catch (err) {
      res.status(500).json({error: err.message});
    }
  });

  app.get("/perfumes/ativos", async (_req, res) => {
    try {
      const snapshot = await db.collection("perfumes").where("ativo", "==", true).get();
      const perfumes = [];
      snapshot.forEach((doc) => perfumes.push({id: doc.id, ...doc.data()}));
      res.json(perfumes);
    } catch (err) {
      res.status(500).json({error: err.message});
    }
  });

  app.put("/perfumes/:id", autenticarAdminJWT, async (req, res) => {
    try {
      await db.collection("perfumes").doc(req.params.id).update(req.body);
      await registrarLogAdmin("editar_perfume", {id: req.params.id, ...req.body});
      res.json({id: req.params.id, ...req.body});
    } catch (err) {
      res.status(500).json({error: err.message});
    }
  });

  app.delete("/perfumes/:id", autenticarAdminJWT, async (req, res) => {
    try {
      await db.collection("perfumes").doc(req.params.id).delete();
      await registrarLogAdmin("excluir_perfume", {id: req.params.id});
      res.json({success: true});
    } catch (err) {
      res.status(500).json({error: err.message});
    }
  });

  app.post("/perfumes/:id/desativar", autenticarAdminJWT, async (req, res) => {
    try {
      await db.collection("perfumes").doc(req.params.id).update({ativo: false});
      await registrarLogAdmin("desativar_perfume", {id: req.params.id});
      res.json({success: true});
    } catch (err) {
      res.status(500).json({error: err.message});
    }
  });

  app.post("/perfumes/:id/ativar", autenticarAdminJWT, async (req, res) => {
    try {
      await db.collection("perfumes").doc(req.params.id).update({ativo: true});
      await registrarLogAdmin("ativar_perfume", {id: req.params.id});
      res.json({success: true});
    } catch (err) {
      res.status(500).json({error: err.message});
    }
  });

  return app;
}

module.exports = {createApp};
