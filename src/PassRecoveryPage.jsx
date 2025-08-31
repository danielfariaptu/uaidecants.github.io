import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { auth } from "./firebaseConfig"; // ajuste o caminho se necessário

export default function PassRecoveryPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const oobCode = params.get("oobCode");
  const mode = params.get("mode");

  const [validando, setValidando] = useState(true);
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mostrar1, setMostrar1] = useState(false);
  const [mostrar2, setMostrar2] = useState(false);
  const [okMsg, setOkMsg] = useState("");

  useEffect(() => {
    // força PT-BR para fluxos do Firebase Auth
    auth.languageCode = "pt";
    if (!oobCode || mode !== "resetPassword") {
      setErro("Link inválido.");
      setValidando(false);
      return;
    }
    verifyPasswordResetCode(auth, oobCode)
      .then((em) => { setEmail(em || ""); setValidando(false); })
      .catch(() => { setErro("Link inválido ou expirado."); setValidando(false); });
  }, [oobCode, mode]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!senha || senha.length < 8) { setErro("A nova senha deve ter ao menos 8 caracteres."); return; }
    if (senha !== confirmacao) { setErro("As senhas não conferem."); return; }
    try {
      setErro("");
      setSalvando(true);
      await confirmPasswordReset(auth, oobCode, senha);
      setOkMsg("Senha redefinida com sucesso! Redirecionando…");
      setTimeout(() => navigate("/"), 1500);
    } catch {
      setErro("Não foi possível redefinir a senha. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 520 }}>
      <div className="card p-4 mt-4">
        <h4 className="mb-3">Redefinir senha</h4>

        {validando && <div>Validando link…</div>}

        {!validando && erro && (
          <>
            <div className="alert alert-danger" role="alert">{erro}</div>
            <Link to="/" className="btn btn-outline-secondary mt-2">Voltar</Link>
          </>
        )}

        {!validando && !erro && (
          <form onSubmit={onSubmit} autoComplete="off">
            <div className="mb-2">
              <label className="form-label">Conta</label>
              <input className="form-control" value={email} disabled />
            </div>

            <div className="mb-2">
              <label className="form-label">Nova senha</label>
              <div className="input-group">
                <input
                  type={mostrar1 ? "text" : "password"}
                  className="form-control"
                  placeholder="Mínimo 8 caracteres"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setMostrar1(s => !s)}
                  title={mostrar1 ? "Ocultar senha" : "Mostrar senha"}
                >
                  <i className={`bi ${mostrar1 ? "bi-eye-slash" : "bi-eye"}`}></i>
                </button>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Confirmar nova senha</label>
              <div className="input-group">
                <input
                  type={mostrar2 ? "text" : "password"}
                  className="form-control"
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setMostrar2(s => !s)}
                  title={mostrar2 ? "Ocultar senha" : "Mostrar senha"}
                >
                  <i className={`bi ${mostrar2 ? "bi-eye-slash" : "bi-eye"}`}></i>
                </button>
              </div>
              {senha && confirmacao && senha !== confirmacao && (
                <small className="text-danger">As senhas não conferem.</small>
              )}
            </div>

            {okMsg && <div className="alert alert-success">{okMsg}</div>}
            {!okMsg && (
              <button className="btn btn-primary w-100" disabled={salvando}>
                {salvando ? "Salvando…" : "Salvar nova senha"}
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}