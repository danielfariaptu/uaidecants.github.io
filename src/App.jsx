import React, { useState, useEffect } from "react";

// Função para transformar os dados do Sheets
function transformarProdutos(dadosSheets) {
  return dadosSheets.map(item => ({
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
    imagem: item.imagem
  }));
}

function Carrinho({ aberto, itens, onFechar, onRemover }) {
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

export default function App() {
  // Carregar estados do localStorage
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
  const itensPorPagina = 6;

  // Persistir estados no localStorage
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
    fetch("https://opensheet.elk.sh/1FAGEx9NpcQXtukNKsnxd_RySr5Jc3rTk827QLKjSA7Q/Sheet1")
      .then(res => res.json())
      .then(data => setProdutos(transformarProdutos(data)));
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
    }
    return novaLista;
  }

  const produtosOrdenados = ordenarProdutos(produtos);
  const totalPaginas = Math.ceil(produtosOrdenados.length / itensPorPagina);
  const inicio = (pagina - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;
  const produtosPaginados = produtosOrdenados.slice(inicio, fim);

  function handleVolumeChange(idx, volume) {
    setVolumesSelecionados({ ...volumesSelecionados, [idx]: volume });
  }

  function adicionarAoCarrinho(produto, idx) {
  const volume = volumesSelecionados[idx] || "2ml";
  const preco = produto.precos[volume];
  const mlVenda = parseInt(volume.replace("ml", ""));
  const estoqueAtual = produto.volumeRestante;

  if (estoqueAtual < mlVenda) return;

  const itemIdx = carrinho.findIndex(
    item => item.nome === produto.nome && item.volume === volume
  );
  if (itemIdx >= 0) {
    const novoCarrinho = [...carrinho];
    novoCarrinho[itemIdx].quantidade += 1;
    setCarrinho(novoCarrinho);
  } else {
    setCarrinho([
      ...carrinho,
      {
        nome: produto.nome,
        volume,
        preco,
        quantidade: 1
      }
    ]);
  }

  const novosProdutos = [...produtos];
  const nomeProduto = produto.nome;
  const idxReal = novosProdutos.findIndex(p => p.nome === nomeProduto);
  if (idxReal >= 0) {
    novosProdutos[idxReal].volumeRestante -= mlVenda;
    setProdutos(novosProdutos);
  }

  setCarrinhoAberto(true); // Abre o carrinho ao adicionar
}

  function removerDoCarrinho(idx) {
    const item = carrinho[idx];
    const mlVenda = parseInt(item.volume.replace("ml", ""));
    const prodIdx = produtos.findIndex(p => p.nome === item.nome);
    if (prodIdx >= 0) {
      const novosProdutos = [...produtos];
      novosProdutos[prodIdx].volumeRestante += mlVenda * item.quantidade;
      setProdutos(novosProdutos);
    }
    const novoCarrinho = [...carrinho];
    novoCarrinho.splice(idx, 1);
    setCarrinho(novoCarrinho);
  }

  const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);

  return (
    <div className="container py-4">
      <header className="d-flex align-items-center mb-4">
        <img src="/images/Logo.png" alt="Uai Decants" style={{ width: "80px", marginRight: "16px" }} />
        <h1 className="flex-grow-1">Monte seu pedido</h1>
        <button
          className="btn btn-primary position-relative"
          onClick={() => setCarrinhoAberto(true)}
        >
          <span style={{ fontSize: "22px" }}>🛍️</span> Carrinho
          <span className="badge bg-warning text-dark position-absolute top-0 start-100 translate-middle rounded-pill">
            {totalItens}
          </span>
        </button>
      </header>

      {/* Controle de ordenação */}
      <div className="d-flex justify-content-end align-items-center mb-3 gap-2">
        <label className="form-label mb-0">Ordenar por:</label>
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
        </select>
      </div>

      {/* Renderização dos cards paginados */}
      <main className="row">
        {produtosPaginados.map((produto, idx) => {
          const cardInativo = produto.volumeRestante < 10;
          return (
            <div key={inicio + idx} className="col-md-4 mb-4">
              <div className={`card h-100 position-relative overflow-hidden ${cardInativo ? "bg-light text-muted" : ""}`}>
                {/* Imagem com nome sobreposto */}
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
                      disabled={cardInativo}
                    >
                      {Object.keys(produto.precos).map(volume => {
                        const mlVenda = parseInt(volume.replace("ml", ""));
                        const disponivel = produto.volumeRestante >= mlVenda && !cardInativo;
                        return (
                          <option key={volume} value={volume} disabled={!disponivel}>
                            {volume} - R$ {produto.precos[volume]} {disponivel ? "" : "(Sem estoque)"}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                  <button
                    className="btn btn-success mt-auto"
                    onClick={() => adicionarAoCarrinho(produto, inicio + idx)}
                    disabled={cardInativo || produto.volumeRestante < parseInt((volumesSelecionados[inicio + idx] || "2ml").replace("ml", ""))}
                  >
                    Adicionar ao Carrinho
                  </button>
                  {cardInativo && (
                    <div className="mt-2 text-danger fw-bold">Produto indisponível</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </main>

      {/* Paginação */}
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

      <Carrinho
        aberto={carrinhoAberto}
        itens={carrinho}
        onFechar={() => setCarrinhoAberto(false)}
        onRemover={removerDoCarrinho}
      />
    </div>
  );
}