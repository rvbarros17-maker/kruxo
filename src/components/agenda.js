import {
  getAtividades,
  addAtividade,
  alternarAtividadeConcluida,
  excluirAtividade,
} from '../services/agendaService.js';
import { paraChaveData, segundaDaSemana } from '../services/habitosService.js';

const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

let modo = 'diario'; // 'mensal' | 'semanal' | 'diario'
let referencia = new Date();

function formatarDataLonga(date) {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function ordenarPorHorario(lista) {
  return [...lista].sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));
}

export async function renderAgenda(container) {
  container.innerHTML = '<p class="estado-carregando">Carregando sua agenda...</p>';

  let atividades;
  try {
    atividades = await getAtividades();
  } catch (erro) {
    container.innerHTML = `<p class="estado-carregando">Não deu pra carregar. ${erro.message}</p>`;
    return;
  }

  const porChave = {};
  atividades.forEach((a) => {
    porChave[a.data] = porChave[a.data] || [];
    porChave[a.data].push(a);
  });

  desenharTela(container, porChave);
}

function desenharTela(container, porChave) {
  container.innerHTML = `
    <div class="cabecalho-tela">
      <h2>Agenda</h2>
      <div class="seletor-modo">
        <button class="botao-modo ${modo === 'mensal' ? 'ativo' : ''}" data-modo="mensal">Mensal</button>
        <button class="botao-modo ${modo === 'semanal' ? 'ativo' : ''}" data-modo="semanal">Semanal</button>
        <button class="botao-modo ${modo === 'diario' ? 'ativo' : ''}" data-modo="diario">Diário</button>
      </div>
    </div>
    <div id="corpo-agenda"></div>
  `;

  container.querySelectorAll('.botao-modo').forEach((btn) => {
    btn.addEventListener('click', () => {
      modo = btn.dataset.modo;
      desenharTela(container, porChave);
    });
  });

  const corpo = container.querySelector('#corpo-agenda');
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
    const atividadesDoDia = porChave[chave] || [];
    const pendentes = atividadesDoDia.filter((a) => !a.concluida).length;
    const ehHoje = hoje.getDate() === dia && hoje.getMonth() === mes && hoje.getFullYear() === ano;
    celulas += `
      <div class="dia-celula ${ehHoje ? 'hoje' : ''}" data-dia="${dia}" style="cursor:pointer">
        <span class="dia-numero">${dia}</span>
        ${atividadesDoDia.length > 0 ? `<span class="chip-conta" style="border-left:2px solid ${pendentes > 0 ? 'var(--amber)' : 'var(--green)'}">${atividadesDoDia.length} ativ.</span>` : ''}
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
    renderAgenda(container);
  });
  corpo.querySelector('#mes-seguinte').addEventListener('click', () => {
    referencia = new Date(ano, mes + 1, 1);
    renderAgenda(container);
  });
  corpo.querySelectorAll('.dia-celula[data-dia]').forEach((el) => {
    el.addEventListener('click', () => {
      referencia = new Date(ano, mes, parseInt(el.dataset.dia, 10));
      modo = 'diario';
      renderAgenda(container);
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
    renderAgenda(container);
  });
  corpo.querySelector('#semana-seguinte').addEventListener('click', () => {
    referencia = new Date(segunda);
    referencia.setDate(referencia.getDate() + 7);
    renderAgenda(container);
  });
  corpo.querySelectorAll('[data-acao="ir-dia"]').forEach((el) => {
    el.addEventListener('click', () => {
      referencia = new Date(el.dataset.data + 'T00:00:00');
      modo = 'diario';
      renderAgenda(container);
    });
  });
}

function cartaoDiaSemana(data, indice, porChave) {
  const chave = paraChaveData(data);
  const atividadesDoDia = ordenarPorHorario(porChave[chave] || []);
  const label = data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return `
    <div style="background:var(--surface);border-radius:12px;padding:12px 16px;cursor:pointer" data-acao="ir-dia" data-data="${chave}">
      <p style="font-family:var(--font-display);font-size:13px;font-weight:600;margin:0 0 4px">${DIAS_SEMANA[indice]} · ${label}</p>
      ${atividadesDoDia.length === 0
        ? '<p class="legenda-progresso" style="margin:0">Nada marcado.</p>'
        : atividadesDoDia.map((a) => `<p style="font-size:13px;color:${a.concluida ? 'var(--ink-muted)' : 'var(--ink)'};margin:0 0 2px;text-decoration:${a.concluida ? 'line-through' : 'none'}">${a.horario ? a.horario + ' · ' : ''}${a.titulo}</p>`).join('')
      }
    </div>
  `;
}

// --- DIÁRIO (dia único) ---

function renderDiarioUnico(container, corpo, porChave) {
  const chave = paraChaveData(referencia);
  const atividadesDoDia = ordenarPorHorario(porChave[chave] || []);

  corpo.innerHTML = `
    <div class="calendario-header">
      <button class="btn-duplicar" id="dia-anterior">‹</button>
      <h2 style="text-transform:capitalize;min-width:220px">${formatarDataLonga(referencia)}</h2>
      <button class="btn-duplicar" id="dia-seguinte">›</button>
    </div>

    <div class="lista-contas" style="background:transparent;gap:8px;margin:16px 0">
      ${atividadesDoDia.length === 0
        ? '<p class="legenda-progresso">Nada marcado pra esse dia ainda.</p>'
        : atividadesDoDia.map((a) => linhaAtividade(a)).join('')
      }
    </div>

    <button class="btn-nova" id="btn-nova-atividade">+ Nova atividade</button>
  `;

  corpo.querySelector('#dia-anterior').addEventListener('click', () => {
    referencia = new Date(referencia);
    referencia.setDate(referencia.getDate() - 1);
    renderAgenda(container);
  });
  corpo.querySelector('#dia-seguinte').addEventListener('click', () => {
    referencia = new Date(referencia);
    referencia.setDate(referencia.getDate() + 1);
    renderAgenda(container);
  });
  corpo.querySelector('#btn-nova-atividade').addEventListener('click', () => {
    abrirFormularioAtividade(container, chave);
  });
  corpo.querySelectorAll('[data-acao="concluir-atividade"]').forEach((chk) => {
    chk.addEventListener('change', async (e) => {
      await alternarAtividadeConcluida(e.currentTarget.dataset.id, e.currentTarget.checked);
      renderAgenda(container);
    });
  });
  corpo.querySelectorAll('[data-acao="excluir-atividade"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      if (!confirm('Excluir essa atividade?')) return;
      await excluirAtividade(e.currentTarget.dataset.id);
      renderAgenda(container);
    });
  });
}

function linhaAtividade(atividade) {
  return `
    <div class="linha-conta-item">
      <input type="checkbox" class="check-habito" data-acao="concluir-atividade" data-id="${atividade.id}" ${atividade.concluida ? 'checked' : ''}>
      <div class="info-conta">
        <p class="nome-conta" style="${atividade.concluida ? 'text-decoration:line-through;color:var(--ink-muted)' : ''}">${atividade.titulo}</p>
        ${atividade.horario ? `<p class="meta-conta">${atividade.horario}</p>` : ''}
      </div>
      <button class="btn-remover-habito" data-acao="excluir-atividade" data-id="${atividade.id}" title="Excluir">×</button>
    </div>
  `;
}

function abrirFormularioAtividade(container, dataPadrao) {
  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.innerHTML = `
    <div class="modal-card">
      <p style="font-family:var(--font-display);font-size:16px;font-weight:500;margin:0 0 16px">Nova atividade</p>

      <label for="a-titulo">O que você precisa fazer?</label>
      <input id="a-titulo" type="text" placeholder="Ex: Ligar pro dentista">

      <label for="a-data">Data</label>
      <input id="a-data" type="date" value="${dataPadrao}">

      <label for="a-horario">Horário (opcional)</label>
      <input id="a-horario" type="time">

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
    const titulo = fundo.querySelector('#a-titulo').value.trim();
    const data = fundo.querySelector('#a-data').value;
    const horario = fundo.querySelector('#a-horario').value;

    if (!titulo || !data) {
      alert('Preenche o que fazer e a data antes de salvar.');
      return;
    }

    const btn = fundo.querySelector('#btn-salvar');
    btn.textContent = 'Salvando...';
    btn.disabled = true;

    try {
      await addAtividade({ titulo, data, horario });
      fundo.remove();
      referencia = new Date(`${data}T00:00:00`);
      renderAgenda(container);
    } catch (erro) {
      btn.textContent = 'Salvar';
      btn.disabled = false;
      alert('Não deu pra salvar: ' + erro.message);
    }
  });
}
