import {
  getMetas,
  addMeta,
  atualizarMeta,
  atualizarProgresso,
  alternarConcluida,
  excluirMeta,
} from '../services/metasService.js';

function formatarData(timestamp) {
  if (!timestamp) return null;
  const data = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return data.toLocaleDateString('pt-BR');
}

function paraInputDate(timestamp) {
  if (!timestamp) return '';
  const data = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export async function renderMetas(container) {
  container.innerHTML = '<p class="estado-carregando">Carregando suas metas...</p>';

  let metas;
  try {
    metas = await getMetas();
  } catch (erro) {
    container.innerHTML = `<p class="estado-carregando">Não deu pra carregar. ${erro.message}</p>`;
    return;
  }

  desenharTela(container, metas);
}

function desenharTela(container, metas) {
  const emAndamento = metas.filter((m) => !m.concluida);
  const concluidas = metas.filter((m) => m.concluida);

  container.innerHTML = `
    <div class="cabecalho-tela">
      <h2>Metas</h2>
      <button class="btn-nova" id="btn-nova-meta">+ Nova meta</button>
    </div>

    <div class="lista-contas" style="background:transparent;gap:8px">
      ${emAndamento.length === 0
        ? '<p class="legenda-progresso">Nenhuma meta em andamento.</p>'
        : emAndamento.map((m) => cartaoMeta(m)).join('')
      }
    </div>

    ${concluidas.length > 0 ? `
      <p class="eyebrow" style="margin:24px 0 8px">Concluídas</p>
      <div class="lista-contas" style="background:transparent;gap:8px">
        ${concluidas.map((m) => cartaoMeta(m)).join('')}
      </div>
    ` : ''}
  `;

  container.querySelector('#btn-nova-meta').addEventListener('click', () => {
    abrirFormularioMeta(container);
  });

  container.querySelectorAll('[data-acao="editar-meta"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const meta = metas.find((m) => m.id === e.currentTarget.dataset.id);
      abrirFormularioMeta(container, meta);
    });
  });

  container.querySelectorAll('[data-acao="progresso"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const meta = metas.find((m) => m.id === e.currentTarget.dataset.id);
      abrirFormularioProgresso(container, meta);
    });
  });

  container.querySelectorAll('[data-acao="concluir"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const meta = metas.find((m) => m.id === e.currentTarget.dataset.id);
      e.currentTarget.textContent = '...';
      await alternarConcluida(meta.id, !meta.concluida);
      renderMetas(container);
    });
  });

  container.querySelectorAll('[data-acao="excluir-meta"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      if (!confirm('Excluir essa meta?')) return;
      await excluirMeta(e.currentTarget.dataset.id);
      renderMetas(container);
    });
  });
}

function cartaoMeta(meta) {
  const prazo = formatarData(meta.prazo);
  return `
    <div style="background:var(--surface);border-radius:12px;padding:14px 16px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
        <div style="flex:1;min-width:0">
          <p style="font-family:var(--font-display);font-size:14px;font-weight:600;margin:0 0 2px;${meta.concluida ? 'text-decoration:line-through;color:var(--ink-muted)' : ''}">
            ${meta.titulo}
          </p>
          ${meta.descricao ? `<p style="font-size:13px;color:var(--ink-muted);margin:0 0 8px">${meta.descricao}</p>` : ''}
        </div>
        <button class="btn-remover-habito" data-acao="excluir-meta" data-id="${meta.id}" title="Excluir">×</button>
      </div>

      <div class="progresso-orcamento" style="margin:8px 0 4px">
        <div style="width:${meta.progresso}%;background:${meta.concluida ? 'var(--green)' : 'var(--amber)'}"></div>
      </div>
      <p class="legenda-progresso" style="margin:0 0 10px">
        ${meta.progresso}% ${prazo ? `· prazo ${prazo}` : ''}
      </p>

      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${!meta.concluida ? `<button class="btn-nova" style="padding:6px 10px;font-size:12px" data-acao="progresso" data-id="${meta.id}">Atualizar progresso</button>` : ''}
        <button class="btn-duplicar" style="width:auto;padding:0 10px;font-size:12px" data-acao="editar-meta" data-id="${meta.id}">Editar</button>
        <button class="btn-duplicar" style="width:auto;padding:0 10px;font-size:12px" data-acao="concluir" data-id="${meta.id}">
          ${meta.concluida ? 'Reabrir' : 'Concluir'}
        </button>
      </div>
    </div>
  `;
}

function abrirFormularioMeta(container, metaExistente = null) {
  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.innerHTML = `
    <div class="modal-card">
      <p style="font-family:var(--font-display);font-size:16px;font-weight:500;margin:0 0 16px">${metaExistente ? 'Editar meta' : 'Nova meta'}</p>

      <label for="m-titulo">Título</label>
      <input id="m-titulo" type="text" placeholder="Ex: Ler 12 livros esse ano" value="${metaExistente?.titulo || ''}">

      <label for="m-descricao">Descrição (opcional)</label>
      <input id="m-descricao" type="text" placeholder="Detalhes da meta" value="${metaExistente?.descricao || ''}">

      <label for="m-prazo">Prazo (opcional)</label>
      <input id="m-prazo" type="date" value="${paraInputDate(metaExistente?.prazo)}">

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
    const titulo = fundo.querySelector('#m-titulo').value.trim();
    const descricao = fundo.querySelector('#m-descricao').value.trim();
    const prazoStr = fundo.querySelector('#m-prazo').value;

    if (!titulo) {
      alert('Dá um título pra meta antes de salvar.');
      return;
    }

    const btn = fundo.querySelector('#btn-salvar');
    btn.textContent = 'Salvando...';
    btn.disabled = true;

    try {
      const prazo = prazoStr ? new Date(`${prazoStr}T00:00:00`) : null;
      if (metaExistente) {
        await atualizarMeta(metaExistente.id, { titulo, descricao, prazo });
      } else {
        await addMeta({ titulo, descricao, prazo });
      }
      fundo.remove();
      renderMetas(container);
    } catch (erro) {
      btn.textContent = 'Salvar';
      btn.disabled = false;
      alert('Não deu pra salvar: ' + erro.message);
    }
  });
}

function abrirFormularioProgresso(container, meta) {
  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.innerHTML = `
    <div class="modal-card">
      <p style="font-family:var(--font-display);font-size:16px;font-weight:500;margin:0 0 4px">Atualizar progresso</p>
      <p style="font-size:13px;color:var(--ink-muted);margin:0 0 16px">${meta.titulo}</p>

      <label for="p-valor">Progresso (%)</label>
      <input id="p-valor" type="number" min="0" max="100" value="${meta.progresso}">

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
    const valor = Math.min(100, Math.max(0, parseInt(fundo.querySelector('#p-valor').value, 10) || 0));

    const btn = fundo.querySelector('#btn-salvar');
    btn.textContent = 'Salvando...';
    btn.disabled = true;

    try {
      await atualizarProgresso(meta.id, valor);
      fundo.remove();
      renderMetas(container);
    } catch (erro) {
      btn.textContent = 'Salvar';
      btn.disabled = false;
      alert('Não deu pra salvar: ' + erro.message);
    }
  });
}
