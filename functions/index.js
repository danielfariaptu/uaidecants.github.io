const functions = require("firebase-functions");
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

// Hash da senha do admin
const ADMIN_HASH =
  "$2a$12$zkC53TaMvmJHtCuwPAUXLuYyEKkJcK7KGepUI9ycMtimkUnDMZQeS";

// Rota de teste
app.get("/", (req, res) => {
  res.send("API Uai Decants rodando com Firebase!");
});

// Rota de login admin
app.post("/login-admin-daniel-faria", async (req, res) => {
  const {senha} = req.body;
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
    console.log("Dados recebidos:", req.body); // Log dos dados recebidos
    const perfume = {...req.body, ativo: true};
    const docRef = await db.collection("perfumes").add(perfume);
    res.json({
      id: docRef.id,
      ...perfume,
    });
  } catch (err) {
    console.error("Erro ao cadastrar perfume:", err); // Log do erro detalhado
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

// Exporta o app Express como função do Firebase
exports.api = functions.https.onRequest(app);
