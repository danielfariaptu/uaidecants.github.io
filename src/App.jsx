import React, { useState } from "react";
import produtos from "./produtos.json";

function Carrinho({ aberto, itens, onFechar }) {
  const total = itens.reduce((acc, item) => acc + item.preco * item.quantidade, 0);

  return (
    <div
      style={{
        display: aberto ? "block" : "none",
        position: "fixed",
        top: 0,
        right: 0,
        width: "300px",
        height: "100%",
        background: "#fff",
        borderLeft: "2px solid #ccc",
        padding: "10px",
        overflowY: "auto",
        zIndex: 10
      }}
    >
      <h2>Carrinho</h2>
      <ul>
        {itens.length === 0 ? (
          <li>Carrinho vazio</li>
        ) : (
          itens.map((item, idx) => (
            <li key={idx}>
              {item.nome} ({item.volume}, {item.quantidade}x) - R$ {item.preco.toFixed(2)}
            </li>
          ))
        )}
      </ul>
      <p>
        <strong>Total: R$ {total.toFixed(2)}</strong>
      </p>
      <button onClick={onFechar}>Fechar Carrinho</button>
    </div>
  );
}

export default function App() {
  const [carrinho, setCarrinho] = useState([]);
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);
  const [volumesSelecionados, setVolumesSelecionados] = useState({});

  function handleVolumeChange(idx, volume) {
    setVolumesSelecionados({ ...volumesSelecionados, [idx]: volume });
  }

  function adicionarAoCarrinho(produto, idx) {
    const volume = volumesSelecionados[idx] || "2ml";
    const preco = produto.precos[volume];

    // Verifica se já existe o mesmo produto e volume no carrinho
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
  }

  const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);

  return (
    <div>
      <header>
        <img src="/images/Logo.png" alt="Uai Decants" style={{ width: "10%" }} />
        <button
          id="abrirCarrinho"
          style={{
            background: "#003366",
            color: "white",
            border: "none",
            fontSize: "18px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            cursor: "pointer",
            position: "relative"
          }}
          onClick={() => setCarrinhoAberto(true)}
        >
          <span style={{ fontSize: "22px" }}>🛍️</span> Carrinho
          <span
            style={{
              background: "#ffcd1e",
              color: "#003366",
              borderRadius: "50%",
              padding: "2px 8px",
              fontWeight: "bold",
              marginLeft: "8px"
            }}
          >
            {totalItens}
          </span>
        </button>
        <h1>Monte seu pedido</h1>
      </header>

      <main>
        {produtos.map((produto, idx) => (
          <div key={idx} style={{ margin: "10px", border: "1px solid #ccc", padding: "10px", borderRadius: "8px" }}>
            <span style={{ fontWeight: "bold" }}>{produto.nome}</span>
            <br />
            <label>
              Volume:&nbsp;
              <select
                value={volumesSelecionados[idx] || "2ml"}
                onChange={e => handleVolumeChange(idx, e.target.value)}
              >
                {Object.keys(produto.precos).map(volume => (
                  <option key={volume} value={volume}>
                    {volume} - R$ {produto.precos[volume]}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() => adicionarAoCarrinho(produto, idx)}
              style={{ marginLeft: "10px" }}
            >
              Adicionar ao Carrinho
            </button>
          </div>
        ))}
      </main>

      <Carrinho aberto={carrinhoAberto} itens={carrinho} onFechar={() => setCarrinhoAberto(false)} />
    </div>
  );
}