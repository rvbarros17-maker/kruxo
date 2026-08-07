import { getEntradas, addEntrada, excluirEntrada } from '../services/diarioService.js';

const HUMORES = [
  { id: '', label: 'Sem humor registrado' },
  { id: '😊', label: '😊 Bom' },
  { id: '😐', label: '😐 Neutro' },
  { id: '😞', label: '😞 Difícil' },
];

function formatarData(chave) {
  const [ano, mes, dia] = chave.split('-');
  return `${dia}/${mes}/${ano}`;
}

export async function renderDiario(container) {
  container.innerHTML = '<p class="estado-carregando">Carregando seu diário...</p>';

  let entradas;
  try {
    entradas = await getEntradas();
  } catch (erro) {
    container.innerHTML = `<p class="estado-carregando">Não deu pra carregar. ${erro.message}</p>`;
    return;
  }

  desenharTela(container, entradas);
}

function desenharTela(container, entradas) {
  container.innerHTML = `
    <div class="cabecalho-tela">
      <h2>Diário</h2>
      <button class="btn-nova" id="btn-nova-entrada">+ Nova entrada</button>
    </div>

    <div class="lista-contas" style="background:transparent;gap:8px">
      ${entradas.length === 0
        ? '<p class="legenda-progresso">Nenhuma entrada ainda. Que tal escrever sobre o seu dia?</p>'
        : entradas.map((e) => cartaoEntrada(e)).join('')
      }
    </div>
  `;

  container.querySelector('#btn-nova-entrada').addEventListener('click', () => {
    abrirFormularioEntrada(container);
  });

  container.querySelectorAll('[data-acao="excluir-entrada"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      if (!confirm('Excluir essa entrada do diário?')) return;
      await excluirEntrada(e.currentTarget.dataset.id);
      renderDiario(container);
    });
  });
}

function cartaoEntrada(entrada) {
  return `
    <div style="background:var(--surface);border-radius:12px;padding:14px 16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <p style="font-family:var(--font-display);font-size:13px;font-weight:600;margin:0">
          ${formatarData(entrada.data)} ${entrada.humor || ''}
        </p>
        <button class="btn-remover-habito" data-acao="excluir-entrada" data-id="${entrada.id}" title="Excluir">×</button>
      </div>
      <p style="font-size:14px;color:var(--ink);margin:0;white-space:pre-wrap">${entrada.texto}</p>
    </div>
  `;
}

function abrirFormularioEntrada(container) {
  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.innerHTML = `
    <div class="modal-card">
      <p style="font-family:var(--font-display);font-size:16px;font-weight:500;margin:0 0 16px">Nova entrada</p>

      <label for="e-data">Data</label>
      <input id="e-data" type="date" value="${new Date().toISOString().slice(0, 10)}">

      <label for="e-humor">Humor</label>
      <select id="e-humor">
        ${HUMORES.map((h) => `<option value="${h.id}">${h.label}</option>`).join('')}
      </select>

      <label for="e-texto">Como foi o seu dia?</label>
      <textarea id="e-texto" rows="5" style="width:100%;border:1px solid var(--border);border-radius:8px;padding:8px 10px;font-family:var(--font-body);font-size:14px;margin-bottom:16px;resize:vertical"></textarea>

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
    const data = fundo.querySelector('#e-data').value;
    const humor = fundo.querySelector('#e-humor').value;
    const texto = fundo.querySelector('#e-texto').value.trim();

    if (!data || !texto) {
      alert('Preenche a data e o texto antes de salvar.');
      return;
    }

    const btn = fundo.querySelector('#btn-salvar');
    btn.textContent = 'Salvando...';
    btn.disabled = true;

    try {
      await addEntrada({ data, texto, humor });
      fundo.remove();
      renderDiario(container);
    } catch (erro) {
      btn.textContent = 'Salvar';
      btn.disabled = false;
      alert('Não deu pra salvar: ' + erro.message);
    }
  });
}
