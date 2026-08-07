import { getEntradas, addEntrada, excluirEntrada } from '../services/diarioService.js';
import { paraChaveData, segundaDaSemana } from '../services/habitosService.js';

const HUMORES = [
  { id: '', label: 'Sem humor registrado' },
  { id: '😊', label: '😊 Bom' },
  { id: '😐', label: '😐 Neutro' },
  { id: '😞', label: '😞 Difícil' },
];
const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

let modo = 'semanal'; // 'mensal' | 'semanal' | 'diario'
let referencia = new Date(); // dia/semana/mês de referência, conforme o modo

function formatarDataLonga(date) {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
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

  const porChave = {};
  entradas.forEach((e) => {
    porChave[e.data] = porChave[e.data] || [];
    porChave[e.data].push(e);
  });

  desenharTela(container, porChave);
}

function desenharTela(container, porChave) {
  container.innerHTML = `
    <div class="cabecalho-tela">
      <h2>Diário</h2>
      <div class="seletor-modo">
        <button class="botao-modo ${modo === 'mensal' ? 'ativo' : ''}" data-modo="mensal">Mensal</button>
        <button class="botao-modo ${modo === 'semanal' ? 'ativo' : ''}" data-modo="semanal">Semanal</button>
        <button class="botao-modo ${modo === 'diario' ? 'ativo' : ''}" data-modo="diario">Diário</button>
      </div>
    </div>
    <div id="corpo-diario"></div>
  `;

  container.querySelectorAll('.botao-modo').forEach((btn) => {
    btn.addEventListener('click', () => {
      modo = btn.dataset.modo;
      desenharTela(container, porChave);
    });
  });

  const corpo = container.querySelector('#corpo-diario');
  if (modo === 'mensal') renderMensal(container, corpo, porChave);
  else if (modo === 'semanal') renderSemanal(container, corpo, porChave);
  else renderDiarioUnico(container, corpo, porChave);
}

// --- MENSAL ---

function renderMensal(container, corpo, porChave) {
  const ano = referencia.getFullYear();
  const mes = referencia.getMonth();
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const hoje = new Date();
  const nomeMes = referencia.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  let celulas = '';
  for (let i = 0; i < primeiroDiaSemana; i++) celulas += '<div class="dia-celula vazia"></div>';
  for (let dia = 1; dia <= diasNoMes; dia++) {
    const dataDia = new Date(ano, mes, dia);
    const chave = paraChaveData(dataDia);
    const entradasDoDia = porChave[chave] || [];
    const ehHoje = hoje.getDate() === dia && hoje.getMonth() === mes && hoje.getFullYear() === ano;
    celulas += `
      <div class="dia-celula ${ehHoje ? 'hoje' : ''}" data-dia="${dia}" style="cursor:pointer">
        <span class="dia-numero">${dia}</span>
        ${entradasDoDia.length > 0 ? `<span class="chip-conta" style="border-left:2px solid var(--green)">${entradasDoDia.length} registro${entradasDoDia.length > 1 ? 's' : ''}</span>` : ''}
      </div>
    `;
  }

  corpo.innerHTML = `
    <div class="calendario-header">
      <button class="btn-duplicar" id="mes-anterior">‹</button>
      <h2 style="text-transform:capitalize">${nomeMes}</h2>
      <button class="btn-duplicar" id="mes-seguinte">›</button>
    </div>
    <div class="calendario-grid">
      ${['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => `<div class="dia-semana-nome">${d}</div>`).join('')}
      ${celulas}
    </div>
  `;

  corpo.querySelector('#mes-anterior').addEventListener('click', () => {
    referencia = new Date(ano, mes - 1, 1);
    renderDiario(container);
  });
  corpo.querySelector('#mes-seguinte').addEventListener('click', () => {
    referencia = new Date(ano, mes + 1, 1);
    renderDiario(container);
  });
  corpo.querySelectorAll('.dia-celula[data-dia]').forEach((el) => {
    el.addEventListener('click', () => {
      referencia = new Date(ano, mes, parseInt(el.dataset.dia, 10));
      modo = 'diario';
      renderDiario(container);
    });
  });
}

// --- SEMANAL ---

