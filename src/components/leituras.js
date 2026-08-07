import {
  getLivros,
  addLivro,
  enviarCapa,
  removerCapa,
  atualizarPaginas,
  atualizarStatus,
  avaliarLivro,
  excluirLivro,
} from '../services/leiturasService.js';

const STATUS_LIVRO = { quero_ler: 'Quero ler', lendo: 'Lendo', lido: 'Lido' };

function formatarData(chave) {
  if (!chave) return null;
  const [ano, mes, dia] = chave.split('-');
  return `${dia}/${mes}/${ano}`;
}

function estrelasHTML(valor, id, acao) {
  return `
    <div class="estrelas" data-id="${id}" data-acao="${acao}">
      ${[1, 2, 3, 4, 5].map((i) => `<button class="estrela ${i <= valor ? 'preenchida' : ''}" data-valor="${i}">★</button>`).join('')}
    </div>
  `;
}

function pickerEstrelasHTML(idPicker) {
  return `
    <div id="${idPicker}" class="estrelas">
      ${[1, 2, 3, 4, 5].map((i) => `<button type="button" class="estrela" data-valor="${i}">★</button>`).join('')}
    </div>
  `;
}

function ligarPicker(fundo, idPicker) {
  let selecionado = 0;
  const botoes = fundo.querySelectorAll(`#${idPicker} .estrela`);
  botoes.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      selecionado = idx + 1;
      botoes.forEach((b, i) => b.classList.toggle('preenchida', i < selecionado));
    });
  });
  return () => selecionado;
}

export async function renderLeituras(container) {
  container.innerHTML = '<p class="estado-carregando">Carregando sua estante...</p>';

  let livros;
  try {
    livros = await getLivros();
  } catch (erro) {
    container.innerHTML = `<p class="estado-carregando">Não deu pra carregar. ${erro.message}</p>`;
    return;
  }

  desenharTela(container, livros);
}

function desenharTela(container, livros) {
  const lendo = livros.filter((l) => l.status === 'lendo');
  const queroLer = livros.filter((l) => l.status === 'quero_ler');
  const lidos = livros.filter((l) => l.status === 'lido');
  const paginasLidasTotal = livros.reduce((soma, l) => soma + (l.paginasLidas || 0), 0);

  container.innerHTML = `
    <div class="cabecalho-tela">
      <h2>Leituras</h2>
      <button class="btn-nova" id="btn-novo-livro">+ Livro</button>
    </div>

    <div class="cards-resumo" style="grid-template-columns:repeat(4,1fr)">
      <div class="card-resumo">
        <p class="eyebrow">Total</p>
        <p class="valor" style="color:var(--ink)">${livros.length}</p>
      </div>
      <div class="card-resumo">
        <p class="eyebrow">Lendo</p>
        <p class="valor" style="color:var(--amber)">${lendo.length}</p>
      </div>
      <div class="card-resumo">
        <p class="eyebrow">Lidos</p>
        <p class="valor" style="color:var(--green)">${lidos.length}</p>
      </div>
      <div class="card-resumo">
        <p class="eyebrow">Páginas lidas</p>
        <p class="valor" style="color:var(--ink)">${paginasLidasTotal}</p>
      </div>
    </div>

    ${secaoLivros('Lendo', lendo)}
    ${secaoLivros('Quero ler', queroLer)}
    ${secaoLivros('Lidos', lidos)}
    ${livros.length === 0 ? '<p class="legenda-progresso">Nenhum livro ainda.</p>' : ''}
  `;

  container.querySelector('#btn-novo-livro').addEventListener('click', () => abrirFormularioLivro(container));

  container.querySelectorAll('[data-acao="atualizar-pagina"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const livro = livros.find((l) => l.id === e.currentTarget.dataset.id);
      abrirFormularioPagina(container, livro);
    });
  });
  container.querySelectorAll('[data-acao="marcar-lido"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const livro = livros.find((l) => l.id === e.currentTarget.dataset.id);
      await atualizarStatus(livro.id, 'lido', livro.paginasTotal);
      renderLeituras(container);
    });
  });
  container.querySelectorAll('[data-acao="excluir-livro"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      if (!confirm('Excluir esse livro da estante?')) return;
      const livro = livros.find((l) => l.id === e.currentTarget.dataset.id);
      await excluirLivro(livro.id, livro.capaPath);
      renderLeituras(container);
    });
  });
  container.querySelectorAll('[data-acao="trocar-capa"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const livro = livros.find((l) => l.id === e.currentTarget.dataset.id);
      abrirSeletorCapa(container, livro);
    });
  });

  container.querySelectorAll('.estrelas[data-acao="avaliar-livro"]').forEach((div) => {
    div.querySelectorAll('.estrela').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const valor = parseInt(e.currentTarget.dataset.valor, 10);
        await avaliarLivro(div.dataset.id, valor);
        renderLeituras(container);
      });
    });
  });
}

