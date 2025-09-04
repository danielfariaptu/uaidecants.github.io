import React from "react";
export default function Privacy() {
  return (
    <div className="container" style={{ maxWidth: 820, color: '#FFF'}}>
      <h3>Política de Privacidade</h3>
      <p>Protegemos seus dados conforme a LGPD. Coletamos apenas informações necessárias para processamento de pedidos, suporte e melhorias do serviço.</p>
      <p>Você pode solicitar acesso, correção ou exclusão dos seus dados pelo e-mail suporte@uaidecants.com.br.</p>
      <p>Cookies são usados para autenticação e analytics. Não vendemos suas informações.</p>
      <p>Contato do controlador: suporte@uaidecants.com.br • Última atualização: {new Date().getFullYear()}.</p>
    </div>
  );
}