import React, { useEffect, useState } from "react";

const API = "https://us-central1-uaidecants.cloudfunctions.net/api/api/perfumes";

export default function PerfumeAdmin() {
  
  const [perfumes, setPerfumes] = useState([]);
  const [novo, setNovo] = useState({
    nome: "",
    volumeInicial: "",
    precos2ml: "",
    precos5ml: "",
    precos8ml: "",
    precos15ml: "",
    urlFragrantica: "",
    imagem: ""
  });
  const [editando, setEditando] = useState(null);

  useEffect(() => {
    fetch(API)
      .then(res => res.json())
      .then(data => setPerfumes(Array.isArray(data) ? data : []));
  }, []);

  function criarPerfume(e) {
    e.preventDefault();
    fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(novo)
    })
      .then(res => res.json())
      .then(p => {
        setPerfumes([...perfumes, p]);
        setNovo({
          nome: "",
          volumeInicial: "",
          precos2ml: "",
          precos5ml: "",
          precos8ml: "",
          precos15ml: "",
          urlFragrantica: "",
          imagem: ""
        });
      });
  }

  function salvarEdicao(id) {
    fetch(`${API}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editando)
    })
      .then(res => res.json())
      .then(p => {
        setPerfumes(perfumes.map(perf => perf.id === id ? p : perf));
        setEditando(null);
      });
  }

  function excluirPerfume(id) {
    fetch(`${API}/${id}`, { method: "DELETE" })
      .then(() => setPerfumes(perfumes.filter(p => p.id !== id)));
  }

  function ativarDesativar(id, ativo) {
    fetch(`${API}/${id}/${ativo ? "desativar" : "ativar"}`, { method: "POST" })
      .then(() =>
        setPerfumes(perfumes.map(p =>
          p.id === id ? { ...p, ativo: !ativo } : p
        ))
      );
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
                    <input value={editando.precos2ml} onChange={e => setEditando({ ...editando, precos2ml: e.target.value })} placeholder="2ml" />
                    <input value={editando.precos5ml} onChange={e => setEditando({ ...editando, precos5ml: e.target.value })} placeholder="5ml" />
                    <input value={editando.precos8ml} onChange={e => setEditando({ ...editando, precos8ml: e.target.value })} placeholder="8ml" />
                    <input value={editando.precos15ml} onChange={e => setEditando({ ...editando, precos15ml: e.target.value })} placeholder="15ml" />
                  </>
                ) : (
                  <>
                    2ml: {p.precos2ml} | 5ml: {p.precos5ml} | 8ml: {p.precos8ml} | 15ml: {p.precos15ml}
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