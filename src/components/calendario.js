import { getContasDoMes, atualizarStatusConta, mesAtualRef } from '../services/financeService.js';
import { getConsultas, alternarConsultaConcluida } from '../services/saudeService.js';
import { getMetas, alternarConcluida as alternarMetaConcluida } from '../services/metasService.js';
import {
  getAtividades,
  addAtividade,
  atualizarAtividade,
  alternarAtividadeConcluida,
  excluirAtividade,
} from '../services/agendaService.js';
import { paraChaveData, segundaDaSemana } from '../services/habitosService.js';
import { nomeCategoria } from '../constants/categorias.js';

const DIAS_SEMANA_GRADE = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DIAS_SEMANA_NOMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

const COR_TIPO = {
  despesa: 'var(--red)',
  receita: 'var(--green)',
  consulta: 'var(--blue)',
  meta: 'var(--purple)',
  atividade: 'var(--teal)',
};

let modo = 'mensal'; // 'mensal' | 'semanal' | 'diario'
let referencia = new Date();

function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function paraDate(valor) {
  if (!valor) return null;
  if (valor.toDate) return valor.toDate();
  if (typeof valor === 'string') {
    const [ano, mes, dia] = valor.split('-').map(Number);
    return new Date(ano, mes - 1, dia);
  }
  return new Date(valor);
}

