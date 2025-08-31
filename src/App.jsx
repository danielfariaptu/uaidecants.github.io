import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom"; // + Link
import PerfumeAdmin from "./PerfumeAdmin.jsx";
import ConfirmEmailPage from "./ConfirmEmailPage.jsx";
import PassRecoveryPage from "./PassRecoveryPage.jsx";
import "bootstrap/dist/css/bootstrap.min.css";
import { auth } from "./firebaseConfig";
import {
  signInWithEmailAndPassword,
  sendEmailVerification,
  onAuthStateChanged,               // + persistência
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";
import { signOut } from "firebase/auth";
import { cpf as cpfLib } from "cpf-cnpj-validator"; // + lib de CPF

// Toast visual feedback (Bootstrap, sem CSS extra)
function ToastBootstrap({ mensagem, tipo = "info", show, onClose, fixed = false, placement = "br" }) {
  if (!show || !mensagem) return null;
  const tipoBootstrap = tipo === "error" ? "danger" : tipo;

  // mapa de posições
  const pos = {
    br: "bottom-0 end-0",
    tr: "top-0 end-0",
    bl: "bottom-0 start-0",
    tl: "top-0 start-0",
    tc: "top-0 start-50 translate-middle-x",
    bc: "bottom-0 start-50 translate-middle-x",
  }[placement] || "bottom-0 end-0";

  const toastEl = (
    <div
      className={`toast align-items-center text-bg-${tipoBootstrap} border-0 show`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      style={fixed ? undefined : { width: "100%" }}
    >
      <div className="d-flex">
        <div className="toast-body">{mensagem}</div>
        <button
          type="button"
          className="btn-close btn-close-white me-2 m-auto"
          data-bs-dismiss="toast"
          aria-label="Close"
          onClick={onClose}
        />
      </div>
    </div>
  );

  if (!fixed) return toastEl;

  // container fixo (não empurra a página)
  return (
    <div className={`toast-container position-fixed p-3 ${pos}`} style={{ zIndex: 2000 }}>
      {toastEl}
    </div>
  );
}

// Função para transformar os dados da API
function transformarProdutos(dadosAPI) {
  return dadosAPI.map(item => ({
    nome: item.nome,
    volumeInicial: Number(item.volumeInicial),
    volumeRestante: Number(item.volumeInicial),
    precos: {
      "2ml": Number(item.precos2ml),
      "5ml": Number(item.precos5ml),
      "8ml": Number(item.precos8ml),
      "15ml": Number(item.precos15ml)
    },
    urlFragrantica: item.urlFragrantica,
    imagem: item.imagem,
    pedidos: Number(item.pedidos) || 0
  }));
}

function Carrinho({ aberto, itens, onFechar, onRemover, toastCarrinho, onCloseToastCarrinho }) {
  const total = itens.reduce((acc, item) => acc + item.preco * item.quantidade, 0);
  return (
    <div
      className={`offcanvas offcanvas-end${aberto ? " show" : ""}`}
      tabIndex="-1"
      style={{
        visibility: aberto ? "visible" : "hidden",
        zIndex: 1050,
        width: "300px",
        background: "#fff"
      }}
    >
      <div className="offcanvas-header">
        <h2 className="offcanvas-title">Carrinho</h2>
        <button type="button" className="btn-close" onClick={onFechar}></button>
      </div>
      <div className="offcanvas-body">
        {/* Toast do carrinho aparece dentro do carrinho */}
        <ToastBootstrap
          mensagem={toastCarrinho.mensagem}
          tipo={toastCarrinho.tipo}
          show={!!toastCarrinho.mensagem}
          onClose={onCloseToastCarrinho}
        />
        <ul className="list-group mb-3">
          {itens.length === 0 ? (
            <li className="list-group-item">Carrinho vazio</li>
          ) : (
            itens.map((item, idx) => (
              <li key={idx} className="list-group-item d-flex justify-content-between align-items-center">
                <span>
                  {item.nome} ({item.volume}, {item.quantidade}x) - R$ {item.preco.toFixed(2)}
                </span>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => onRemover(idx)}
                >
                  Remover
                </button>
              </li>
            ))
          )}
        </ul>
        <p>
          <strong>Total: R$ {total.toFixed(2)}</strong>
        </p>
      </div>
    </div>
  );
}

function LoginAdmin({ onLogin, adminLogado, mostrarToast }) {
  const [emailAdmin, setEmailAdmin] = useState("");
  const [senhaAdmin, setSenhaAdmin] = useState("");
  const [erroLogin, setErroLogin] = useState("");

  useEffect(() => {
    async function check() {
      const token = localStorage.getItem("token");
      if (!token) {
        onLogin(false);
        return;
      }
      try {
        const resp = await fetch("https://us-central1-uaidecants.cloudfunctions.net/api/admin-check", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` }
        });
        onLogin(resp.status === 200);
      } catch {
        onLogin(false);
      }
    }
    check();
  }, [onLogin]);

  async function handleLoginAdmin(e) {
    e.preventDefault();
    setErroLogin("");
    try {

      const userCredential = await signInWithEmailAndPassword(auth, emailAdmin, senhaAdmin);
      const user = userCredential.user;
      const token = await user.getIdToken();
      localStorage.setItem("token", token);
      onLogin(true);
      mostrarToast("Login realizado com sucesso!", "success");
      setEmailAdmin("");
      setSenhaAdmin("");
      setErroLogin("");
    } catch (err) {
      setErroLogin("Senha ou e-mail incorretos!");
      mostrarToast("Senha ou e-mail incorretos!", "error");
    }
  }

  if (adminLogado) {
    return (
      <div className="container mt-4">
        <h3>Painel Admin</h3>
        <button
          className="btn btn-outline-danger mb-3"
          onClick={async () => {
            await fetch("https://us-central1-uaidecants.cloudfunctions.net/api/logout-admin", { method: "POST" });
            localStorage.removeItem("token");
            onLogin(false);
            await signOut(auth);
            mostrarToast("Logout realizado.", "info");
            window.location.href = "/";
          }}
        >
          Sair
        </button>
        <PerfumeAdmin adminLogado={adminLogado} />
      </div>
    );
  }

  return (
    <form onSubmit={handleLoginAdmin} style={{ maxWidth: 300, margin: "32px auto" }}>
      <h3>Login Admin</h3>
      <input
        type="email"
        className="form-control mb-2"
        placeholder="E-mail do admin"
        value={emailAdmin}
        onChange={e => setEmailAdmin(e.target.value)}
        required
      />
      <input
        type="password"
        className="form-control mb-2"
        placeholder="Senha do admin"
        value={senhaAdmin}
        onChange={e => setSenhaAdmin(e.target.value)}
        required
      />
      <button type="submit" className="btn btn-primary w-100">Entrar</button>
      {erroLogin && <div className="text-danger mt-2">{erroLogin}</div>}
    </form>
  );
}

// Dropdown de Minha Conta
function MenuConta({ logado, onLogin, onLogout }) {

  const [aberto, setAberto] = useState(false);

  function handleClick(action) {
    setAberto(false); // Fecha o dropdown
    onLogin(action);
  }

  function handleLogout() {
    setAberto(false); // Fecha o dropdown
    onLogout();
  }

  return (
    <div className="dropdown" style={{ display: "inline-block" }}>
      <button
        className="btn navbar-account dropdown-toggle"
        onClick={() => setAberto(!aberto)}
        aria-expanded={aberto}
      >
        Minha Conta
      </button>
      <ul
        className={`dropdown-menu${aberto ? " show" : ""}`}
        style={{ minWidth: 180 }}
      >
        {!logado ? (
          <>
            <li>
              <button className="dropdown-item" onClick={() => handleClick("criar")}>
                Criar conta
              </button>
            </li>
            <li>
              <button className="dropdown-item" onClick={() => handleClick("login")}>
                Iniciar Sessão
              </button>
            </li>
            <li>
              <button className="dropdown-item" onClick={() => handleClick("convidado")}>
                Comprar como Convidado
              </button>
            </li>
          </>
        ) : (
          <>
            <li>
              <button className="dropdown-item" onClick={() => handleClick("dados")}>
                Dados
              </button>
            </li>
            <li>
              <button className="dropdown-item" onClick={() => handleClick("enderecos")}>
                Endereços
              </button>
            </li>
            <li>
              <button className="dropdown-item" onClick={() => handleClick("pedidos")}>
                Meus Pedidos
              </button>
            </li>
            <li>
              <button className="dropdown-item text-danger" onClick={handleLogout}>
                Sair
              </button>
            </li>
          </>
        )}
      </ul>
    </div>
  );
}

// Helpers mínimos de API e CEP (ViaCEP)
const API_BASE = "https://us-central1-uaidecants.cloudfunctions.net/api";

async function api(path, init = {}) {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", ...(init.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}

async function buscarCEP(cep) {
  const digits = (cep || "").replace(/\D/g, "");
  if (digits.length !== 8) return null;
  const resp = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  const data = await resp.json();
  if (data.erro) return null;
  return {
    logradouro: data.logradouro || "",
    bairro: data.bairro || "",
    cidade: data.localidade || "",
    estado: data.uf || "",
  };
}

function onlyDigits(s) {
  return String(s || "").replace(/\D/g, "");
}
function maskCPF(v) {
  const d = onlyDigits(v).slice(0, 11);
  const p1 = d.slice(0, 3), p2 = d.slice(3, 6), p3 = d.slice(6, 9), p4 = d.slice(9, 11);
  return [p1, p2 && `.${p2}`, p3 && `.${p3}`, p4 && `-${p4}`].filter(Boolean).join("");
}

// Remove +55 se vier em E.164 e limita a 11 dígitos (DD + número)
function normalizeBRPhoneDigits(v) {
  let d = onlyDigits(v || "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  return d.slice(0, 11);
}

// Máscara de telefone BR
function maskPhoneBR(v) {
  const d = normalizeBRPhoneDigits(v);
  if (!d) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
const UFS = [
  { sigla: "AC", nome: "Acre" }, { sigla: "AL", nome: "Alagoas" },
  { sigla: "AP", nome: "Amapá" }, { sigla: "AM", nome: "Amazonas" },
  { sigla: "BA", nome: "Bahia" }, { sigla: "CE", nome: "Ceará" },
  { sigla: "DF", nome: "Distrito Federal" }, { sigla: "ES", nome: "Espírito Santo" },
  { sigla: "GO", nome: "Goiás" }, { sigla: "MA", nome: "Maranhão" },
  { sigla: "MT", nome: "Mato Grosso" }, { sigla: "MS", nome: "Mato Grosso do Sul" },
  { sigla: "MG", nome: "Minas Gerais" }, { sigla: "PA", nome: "Pará" },
  { sigla: "PB", nome: "Paraíba" }, { sigla: "PR", nome: "Paraná" },
  { sigla: "PE", nome: "Pernambuco" }, { sigla: "PI", nome: "Piauí" },
  { sigla: "RJ", nome: "Rio de Janeiro" }, { sigla: "RN", nome: "Rio Grande do Norte" },
  { sigla: "RS", nome: "Rio Grande do Sul" }, { sigla: "RO", nome: "Rondônia" },
  { sigla: "RR", nome: "Roraima" }, { sigla: "SC", nome: "Santa Catarina" },
  { sigla: "SP", nome: "São Paulo" }, { sigla: "SE", nome: "Sergipe" },
  { sigla: "TO", nome: "Tocantins" },
];

// Breadcrumb label para cada painel do usuário
function breadcrumbLabel(key) {
  switch (key) {
    case "criar": return "Você está em: /Usuário/Criar Conta";
    case "login": return "Você está em: /Usuário/Iniciar Sessão";
    case "dados": return "Você está em: /Usuário/Meus Dados";
    case "enderecos": return "Você está em: /Usuário/Meus Endereços";
    case "convidado": return "Você está em: /Checkout/Convidado";
    default: return "";
  }
}

// Box reutilizável com header + botão X
function NavBox({ title, breadcrumb, onClose, maxWidth = 680, toastSlot, children }) {
  return (
    <div className="container mx-auto" style={{ maxWidth }}>
      {/* toasts fixos do painel */}
      <div className="toast-rail">{toastSlot}</div>

      {breadcrumb && (
        <div className="mb-2 small text-gold">{breadcrumb}</div>
      )}
      <div className="card shadow-sm navbox">
        <div className="card-header d-flex align-items-center justify-content-center">
          <h5 className="mb-0">{title}</h5>
        </div>

        {/* Botão X dourado fixo no canto do box */}
        <button
          type="button"
          className="btn btn-gold btn-close-gold"
          aria-label="Fechar"
          onClick={onClose}
          title="Fechar"
        >
          ×
        </button>

        <div className="card-body">{children}</div>
      </div>
    </div>
  );
}

export default function App() {
  const [ordem, setOrdem] = useState(() => localStorage.getItem("ordem") || "alfabetica");
  const [pagina, setPagina] = useState(() => Number(localStorage.getItem("pagina")) || 1);
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState(() => {
    const salvo = localStorage.getItem("carrinho");
    return salvo ? JSON.parse(salvo) : [];
  });
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);
  const [volumesSelecionados, setVolumesSelecionados] = useState(() => {
    const salvo = localStorage.getItem("volumesSelecionados");
    return salvo ? JSON.parse(salvo) : {};
  });
  const [busca, setBusca] = useState("");
  const itensPorPagina = 6;
  const [adminLogado, setAdminLogado] = useState(false);

  // Estados para menu de conta
  const [contaMenu, setContaMenu] = useState(""); // controla qual tela do menu conta
  const [usuarioLogado, setUsuarioLogado] = useState(false); // controle login

  // Estado de perfil e endereços
  const [perfil, setPerfil] = useState(null);
  const [enderecos, setEnderecos] = useState([]);
  const [carregandoPerfil, setCarregandoPerfil] = useState(false);

  // NOVO: controla máscara do CPF no formulário
  const [cpfInput, setCpfInput] = useState("");

  // Toast state
  const [toast, setToast] = useState({ mensagem: "", tipo: "info" });
  const [toastCadastro, setToastCadastro] = useState({ mensagem: "", tipo: "info" });
  const [toastCarrinho, setToastCarrinho] = useState({ mensagem: "", tipo: "info" });

  // total de itens no carrinho para o badge
  const totalItens = carrinho.reduce((acc, item) => acc + (item.quantidade || 1), 0);

  // Persistência do login e restauração do perfil ao abrir/voltar ao início
  useEffect(() => {
    // garante persistência em localStorage
    setPersistence(auth, browserLocalPersistence).catch(() => { });
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user && user.emailVerified) {
        setUsuarioLogado(true);
        // opcional: guarda/atualiza token para chamadas à API
        try {
          const t = await user.getIdToken();
          localStorage.setItem("token", t);
        } catch { }
        await carregarPerfilEEnderecos();
      } else {
        setUsuarioLogado(false);
        setPerfil(null);
        setEnderecos([]);
        localStorage.removeItem("token");
      }
    });
    return () => unsub();
  }, []);

  async function checarAdminLogado() {
    const token = localStorage.getItem("token");
    try {
      const resp = await fetch("https://us-central1-uaidecants.cloudfunctions.net/api/admin-check", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdminLogado(resp.status === 200);
    } catch {
      setAdminLogado(false);
    }
  }

  // Função para mostrar toast
  function mostrarToast(mensagem, tipo = "info") {
    setToast({ mensagem, tipo });
    setTimeout(() => setToast({ mensagem: "", tipo }), 3500);
  }

  function mostrarToastCadastro(mensagem, tipo = "info") {
    setToastCadastro({ mensagem, tipo });
    setTimeout(() => setToastCadastro({ mensagem: "", tipo }), 3500);
  }

  function mostrarToastCarrinho(mensagem, tipo = "info") {
    setToastCarrinho({ mensagem, tipo });
    setTimeout(() => setToastCarrinho({ mensagem: "", tipo }), 3500);
  }

  useEffect(() => {
    localStorage.setItem("carrinho", JSON.stringify(carrinho));
  }, [carrinho]);
  useEffect(() => {
    localStorage.setItem("volumesSelecionados", JSON.stringify(volumesSelecionados));
  }, [volumesSelecionados]);
  useEffect(() => {
    localStorage.setItem("ordem", ordem);
  }, [ordem]);
  useEffect(() => {
    localStorage.setItem("pagina", pagina);
  }, [pagina]);

  useEffect(() => {
    fetch("https://us-central1-uaidecants.cloudfunctions.net/api/perfumes")
      .then(res => res.json())
      .then(data => setProdutos(transformarProdutos(data)));
  }, []);

  useEffect(() => {
    checarAdminLogado();
  }, []);

  function ordenarProdutos(lista) {
    let novaLista = [...lista];
    if (ordem === "alfabetica") {
      novaLista.sort((a, b) => a.nome.localeCompare(b.nome));
    } else if (ordem === "maisCaros") {
      novaLista.sort((a, b) => {
        const maxA = Math.max(...Object.values(a.precos));
        const maxB = Math.max(...Object.values(b.precos));
        return maxB - maxA;
      });
    } else if (ordem === "maisBaratos") {
      novaLista.sort((a, b) => {
        const minA = Math.min(...Object.values(a.precos));
        const minB = Math.min(...Object.values(b.precos));
        return minA - minB;
      });
    } else if (ordem === "maisVendidos") {
      novaLista.sort((a, b) => (b.pedidos || 0) - (a.pedidos || 0));
    }
    return novaLista;
  }

  // Filtra produtos conforme busca
  const produtosOrdenados = ordenarProdutos(produtos);
  const produtosFiltrados = produtosOrdenados.filter(produto =>
    produto.nome.toLowerCase().includes(busca.toLowerCase())
  );
  const totalPaginas = Math.ceil(produtosFiltrados.length / itensPorPagina);
  const inicio = (pagina - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;
  const produtosPaginados = produtosFiltrados.slice(inicio, fim);

  function handleVolumeChange(idx, volume) {
    setVolumesSelecionados({ ...volumesSelecionados, [idx]: volume });
  }

  function adicionarAoCarrinho(produto, idx) {
    const volume = volumesSelecionados[idx] || "2ml";
    const preco = produto.precos[volume];
    const mlVenda = parseInt(volume.replace("ml", ""));
    const nomeProduto = produto.nome;

    // Soma total de ml desse perfume já no carrinho
    const totalMlNoCarrinho = carrinho
      .filter(item => item.nome === nomeProduto)
      .reduce((acc, item) => acc + parseInt(item.volume.replace("ml", "")) * item.quantidade, 0);

    // Estoque real disponível para retirada
    const estoqueDisponivel = produto.volumeInicial - totalMlNoCarrinho;

    // Nunca permitir retirar mais do que o volumeInicial - 10ml
    if (totalMlNoCarrinho + mlVenda > produto.volumeInicial - 10) {
      mostrarToastCarrinho("Sem estoque", "error");
      return;
    }

    if (estoqueDisponivel < mlVenda) {
      mostrarToastCarrinho("Sem estoque", "error");
      return;
    }

    const itemIdx = carrinho.findIndex(
      item => item.nome === produto.nome && item.volume === volume
    );
    if (itemIdx >= 0) {
      const novoCarrinho = [...carrinho];
      novoCarrinho[itemIdx].quantidade += 1;
      setCarrinho(novoCarrinho);
      localStorage.setItem("carrinho", JSON.stringify(novoCarrinho));
    } else {
      const novoCarrinho = [
        ...carrinho,
        {
          nome: produto.nome,
          volume,
          preco,
          quantidade: 1
        }
      ];
      setCarrinho(novoCarrinho);
      localStorage.setItem("carrinho", JSON.stringify(novoCarrinho));
    }

    mostrarToastCarrinho("Produto adicionado ao carrinho!", "success");
    setCarrinhoAberto(true);
  }

  function removerDoCarrinho(idx) {
    const novoCarrinho = [...carrinho];
    novoCarrinho.splice(idx, 1);
    setCarrinho(novoCarrinho);
    localStorage.setItem("carrinho", JSON.stringify(novoCarrinho));
    mostrarToastCarrinho("Item removido do carrinho.", "info");
  }

  async function carregarPerfilEEnderecos() {
    try {
      setCarregandoPerfil(true);
      const res = await api("/me/init");
      const json = await res.json();
      if (json.success) {
        setPerfil(json.perfil || null);
        setEnderecos(Array.isArray(json.enderecos) ? json.enderecos : []);
        // aplica máscara inicial do CPF vindo do backend (se houver)
        setCpfInput(maskCPF(json.perfil?.cpf || ""));
      }
    } finally {
      setCarregandoPerfil(false);
    }
  }

  // Logout do cliente (sem backend)
  async function handleLogoutUser() {
    try {
      await signOut(auth); // encerra a sessão no dispositivo
    } finally {
      localStorage.removeItem("token"); // evita reaproveitar token nas requisições
      setUsuarioLogado(false);
      setPerfil(null);
      setEnderecos([]);
      setContaMenu("");
      mostrarToast("Logout realizado.", "info");
    }
  }

  // NOVO: estados para cadastro
  const [senhaCadastro, setSenhaCadastro] = useState("");

  // Lazy-load do zxcvbn
  const [zxcvbnFn, setZxcvbnFn] = useState(null);
  const loadZxcvbn = useCallback(async () => {
    if (zxcvbnFn) return zxcvbnFn;
    const mod = await import("zxcvbn");
    const fn = mod.default || mod;
    setZxcvbnFn(() => fn);
    return fn;
  }, [zxcvbnFn]);

  // Prefetch quando abrir o painel "Criar Conta"
  useEffect(() => {
    if (contaMenu === "criar") {
      const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 100));
      idle(() => { loadZxcvbn().catch(() => { }); });
    }
  }, [contaMenu, loadZxcvbn]);

  // Heurística leve enquanto zxcvbn não carrega
  function fallbackScore(p = "") {
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return Math.min(s, 4);
  }
  const getScore = (p) => (zxcvbnFn ? zxcvbnFn(p).score : fallbackScore(p)); // 0..4
  const isStrong = (p) => getScore(p) >= 3 && String(p).length >= 8;

  return (
    <BrowserRouter>
      <div className="container py-4">
        {/* Toast global só aparece fora dos painéis */}
        {!contaMenu && (
          <ToastBootstrap
            mensagem={toast.mensagem}
            tipo={toast.tipo}
            show={!!toast.mensagem}
            onClose={() => setToast({ mensagem: "", tipo: toast.tipo })}
            fixed
            placement="br" // br,tr,bl,tl,tc,bc
          />
        )}

        <nav className="navbar mb-4">
          {/* Usa Link para evitar reload da página (não perde estado/login) */}
          <Link to="/">
            <img src="/images/Logo.png" alt="Uai Decants" className="navbar-logo" />
          </Link>

          <div className="navbar-search">
            <input
              type="text"
              placeholder="Qual perfume procura?"
              className="navbar-input"
              value={busca}
              onChange={e => {
                setBusca(e.target.value);
                setPagina(1);
              }}
            />
          </div>
          {/* Atendimento dropdown usando Bootstrap padrão */}
          <div className="dropdown" style={{ display: "inline-block" }}>
            <button
              className="btn btn-success dropdown-toggle"
              type="button"
              id="atendimentoDropdown"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              🟢 Atendimento
            </button>
            <ul
              className="dropdown-menu"
              aria-labelledby="atendimentoDropdown"
              style={{ minWidth: 230, marginTop: -18 }}
            >
              <li>
                <span className="dropdown-item-text">
                  <i className="bi bi-envelope"></i> <a href="mailto:suporte@uaidecants.com.br"> Email Suporte </a>
                </span>
              </li>
              <li>
                <a
                  className="dropdown-item"
                  href="https://wa.me/5538997248602"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i className="bi bi-whatsapp"></i> (38) 99724-8602
                </a>
              </li>
            </ul>
          </div>
          <button className="btn btn-primary position-relative navbar-cart" onClick={() => setCarrinhoAberto(true)}>
            <span style={{ fontSize: "22px" }}>🛒</span> Carrinho
            <span className="badge navbar-badge">{totalItens}</span>
          </button>

          <MenuConta
            logado={usuarioLogado}
            onLogin={(tipo) => setContaMenu(tipo)}
            onLogout={handleLogoutUser}     // usa logout real do Firebase
          />
        </nav>

        {/* PAINEL: Criar conta */}
        {contaMenu === "criar" && (
          <NavBox
            title="Criar Conta"
            breadcrumb={breadcrumbLabel("criar")}
            onClose={() => setContaMenu("")}
            maxWidth={560}
            toastSlot={
              <>
                <ToastBootstrap
                  mensagem={toast.mensagem}
                  tipo={toast.tipo}
                  show={!!toast.mensagem}
                  onClose={() => setToast({ mensagem: "", tipo: toast.tipo })}
                />
                <ToastBootstrap
                  mensagem={toastCadastro.mensagem}
                  tipo={toastCadastro.tipo}
                  show={!!toastCadastro.mensagem}
                  onClose={() => setToastCadastro({ mensagem: "", tipo: toastCadastro.tipo })}
                />
              </>
            }
          >
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const nome = e.currentTarget.nome.value;
                const email = e.currentTarget.email.value;
                const senha = senhaCadastro;

                if (!isStrong(senha)) {
                  mostrarToastCadastro("Senha fraca. Use 8+ caracteres e combine maiúsculas, minúsculas, número e símbolo.", "warning");
                  return;
                }
                try {
                  const resp = await fetch("https://us-central1-uaidecants.cloudfunctions.net/api/usuarios", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ nome, email, senha })
                  });
                  const data = await resp.json();
                  if (data.success) {
                    mostrarToastCadastro("Conta criada com sucesso! Verifique o Email Antes de Acessar!", "success");
                    setContaMenu("login");
                  } else {
                    mostrarToastCadastro(data.message || "Erro ao criar conta.", "error");
                  }
                } catch {
                  mostrarToastCadastro("Erro de conexão.", "error");
                }
              }}
            >
              <div className="mb-2">
                <label className="form-label">Nome</label>
                <input type="text" name="nome" className="form-control" required />
              </div>
              <div className="mb-2">
                <label className="form-label">Email</label>
                <input type="email" name="email" className="form-control" required />
              </div>
              <div className="mb-2">
                <label className="form-label">Senha</label>
                <input
                  type="password"
                  name="senha"
                  className="form-control"
                  value={senhaCadastro}
                  onFocus={() => loadZxcvbn().catch(() => { })}
                  onChange={(e) => setSenhaCadastro(e.target.value)}
                  placeholder="Mínimo 8 caracteres, use símbolos"
                  required
                />
                {senhaCadastro && (() => {
                  const s = getScore(senhaCadastro); // 0..4
                  const meta = [
                    { label: "Muito fraca", color: "danger", width: "20%" },
                    { label: "Fraca", color: "warning", width: "40%" },
                    { label: "Razoável", color: "info", width: "60%" },
                    { label: "Boa", color: "primary", width: "80%" },
                    { label: "Excelente", color: "success", width: "100%" },
                  ][Math.min(s, 4)];
                  return (
                    <div className="mt-2">
                      <div className="progress" style={{ height: 8 }}>
                        <div className={`progress-bar bg-${meta.color}`} style={{ width: meta.width }} />
                      </div>
                      <small className={`d-block text-${meta.color}`}>Força: {meta.label}</small>
                      <small className="text-muted">Recomendado: 8+ caracteres com maiúsculas, minúsculas, números e símbolos.</small>
                    </div>
                  );
                })()}
              </div>

              <button type="submit" className="btn btn-success w-100" disabled={!isStrong(senhaCadastro)}>
                Criar Conta
              </button>
            </form>
          </NavBox>
        )}

        {/* PAINEL: Login */}
        {contaMenu === "login" && (
          <NavBox
            title="Iniciar Sessão"
            breadcrumb={breadcrumbLabel("login")}
            onClose={() => setContaMenu("")}
            maxWidth={560}
            toastSlot={
              <>
                <ToastBootstrap
                  mensagem={toast.mensagem}
                  tipo={toast.tipo}
                  show={!!toast.mensagem}
                  onClose={() => setToast({ mensagem: "", tipo: toast.tipo })}
                />
                <ToastBootstrap
                  mensagem={toastCadastro.mensagem}
                  tipo={toastCadastro.tipo}
                  show={!!toastCadastro.mensagem}
                  onClose={() => setToastCadastro({ mensagem: "", tipo: toastCadastro.tipo })}
                />
              </>
            }
          >
            <form
              onSubmit={async e => {
                e.preventDefault();
                const email = e.target.email.value;
                const senha = e.target.senha.value;
                try {
                  const cred = await signInWithEmailAndPassword(auth, email, senha);
                  const user = cred.user;

                  if (!user.emailVerified) {
                    let reenviado = false;
                    try {
                      const resp = await fetch(`${API_BASE}/auth/resend-verification`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          email: user.email,
                          nome: user.displayName || "",
                          redirectUrl: `${window.location.origin}/confirmar-email`,
                        }),
                      });
                      reenviado = resp.ok;
                    } catch { }

                    if (!reenviado) {
                      try { await sendEmailVerification(user); } catch { }
                    }

                    mostrarToastCadastro("E-mail não verificado. Reenviamos o link para seu e-mail.", "warning");
                    await signOut(auth);
                    return;
                  }

                  const token = await user.getIdToken();
                  localStorage.setItem("token", token);
                  setUsuarioLogado(true);
                  await carregarPerfilEEnderecos();
                  setContaMenu("dados");
                  mostrarToast("Login realizado com sucesso!", "success");
                } catch {
                  mostrarToastCadastro("Usuário não encontrado ou senha incorreta.", "error");
                }
              }}
            >
              <div className="mb-2">
                <label className="form-label">Email</label>
                <input type="email" name="email" className="form-control" required />
              </div>
              <div className="mb-2">
                <label className="form-label">Senha</label>
                <input type="password" name="senha" className="form-control" required />
              </div>
              <button type="submit" className="btn btn-primary w-100">Entrar</button>
              <button
                type="button"
                className="btn btn-link forgot-link w-100 d-inline-flex align-items-center justify-content-center mt-3"
                onClick={async (e) => {
                  const form = e.currentTarget.form;
                  const email = form?.email?.value?.trim();
                  if (!email) { mostrarToastCadastro("Informe seu email para recuperar a senha.", "warning"); return; }
                  try {
                    const resp = await fetch(`${API_BASE}/auth/password-reset`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email, redirectUrl: `${window.location.origin}/recuperar-senha` })
                    });
                    const js = await resp.json();
                    if (resp.ok && js?.success) mostrarToastCadastro("Enviamos um email para redefinir sua senha.", "success");
                    else mostrarToastCadastro(js?.message || "Não foi possível enviar o email.", "error");
                  } catch {
                    mostrarToastCadastro("Erro de conexão ao solicitar redefinição.", "error");
                  }
                }}
              >
                <i className="bi bi-key"></i>
                Esqueci minha senha!
              </button>
            </form>
          </NavBox>
        )}

        {/* PAINEL: Meus Dados */}
        {contaMenu === "dados" && (
          <NavBox
            title="Meus Dados"
            breadcrumb={breadcrumbLabel("dados")}
            onClose={() => setContaMenu("")}
            maxWidth={680}
            toastSlot={
              <>
                <ToastBootstrap
                  mensagem={toast.mensagem}
                  tipo={toast.tipo}
                  show={!!toast.mensagem}
                  onClose={() => setToast({ mensagem: "", tipo: toast.tipo })}
                />
                <ToastBootstrap
                  mensagem={toastCadastro.mensagem}
                  tipo={toastCadastro.tipo}
                  show={!!toastCadastro.mensagem}
                  onClose={() => setToastCadastro({ mensagem: "", tipo: toastCadastro.tipo })}
                />
              </>
            }
          >
            {carregandoPerfil && <div>Carregando…</div>}
            {!!perfil && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  const payload = { nome: form.get("nome"), telefone: form.get("telefone") };
                  const cpfDigits = onlyDigits(cpfInput);
                  if (!perfil.cpf && cpfDigits) {
                    if (!cpfLib.isValid(cpfDigits)) {
                      mostrarToast("CPF inválido. Verifique os dígitos.", "error");
                      return;
                    }
                    payload.cpf = cpfDigits;
                  }
                  const res = await api("/me/profile", { method: "PUT", body: JSON.stringify(payload) });
                  const json = await res.json();
                  if (json.success) {
                    setPerfil(json.perfil);
                    setCpfInput(maskCPF(json.perfil?.cpf || cpfDigits));
                    mostrarToast("Dados salvos.", "success");
                  } else {
                    mostrarToast("Erro ao salvar.", "error");
                  }
                }}
              >
                <div className="mb-2">
                  <label className="form-label">Nome</label>
                  <input name="nome" className="form-control bg-white text-dark" defaultValue={perfil.nome || ""} required />
                </div>
                <div className="mb-2">
                  <label className="form-label">Email</label>
                  <input className="form-control bg-white text-dark" value={perfil.email || auth.currentUser?.email || ""} disabled />
                </div>
                <div className="mb-2">
                  <label className="form-label">Telefone (WhatsApp)</label>
                  <input
                    name="telefone"
                    className="form-control bg-white text-dark"
                    defaultValue={maskPhoneBR(perfil.telefone || "")}
                    placeholder="(XX) 99999-9999"
                    onInput={(e) => { e.currentTarget.value = maskPhoneBR(e.currentTarget.value); }}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">CPF</label>
                  <input
                    name="cpf"
                    className="form-control bg-white text-dark"
                    value={cpfInput}
                    onChange={(e) => setCpfInput(maskCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    disabled={!!perfil.cpf}
                  />
                  {!perfil.cpf && onlyDigits(cpfInput).length === 11 && !cpfLib.isValid(onlyDigits(cpfInput)) && (
                    <small className="text-danger">CPF inválido.</small>
                  )}
                  {!perfil.cpf && <small className="text-muted d-block">O Campo CPF Não poderá ser editado depois de cadastrado!</small>}
                </div>
                <button className="btn btn-success">Salvar</button>
              </form>
            )}
          </NavBox>
        )}

        {/* PAINEL: Meus Endereços */}
        {contaMenu === "enderecos" && (
          <NavBox
            title="Meus Endereços"
            breadcrumb={breadcrumbLabel("enderecos")}
            onClose={() => setContaMenu("")}
            maxWidth={820}
            toastSlot={
              <>
                <ToastBootstrap
                  mensagem={toast.mensagem}
                  tipo={toast.tipo}
                  show={!!toast.mensagem}
                  onClose={() => setToast({ mensagem: "", tipo: toast.tipo })}
                />
                <ToastBootstrap
                  mensagem={toastCadastro.mensagem}
                  tipo={toastCadastro.tipo}
                  show={!!toastCadastro.mensagem}
                  onClose={() => setToastCadastro({ mensagem: "", tipo: toastCadastro.tipo })}
                />
              </>
            }
          >
            <EnderecosUI
              perfil={perfil}
              enderecos={enderecos}
              onReload={async () => { await carregarPerfilEEnderecos(); }}
              showToast={mostrarToast}   // novo: para feedback
            />
          </NavBox>
        )}

        <Routes>
          <Route
            path="/"
            element={
              <>
                <div className="d-flex justify-content-end align-items-center mb-3 gap-2">
                  <label className="form-label mb-0 text-white">Ordenar por:</label>
                  <select
                    className="form-select w-auto"
                    value={ordem}
                    onChange={e => {
                      setOrdem(e.target.value);
                      setPagina(1);
                    }}
                  >
                    <option value="alfabetica">Alfabética</option>
                    <option value="maisCaros">Mais caros</option>
                    <option value="maisBaratos">Mais baratos</option>
                    <option value="maisVendidos">Mais vendidos</option>
                  </select>
                </div>
                <main className="row">
                  {produtosPaginados.map((produto, idx) => {
                    const nomeProduto = produto.nome;
                    // Soma total de ml desse perfume já no carrinho
                    const totalMlNoCarrinho = carrinho
                      .filter(item => item.nome === nomeProduto)
                      .reduce((acc, item) => acc + parseInt(item.volume.replace("ml", "")) * item.quantidade, 0);

                    // Estoque disponível para retirada
                    const estoqueDisponivel = produto.volumeInicial - totalMlNoCarrinho;

                    // Verifica se existe algum volume permitido
                    const algumPermitido = Object.keys(produto.precos).some(volume => {
                      const mlVenda = parseInt(volume.replace("ml", ""));
                      return estoqueDisponivel - mlVenda >= 10;
                    });

                    // Card bloqueado se nenhum volume pode ser retirado
                    const bloqueado = !algumPermitido;

                    return (
                      <div key={inicio + idx} className="col-md-4 mb-4">
                        <div className={`card h-100 position-relative overflow-hidden ${bloqueado ? "bg-light text-muted" : ""}`}>
                          <div style={{ position: "relative", width: "100%", height: "140px" }}>
                            <img
                              src={produto.imagem}
                              alt={produto.nome}
                              style={{
                                width: "100%",
                                height: "140px",
                                objectFit: "cover",
                                borderRadius: "8px"
                              }}
                            />
                            <div
                              style={{
                                position: "absolute",
                                bottom: "0",
                                left: "0",
                                width: "100%",
                                background: "rgba(0,0,0,0.5)",
                                color: "#fff",
                                padding: "8px 12px",
                                fontWeight: "bold",
                                fontSize: "1.2em",
                                borderBottomLeftRadius: "8px",
                                borderBottomRightRadius: "8px",
                                display: "flex",
                                alignItems: "center"
                              }}
                            >
                              {produto.nome}
                              {produto.urlFragrantica &&
                                produto.urlFragrantica.trim() !== "" && (
                                  <button
                                    className="btn btn-link p-0 ms-2"
                                    title="Ver no Fragrantica"
                                    onClick={() => window.open(produto.urlFragrantica, "_blank")}
                                    style={{ verticalAlign: "middle" }}
                                  >
                                    <img
                                      src="https://www.fragrantica.com.br/favicon.ico"
                                      alt="Fragrantica"
                                      style={{ width: "22px", marginLeft: "8px" }}
                                    />
                                  </button>
                                )
                              }
                            </div>
                          </div>
                          <div className="card-body d-flex flex-column">
                            <label className="form-label">
                              Volume:&nbsp;
                              <select
                                className="form-select mb-3"
                                value={volumesSelecionados[inicio + idx] || "2ml"}
                                onChange={e => handleVolumeChange(inicio + idx, e.target.value)}
                                disabled={bloqueado}
                              >
                                {Object.keys(produto.precos).map(volume => {
                                  const mlVenda = parseInt(volume.replace("ml", ""));
                                  const permitido = estoqueDisponivel - mlVenda >= 10;
                                  return (
                                    <option key={volume} value={volume} disabled={!permitido}>
                                      {volume} - R$ {produto.precos[volume]} {!permitido ? "(sem estoque)" : ""}
                                    </option>
                                  );
                                })}
                              </select>
                            </label>
                            {bloqueado ? (
                              <button
                                className="btn btn-danger mt-auto"
                                disabled
                                style={{ cursor: "not-allowed" }}
                              >
                                Estoque insuficiente
                              </button>
                            ) : (
                              <button
                                className="btn btn-success mt-auto"
                                onClick={() => adicionarAoCarrinho(produto, inicio + idx)}
                                disabled={
                                  !Object.keys(produto.precos).some(volume => {
                                    const mlVenda = parseInt(volume.replace("ml", ""));
                                    return (
                                      volume === (volumesSelecionados[inicio + idx] || "2ml") &&
                                      estoqueDisponivel - mlVenda >= 10
                                    );
                                  })
                                }
                              >
                                Adicionar ao Carrinho
                              </button>
                            )}
                            {bloqueado && (
                              <div className="mt-2 text-danger fw-bold text-center">Produto indisponível, Todo estoque Disponível está no seu carrinho!</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </main>
                <nav className="d-flex justify-content-center align-items-center mt-4">
                  <ul className="pagination mb-0">
                    <li className={`page-item ${pagina === 1 ? "disabled" : ""}`}>
                      <button className="page-link" onClick={() => setPagina(pagina - 1)} disabled={pagina === 1}>
                        &laquo;
                      </button>
                    </li>
                    {Array.from({ length: totalPaginas }, (_, i) => (
                      <li key={i + 1} className={`page-item ${pagina === i + 1 ? "active" : ""}`}>
                        <button className="page-link" onClick={() => setPagina(i + 1)}>
                          {i + 1}
                        </button>
                      </li>
                    ))}
                    <li className={`page-item ${pagina === totalPaginas ? "disabled" : ""}`}>
                      <button className="page-link" onClick={() => setPagina(pagina + 1)} disabled={pagina === totalPaginas}>
                        &raquo;
                      </button>
                    </li>
                  </ul>
                </nav>
              </>
            }
          />
          <Route path="/recuperar-senha" element={<PassRecoveryPage />} />
          <Route path="/confirmar-email" element={<ConfirmEmailPage />} />
          <Route
            path="/godpleaseno"
            element={
              <LoginAdmin
                onLogin={logado => setAdminLogado(!!logado)}
                adminLogado={adminLogado}
                mostrarToast={mostrarToast}
              />
            }
          />
        </Routes>
        <Carrinho
          aberto={carrinhoAberto}
          itens={carrinho}
          onFechar={() => setCarrinhoAberto(false)}
          onRemover={removerDoCarrinho}
          toastCarrinho={toastCarrinho}
          onCloseToastCarrinho={() => setToastCarrinho({ mensagem: "", tipo: toastCarrinho.tipo })}
        />
      </div>
    </BrowserRouter>
  );
}

// -------- Endereços: inputs com fundo branco --------
function EnderecosUI({ perfil, enderecos, onReload, showToast }) {
  const MAX_ENDERECOS = 4;
  const lista = Array.isArray(enderecos) ? enderecos : [];

  const [adicionando, setAdicionando] = useState(false);

  const base = {
    nomeDestinatario: perfil?.nome || "",
    telefone: maskPhoneBR(perfil?.telefone || ""),
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cep: "",
    cidade: "",
    estado: "",
    principal: lista.length === 0,
  };
  const [form, setForm] = useState(base);

  useEffect(() => {
    setForm((f) => ({
      ...f,
      nomeDestinatario: perfil?.nome || "",
      telefone: maskPhoneBR(perfil?.telefone || ""),
    }));
  }, [perfil]);

  const podeAdicionar = lista.length < MAX_ENDERECOS;

  const ordenados = React.useMemo(
    () => [...lista].sort((a, b) => (b.principal === true) - (a.principal === true)),
    [lista]
  );

  async function carregarCidades(uf) {
    if (!uf) return [];
    try {
      const r = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
      const js = await r.json();
      return js.map((m) => m.nome).sort((a, b) => a.localeCompare(b, "pt-BR"));
    } catch {
      return [];
    }
  }

  async function preencherPorCEP(cep, setter) {
    const dados = await buscarCEP(cep || "");
    if (dados) {
      const cidades = await carregarCidades(dados.estado);
      setter((s) => ({
        ...s,
        cep,
        logradouro: dados.logradouro,
        bairro: dados.bairro,
        cidade: dados.cidade,
        estado: dados.estado,
        _cidades: cidades,
      }));
    }
  }

  async function salvarNovo() {
    if (!podeAdicionar) {
      showToast?.(`Limite de ${MAX_ENDERECOS} endereços atingido.`, "warning");
      return;
    }
    const { _cidades, ...payload } = form;
    const res = await api("/me/addresses", { method: "POST", body: JSON.stringify(payload) });
    const json = await res.json();
    if (json.success) {
      setAdicionando(false);
      setForm(base);
      await onReload?.();
      showToast?.("Endereço salvo.", "success");
    } else {
      showToast?.(json.message || "Erro ao salvar endereço.", "error");
    }
  }

  // Card de endereço isolado (estado local) — evita perder foco no mobile
  const CardEndereco = React.memo(function CardEndereco({ e }) {
    const [emEdicao, setEmEdicao] = useState(false);
    const [edit, setEdit] = useState(null);
    const [cidades, setCidades] = useState([]);

    const onlyNum = (v) => onlyDigits(v);

    useEffect(() => {
      // se trocar a lista/obj, sai da edição para evitar inconsistência
      setEmEdicao(false);
      setEdit(null);
      setCidades([]);
    }, [e.id]);

    const abrirEdicao = async () => {
      setEmEdicao(true);
      setEdit({
        ...e,
        telefone: maskPhoneBR(e.telefone || ""),
      });
      setCidades(await carregarCidades(e.estado));
    };

    const cancelarEdicao = () => {
      setEmEdicao(false);
      setEdit(null);
      setCidades([]);
    };

    const salvarEdicao = async () => {
      const { id, ...body } = edit || {};
      const res = await api(`/me/addresses/${e.id}`, { method: "PUT", body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) {
        cancelarEdicao();
        await onReload?.();
        showToast?.("Endereço atualizado.", "success");
      } else {
        showToast?.(json.message || "Erro ao atualizar endereço.", "error");
      }
    };

    const excluirEndereco = async () => {
      if (!window.confirm("Tem certeza que deseja excluir este endereço?")) return;
      const res = await api(`/me/addresses/${e.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        await onReload?.();
        showToast?.("Endereço excluído.", "success");
      } else {
        showToast?.(json.message || "Erro ao excluir endereço.", "error");
      }
    };

    return (
      <div className="card p-3 mb-3">
        <div className="d-flex justify-content-between align-items-center">
          <strong>{e.principal ? "Endereço Principal" : "Endereço"}</strong>
          <div className="d-flex gap-2">
            {!emEdicao && (
              <button className="btn btn-sm btn-outline-danger" onClick={excluirEndereco}>Excluir</button>
            )}
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={emEdicao ? cancelarEdicao : abrirEdicao}
            >
              {emEdicao ? "Cancelar" : "Editar"}
            </button>
          </div>
        </div>

        {emEdicao ? (
          <div className="mt-2">
            <div className="row g-2">
              <div className="col-md-6">
                <label className="form-label">Nome do destinatário</label>
                <input
                  className="form-control bg-white text-dark"
                  required
                  value={edit?.nomeDestinatario || ""}
                  onChange={(ev) => setEdit((s) => ({ ...s, nomeDestinatario: ev.target.value }))}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Telefone</label>
                <input
                  type="tel"
                  inputMode="tel"
                  className="form-control bg-white text-dark"
                  required
                  maxLength={16}
                  value={edit?.telefone || ""}
                  placeholder="(DD) 99999-9999"
                  onChange={(ev) => setEdit((s) => ({ ...s, telefone: maskPhoneBR(ev.target.value) }))}
                />
              </div>

              <div className="col-5">
                <label className="form-label">CEP</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  className="form-control bg-white text-dark"
                  required
                  maxLength={8}
                  value={edit?.cep || ""}
                  onChange={(ev) => setEdit((s) => ({ ...s, cep: onlyNum(ev.target.value).slice(0, 8) }))}
                  onBlur={() =>
                    preencherPorCEP(edit?.cep, (setter) => setEdit((s) => ({ ...s, ...setter })))
                  }
                />
              </div>
              <div className="col-7">
                <label className="form-label">Rua (Logradouro)</label>
                <input
                  className="form-control bg-white text-dark"
                  required
                  value={edit?.logradouro || ""}
                  onChange={(ev) => setEdit((s) => ({ ...s, logradouro: ev.target.value }))}
                />
              </div>

              <div className="col-3">
                <label className="form-label">Número</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  className="form-control bg-white text-dark"
                  required
                  maxLength={6}
                  value={edit?.numero || ""}
                  onChange={(ev) => setEdit((s) => ({ ...s, numero: onlyNum(ev.target.value).slice(0, 6) }))}
                />
              </div>
              <div className="col-4">
                <label className="form-label">Complemento</label>
                <input
                  className="form-control bg-white text-dark"
                  value={edit?.complemento || ""}
                  onChange={(ev) => setEdit((s) => ({ ...s, complemento: ev.target.value }))}
                />
              </div>
              <div className="col-5">
                <label className="form-label">Bairro</label>
                <input
                  className="form-control bg-white text-dark"
                  required
                  value={edit?.bairro || ""}
                  onChange={(ev) => setEdit((s) => ({ ...s, bairro: ev.target.value }))}
                />
              </div>

              <div className="col-6">
                <label className="form-label">Estado</label>
                <select
                  className="form-select bg-white text-dark"
                  required
                  value={edit?.estado || ""}
                  onChange={async (ev) => {
                    const uf = ev.target.value;
                    setEdit((s) => ({ ...s, estado: uf, cidade: "" }));
                    setCidades(await carregarCidades(uf));
                  }}
                >
                  <option value="">Selecione</option>
                  {UFS.map((u) => (
                    <option key={u.sigla} value={u.sigla}>
                      {u.sigla} - {u.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-6">
                <label className="form-label">Cidade</label>
                <select
                  className="form-select bg-white text-dark"
                  required
                  value={edit?.cidade || ""}
                  onChange={(ev) => setEdit((s) => ({ ...s, cidade: ev.target.value }))}
                >
                  <option value="">{edit?.estado ? "Selecione" : "Escolha o Estado"}</option>
                  {cidades.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12 form-check mt-2">
                <input
                  id={`principal-${e.id}`}
                  className="form-check-input"
                  type="checkbox"
                  checked={!!edit?.principal}
                  onChange={(ev) => setEdit((s) => ({ ...s, principal: ev.target.checked }))}
                />
                <label className="form-check-label" htmlFor={`principal-${e.id}`}>
                  Definir como principal
                </label>
              </div>
            </div>
            <button className="btn btn-success mt-3" onClick={salvarEdicao}>
              Salvar edição
            </button>
          </div>
        ) : (
          <div className="mt-2">
            <div>
              {e.nomeDestinatario} — {maskPhoneBR(e.telefone)}
            </div>
            <div>
              {e.logradouro}, {e.numero} {e.complemento ? `- ${e.complemento}` : ""}
            </div>
            <div>
              {e.bairro} — {e.cidade}/{e.estado} • CEP {e.cep}
            </div>
          </div>
        )}
      </div>
    );
  });

  return (
    <div className="container" style={{ maxWidth: 820 }}>
      <h4>Meus Endereços</h4>

      {ordenados.length === 0 && <div className="mb-3">Nenhum endereço cadastrado.</div>}
      {ordenados.map((e) => (
        <CardEndereco key={e.id} e={e} />
      ))}

      {!adicionando ? (
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-outline-success"
            onClick={() => setAdicionando(true)}
            disabled={!podeAdicionar}
            title={podeAdicionar ? "" : `Você já tem ${MAX_ENDERECOS} endereços`}
          >
            + Adicionar Endereço
          </button>
          {!podeAdicionar && <small className="text-muted">Limite de {MAX_ENDERECOS} endereços atingido.</small>}
        </div>
      ) : (
        <div className="card p-3 mt-3">
          <strong>Novo Endereço</strong>
          <div className="row g-2 mt-1">
            <div className="col-md-6">
              <label className="form-label">Nome do destinatário</label>
              <input
                className="form-control bg-white text-dark"
                required
                value={form.nomeDestinatario}
                onChange={(e) => setForm({ ...form, nomeDestinatario: e.target.value })}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Telefone</label>
              <input
                type="tel"
                inputMode="tel"
                className="form-control bg-white text-dark"
                required
                maxLength={16}
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: maskPhoneBR(e.target.value) })}
                placeholder="(DD) 99999-9999"
              />
            </div>

            <div className="col-5">
              <label className="form-label">CEP</label>
              <input
                type="tel"
                inputMode="numeric"
                className="form-control bg-white text-dark"
                required
                maxLength={8}
                value={form.cep}
                onChange={(e) => setForm({ ...form, cep: onlyDigits(e.target.value).slice(0, 8) })}
                onBlur={() => preencherPorCEP(form.cep, setForm)}
              />
            </div>
            <div className="col-7">
              <label className="form-label">Rua (Logradouro)</label>
              <input
                className="form-control bg-white text-dark"
                required
                value={form.logradouro}
                onChange={(e) => setForm({ ...form, logradouro: e.target.value })}
              />
            </div>

            <div className="col-3">
              <label className="form-label">Número</label>
              <input
                type="tel"
                inputMode="numeric"
                className="form-control bg-white text-dark"
                required
                maxLength={6}
                value={form.numero}
                onChange={(e) => setForm({ ...form, numero: onlyDigits(e.target.value).slice(0, 6) })}
              />
            </div>
            <div className="col-4">
              <label className="form-label">Complemento</label>
              <input
                className="form-control bg-white text-dark"
                value={form.complemento}
                onChange={(e) => setForm({ ...form, complemento: e.target.value })}
              />
            </div>
            <div className="col-5">
              <label className="form-label">Bairro</label>
              <input
                className="form-control bg-white text-dark"
                required
                value={form.bairro}
                onChange={(e) => setForm({ ...form, bairro: e.target.value })}
              />
            </div>

            <div className="col-6">
              <label className="form-label">Estado</label>
              <select
                className="form-select bg-white text-dark"
                required
                value={form.estado}
                onChange={async (e) => {
                  const uf = e.target.value;
                  setForm({ ...form, estado: uf, cidade: "" });
                  const cidades = await carregarCidades(uf);
                  setForm((s) => ({ ...s, _cidades: cidades }));
                }}
              >
                <option value="">Selecione</option>
                {UFS.map((u) => (
                  <option key={u.sigla} value={u.sigla}>
                    {u.sigla} - {u.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-6">
              <label className="form-label">Cidade</label>
              <select
                className="form-select bg-white text-dark"
                required
                value={form.cidade}
                onChange={(e) => setForm({ ...form, cidade: e.target.value })}
              >
                <option value="">{form.estado ? "Selecione" : "Escolha o Estado"}</option>
                {(form._cidades || []).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 form-check mt-2">
              <input
                id="novo-principal"
                className="form-check-input"
                type="checkbox"
                checked={!!form.principal}
                onChange={(e) => setForm({ ...form, principal: e.target.checked })}
              />
              <label className="form-check-label" htmlFor="novo-principal">
                Definir como principal
              </label>
            </div>
          </div>

          <div className="mt-3 d-flex gap-2">
            <button className="btn btn-success" onClick={salvarNovo} disabled={!podeAdicionar}>
              Salvar endereço
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setAdicionando(false);
                setForm(base);
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}