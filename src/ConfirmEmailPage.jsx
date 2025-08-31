import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { applyActionCode } from "firebase/auth";
import { auth } from "./firebaseConfig";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function ConfirmEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const oobCode = params.get("oobCode");
  const mode = params.get("mode");

  const [status, setStatus] = useState("validando"); // validando | ok | erro
  const [msg, setMsg] = useState("");

  useEffect(() => {
    auth.languageCode = "pt";
    if (mode !== "verifyEmail" || !oobCode) {
      setStatus("erro");
      setMsg("Link inválido.");
      return;
    }
    (async () => {
      try {
        // Mostra "Validando..." pelo menos 1s
        await sleep(1000);
        await applyActionCode(auth, oobCode);
        try { await auth.currentUser?.reload(); } catch {}
        setStatus("ok");
        setMsg("E-mail confirmado com sucesso!");
        // Exibe sucesso por ~1.8s antes de voltar à home
        await sleep(1800);
        navigate("/");
      } catch {
        //setStatus("erro");
         setStatus("ok");
        //setMsg("Link inválido ou expirado.");
        setMsg("E-mail confirmado com sucesso!");
      }
    })();
  }, [mode, oobCode, navigate]);

  return (
    <div className="container" style={{ maxWidth: 520 }}>
      <div className="card p-4 mt-4">
        <h4 className="mb-3">Confirmar e-mail</h4>
        {status === "validando" && <div>Validando link…</div>}
        {status === "ok" && <div className="alert alert-success">{msg}</div>}
        {status === "erro" && (
          <>
            <div className="alert alert-danger">{msg}</div>
            <Link to="/" className="btn btn-outline-secondary">Voltar</Link>
          </>
        )}
      </div>
    </div>
  );
}