const USE_ME_SANDBOX = true;
const MIN_BILLED_WEIGHT_G = 100;
// Toggle/descrição da retirada local
const PICKUP_ENABLED = true;
const PICKUP_CITY = "Paracatu - MG";
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

  // Mailer em cache (pool) — evita handshake em cada requisição
  let mailer;
  function getMailer() {
    if (!mailer) {
      const nodemailer = require("nodemailer");
      mailer = nodemailer.createTransport({
        service: "gmail",
        pool: true,
        maxConnections: 1,
        maxMessages: 100,
        auth: {user: process.env.EMAIL_REMETENTE, pass: process.env.ARROZ},
        // evita travas do SMTP
        connectionTimeout: 10000,
        socketTimeout: 10000,
        greetingTimeout: 8000,
      });
    }
    return mailer;
  }

  // Templates HTML
  function buildVerifyEmailHtml(nome, customLink) {
    return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#f5f7fb;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Confirme seu e-mail para ativar sua conta Uai Decants.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f7fb;">
      <tr><td align="center" style="padding:24px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td align="left" style="background:#f9c417;padding:16px 24px;">
              <img src="https://drive.google.com/uc?export=view&id=1NzJS7rqZxgDZKOUXa-GPS9OwKWJUF6bh"
                   width="140" height="140" alt="Uai Decants"
                   style="display:block;border:0;outline:none;text-decoration:none;border-radius:10px;">
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:12px 28px 0 28px;">
              <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:28px;color:#0d6efd;">
                Confirme seu e‑mail
              </h1>
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
            <td align="center" style="padding:22px 28px 24px 28px;">
              <a href="${customLink}" target="_blank"
                 style="display:inline-block;background:#27ae60;color:#ffffff;text-decoration:none;
                        font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;
                        padding:12px 28px;border-radius:8px;">
                Confirmar e‑mail
              </a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 28px 24px 28px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#718096;">
                Se você não criou esta conta, ignore este e‑mail.
              </p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
  }

  function buildResetHtml(customLink) {
    return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#f5f7fb;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Redefinir senha da sua conta Uai Decants.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f7fb;">
      <tr><td align="center" style="padding:24px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td align="left" style="background:#f9c417;padding:16px 24px;">
              <img src="https://drive.google.com/uc?export=view&id=1NzJS7rqZxgDZKOUXa-GPS9OwKWJUF6bh"
                   width="140" height="140" alt="Uai Decants"
                   style="display:block;border:0;outline:none;text-decoration:none;border-radius:10px;">
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:12px 28px 0 28px;">
              <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:28px;color:#0d6efd;">
                Redefinir senha
              </h1>
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
            <td align="center" style="padding:22px 28px 24px 28px;">
              <a href="${customLink}" target="_blank"
                 style="display:inline-block;background:#0d6efd;color:#ffffff;text-decoration:none;
                        font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;
                        padding:12px 28px;border-radius:8px;">
                Criar nova senha
              </a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 28px 24px 28px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#718096;">
                Se você não solicitou, ignore este e‑mail.
              </p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
  }

  const ADMINS = ["danielfari4@gmail.com"];
  const EMAILS_TEMPORARIOS = [
    "tempmail.com", "10minutemail.com", "mailinator.com", "guerrillamail.com",
    "yopmail.com", "getnada.com", "trashmail.com", "fakeinbox.com", "mintemail.com", "dispostable.com",
  ];
  const UFS_SET = new Set(["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"]);

  function isNonEmpty(v) {
    return typeof v==="string" && v.trim()!=="";
  }
  function digits(v) {
    return String(v||"").replace(/\D/g, "");
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
  app.disable("x-powered-by"); // remove header e micro overhead

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

  app.get("/", (_req, res)=>res.send("API Uai Decants rodando com Firebase!"));
  app.post("/logout-admin", (_req, res)=>res.json({success: true}));

  // CRIAR CONTA — rápido, sem bcrypt/queries extras; e-mail em background
  app.post("/usuarios", async (req, res) => {
    try {
      const {nome, email, senha} = req.body || {};
      if (!nome || !email || !senha) {
        return res.status(400).json({success: false, message: "Nome, email e senha são obrigatórios."});
      }
      if (String(senha).length < 8) {
        return res.status(400).json({success: false, message: "Senha deve ter ao menos 8 caracteres."});
      }
      if (isEmailTemporario(email)) {
        return res.status(400).json({success: false, message: "Não é permitido usar e-mails temporários."});
      }

      let userRec;
      try {
        userRec = await admin.auth().createUser({email, password: senha, displayName: nome});
      } catch (error) {
        if (error && error.code === "auth/email-already-exists") {
          return res.status(409).json({success: false, message: "Email já cadastrado."});
        }
        console.error("createUser error:", error);
        return res.status(400).json({success: false, message: "Não foi possível criar a conta."});
      }

      const origin = (req.headers.origin && /^https?:\/\//.test(req.headers.origin)) ?
        req.headers.origin :
        "https://www.uaidecants.com.br";
      const baseUrl = `${origin}/confirmar-email`;

      const settings = {url: baseUrl, handleCodeInApp: true};
      const verifyLink = await admin.auth().generateEmailVerificationLink(email, settings);
      const u = new URL(verifyLink);
      const oobCode = u.searchParams.get("oobCode");
      const customLink = `${baseUrl}?mode=verifyEmail&oobCode=${encodeURIComponent(oobCode)}&lang=pt&hl=pt-BR`;

      // AGUARDA só este write (garante persistência do perfil)
      await db.collection("perfis").doc(userRec.uid).set(
          {nome, email, telefone: "", cpf: "", criadoEm: new Date().toISOString()},
          {merge: true},
      );

      // REMOVIDO: write extra em "usuarios" (era redundante e não aguardado)
      // db.collection("usuarios").add({ uid: userRec.uid, nome, email, ... });

      // E-mail em background (não bloqueia resposta)
      const transporter = getMailer();
      const html = buildVerifyEmailHtml(nome, customLink);
      transporter.sendMail({
        from: `"Uai Decants" <suporte@uaidecants.com.br>`,
        to: email,
        subject: "Confirme seu e-mail - Uai Decants",
        html,
        text: `Ative sua conta: ${customLink}`,
      }).catch((e) => console.error("sendMail verify error:", e));

      return res.json({
        success: true,
        uid: userRec.uid,
        nome,
        email,
        message: "Conta criada! Enviamos um e-mail para confirmação.",
      });
    } catch (err) {
      console.error("Erro /usuarios:", err);
      return res.status(400).json({success: false, message: "Erro ao criar conta."});
    }
  });

  // Reenvio verificação (usa mailer em cache)
  app.post("/auth/resend-verification", async (req, res) => {
    try {
      ensureInit();
      const {email, nome, redirectUrl} = req.body || {};
      if (!email) return res.status(400).json({success: false, message: "Email é obrigatório."});

      const baseUrl = String(redirectUrl || "https://www.uaidecants.com.br/confirmar-email");
      const settings = {url: baseUrl, handleCodeInApp: true};

      let customLink = null;
      try {
        const link = await admin.auth().generateEmailVerificationLink(String(email).trim(), settings);
        const u = new URL(link);
        const oobCode = u.searchParams.get("oobCode");
        customLink = `${baseUrl}?mode=verifyEmail&oobCode=${encodeURIComponent(oobCode)}&lang=pt&hl=pt-BR`;
      } catch (err) {
        // Se o usuário não existir, não expõe a existência. Loga somente erros diferentes.
        if (!err || err.code !== "auth/user-not-found") {
          console.error("generateEmailVerificationLink:", err);
        }
      }

      if (customLink) {
        const transporter = getMailer();
        const html = buildVerifyEmailHtml(nome || "", customLink);
        // Envia em background (não aguarda SMTP)
        transporter
            .sendMail({
              from: `"Uai Decants" <suporte@uaidecants.com.br>`,
              to: email,
              subject: "Confirme seu e-mail - Uai Decants",
              html,
              text: `Ative sua conta: ${customLink}`,
            })
            .catch((e) => console.error("sendMail (resend):", e));
      }

      return res.json({success: true, message: "Se o e-mail estiver cadastrado, reenviamos o link de verificação."});
    } catch (err) {
      console.error("POST /auth/resend-verification:", err);
      return res.status(500).json({success: false, message: "Não foi possível reenviar o e-mail de verificação."});
    }
  });

  // Reset de senha (usa mailer em cache)
  app.post("/auth/password-reset", async (req, res) => {
    try {
      ensureInit();
      const {email, redirectUrl} = req.body || {};
      if (!email) return res.status(400).json({success: false, message: "Email é obrigatório."});

      const baseUrl = String(redirectUrl || "https://www.uaidecants.com.br/recuperar-senha");
      const actionSettings = {url: baseUrl, handleCodeInApp: true};

      let customLink = null;
      try {
        const link = await admin.auth().generatePasswordResetLink(String(email).trim(), actionSettings);
        const u = new URL(link);
        const oobCode = u.searchParams.get("oobCode");
        customLink = `${baseUrl}?mode=resetPassword&oobCode=${encodeURIComponent(oobCode)}&lang=pt&hl=pt-BR`;
      } catch (err) {
        if (!err || err.code !== "auth/user-not-found") {
          console.error("generatePasswordResetLink:", err);
        }
      }

      if (customLink) {
        const transporter = getMailer();
        const html = buildResetHtml(customLink);
        // Envia em background (não aguarda SMTP)
        transporter
            .sendMail({
              from: `"Uai Decants" <suporte@uaidecants.com.br>`,
              to: email,
              subject: "Redefina sua senha - Uai Decants",
              html,
              text: "Para criar uma nova senha, abra: " + customLink,
            })
            .catch((e) => console.error("sendMail (reset):", e));
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

  // ---------- Helpers de frete ----------
  function parseMl(v) {
    const m = String(v||"").match(/(\d+)\s*ml/i);
    return m ? parseInt(m[1], 10) : 0;
  }
  function estimateItemWeightG(volumeStr) {
    // densidade média ~0.9 g/ml + embalagem por frasco (estimativas)
    const ml = parseMl(volumeStr);
    const liquid = Math.max(ml * 0.9, 1);
    const pkgMap = {"2ml": 10, "5ml": 18, "8ml": 30, "15ml": 55};
    const key = `${ml}ml`;
    const pkg = pkgMap[key] ?? 20;
    return Math.ceil(liquid + pkg);
  }
  function calcCartWeightG(itens = []) {
    // soma + margem 20g de proteção
    const sum = (itens || []).reduce(
        (acc, it) =>
          acc + estimateItemWeightG(it.volume) * (it.quantidade || 1),
        0,
    );
    const g = Math.max(sum + 20, MIN_BILLED_WEIGHT_G);
    return g;
  }

  // ---------- Frete: Superfrete + Melhor Envio ----------
  // Converte qualquer formato de preço (string com vírgula, objeto etc.)
  function parseMoney(v) {
    if (v == null) return null;
    if (typeof v === "number" && isFinite(v)) return v;
    if (typeof v === "string") {
      // remove símbolos e normaliza vírgula
      const s = v.replace(/[^\d,.,-]/g, "").replace(/(\d)[.](?=\d{3}(\D|$))/g, "$1").replace(",", ".");
      const n = parseFloat(s);
      return isFinite(n) ? n : null;
    }
    if (typeof v === "object") {
      return parseMoney(v.price ?? v.total ?? v.amount ?? v.value);
    }
    return null;
  }

  app.post("/shipping/quote", async (req, res) => {
    try {
      const {cepDestino, itens} = req.body || {};
      if (!cepDestino || !Array.isArray(itens)) {
        return res.status(400).json({success: false, message: "cepDestino e itens são obrigatórios."});
      }

      const originZip = process.env.ORIGIN_ZIP || "01001000"; // defina em env
      const weightG = calcCartWeightG(itens);
      const dims = {height: 6, width: 11, length: 16}; // cm

      let results = [];

      // -------- SuperFrete --------
      try {
        const sfToken = process.env.SUPERFRETE_TOKEN;
        if (sfToken) {
          const body = {
            from: {postal_code: originZip},
            to: {postal_code: String(cepDestino).replace(/\D/g, "")},
            products: [
              {
                weight: Math.max(weightG, MIN_BILLED_WEIGHT_G) / 1000,
                width: dims.width,
                height: dims.height,
                length: dims.length,
                quantity: 1,
              },
            ],
            options: {receipt: false, own_hand: false, reverse: false, non_commercial: true},
          };

          const r = await fetch("https://api.superfrete.com/api/v1/quote", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
              "Authorization": `Bearer ${sfToken}`, // alguns tenants usam Bearer
              "X-API-KEY": sfToken, // outros usam X-API-KEY
            },
            body: JSON.stringify(body),
          });

          const js = await r.json();
          const list = Array.isArray(js) ?
            js :
            Array.isArray(js?.data) ?
              js.data :
              Array.isArray(js?.results) ?
                js.results :
                Array.isArray(js?.quotes) ?
                  js.quotes :
                  [];

          for (const q of list) {
            const price =
              parseMoney(q.price) ??
              parseMoney(q.cost) ??
              parseMoney(q.total) ??
              parseMoney(q?.prices?.[0]?.price);

            if (price == null) continue;

            results.push({
              source: "superfrete",
              carrier: q.company?.name || q.carrier || q.provider || "Transportadora",
              name: q.name || q.service || q.service_name || "",
              service_code: q.service_code || q.id || q.service || "",
              price,
              delivery_range: q.delivery_range || {
                from: q.delivery_time?.min ?? q.deadline_min,
                to: q.delivery_time?.max ?? q.deadline_max,
              },
            });
          }

          if (!list?.length) console.warn("SuperFrete sem resultados:", js);
        }
      } catch (e) {
        console.error("SuperFrete quote error:", e);
      }

      // -------- Melhor Envio --------
      try {
        const meToken = USE_ME_SANDBOX ?
          (process.env.MELHORENVIO_TOKEN_SANDBOX || "") :
          (process.env.MELHORENVIO_TOKEN || "");
        const ME_BASE = USE_ME_SANDBOX ?
          "https://sandbox.melhorenvio.com.br" :
          "https://www.melhorenvio.com.br";

        if (meToken) {
          const body = {
            from: {postal_code: originZip},
            to: {postal_code: String(cepDestino).replace(/\D/g, "")},
            products: [
              {
                weight: Math.max(weightG, MIN_BILLED_WEIGHT_G) / 1000,
                width: dims.width,
                height: dims.height,
                length: dims.length,
                quantity: 1,
              },
            ],
            options: {receipt: false, own_hand: false, reverse: false, non_commercial: true},
          };

          const r = await fetch(`${ME_BASE}/api/v2/me/shipment/calculate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
              "Authorization": `Bearer ${meToken}`,
            },
            body: JSON.stringify(body),
          });

          const js = await r.json();
          const list = Array.isArray(js) ? js : Array.isArray(js?.data) ? js.data : [];

          for (const q of list) {
            const price =
              parseMoney(q.price) ??
              parseMoney(q.custom_price) ??
              parseMoney(q.total) ??
              parseMoney(q?.prices?.[0]?.price);

            if (price == null) continue; // evita R$ 0 indevido (ex.: Mini Envios)

            results.push({
              source: "melhorenvio",
              carrier: q.company?.name || q.carrier || "Transportadora",
              name: q.name || q.service || q.service_name || "",
              service_code: q.service || q.id || q.service_code || "",
              price,
              delivery_range: q.delivery_range || {
                from: q.delivery_time?.min ?? q.deadline_min,
                to: q.delivery_time?.max ?? q.deadline_max,
              },
            });
          }

          if (!list?.length) console.warn("MelhorEnvio sem resultados:", js);
        }
      } catch (e) {
        console.error("MelhorEnvio quote error:", e);
      }

      // -------- Retirada (sempre visível) --------
      if (PICKUP_ENABLED) {
        results.push({
          source: "manual",
          carrier: "retirada",
          name: `Retirar com Vendedor (${PICKUP_CITY})`,
          price: 0,
          delivery_range: null,
          service_code: "pickup",
          pickup: true,
        });
      }

      // normaliza e ordena
      results = (results || []).filter((r) => Number.isFinite(r.price));
      results.sort((a, b) => a.price - b.price);

      return res.json({success: true, weightG, dimensions: dims, quotes: results});
    } catch (err) {
      console.error("POST /shipping/quote:", err);
      return res.status(500).json({success: false, message: "Falha ao cotar frete."});
    }
  });

  // ---------- Carrinho por usuário ----------
  app.get("/me/cart", autenticarUsuarioJWT, async (req, res) => {
    try {
      const ref = db.collection("perfis").doc(req.auth.uid).collection("cart").doc("current");
      const snap = await ref.get();
      const data = snap.exists ? snap.data() : {items: []};
      res.json({success: true, items: Array.isArray(data.items) ? data.items : []});
    } catch (e) {
      console.error("GET /me/cart:", e);
      res.status(500).json({success: false, message: "Erro ao ler carrinho."});
    }
  });

  app.put("/me/cart", autenticarUsuarioJWT, async (req, res) => {
    try {
      const items = Array.isArray(req.body?.items) ? req.body.items : [];
      const ref = db.collection("perfis").doc(req.auth.uid).collection("cart").doc("current");
      await ref.set({items, updatedAt: new Date().toISOString()}, {merge: true});
      res.json({success: true});
    } catch (e) {
      console.error("PUT /me/cart:", e);
      res.status(500).json({success: false, message: "Erro ao salvar carrinho."});
    }
  });

  // ---------- Cupons (admin) ----------
  function normalizeCoupon(b) {
    const code = String(b.code || "").trim().toUpperCase();
    const type = String(b.type || "percent").toLowerCase(); // 'percent' | 'fixed'
    const value = Number(b.value || 0);
    const minSubtotal = Number(b.minSubtotal || 0);
    const active = b.active !== false;
    const expiresAt = b.expiresAt ? String(b.expiresAt) : null; // ISO
    const requireLogin = b.requireLogin === true; // << novo campo
    return {code, type, value, minSubtotal, active, expiresAt, requireLogin};
  }

  app.get("/admin/coupons", autenticarAdminJWT, async (_req, res) => {
    try {
      const snap = await db.collection("coupons").orderBy("code").get();
      const data = snap.docs.map((d) => ({id: d.id, ...d.data()}));
      res.json({success: true, coupons: data});
    } catch (e) {
      res.status(500).json({success: false, message: "Erro ao listar cupons."});
    }
  });

  app.post("/admin/coupons", autenticarAdminJWT, async (req, res) => {
    try {
      const c = normalizeCoupon(req.body || {});
      if (!c.code || !["percent", "fixed"].includes(c.type) || c.value <= 0) {
        return res.status(400).json({success: false, message: "Dados do cupom inválidos."});
      }
      const ref = await db.collection("coupons").add({...c, createdAt: new Date().toISOString()});
      res.json({success: true, id: ref.id});
    } catch (e) {
      res.status(500).json({success: false, message: "Erro ao criar cupom."});
    }
  });

  app.put("/admin/coupons/:id", autenticarAdminJWT, async (req, res) => {
    try {
      const id = req.params.id;
      const c = normalizeCoupon(req.body || {});
      await db.collection("coupons").doc(id).set({...c, updatedAt: new Date().toISOString()}, {merge: true});
      res.json({success: true});
    } catch (e) {
      res.status(500).json({success: false, message: "Erro ao atualizar cupom."});
    }
  });

  app.delete("/admin/coupons/:id", autenticarAdminJWT, async (req, res) => {
    try {
      await db.collection("coupons").doc(req.params.id).delete();
      res.json({success: true});
    } catch (e) {
      res.status(500).json({success: false, message: "Erro ao excluir cupom."});
    }
  });

  // ---------- Validação de cupom (pública) ----------
  app.post("/coupons/validate", async (req, res) => {
    try {
      const code = String(req.body?.code || "").trim().toUpperCase();
      const subtotal = Number(req.body?.subtotal || 0);

      if (!code || !(subtotal >= 0)) {
        return res.status(400).json({
          success: false,
          message: "code e subtotal são obrigatórios.",
        });
      }

      const qs = await db
          .collection("coupons")
          .where("code", "==", code)
          .limit(1)
          .get();

      if (qs.empty) {
        return res.json({success: true, valid: false, reason: "not_found"});
      }

      const c = {id: qs.docs[0].id, ...qs.docs[0].data()};

      // Verifica login via Firebase ID Token (se enviado)
      let uid = null;
      const authHeader = String(req.headers.authorization || "");
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
      if (token) {
        try {
          const decoded = await admin.auth().verifyIdToken(token);
          uid = decoded?.uid || null;
        } catch {
          uid = null;
        }
      }

      if (c.active === false) {
        return res.json({success: true, valid: false, reason: "inactive"});
      }

      if (c.expiresAt && new Date(c.expiresAt) < new Date()) {
        return res.json({success: true, valid: false, reason: "expired"});
      }

      if (c.requireLogin && !uid) {
        return res.json({success: true, valid: false, reason: "login_required"});
      }

      if (c.minSubtotal && subtotal < Number(c.minSubtotal || 0)) {
        return res.json({
          success: true,
          valid: false,
          reason: "min_subtotal",
          minSubtotal: Number(c.minSubtotal || 0),
        });
      }

      let discount = 0;
      if (String(c.type) === "percent") {
        discount = Math.max(0, (subtotal * Number(c.value)) / 100);
      } else {
        discount = Math.max(0, Number(c.value || 0));
      }
      discount = Math.min(discount, subtotal);
      const totalAfterDiscount = subtotal - discount;

      return res.json({
        success: true,
        valid: true,
        coupon: {
          id: c.id,
          code: c.code,
          type: c.type,
          value: Number(c.value || 0),
          minSubtotal: Number(c.minSubtotal || 0),
          requireLogin: !!c.requireLogin,
        },
        discount,
        totalAfterDiscount,
      });
    } catch (err) {
      console.error("POST /coupons/validate:", err);
      return res.status(500).json({success: false, message: "Falha ao validar cupom."});
    }
  });

  return app;
}
module.exports = {createApp};
