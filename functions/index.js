// Importa apenas o submódulo HTTPS (mais leve que 'firebase-functions/v2')
const {onRequest} = require("firebase-functions/v2/https");

// NADA além disso no topo. Sem express/cors/admin aqui.
// Não use setGlobalOptions; passe as opções aqui direto.

let cachedApp;

exports.api = onRequest(
    {
      region: "us-central1",
      memory: "256MiB",
      cpu: 1,
      concurrency: 80,
      timeoutSeconds: 60,
      maxInstances: 20,
      minInstances: 0,
      secrets: [
        "ARROZ",
        "EMAIL_REMETENTE",
        "SUPERFRETE_TOKEN",
        "MELHORENVIO_TOKEN",
        "MELHORENVIO_TOKEN_SANDBOX",
        "ORIGIN_ZIP",
      ],
    },
    (req, res) => {
      if (!cachedApp) {
        const {createApp} = require("./app"); // lazy require do app
        cachedApp = createApp(); // instancia o Express só na 1ª request
      }
      return cachedApp(req, res);
    },
);