function secaoLivros(titulo, livros) {
  if (livros.length === 0) return '';
  return `
    <p class="eyebrow" style="margin:20px 0 8px">${titulo} (${livros.length})</p>
    <div class="lista-contas" style="background:transparent;gap:8px">
      ${livros.map((l) => cartaoLivro(l)).join('')}
    </div>
  `;
}

function cartaoLivro(livro) {
  const percentual = livro.paginasTotal > 0 ? Math.round((livro.paginasLidas / livro.paginasTotal) * 100) : 0;
  return `
    <div style="background:var(--surface);border-radius:12px;padding:14px 16px;display:flex;gap:12px">
      ${livro.capaUrl
        ? `<img src="${livro.capaUrl}" alt="Capa de ${livro.titulo}" style="width:56px;height:84px;object-fit:cover;border-radius:6px;flex-shrink:0;cursor:pointer" data-acao="trocar-capa" data-id="${livro.id}">`
        : `<button data-acao="trocar-capa" data-id="${livro.id}" style="width:56px;height:84px;flex-shrink:0;border:1px dashed var(--border);border-radius:6px;background:var(--bg);color:var(--ink-muted);font-size:11px;cursor:pointer">+ Capa</button>`
      }

      <div style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
          <div style="flex:1;min-width:0">
            <p style="font-family:var(--font-display);font-size:14px;font-weight:600;margin:0 0 2px">${livro.titulo}</p>
            ${livro.autor ? `<p style="font-size:12px;color:var(--ink-muted);margin:0 0 6px">${livro.autor}</p>` : ''}
          </div>
          <button class="btn-remover-habito" data-acao="excluir-livro" data-id="${livro.id}" title="Excluir">×</button>
        </div>

        ${estrelasHTML(livro.avaliacao || 0, livro.id, 'avaliar-livro')}

        ${livro.paginasTotal > 0 ? `
          <div class="progresso-orcamento" style="margin:8px 0 4px">
            <div style="width:${percentual}%;background:${livro.status === 'lido' ? 'var(--green)' : 'var(--amber)'}"></div>
          </div>
          <p class="legenda-progresso" style="margin:0 0 8px">${livro.paginasLidas}/${livro.paginasTotal} páginas · ${percentual}%</p>
        ` : `<p class="legenda-progresso" style="margin:8px 0 8px">${STATUS_LIVRO[livro.status]}</p>`}

        ${livro.dataInicio || livro.dataFim ? `
          <p class="legenda-progresso" style="margin:0 0 8px">
            ${livro.dataInicio ? `Início ${formatarData(livro.dataInicio)}` : ''}${livro.dataInicio && livro.dataFim ? ' · ' : ''}${livro.dataFim ? `Fim ${formatarData(livro.dataFim)}` : ''}
          </p>
        ` : ''}

        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${livro.status !== 'lido' ? `<button class="btn-nova" style="padding:6px 10px;font-size:12px" data-acao="atualizar-pagina" data-id="${livro.id}">Atualizar página</button>` : ''}
          ${livro.status !== 'lido' ? `<button class="btn-duplicar" style="width:auto;padding:0 10px;font-size:12px" data-acao="marcar-lido" data-id="${livro.id}">Marcar como lido</button>` : ''}
        </div>
      </div>
    </div>
  `;
}

function abrirFormularioLivro(container) {
  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.innerHTML = `
    <div class="modal-card">
      <p style="font-family:var(--font-display);font-size:16px;font-weight:500;margin:0 0 16px">Novo livro</p>

      <label for="l-titulo">Título</label>
      <input id="l-titulo" type="text" placeholder="Ex: O Cortiço">

      <label for="l-autor">Autor (opcional)</label>
      <input id="l-autor" type="text" placeholder="Ex: Aluísio Azevedo">

      <label for="l-paginas">Total de páginas (opcional)</label>
      <input id="l-paginas" type="number" min="0" placeholder="0">

      <label for="l-status">Status</label>
      <select id="l-status">
        <option value="quero_ler">Quero ler</option>
        <option value="lendo">Lendo</option>
        <option value="lido">Lido</option>
      </select>

      <label for="l-inicio">Início da leitura (opcional)</label>
      <input id="l-inicio" type="date">

      <label for="l-fim">Fim da leitura (opcional)</label>
      <input id="l-fim" type="date">

      <label>Avaliação (opcional)</label>
      ${pickerEstrelasHTML('l-avaliacao-picker')}

      <label for="l-capa" style="margin-top:12px">Capa (opcional)</label>
      <input id="l-capa" type="file" accept="image/*" style="margin-bottom:16px">

      <div class="botoes">
        <button id="btn-cancelar">Cancelar</button>
        <button id="btn-salvar" class="principal">Salvar</button>
      </div>
    </div>
  `;
  document.body.appendChild(fundo);

  const pegarAvaliacao = ligarPicker(fundo, 'l-avaliacao-picker');

  fundo.querySelector('#btn-cancelar').addEventListener('click', () => fundo.remove());
  fundo.addEventListener('click', (e) => { if (e.target === fundo) fundo.remove(); });

  fundo.querySelector('#btn-salvar').addEventListener('click', async () => {
    const titulo = fundo.querySelector('#l-titulo').value.trim();
    const autor = fundo.querySelector('#l-autor').value.trim();
    const paginasTotal = parseInt(fundo.querySelector('#l-paginas').value, 10) || 0;
    const status = fundo.querySelector('#l-status').value;
    const dataInicio = fundo.querySelector('#l-inicio').value;
    const dataFim = fundo.querySelector('#l-fim').value;
    const capaFile = fundo.querySelector('#l-capa').files[0] || null;

    if (!titulo) { alert('Dá um título pro livro antes de salvar.'); return; }

    const btn = fundo.querySelector('#btn-salvar');
    btn.textContent = capaFile ? 'Enviando capa...' : 'Salvando...';
    btn.disabled = true;

    try {
      await addLivro({ titulo, autor, paginasTotal, status, dataInicio, dataFim, avaliacao: pegarAvaliacao(), capaFile });
      fundo.remove();
      renderLeituras(container);
    } catch (erro) {
      btn.textContent = 'Salvar';
      btn.disabled = false;
      alert('Não deu pra salvar: ' + erro.message);
    }
  });
}

