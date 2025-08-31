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

  const UFS_SET = new Set(["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"]);

  function isNonEmpty(v) {
    return typeof v === "string" && v.trim() !== "";
  }
  function digits(v) {
    return String(v || "").replace(/\D/g, "");
  }

  function validateAddressPayload(obj) {
    const b = obj || {};
    const errors = [];
    if (!isNonEmpty(b.nomeDestinatario)) errors.push("nomeDestinatario");
    if (!isNonEmpty(b.logradouro)) errors.push("logradouro");
    if (!isNonEmpty(b.numero)) errors.push("numero");
    if (!isNonEmpty(b.bairro)) errors.push("bairro");
    if (!isNonEmpty(b.cidade)) errors.push("cidade");
    if (!isNonEmpty(b.estado) || !UFS_SET.has(String(b.estado).toUpperCase())) errors.push("estado");
    if (!isNonEmpty(b.telefone)) errors.push("telefone");
    if (digits(b.cep).length !== 8) errors.push("cep");
    // complemento é opcional
    return {ok: errors.length === 0, errors};
  }

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

  // Middleware: autentica qualquer usuário (não admin)
  async function autenticarUsuarioJWT(req, res, next) {
    try {
      const authHeader = req.headers.authorization || "";
      const m = authHeader.match(/^Bearer\s+(.+)$/i);
      const idToken = m ? m[1] : null;
      if (!idToken) return res.status(401).json({success: false, message: "Token ausente."});
      const decoded = await admin.auth().verifyIdToken(idToken);
      req.auth = decoded; // uid, email, etc.
      next();
    } catch (err) {
      console.error("Auth user error:", err);
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
        console.error("Erro ao criar usuário no Firebase Auth:", error);
        return res.status(400).json({success: false, message: error.message});
      }

      // BASE: usa o origin da requisição quando válido, senão domínio de produção
      const origin = (req.headers.origin && /^https?:\/\//.test(req.headers.origin)) ?
        req.headers.origin :
        "https://www.uaidecants.com.br";
      const baseUrl = `${origin}/confirmar-email`;

      // Gera link oficial e extrai o oobCode para montar a URL da sua página
      const verifySettings = {url: baseUrl, handleCodeInApp: true};
      const verifyLink = await admin.auth().generateEmailVerificationLink(email, verifySettings);
      const u = new URL(verifyLink);
      const oobCode = u.searchParams.get("oobCode");
      const customLink = `${baseUrl}?mode=verifyEmail&oobCode=${encodeURIComponent(oobCode)}&lang=pt&hl=pt-BR`;

      const nodemailer = require("nodemailer");
      const bcrypt = require("bcryptjs");

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {user: process.env.EMAIL_REMETENTE, pass: process.env.ARROZ},
      });

      // Template “bulletproof” (uma tabela, sem margins, com preheader)
      const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#f5f7fb;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Confirme seu e-mail para ativar sua conta Uai Decants.
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f7fb;">
      <tr>
        <td align="center" style="padding:24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:100%;background:#ffffff;border-radius:12px;">
            <tr>
              <td align="center" style="padding:28px 28px 8px 28px;">
                <img src="https://drive.google.com/uc?export=view&id=1NzJS7rqZxgDZKOUXa-GPS9OwKWJUF6bh" alt="Uai Decants" width="120" height="120" style="display:block;border:0;outline:none;text-decoration:none;border-radius:8px;">
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 28px;">
                <h1 style="margin:8px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:28px;color:#0d6efd;">Confirme seu e-mail</h1>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:12px 28px 0 28px;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#4a5568;">
                  Olá, <strong>${nome}</strong>! Clique no botão para ativar sua conta.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:22px 28px;">
                <a href="${customLink}" target="_blank"
                   style="display:inline-block;background:#27ae60;color:#ffffff;text-decoration:none;
                          font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;
                          padding:12px 28px;border-radius:8px;">
                  Confirmar e-mail
                </a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 28px 6px 28px;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#718096;">
                  Se você não criou esta conta, ignore este e-mail.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 0 0 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr><td height="1" style="background:#edf2f7;"></td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:12px 16px 24px 16px;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#a0aec0;">
                  Dúvidas? <a href="mailto:suporte@uaidecants.com.br" style="color:#4a5568;text-decoration:underline;">suporte@uaidecants.com.br</a> • WhatsApp: (38) 99724-8602
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

      await transporter.sendMail({
        from: "\"Uai Decants\" <suporte@uaidecants.com.br>",
        to: email,
        subject: "Confirme seu e-mail - Uai Decants",
        html,
        text: `Ative sua conta: ${customLink}`,
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

  app.post("/auth/resend-verification", async (req, res) => {
    try {
      ensureInit();
      const {email, nome, redirectUrl} = req.body || {};
      if (!email) return res.status(400).json({success: false, message: "Email é obrigatório."});

      let exists = true;
      try {
        await admin.auth().getUserByEmail(String(email).trim());
      } catch (err) { // <-- antes era: catch {
        exists = false;
      }

      if (exists) {
        const baseUrl = String(redirectUrl || "https://www.uaidecants.com.br/confirmar-email");
        const settings = {url: baseUrl, handleCodeInApp: true};
        const link = await admin.auth().generateEmailVerificationLink(String(email).trim(), settings);

        const u = new URL(link);
        const oobCode = u.searchParams.get("oobCode");
        const customLink = `${baseUrl}?mode=verifyEmail&oobCode=${encodeURIComponent(oobCode)}&lang=pt&hl=pt-BR`;

        const nodemailer = require("nodemailer");
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {user: process.env.EMAIL_REMETENTE, pass: process.env.ARROZ},
        });

        const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#f5f7fb;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Confirme seu e-mail para ativar sua conta Uai Decants.
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f7fb;">
      <tr>
        <td align="center" style="padding:24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:100%;background:#ffffff;border-radius:12px;">
            <tr>
              <td align="center" style="padding:28px 28px 8px 28px;">
                <img src="https://drive.google.com/uc?export=view&id=1NzJS7rqZxgDZKOUXa-GPS9OwKWJUF6bh" alt="Uai Decants" width="120" height="120" style="display:block;border:0;outline:none;text-decoration:none;border-radius:8px;">
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 28px;">
                <h1 style="margin:8px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:28px;color:#0d6efd;">Confirme seu e-mail</h1>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:12px 28px 0 28px;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#4a5568;">
                  Olá, <strong>${nome || ""}</strong>! Clique no botão para ativar sua conta.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:22px 28px;">
                <a href="${customLink}" target="_blank"
                   style="display:inline-block;background:#27ae60;color:#ffffff;text-decoration:none;
                          font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;
                          padding:12px 28px;border-radius:8px;">
                  Confirmar e-mail
                </a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 28px 6px 28px;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#718096;">
                  Se você não criou esta conta, ignore este e-mail.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:12px 16px 24px 16px;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#a0aec0;">
                  Dúvidas? <a href="mailto:suporte@uaidecants.com.br" style="color:#4a5568;text-decoration:underline;">suporte@uaidecants.com.br</a> • WhatsApp: (38) 99724-8602
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

        await transporter.sendMail({
          from: "\"Uai Decants\" <suporte@uaidecants.com.br>",
          to: email,
          subject: "Confirme seu e-mail - Uai Decants",
          html,
          text: `Ative sua conta: ${customLink}`,
        });
      }

      // sempre responde sucesso para não expor se o e-mail existe
      return res.json({success: true, message: "Se o e-mail estiver cadastrado, reenviamos o link de verificação."});
    } catch (err) {
      console.error("POST /auth/resend-verification:", err);
      return res.status(500).json({success: false, message: "Não foi possível reenviar o e-mail de verificação."});
    }
  });

  app.post("/auth/password-reset", async (req, res) => {
    try {
      ensureInit();
      const {email, redirectUrl} = req.body || {};
      if (!email) return res.status(400).json({success: false, message: "Email é obrigatório."});

      // Não revelar existência
      let userExists = true;
      try {
        await admin.auth().getUserByEmail(String(email).trim());
      } catch (err) {
        userExists = false;
      }

      if (userExists) {
        const baseUrl = String(redirectUrl || "https://www.uaidecants.com.br/recuperar-senha");

        // Gera o link oficial só para obter o oobCode
        const actionSettings = {url: baseUrl, handleCodeInApp: true};
        const link = await admin.auth().generatePasswordResetLink(String(email).trim(), actionSettings);

        // Extrai o código e monta link direto para sua página
        const u = new URL(link);
        const oobCode = u.searchParams.get("oobCode");
        const customLink = `${baseUrl}?mode=resetPassword&oobCode=${encodeURIComponent(oobCode)}&lang=pt&hl=pt-BR`;

        const nodemailer = require("nodemailer");
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {user: process.env.EMAIL_REMETENTE, pass: process.env.ARROZ},
        });

        const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#f5f7fb;">
    <!-- Preheader invisível (melhora preview e evita cortes estranhos) -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Redefinir senha da sua conta Uai Decants.
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f7fb;">
      <tr>
        <td align="center" style="padding:24px;">
          <!-- CARD ÚNICO -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:100%;background:#ffffff;border-radius:12px;">
            <tr>
              <td align="center" style="padding:28px 28px 8px 28px;">
                <img src="https://drive.google.com/uc?export=view&id=1NzJS7rqZxgDZKOUXa-GPS9OwKWJUF6bh" alt="Uai Decants" width="120" height="120" style="display:block;border:0;outline:none;text-decoration:none;border-radius:8px;">
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 28px;">
                <h1 style="margin:8px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:28px;color:#0d6efd;">Redefinir senha</h1>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:12px 28px 0 28px;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#4a5568;">
                  Para criar uma nova senha, clique no botão abaixo:
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:22px 28px;">
                <a href="${customLink}" target="_blank"
                   style="display:inline-block;background:#0d6efd;color:#ffffff;text-decoration:none;
                          font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;
                          padding:12px 28px;border-radius:8px;">
                  Criar nova senha
                </a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 28px 6px 28px;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#718096;">
                  Se você não solicitou, ignore este e-mail.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 0 0 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td height="1" style="background:#edf2f7;"></td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:12px 16px 24px 16px;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#a0aec0;">
                  Dúvidas? <a href="mailto:suporte@uaidecants.com.br" style="color:#4a5568;text-decoration:underline;">suporte@uaidecants.com.br</a> • WhatsApp: (38) 99724-8602
                </p>
              </td>
            </tr>
          </table>
          <!-- FIM CARD -->
        </td>
      </tr>
    </table>
  </body>
</html>`;

        await transporter.sendMail({
          from: "\"Uai Decants\" <suporte@uaidecants.com.br>",
          to: email,
          subject: "Redefina sua senha - Uai Decants",
          html,
          text: "Para criar uma nova senha, abra: " + customLink,
        });
      }

      return res.json({success: true, message: "Se o e-mail estiver cadastrado, enviaremos as instruções."});
    } catch (err) {
      console.error("POST /auth/password-reset:", err);
      return res.status(500).json({success: false, message: "Não foi possível enviar o e-mail de redefinição."});
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

  // ---------- Rotas: Perfil do usuário ----------
  // Inicialização/leitura do perfil + endereços
  app.get("/me/init", autenticarUsuarioJWT, async (req, res) => {
    try {
      const uid = req.auth.uid;
      const email = req.auth.email || "";
      const nomeToken = req.auth.name || (email ? email.split("@")[0] : "");

      const perfisRef = db.collection("perfis").doc(uid);
      const snap = await perfisRef.get();

      const perfil = snap.exists ?
        snap.data() :
        {nome: nomeToken || "", email, telefone: "", cpf: ""};

      if (!snap.exists) {
        await perfisRef.set({...perfil, criadoEm: new Date().toISOString()}, {merge: true});
      }

      const endSnap = await perfisRef.collection("enderecos").get();
      const enderecos = endSnap.docs.map((d) => ({id: d.id, ...d.data()}));

      res.json({success: true, perfil, enderecos});
    } catch (err) {
      console.error("GET /me/init:", err);
      res.status(500).json({success: false, message: "Erro ao carregar perfil."});
    }
  });

  // Atualiza perfil (CPF pode ser definido apenas 1x)
  app.put("/me/profile", autenticarUsuarioJWT, async (req, res) => {
    try {
      const uid = req.auth.uid;
      const {nome, telefone, cpf} = req.body || {};
      const ref = db.collection("perfis").doc(uid);
      const cur = await ref.get();

      const update = {};
      if (nome != null) update.nome = String(nome).trim();
      if (telefone != null) update.telefone = String(telefone).trim();

      if (cpf != null) {
        const cpfDigits = String(cpf).replace(/\D/g, "");
        const jaTemCPF = cur.exists && cur.data().cpf;
        if (!jaTemCPF && cpfDigits) {
          update.cpf = cpfDigits;
        }
      }

      await ref.set(update, {merge: true});
      const final = (await ref.get()).data();
      res.json({success: true, perfil: final});
    } catch (err) {
      console.error("PUT /me/profile:", err);
      res.status(500).json({success: false, message: "Erro ao salvar perfil."});
    }
  });

  // Lista endereços
  app.get("/me/addresses", autenticarUsuarioJWT, async (req, res) => {
    try {
      const uid = req.auth.uid;
      const ref = db.collection("perfis").doc(uid).collection("enderecos");
      const snap = await ref.get();
      res.json({success: true, enderecos: snap.docs.map((d) => ({id: d.id, ...d.data()}))});
    } catch (err) {
      console.error("GET /me/addresses:", err);
      res.status(500).json({success: false, message: "Erro ao listar endereços."});
    }
  });

  const MAX_ENDERECOS = 4; // limite por usuário

  // Cria endereço (define principal se for o primeiro ou se enviado principal=true)
  app.post("/me/addresses", autenticarUsuarioJWT, async (req, res) => {
    try {
      const uid = req.auth.uid;
      const b = req.body || {};

      const col = db.collection("perfis").doc(uid).collection("enderecos");
      const snap = await col.get();

      // valida limite
      if (snap.size >= MAX_ENDERECOS) {
        return res.status(400).json({success: false, message: `Limite de ${MAX_ENDERECOS} endereços atingido.`});
      }

      const setPrincipal = snap.empty ? true : !!b.principal;

      const batch = db.batch();
      if (setPrincipal) {
        snap.forEach((d) => batch.update(d.ref, {principal: false}));
      }

      const novoRef = col.doc();
      const payload = {
        nomeDestinatario: String(b.nomeDestinatario || "").trim(),
        logradouro: String(b.logradouro || "").trim(),
        numero: String(b.numero || "").trim(),
        complemento: String(b.complemento || "").trim(),
        bairro: String(b.bairro || "").trim(),
        cep: digits(b.cep),
        cidade: String(b.cidade || "").trim(),
        estado: String(b.estado || "").toUpperCase().trim(),
        telefone: String(b.telefone || "").trim(),
        principal: setPrincipal,
        criadoEm: new Date().toISOString(),
      };
      const v = validateAddressPayload(payload);
      if (!v.ok) return res.status(400).json({success: false, message: `Campos inválidos: ${v.errors.join(", ")}`});

      batch.set(novoRef, payload);

      await batch.commit();
      res.json({success: true, id: novoRef.id});
    } catch (err) {
      console.error("POST /me/addresses:", err);
      res.status(500).json({success: false, message: "Erro ao adicionar endereço."});
    }
  });

  app.put("/me/addresses/:id", autenticarUsuarioJWT, async (req, res) => {
    try {
      const uid = req.auth.uid;
      const id = req.params.id;
      const b = req.body || {};

      const col = db.collection("perfis").doc(uid).collection("enderecos");
      const docRef = col.doc(id);

      const snapCur = await docRef.get();
      if (!snapCur.exists) return res.status(404).json({success: false, message: "Endereço não encontrado."});

      const incoming = {};
      ["nomeDestinatario", "logradouro", "numero", "complemento", "bairro", "cep", "cidade", "estado", "telefone", "principal"]
          .forEach((k)=>{
            if (b[k] != null) incoming[k] = b[k];
          });

      // normaliza
      if (incoming.cep != null) incoming.cep = digits(incoming.cep);
      if (incoming.estado != null) incoming.estado = String(incoming.estado).toUpperCase().trim();

      const merged = {...snapCur.data(), ...incoming};
      const v = validateAddressPayload(merged);
      if (!v.ok) return res.status(400).json({success: false, message: `Campos inválidos: ${v.errors.join(", ")}`});

      if (incoming.principal === true) {
        const all = await col.get();
        const batch2 = db.batch();
        all.forEach((d) => batch2.update(d.ref, {principal: false}));
        batch2.update(docRef, {...incoming, principal: true, atualizadoEm: new Date().toISOString()});
        await batch2.commit();
      } else {
        await docRef.set({...incoming, atualizadoEm: new Date().toISOString()}, {merge: true});
      }
      res.json({success: true});
    } catch (err) {
      console.error("PUT /me/addresses/:id:", err);
      res.status(500).json({success: false, message: "Erro ao atualizar endereço."});
    }
  });

  // Exclui endereço; se principal foi removido, define outro como principal
  app.delete("/me/addresses/:id", autenticarUsuarioJWT, async (req, res) => {
    try {
      const uid = req.auth.uid;
      const id = req.params.id;

      const col = db.collection("perfis").doc(uid).collection("enderecos");
      const docRef = col.doc(id);
      const cur = await docRef.get();
      if (!cur.exists) return res.status(404).json({success: false, message: "Endereço não encontrado."});

      const eraPrincipal = !!cur.data().principal;
      await docRef.delete();

      if (eraPrincipal) {
        const rest = await col.get();
        if (!rest.empty) {
          const algumPrincipal = rest.docs.some((d) => d.data().principal === true);
          if (!algumPrincipal) {
            // define o primeiro como principal
            const first = rest.docs[0].ref;
            await first.set({principal: true, atualizadoEm: new Date().toISOString()}, {merge: true});
          }
        }
      }

      res.json({success: true});
    } catch (err) {
      console.error("DELETE /me/addresses/:id:", err);
      res.status(500).json({success: false, message: "Erro ao excluir endereço."});
    }
  });

  return app;
}
module.exports = {createApp};
