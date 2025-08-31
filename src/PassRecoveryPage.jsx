import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { auth } from "./firebaseConfig";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  const [mostrar1, setMostrar1] = useState(false);
  const [mostrar2, setMostrar2] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [okMsg, setOkMsg] = useState("");

  useEffect(() => {
    auth.languageCode = "pt";
    if (!oobCode || mode !== "resetPassword") {
      setErro("Link inválido.");
      setValidando(false);
      return;
    }
    verifyPasswordResetCode(auth, oobCode)
      .then(async (em) => { await sleep(500); setEmail(em || ""); setValidando(false); })
      .catch(async () => { await sleep(500); setErro("Link inválido ou expirado."); setValidando(false); });
  }, [oobCode, mode]);

  // Medidor simples (visual apenas)
  function simpleScore(p = "") {
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return Math.min(s, 4);
  }
  const score = simpleScore(senha);
  const meter = [
    { label: "Muito fraca", color: "danger",  width: "20%"  },
    { label: "Fraca",       color: "warning", width: "40%"  },
    { label: "Razoável",    color: "info",    width: "60%"  },
    { label: "Boa",         color: "primary", width: "80%"  },
    { label: "Excelente",   color: "success", width: "100%" },
  ][Math.min(score, 4)];

  async function onSubmit(e) {
    e.preventDefault();
    if (!senha || senha.length < 8) { setErro("A senha deve ter ao menos 8 caracteres."); return; }
    if (senha !== confirmacao) { setErro("As senhas não conferem."); return; }
    try {
      setErro("");
      setSalvando(true);
      await confirmPasswordReset(auth, oobCode, senha);
      setOkMsg("Senha redefinida com sucesso! Redirecionando…");
      await sleep(1400);
      navigate("/");
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
            <div className="alert alert-danger">{erro}</div>
            <Link to="/" className="btn btn-outline-secondary">Voltar</Link>
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
                  onClick={() => setMostrar1((v) => !v)}
                  title={mostrar1 ? "Ocultar senha" : "Mostrar senha"}
                >
                  <i className={`bi ${mostrar1 ? "bi-eye-slash" : "bi-eye"}`}></i>
                </button>
              </div>

              {senha && (
                <div className="mt-2">
                  <div className="progress" style={{ height: 6 }}>
                    <div className={`progress-bar bg-${meter.color}`} style={{ width: meter.width }} />
                  </div>
                  <small className="text-muted">Força: {meter.label}</small>
                </div>
              )}
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
                  onClick={() => setMostrar2((v) => !v)}
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
              <button className="btn btn-primary w-100" disabled={salvando || senha.length < 8 || senha !== confirmacao}>
                {salvando ? "Salvando…" : "Salvar nova senha"}
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}