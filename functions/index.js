const functions = require("firebase-functions/v2");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const admin = require("firebase-admin");

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

exports.api = functions.https.onRequest(app, {
  secrets: ["ADMIN_HASH"],
});
