import React, { useEffect, useState } from "react";

const API = "https://us-central1-uaidecants.cloudfunctions.net/api/perfumes";

export default function PerfumeAdmin({ adminLogado }) {

  const [perfumes, setPerfumes] = useState([]);
  const [novo, setNovo] = useState({
    nome: "",
    volumeInicial: "",
    precos2ml: "",
    precos5ml: "",
    precos8ml: "",
    precos15ml: "",
    urlFragrantica: "",
    imagem: "",
    pedidos: 0
  });
  const [editando, setEditando] = useState(null);

  useEffect(() => {
    fetch(API)
      .then(res => res.json())
      .then(data => setPerfumes(Array.isArray(data) ? data : []));
  }, []);

  function criarPerfume(e) {
    e.preventDefault();
    const token = localStorage.getItem("token");
    fetch(API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...novo, pedidos: 0 })
    })
      .then(res => res.json())
      .then(data => {
        setPerfumes([...perfumes, data]);
        setNovo({
          nome: "",
          volumeInicial: "",
          precos2ml: "",
          precos5ml: "",
          precos8ml: "",
          precos15ml: "",
          urlFragrantica: "",
          imagem: "",
          pedidos: 0
        });
      })
      .catch(err => {
        console.error("Erro ao cadastrar perfume:", err);
        alert("Erro ao cadastrar perfume!");
      });
  }


  function salvarEdicao(id) {
    const token = localStorage.getItem("token");
    fetch(`${API}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(editando)
    })
      .then(res => res.json())
      .then(p => {
        if (p.error) {
          alert("Erro: " + p.error);
          return;
        }
        setPerfumes(perfumes.map(perf => perf.id === id ? p : perf));
        setEditando(null);
      })
      .catch(err => {
        console.error("Erro ao editar perfume:", err);
        alert("Erro ao editar perfume!");
      });
  }

  function excluirPerfume(id) {
    const token = localStorage.getItem("token");
    fetch(`${API}/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then(() => setPerfumes(perfumes.filter(p => p.id !== id)))
      .catch(err => {
        console.error("Erro ao excluir perfume:", err);
        alert("Erro ao excluir perfume!");
      });
  }

  function ativarDesativar(id, ativo) {
    const token = localStorage.getItem("token");
    fetch(`${API}/${id}/${ativo ? "desativar" : "ativar"}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then(() =>
        setPerfumes(perfumes.map(p =>
          p.id === id ? { ...p, ativo: !ativo } : p
        ))
      )
      .catch(err => {
        console.error("Erro ao ativar/desativar perfume:", err);
        alert("Erro ao ativar/desativar perfume!");
      });
  }

  return (
    <div>
      <h4>Cadastrar novo perfume</h4>
      <form onSubmit={criarPerfume} className="mb-4">
        <input className="form-control mb-2" placeholder="Nome" value={novo.nome} onChange={e => setNovo({ ...novo, nome: e.target.value })} />
        <input className="form-control mb-2" placeholder="Volume Inicial" value={novo.volumeInicial} onChange={e => setNovo({ ...novo, volumeInicial: e.target.value })} />
        <input className="form-control mb-2" placeholder="Preço 2ml" value={novo.precos2ml} onChange={e => setNovo({ ...novo, precos2ml: e.target.value })} />
        <input className="form-control mb-2" placeholder="Preço 5ml" value={novo.precos5ml} onChange={e => setNovo({ ...novo, precos5ml: e.target.value })} />
        <input className="form-control mb-2" placeholder="Preço 8ml" value={novo.precos8ml} onChange={e => setNovo({ ...novo, precos8ml: e.target.value })} />
        <input className="form-control mb-2" placeholder="Preço 15ml" value={novo.precos15ml} onChange={e => setNovo({ ...novo, precos15ml: e.target.value })} />
        <input className="form-control mb-2" placeholder="URL Fragrantica" value={novo.urlFragrantica} onChange={e => setNovo({ ...novo, urlFragrantica: e.target.value })} />
        <input className="form-control mb-2" placeholder="URL Imagem" value={novo.imagem} onChange={e => setNovo({ ...novo, imagem: e.target.value })} />
        <button className="btn btn-success w-100">Cadastrar</button>
      </form>

      <h4>Perfumes cadastrados</h4>
      <table className="table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Volume</th>
            <th>Preços</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {(Array.isArray(perfumes) ? perfumes : []).map(p => (
            <tr key={p.id}>
              <td>
                {editando && editando.id === p.id ? (
                  <input value={editando.nome} onChange={e => setEditando({ ...editando, nome: e.target.value })} />
                ) : p.nome}
              </td>
              <td>{p.volumeInicial}</td>
              <td>
                {editando && editando.id === p.id ? (
                  <>
                    <input value={editando.nome} onChange={e => setEditando({ ...editando, nome: e.target.value })} placeholder="Nome" />
                    <input value={editando.volumeInicial} onChange={e => setEditando({ ...editando, volumeInicial: e.target.value })} placeholder="Volume Inicial" />
                    <input value={editando.precos2ml} onChange={e => setEditando({ ...editando, precos2ml: e.target.value })} placeholder="Preço 2ml" />
                    <input value={editando.precos5ml} onChange={e => setEditando({ ...editando, precos5ml: e.target.value })} placeholder="Preço 5ml" />
                    <input value={editando.precos8ml} onChange={e => setEditando({ ...editando, precos8ml: e.target.value })} placeholder="Preço 8ml" />
                    <input value={editando.precos15ml} onChange={e => setEditando({ ...editando, precos15ml: e.target.value })} placeholder="Preço 15ml" />
                    <input value={editando.urlFragrantica} onChange={e => setEditando({ ...editando, urlFragrantica: e.target.value })} placeholder="URL Fragrantica" />
                    <input value={editando.imagem} onChange={e => setEditando({ ...editando, imagem: e.target.value })} placeholder="URL Imagem" />
                  </>
                ) : (
                  <>
                    {p.nome}<br />
                    {p.volumeInicial}<br />
                    2ml: {p.precos2ml} | 5ml: {p.precos5ml} | 8ml: {p.precos8ml} | 15ml: {p.precos15ml}<br />
                    Fragrantica: {p.urlFragrantica}<br />
                    Imagem: {p.imagem}
                  </>
                )}
              </td>
              <td>
                {p.ativo ? (
                  <span className="badge bg-success">Ativo</span>
                ) : (
                  <span className="badge bg-danger">Inativo</span>
                )}
              </td>
              <td>
                {editando && editando.id === p.id ? (
                  <>
                    <button className="btn btn-primary btn-sm me-2" onClick={() => salvarEdicao(p.id)}>Salvar</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditando(null)}>Cancelar</button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-warning btn-sm me-2" onClick={() => ativarDesativar(p.id, p.ativo)}>
                      {p.ativo ? "Desativar" : "Ativar"}
                    </button>
                    <button className="btn btn-info btn-sm me-2" onClick={() => setEditando(p)}>Editar</button>
                    <button className="btn btn-danger btn-sm" onClick={() => excluirPerfume(p.id)}>Excluir</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}