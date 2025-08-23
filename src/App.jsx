import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PerfumeAdmin from "./PerfumeAdmin.jsx";
import "bootstrap/dist/css/bootstrap.min.css";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

// Toast visual feedback (Bootstrap, sem CSS extra)
function ToastBootstrap({ mensagem, tipo = "info", show, onClose }) {
  if (!show || !mensagem) return null;
  // Bootstrap aceita: "primary", "secondary", "success", "danger", "warning", "info", "light", "dark"
  const tipoBootstrap = tipo === "error" ? "danger" : tipo;
  return (
    <div
      className={`toast align-items-center text-bg-${tipoBootstrap} border-0 show`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      style={{ width: "100%" }}
    >
      <div className="d-flex">
        <div className="toast-body">{mensagem}</div>
        <button
          type="button"
          className="btn-close btn-close-white me-2 m-auto"
          data-bs-dismiss="toast"
          aria-label="Close"
          onClick={onClose}
        ></button>
      </div>
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
  const [senhaAdmin, setSenhaAdmin] = useState("");
  const [erroLogin, setErroLogin] = useState("");

  async function handleLoginAdmin(e) {
    e.preventDefault();
    setErroLogin("");
    try {
      const resp = await fetch("https://us-central1-uaidecants.cloudfunctions.net/api/login-admin-daniel-faria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha: senhaAdmin }),
        credentials: "include"
      });
      const data = await resp.json();
      if (data.success) {
        onLogin(true);
        await checarAdminLogado();
        setSenhaAdmin("");
        setErroLogin("");
        mostrarToast("Login realizado com sucesso!", "success");
      } else {
        setErroLogin(data.message || "Senha incorreta!");
        mostrarToast("Senha incorreta!", "error");
      }
    } catch (err) {
      setErroLogin("Erro ao conectar ao servidor.");
      mostrarToast(err.message || "Erro desconhecido", "error");
    }
  }

  if (adminLogado) {
    return (
      <div className="container mt-4">
        <h3>Painel Admin</h3>
        <button
          className="btn btn-outline-danger mb-3"
          onClick={async () => {
            await fetch("https://us-central1-uaidecants.cloudfunctions.net/api/logout-admin", { method: "POST", credentials: "include" });
            await checarAdminLogado();
            mostrarToast("Logout realizado.", "info");
            // Opcional: redirecionar
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
        type="password"
        className="form-control mb-2"
        placeholder="Senha do admin"
        value={senhaAdmin}
        onChange={e => setSenhaAdmin(e.target.value)}
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

  // Toast state
  const [toast, setToast] = useState({ mensagem: "", tipo: "info" });
  const [toastCadastro, setToastCadastro] = useState({ mensagem: "", tipo: "info" });
  const [toastCarrinho, setToastCarrinho] = useState({ mensagem: "", tipo: "info" });

  async function checarAdminLogado() {
    try {
      const resp = await fetch("https://us-central1-uaidecants.cloudfunctions.net/api/api/perfumes", {
        method: "GET",
        credentials: "include"
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
    fetch("https://us-central1-uaidecants.cloudfunctions.net/api/api/perfumes")
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

  const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);

  return (
    <BrowserRouter>
      <div className="container py-4">
        {/* Toast visual global (ex: login/logout) */}
        <ToastBootstrap
          mensagem={toast.mensagem}
          tipo={toast.tipo}
          show={!!toast.mensagem}
          onClose={() => setToast({ mensagem: "", tipo: toast.tipo })}
        />
        <nav className="navbar mb-4">
          <a href="/">
            <img src="/images/Logo.png" alt="Uai Decants" className="navbar-logo" />
          </a>
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
            onLogin={tipo => setContaMenu(tipo)}
            onLogout={() => {
              setUsuarioLogado(false);
              setContaMenu("");
              mostrarToast("Logout realizado.", "info");
            }}
          />
        </nav>

        {/* Renderização das telas do menu conta */}
        {contaMenu === "criar" && (
          <div className="container" style={{ maxWidth: 400 }}>
            {/* Toast aparece dentro do container de cadastro */}
            <ToastBootstrap
              mensagem={toastCadastro.mensagem}
              tipo={toastCadastro.tipo}
              show={!!toastCadastro.mensagem}
              onClose={() => setToastCadastro({ mensagem: "", tipo: toastCadastro.tipo })}
            />
            <div className="card p-4 ">
              <h4 style={{ textAlign: "center", color: "black" }}>Criar Conta</h4>
              <form
                onSubmit={async e => {
                  e.preventDefault();
                  const nome = e.target.nome.value;
                  const email = e.target.email.value;
                  const senha = e.target.senha.value;
                  try {
                    const resp = await fetch("https://us-central1-uaidecants.cloudfunctions.net/api/api/usuarios", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ nome, email, senha })
                    });
                    const data = await resp.json();
                    if (data.success) {
                      mostrarToastCadastro("Conta criada com sucesso!", "success");
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
                  <input type="password" name="senha" className="form-control" required minLength={6} />
                </div>
                <button type="submit" className="btn btn-success w-100">Criar Conta</button>
              </form>
            </div>
          </div>
        )}
        {contaMenu === "login" && (
          <div className="container" style={{ maxWidth: 400 }}>
            <ToastBootstrap
              mensagem={toastCadastro.mensagem}
              tipo={toastCadastro.tipo}
              show={!!toastCadastro.mensagem}
              onClose={() => setToastCadastro({ mensagem: "", tipo: toastCadastro.tipo })}
            />
            <div className="card p-4">
              <h4 style={{ textAlign: "center", color: "black" }}>Iniciar Sessão</h4>
              <form
                onSubmit={async e => {
                  e.preventDefault();
                  const email = e.target.email.value;
                  const senha = e.target.senha.value;
                  const auth = getAuth();
                  try {
                    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
                    const user = userCredential.user;

                    if (!user.emailVerified) {
                      mostrarToastCadastro("Verifique seu e-mail antes de acessar.", "error");
                      await auth.signOut();
                      return;
                    }

                    const token = await user.getIdToken();
                    localStorage.setItem("token", token);
                    setUsuarioLogado(true);
                    setContaMenu("");
                    mostrarToast("Login realizado com sucesso!", "success");
                  } catch (err) {
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
              </form>
            </div>
          </div>
        )}
        {contaMenu === "convidado" && <div className="container"><h4>Checkout como Convidado</h4>{/* Checkout simples aqui */}</div>}
        {contaMenu === "dados" && <div className="container"><h4>Meus Dados</h4>{/* Dados do usuário aqui */}</div>}
        {contaMenu === "enderecos" && <div className="container"><h4>Endereços</h4>{/* Endereços do usuário aqui */}</div>}
        {contaMenu === "pedidos" && <div className="container"><h4>Meus Pedidos</h4>{/* Pedidos do usuário aqui */}</div>}

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
          <Route
            path="/login-admin-daniel-faria"
            element={
              <LoginAdmin
                onLogin={logado => {
                  setAdminLogado(!!logado);
                }}
                adminLogado={adminLogado}
                mostrarToast={mostrarToast}
                checarAdminLogado={checarAdminLogado}
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