function formatarDataLonga(date) {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export async function renderCalendario(container) {
  container.innerHTML = '<p class="estado-carregando">Carregando o calendário...</p>';

  // busca as contas do mês de referência e dos meses vizinhos, pra cobrir
  // semanas/dias que caem em meses diferentes
  const meses = [-1, 0, 1].map((offset) => mesAtualRef(new Date(referencia.getFullYear(), referencia.getMonth() + offset, 1)));

  let contasPorMes, consultas, metas, atividades;
  try {
    [contasPorMes, consultas, metas, atividades] = await Promise.all([
      Promise.all(meses.map((m) => getContasDoMes(m))),
      getConsultas(),
      getMetas(),
      getAtividades(),
    ]);
  } catch (erro) {
    container.innerHTML = `<p class="estado-carregando">Não deu pra carregar. ${erro.message}</p>`;
    return;
  }

  const contas = contasPorMes.flat();
  const eventos = montarEventos(contas, consultas, metas, atividades);
  desenharTela(container, eventos);
}

function montarEventos(contas, consultas, metas, atividades) {
  const eventos = [];

  contas.forEach((c) => {
    if (!c.dataVencimento) return;
    eventos.push({
      id: c.id,
      dataObj: paraDate(c.dataVencimento),
      nome: c.nome,
      tipo: c.natureza,
      concluido: c.status === 'pago',
      origem: 'conta',
      detalhe: `${nomeCategoria(c.categoriaId, c.natureza)} · R$ ${formatarMoeda(c.valor)}`,
    });
  });

  consultas.forEach((c) => {
    const data = paraDate(c.data);
    if (!data) return;
    eventos.push({
      id: c.id,
      dataObj: data,
      nome: c.titulo,
      tipo: 'consulta',
      concluido: c.concluida,
      origem: 'consulta',
      detalhe: c.local || 'Consulta',
    });
  });

  metas.forEach((m) => {
    if (!m.prazo) return;
    const data = paraDate(m.prazo);
    if (!data) return;
    eventos.push({
      id: m.id,
      dataObj: data,
      nome: m.titulo,
      tipo: 'meta',
      concluido: m.concluida,
      origem: 'meta',
      detalhe: `Prazo da meta · ${m.progresso}%`,
    });
  });

  atividades.forEach((a) => {
    const data = paraDate(a.data);
    if (!data) return;
    eventos.push({
      id: a.id,
      dataObj: data,
      nome: a.titulo,
      tipo: 'atividade',
      concluido: a.concluida,
      origem: 'atividade',
      detalhe: a.horario ? `Atividade · ${a.horario}` : 'Atividade',
      horario: a.horario || '',
    });
  });

  return eventos;
}

function mesmodia(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

function desenharTela(container, eventos) {
  container.innerHTML = `
    <div class="cabecalho-tela">
      <h2>Calendário</h2>
      <div class="seletor-modo">
        <button class="botao-modo ${modo === 'mensal' ? 'ativo' : ''}" data-modo="mensal">Mensal</button>
        <button class="botao-modo ${modo === 'semanal' ? 'ativo' : ''}" data-modo="semanal">Semanal</button>
        <button class="botao-modo ${modo === 'diario' ? 'ativo' : ''}" data-modo="diario">Diário</button>
      </div>
    </div>
    <div id="corpo-calendario"></div>
  `;

  container.querySelectorAll('.botao-modo').forEach((btn) => {
    btn.addEventListener('click', () => {
      modo = btn.dataset.modo;
      desenharTela(container, eventos);
    });
  });

  const corpo = container.querySelector('#corpo-calendario');
  if (modo === 'mensal') renderMensal(container, corpo, eventos);
  else if (modo === 'semanal') renderSemanal(container, corpo, eventos);
  else renderDiarioUnico(container, corpo, eventos);
}

// --- MENSAL ---

function renderMensal(container, corpo, eventos) {
  const ano = referencia.getFullYear();
  const mes = referencia.getMonth();
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const hoje = new Date();
  const nomeMes = referencia.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const eventosPorDia = {};
  eventos.forEach((ev) => {
    if (ev.dataObj.getMonth() !== mes || ev.dataObj.getFullYear() !== ano) return;
    const dia = ev.dataObj.getDate();
    eventosPorDia[dia] = eventosPorDia[dia] || [];
    eventosPorDia[dia].push(ev);
  });

  let celulas = '';
  for (let i = 0; i < primeiroDiaSemana; i++) celulas += '<div class="dia-celula vazia"></div>';
  for (let dia = 1; dia <= diasNoMes; dia++) {
    const eventosDoDia = eventosPorDia[dia] || [];
    const ehHoje = hoje.getDate() === dia && hoje.getMonth() === mes && hoje.getFullYear() === ano;
    celulas += `
      <div class="dia-celula ${ehHoje ? 'hoje' : ''}">
        <span class="dia-numero" data-acao="abrir-dia" data-dia="${dia}" style="cursor:pointer;text-decoration:underline;text-decoration-style:dotted">${dia}</span>
        ${eventosDoDia.map((ev) => chipEvento(ev)).join('')}
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
      ${DIAS_SEMANA_GRADE.map((d) => `<div class="dia-semana-nome">${d}</div>`).join('')}
      ${celulas}
    </div>
    ${legenda()}
  `;

  corpo.querySelector('#mes-anterior').addEventListener('click', () => {
    referencia = new Date(ano, mes - 1, 1);
    renderCalendario(container);
  });
  corpo.querySelector('#mes-seguinte').addEventListener('click', () => {
    referencia = new Date(ano, mes + 1, 1);
    renderCalendario(container);
  });
  corpo.querySelectorAll('[data-acao="abrir-dia"]').forEach((el) => {
    el.addEventListener('click', () => {
      referencia = new Date(ano, mes, parseInt(el.dataset.dia, 10));
      abrirDetalheDia(container, referencia, eventosPorDia[parseInt(el.dataset.dia, 10)] || []);
    });
  });
  ligarToggleEventos(corpo, container);
}

// --- SEMANAL ---

function renderSemanal(container, corpo, eventos) {
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
    <div class="lista-contas" style="background:transparent;gap:8px;margin:16px 0">
      ${dias.map((d, i) => cartaoDiaSemana(d, i, eventos)).join('')}
    </div>
    ${legenda()}
  `;

  corpo.querySelector('#semana-anterior').addEventListener('click', () => {
    referencia = new Date(segunda);
    referencia.setDate(referencia.getDate() - 7);
    renderCalendario(container);
  });
  corpo.querySelector('#semana-seguinte').addEventListener('click', () => {
    referencia = new Date(segunda);
    referencia.setDate(referencia.getDate() + 7);
    renderCalendario(container);
  });
  corpo.querySelectorAll('[data-acao="ir-dia"]').forEach((el) => {
    el.addEventListener('click', () => {
      referencia = new Date(el.dataset.data + 'T00:00:00');
      modo = 'diario';
      renderCalendario(container);
    });
  });
  ligarToggleEventos(corpo, container);
}

function cartaoDiaSemana(data, indice, eventos) {
  const eventosDoDia = eventos.filter((ev) => mesmodia(ev.dataObj, data));
  const label = data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return `
    <div style="background:var(--surface);border-radius:12px;padding:12px 16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <p style="font-family:var(--font-display);font-size:13px;font-weight:600;margin:0;cursor:pointer" data-acao="ir-dia" data-data="${paraChaveData(data)}">${DIAS_SEMANA_NOMES[indice]} · ${label}</p>
      </div>
      ${eventosDoDia.length === 0
        ? '<p class="legenda-progresso" style="margin:0">Nada marcado.</p>'
        : `<div style="display:flex;flex-direction:column;gap:4px">${eventosDoDia.map((ev) => linhaEventoCompacta(ev)).join('')}</div>`
      }
    </div>
  `;
}

function linhaEventoCompacta(ev) {
  const cor = COR_TIPO[ev.tipo] || 'var(--ink-muted)';
  return `
    <button class="chip-conta" data-acao="toggle-evento" data-id="${ev.id}" data-origem="${ev.origem}" data-concluido="${ev.concluido}"
      style="border-left:2px solid ${cor}; opacity:${ev.concluido ? 0.5 : 1}; text-decoration:${ev.concluido ? 'line-through' : 'none'}; width:100%; text-align:left; font-size:12px">
      ${ev.nome}
    </button>
  `;
}

// --- DIÁRIO (dia único) ---

function renderDiarioUnico(container, corpo, eventos) {
  const eventosDoDia = eventos.filter((ev) => mesmodia(ev.dataObj, referencia));

  corpo.innerHTML = `
    <div class="calendario-header">
      <button class="btn-duplicar" id="dia-anterior">‹</button>
      <h2 style="text-transform:capitalize;min-width:220px">${formatarDataLonga(referencia)}</h2>
      <button class="btn-duplicar" id="dia-seguinte">›</button>
    </div>

    <div class="lista-contas" style="background:transparent;gap:6px;margin:16px 0">
      ${eventosDoDia.length === 0
        ? '<p class="legenda-progresso">Nada marcado pra esse dia ainda.</p>'
        : eventosDoDia.map((ev) => linhaDetalheEvento(ev)).join('')
      }
    </div>

    <button class="btn-nova" id="btn-nova-atividade">+ Nova atividade</button>
    ${legenda()}
  `;

  corpo.querySelector('#dia-anterior').addEventListener('click', () => {
    referencia = new Date(referencia);
    referencia.setDate(referencia.getDate() - 1);
    renderCalendario(container);
  });
  corpo.querySelector('#dia-seguinte').addEventListener('click', () => {
    referencia = new Date(referencia);
    referencia.setDate(referencia.getDate() + 1);
    renderCalendario(container);
  });
  corpo.querySelector('#btn-nova-atividade').addEventListener('click', () => {
    abrirFormularioAtividade(container, null, paraChaveData(referencia));
  });
  ligarAcoesDetalhe(corpo, container);
}

// --- Compartilhados ---

function legenda() {
  return `
    <p class="legenda-progresso" style="margin-top:16px">
      <span style="color:var(--red)">●</span> Despesa &nbsp;
      <span style="color:var(--green)">●</span> Receita &nbsp;
      <span style="color:var(--blue)">●</span> Consulta &nbsp;
      <span style="color:var(--purple)">●</span> Meta &nbsp;
      <span style="color:var(--teal)">●</span> Atividade &nbsp;
      · clique num item pra marcar como concluído
    </p>
  `;
}

function chipEvento(ev) {
  const cor = COR_TIPO[ev.tipo] || 'var(--ink-muted)';
  return `
    <button class="chip-conta" data-acao="toggle-evento" data-id="${ev.id}" data-origem="${ev.origem}" data-concluido="${ev.concluido}"
      style="border-left:2px solid ${cor}; opacity:${ev.concluido ? 0.5 : 1}; text-decoration:${ev.concluido ? 'line-through' : 'none'}"
      title="${ev.detalhe}">
      ${ev.nome}
    </button>
  `;
}

function ligarToggleEventos(escopo, container) {
  escopo.querySelectorAll('[data-acao="toggle-evento"]').forEach((chip) => {
    chip.addEventListener('click', async (e) => {
      const { id, origem, concluido } = e.currentTarget.dataset;
      const novo = concluido !== 'true';
      await aplicarToggle(origem, id, novo);
      renderCalendario(container);
    });
  });
}

async function aplicarToggle(origem, id, novo) {
  if (origem === 'conta') await atualizarStatusConta(id, novo ? 'pago' : 'pendente');
  else if (origem === 'consulta') await alternarConsultaConcluida(id, novo);
  else if (origem === 'meta') await alternarMetaConcluida(id, novo);
  else if (origem === 'atividade') await alternarAtividadeConcluida(id, novo);
}

function abrirDetalheDia(container, dataDia, eventosDoDia) {
  const chaveDia = paraChaveData(dataDia);
  const label = formatarDataLonga(dataDia);

  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.innerHTML = `
    <div class="modal-card" style="max-width:420px">
      <p style="font-family:var(--font-display);font-size:16px;font-weight:500;margin:0 0 16px;text-transform:capitalize">${label}</p>

      <div class="lista-contas" style="background:transparent;gap:6px;margin-bottom:16px">
        ${eventosDoDia.length === 0
          ? '<p class="legenda-progresso">Nada marcado nesse dia.</p>'
          : eventosDoDia.map((ev) => linhaDetalheEvento(ev)).join('')
        }
      </div>

      <button class="btn-nova" id="btn-nova-atividade-dia" style="width:100%;margin-bottom:12px">+ Nova atividade</button>
      <button id="btn-fechar-detalhe" style="width:100%">Fechar</button>
    </div>
  `;
  document.body.appendChild(fundo);

  fundo.querySelector('#btn-fechar-detalhe').addEventListener('click', () => fundo.remove());
  fundo.addEventListener('click', (e) => { if (e.target === fundo) fundo.remove(); });

  ligarAcoesDetalhe(fundo, container, fundo);

  fundo.querySelector('#btn-nova-atividade-dia').addEventListener('click', () => {
    abrirFormularioAtividade(container, fundo, chaveDia);
  });
}

function linhaDetalheEvento(ev) {
  const cor = COR_TIPO[ev.tipo] || 'var(--ink-muted)';
  const ehAtividade = ev.origem === 'atividade';
  return `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
      <input type="checkbox" class="check-habito" data-acao="toggle-evento" data-id="${ev.id}" data-origem="${ev.origem}" ${ev.concluido ? 'checked' : ''}>
      <div style="flex:1;min-width:0;border-left:2px solid ${cor};padding-left:8px">
        <p style="font-size:13px;font-weight:500;margin:0;${ev.concluido ? 'text-decoration:line-through;color:var(--ink-muted)' : ''}">${ev.nome}</p>
        <p class="meta-conta" style="margin:0">${ev.detalhe}</p>
      </div>
      ${ehAtividade ? `
        <button class="btn-duplicar" data-acao="editar-atividade" data-id="${ev.id}" data-titulo="${ev.nome}" data-horario="${ev.horario || ''}" title="Editar">✎</button>
        <button class="btn-remover-habito" data-acao="excluir-atividade" data-id="${ev.id}" title="Excluir">×</button>
      ` : ''}
    </div>
  `;
}

function ligarAcoesDetalhe(escopo, container, modalPai = null) {
  escopo.querySelectorAll('[data-acao="toggle-evento"]').forEach((chk) => {
    chk.addEventListener('change', async (e) => {
      const { id, origem } = e.currentTarget.dataset;
      await aplicarToggle(origem, id, e.currentTarget.checked);
      if (modalPai) modalPai.remove();
      renderCalendario(container);
    });
  });

  escopo.querySelectorAll('[data-acao="editar-atividade"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const { id, titulo, horario } = e.currentTarget.dataset;
      abrirFormularioAtividade(container, modalPai, null, { id, titulo, horario });
    });
  });

  escopo.querySelectorAll('[data-acao="excluir-atividade"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      if (!confirm('Excluir essa atividade?')) return;
      await excluirAtividade(e.currentTarget.dataset.id);
      if (modalPai) modalPai.remove();
      renderCalendario(container);
    });
  });
}

function abrirFormularioAtividade(container, modalPai, chaveDia, atividadeExistente = null) {
  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.innerHTML = `
    <div class="modal-card">
      <p style="font-family:var(--font-display);font-size:16px;font-weight:500;margin:0 0 16px">${atividadeExistente ? 'Editar atividade' : 'Nova atividade'}</p>

      <label for="a-titulo">O que você precisa fazer?</label>
      <input id="a-titulo" type="text" placeholder="Ex: Ligar pro dentista" value="${atividadeExistente?.titulo || ''}">

      <label for="a-horario">Horário (opcional)</label>
      <input id="a-horario" type="time" value="${atividadeExistente?.horario || ''}">

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
    const horario = fundo.querySelector('#a-horario').value;

    if (!titulo) { alert('Escreve o que você precisa fazer.'); return; }

    const btn = fundo.querySelector('#btn-salvar');
    btn.textContent = 'Salvando...';
    btn.disabled = true;

    try {
      if (atividadeExistente) {
        await atualizarAtividade(atividadeExistente.id, { titulo, horario });
      } else {
        await addAtividade({ titulo, data: chaveDia, horario });
      }
      fundo.remove();
      if (modalPai) modalPai.remove();
      renderCalendario(container);
    } catch (erro) {
      btn.textContent = 'Salvar';
      btn.disabled = false;
      alert('Não deu pra salvar: ' + erro.message);
    }
  });
}
