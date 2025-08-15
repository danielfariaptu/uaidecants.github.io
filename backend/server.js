const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const path = require('path');
const bcrypt = require('bcrypt');
const serviceAccount = require(path.join(__dirname, 'uaidecants-firebase-adminsdk-fbsvc-bef53e38b4.json'));
const ADMIN_HASH = '$2a$12$zkC53TaMvmJHtCuwPAUXLuYyEKkJcK7KGepUI9ycMtimkUnDMZQeS';
const PORT = process.env.PORT || 3001;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


const db = admin.firestore();

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));




// Rota de teste
app.get('/', (req, res) => {
  res.send('API Uai Decants rodando com Firebase!');
});

// Rota de login admin (simples, só para exemplo)
app.post('/login-admin-daniel-faria', async (req, res) => {
  const { senha } = req.body;
  const match = await bcrypt.compare(senha, ADMIN_HASH);
  if (match) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Senha incorreta' });
  }
});

// Cadastrar perfumecd ..
app.post('/api/perfumes', async (req, res) => {
  try {
    const perfume = { ...req.body, ativo: true }; // Perfume começa ativo
    const docRef = await db.collection('perfumes').add(perfume);
    res.json({ id: docRef.id, ...perfume });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar perfumes (todos)
app.get('/api/perfumes', async (req, res) => {
  try {
    const snapshot = await db.collection('perfumes').get();
    const perfumes = [];
    snapshot.forEach(doc => {
      perfumes.push({ id: doc.id, ...doc.data() });
    });
    res.json(perfumes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar perfumes ativos
app.get('/api/perfumes/ativos', async (req, res) => {
  try {
    const snapshot = await db.collection('perfumes').where('ativo', '==', true).get();
    const perfumes = [];
    snapshot.forEach(doc => {
      perfumes.push({ id: doc.id, ...doc.data() });
    });
    res.json(perfumes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Editar perfume
app.put('/api/perfumes/:id', async (req, res) => {
  try {
    await db.collection('perfumes').doc(req.params.id).update(req.body);
    res.json({ id: req.params.id, ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Excluir perfume
app.delete('/api/perfumes/:id', async (req, res) => {
  try {
    await db.collection('perfumes').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Desativar perfume
app.post('/api/perfumes/:id/desativar', async (req, res) => {
  try {
    await db.collection('perfumes').doc(req.params.id).update({ ativo: false });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ativar perfume
app.post('/api/perfumes/:id/ativar', async (req, res) => {
  try {
    await db.collection('perfumes').doc(req.params.id).update({ ativo: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
});