function renderSemanal(container, corpo, porChave) {
  const segunda = segundaDaSemana(referencia);
  const dias = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(segunda);
    d.setDate(d.getDate() + i);
    dias.push(d);
  }
  const inicio = dias[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const fim = dias[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  corpo.innerHTML = `
    <div class="calendario-header">
      <button class="btn-duplicar" id="semana-anterior">‹</button>
      <h2>${inicio} a ${fim}</h2>
      <button class="btn-duplicar" id="semana-seguinte">›</button>
    </div>
    <div class="lista-contas" style="background:transparent;gap:8px;margin-top:16px">
      ${dias.map((d, i) => cartaoDiaSemana(d, i, porChave)).join('')}
    </div>
  `;

  corpo.querySelector('#semana-anterior').addEventListener('click', () => {
    referencia = new Date(segunda);
    referencia.setDate(referencia.getDate() - 7);
    renderDiario(container);
  });
  corpo.querySelector('#semana-seguinte').addEventListener('click', () => {
    referencia = new Date(segunda);
    referencia.setDate(referencia.getDate() + 7);
    renderDiario(container);
  });
  corpo.querySelectorAll('[data-acao="ir-dia"]').forEach((el) => {
    el.addEventListener('click', () => {
      referencia = new Date(el.dataset.data + 'T00:00:00');
      modo = 'diario';
      renderDiario(container);
    });
  });
}

function cartaoDiaSemana(data, indice, porChave) {
  const chave = paraChaveData(data);
  const entradasDoDia = porChave[chave] || [];
  const label = data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return `
    <div style="background:var(--surface);border-radius:12px;padding:12px 16px;cursor:pointer" data-acao="ir-dia" data-data="${chave}">
      <p style="font-family:var(--font-display);font-size:13px;font-weight:600;margin:0 0 4px">${DIAS_SEMANA[indice]} · ${label}</p>
      ${entradasDoDia.length === 0
        ? '<p class="legenda-progresso" style="margin:0">Sem registro ainda.</p>'
        : entradasDoDia.map((e) => `<p style="font-size:13px;color:var(--ink-muted);margin:0 0 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.humor || ''} ${e.texto}</p>`).join('')
      }
    </div>
  `;
}

// --- DIÁRIO (dia único) ---

function renderDiarioUnico(container, corpo, porChave) {
  const chave = paraChaveData(referencia);
  const entradasDoDia = porChave[chave] || [];

  corpo.innerHTML = `
    <div class="calendario-header">
      <button class="btn-duplicar" id="dia-anterior">‹</button>
      <h2 style="text-transform:capitalize;min-width:220px">${formatarDataLonga(referencia)}</h2>
      <button class="btn-duplicar" id="dia-seguinte">›</button>
    </div>

    <div class="lista-contas" style="background:transparent;gap:8px;margin:16px 0">
      ${entradasDoDia.length === 0
        ? '<p class="legenda-progresso">Nenhuma entrada ainda hoje. Adicione quantas quiser.</p>'
        : entradasDoDia.map((e) => cartaoEntrada(e)).join('')
      }
    </div>

    <button class="btn-nova" id="btn-nova-entrada">+ Adicionar página</button>
  `;

  corpo.querySelector('#dia-anterior').addEventListener('click', () => {
    referencia = new Date(referencia);
    referencia.setDate(referencia.getDate() - 1);
    renderDiario(container);
  });
  corpo.querySelector('#dia-seguinte').addEventListener('click', () => {
    referencia = new Date(referencia);
    referencia.setDate(referencia.getDate() + 1);
    renderDiario(container);
  });
  corpo.querySelector('#btn-nova-entrada').addEventListener('click', () => {
    abrirFormularioEntrada(container, chave);
  });
  corpo.querySelectorAll('[data-acao="excluir-entrada"]').forEach((btn) => {
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
        <p style="font-family:var(--font-display);font-size:13px;font-weight:600;margin:0">${entrada.humor || 'Registro'}</p>
        <button class="btn-remover-habito" data-acao="excluir-entrada" data-id="${entrada.id}" title="Excluir">×</button>
      </div>
      <p style="font-size:14px;color:var(--ink);margin:0;white-space:pre-wrap">${entrada.texto}</p>
    </div>
  `;
}

function abrirFormularioEntrada(container, dataPadrao) {
  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.innerHTML = `
    <div class="modal-card">
      <p style="font-family:var(--font-display);font-size:16px;font-weight:500;margin:0 0 16px">Nova entrada</p>

      <label for="e-data">Data</label>
      <input id="e-data" type="date" value="${dataPadrao}">

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
      referencia = new Date(`${data}T00:00:00`);
      renderDiario(container);
    } catch (erro) {
      btn.textContent = 'Salvar';
      btn.disabled = false;
      alert('Não deu pra salvar: ' + erro.message);
    }
  });
}
