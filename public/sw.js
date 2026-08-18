const CACHE_NOME = 'meu-planner-v1';
const ARQUIVOS_ESSENCIAIS = ['/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NOME).then((cache) => cache.addAll(ARQUIVOS_ESSENCIAIS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(
        chaves.filter((chave) => chave !== CACHE_NOME).map((chave) => caches.delete(chave))
      )
    )
  );
  self.clients.claim();
});

// Estratégia: network-first pra tudo (o app depende de dados ao vivo do Firestore),
// caindo pro cache só quando estiver offline — garante que o app abre mesmo sem internet,
// mas nunca serve dados financeiros desatualizados quando está online.
self.addEventListener('fetch', (evento) => {
  if (evento.request.method !== 'GET') return;

  evento.respondWith(
    fetch(evento.request)
      .then((resposta) => {
        const respostaClone = resposta.clone();
        caches.open(CACHE_NOME).then((cache) => cache.put(evento.request, respostaClone));
        return resposta;
      })
      .catch(() => caches.match(evento.request).then((resposta) => resposta || caches.match('/')))
  );
});