function abrirFormularioPagina(container, livro) {
  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.innerHTML = `
    <div class="modal-card">
      <p style="font-family:var(--font-display);font-size:16px;font-weight:500;margin:0 0 4px">Atualizar página</p>
      <p style="font-size:13px;color:var(--ink-muted);margin:0 0 16px">${livro.titulo}</p>
      <label for="pg-valor">Página atual</label>
      <input id="pg-valor" type="number" min="0" max="${livro.paginasTotal || 99999}" value="${livro.paginasLidas || 0}">
      <div class="botoes">
        <button id="btn-cancelar">Cancelar</button>
        <button id="btn-salvar" class="principal">Salvar</button>
      </div>
    </div>
  `;
  document.body.appendChild(fundo);
  fundo.querySelector('#btn-cancelar').addEventListener('click', () => fundo.remove());
  fundo.addEventListener('click', (e) => { if (e.target === fundo) fundo.remove(); });
  fundo.querySelector('#btn-salvar').addEventListener('click', async () => {
    const valor = parseInt(fundo.querySelector('#pg-valor').value, 10) || 0;
    const btn = fundo.querySelector('#btn-salvar');
    btn.textContent = 'Salvando...';
    btn.disabled = true;
    try {
      await atualizarPaginas(livro.id, valor, livro.paginasTotal);
      fundo.remove();
      renderLeituras(container);
    } catch (erro) {
      btn.textContent = 'Salvar';
      btn.disabled = false;
      alert('Não deu pra salvar: ' + erro.message);
    }
  });
}

function abrirSeletorCapa(container, livro) {
  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.innerHTML = `
    <div class="modal-card">
      <p style="font-family:var(--font-display);font-size:16px;font-weight:500;margin:0 0 4px">Capa do livro</p>
      <p style="font-size:13px;color:var(--ink-muted);margin:0 0 16px">${livro.titulo}</p>
      <input id="nova-capa" type="file" accept="image/*" style="margin-bottom:16px">
      <div class="botoes">
        <button id="btn-cancelar">Cancelar</button>
        ${livro.capaUrl ? '<button id="btn-remover" style="border-color:var(--red);color:var(--red)">Remover capa</button>' : ''}
        <button id="btn-salvar" class="principal">Enviar</button>
      </div>
    </div>
  `;
  document.body.appendChild(fundo);
  fundo.querySelector('#btn-cancelar').addEventListener('click', () => fundo.remove());
  fundo.addEventListener('click', (e) => { if (e.target === fundo) fundo.remove(); });

  fundo.querySelector('#btn-remover')?.addEventListener('click', async () => {
    await removerCapa(livro.id, livro.capaPath);
    fundo.remove();
    renderLeituras(container);
  });

  fundo.querySelector('#btn-salvar').addEventListener('click', async () => {
    const arquivo = fundo.querySelector('#nova-capa').files[0];
    if (!arquivo) { alert('Escolhe uma imagem antes de enviar.'); return; }
    const btn = fundo.querySelector('#btn-salvar');
    btn.textContent = 'Enviando...';
    btn.disabled = true;
    try {
      await enviarCapa(livro.id, arquivo);
      fundo.remove();
      renderLeituras(container);
    } catch (erro) {
      btn.textContent = 'Enviar';
      btn.disabled = false;
      alert('Não deu pra enviar: ' + erro.message);
    }
  });
}
