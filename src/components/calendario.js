import { getContasDoMes, atualizarStatusConta, mesAtualRef } from '../services/financeService.js';
import { getConsultas, alternarConsultaConcluida } from '../services/saudeService.js';
import { getMetas, alternarConcluida as alternarMetaConcluida } from '../services/metasService.js';
import { getAtividades, addAtividade, alternarAtividadeConcluida } from '../services/agendaService.js';
import { paraChaveData } from '../services/habitosService.js';
import { nomeCategoria } from '../constants/categorias.js';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

let mesExibido = new Date();

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

export async function renderCalendario(container) {
  container.innerHTML = '<p class="estado-carregando">Carregando o calendário...</p>';

  const mesReferencia = mesAtualRef(mesExibido);
  let contas, consultas, metas, atividades;
  try {
    [contas, consultas, metas, atividades] = await Promise.all([
      getContasDoMes(mesReferencia),
      getConsultas(),
      getMetas(),
      getAtividades(),
    ]);
  } catch (erro) {
    container.innerHTML = `<p class="estado-carregando">Não deu pra carregar. ${erro.message}</p>`;
    return;
  }

  desenharTela(container, contas, consultas, metas, atividades);
}

function montarEventos(contas, consultas, metas, atividades, ano, mes) {
  const eventos = [];

  contas.forEach((c) => {
    if (!c.dataVencimento) return;
    const data = paraDate(c.dataVencimento);
    if (data.getMonth() !== mes || data.getFullYear() !== ano) return;
    eventos.push({
      id: c.id,
      dia: data.getDate(),
      nome: c.nome,
      tipo: c.natureza, // 'despesa' | 'receita'
      concluido: c.status === 'pago',
      origem: 'conta',
      detalhe: `${nomeCategoria(c.categoriaId, c.natureza)} · R$ ${formatarMoeda(c.valor)}`,
    });
  });

  consultas.forEach((c) => {
    const data = paraDate(c.data);
    if (!data || data.getMonth() !== mes || data.getFullYear() !== ano) return;
    eventos.push({
      id: c.id,
      dia: data.getDate(),
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
    if (!data || data.getMonth() !== mes || data.getFullYear() !== ano) return;
    eventos.push({
      id: m.id,
      dia: data.getDate(),
      nome: m.titulo,
      tipo: 'meta',
      concluido: m.concluida,
      origem: 'meta',
      detalhe: `Prazo da meta · ${m.progresso}%`,
    });
  });

  atividades.forEach((a) => {
    const data = paraDate(a.data);
    if (!data || data.getMonth() !== mes || data.getFullYear() !== ano) return;
    eventos.push({
      id: a.id,
      dia: data.getDate(),
      nome: a.titulo,
      tipo: 'atividade',
      concluido: a.concluida,
      origem: 'atividade',
      detalhe: a.horario ? `Atividade · ${a.horario}` : 'Atividade',
    });
  });

  return eventos;
}

function desenharTela(container, contas, consultas, metas, atividades) {
  const ano = mesExibido.getFullYear();
  const mes = mesExibido.getMonth();
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const hoje = new Date();

  const eventos = montarEventos(contas, consultas, metas, atividades, ano, mes);
  const eventosPorDia = {};
  eventos.forEach((ev) => {
    eventosPorDia[ev.dia] = eventosPorDia[ev.dia] || [];
    eventosPorDia[ev.dia].push(ev);
  });

  const nomeMes = mesExibido.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  let celulas = '';
  for (let i = 0; i < primeiroDiaSemana; i++) {
    celulas += '<div class="dia-celula vazia"></div>';
  }
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

  container.innerHTML = `
    <div class="calendario-header">
      <button class="btn-duplicar" id="mes-anterior">‹</button>
      <h2 style="text-transform:capitalize">${nomeMes}</h2>
      <button class="btn-duplicar" id="mes-seguinte">›</button>
    </div>

    <div class="calendario-grid">
      ${DIAS_SEMANA.map((d) => `<div class="dia-semana-nome">${d}</div>`).join('')}
      ${celulas}
    </div>

    <p class="legenda-progresso" style="margin-top:16px">
      <span style="color:var(--red)">●</span> Despesa &nbsp;
      <span style="color:var(--green)">●</span> Receita &nbsp;
      <span style="color:var(--blue)">●</span> Consulta &nbsp;
      <span style="color:var(--purple)">●</span> Meta &nbsp;
      <span style="color:var(--teal)">●</span> Atividade &nbsp;
      · clique num item pra marcar como concluído
    </p>
  `;

  container.querySelector('#mes-anterior').addEventListener('click', () => {
    mesExibido = new Date(ano, mes - 1, 1);
    renderCalendario(container);
  });
  container.querySelector('#mes-seguinte').addEventListener('click', () => {
    mesExibido = new Date(ano, mes + 1, 1);
    renderCalendario(container);
  });

  container.querySelectorAll('[data-acao="toggle-evento"]').forEach((chip) => {
    chip.addEventListener('click', async (e) => {
      const { id, origem, concluido } = e.currentTarget.dataset;
      const novo = concluido === 'true' ? false : true;
      if (origem === 'conta') {
        await atualizarStatusConta(id, novo ? 'pago' : 'pendente');
      } else if (origem === 'consulta') {
        await alternarConsultaConcluida(id, novo);
      } else if (origem === 'meta') {
        await alternarMetaConcluida(id, novo);
      } else if (origem === 'atividade') {
        await alternarAtividadeConcluida(id, novo);
      }
      renderCalendario(container);
    });
  });

  container.querySelectorAll('[data-acao="abrir-dia"]').forEach((el) => {
    el.addEventListener('click', () => {
      const dia = parseInt(el.dataset.dia, 10);
      abrirDetalheDia(container, dia, eventosPorDia[dia] || [], ano, mes);
    });
  });
}

const COR_TIPO = {
  despesa: 'var(--red)',
  receita: 'var(--green)',
  consulta: 'var(--blue)',
  meta: 'var(--purple)',
  atividade: 'var(--teal)',
};

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

function abrirDetalheDia(container, dia, eventosDoDia, ano, mes) {
  const dataDia = new Date(ano, mes, dia);
  const chaveDia = paraChaveData(dataDia);
  const label = dataDia.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

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

  fundo.querySelectorAll('[data-acao="toggle-evento"]').forEach((chk) => {
    chk.addEventListener('change', async (e) => {
      const { id, origem } = e.currentTarget.dataset;
      const novo = e.currentTarget.checked;
      if (origem === 'conta') await atualizarStatusConta(id, novo ? 'pago' : 'pendente');
      else if (origem === 'consulta') await alternarConsultaConcluida(id, novo);
      else if (origem === 'meta') await alternarMetaConcluida(id, novo);
      else if (origem === 'atividade') await alternarAtividadeConcluida(id, novo);
      fundo.remove();
      renderCalendario(container);
    });
  });

  fundo.querySelector('#btn-nova-atividade-dia').addEventListener('click', () => {
    abrirFormularioAtividade(container, fundo, chaveDia);
  });
}

function linhaDetalheEvento(ev) {
  const cor = COR_TIPO[ev.tipo] || 'var(--ink-muted)';
  return `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
      <input type="checkbox" class="check-habito" data-acao="toggle-evento" data-id="${ev.id}" data-origem="${ev.origem}" ${ev.concluido ? 'checked' : ''}>
      <div style="flex:1;min-width:0;border-left:2px solid ${cor};padding-left:8px">
        <p style="font-size:13px;font-weight:500;margin:0;${ev.concluido ? 'text-decoration:line-through;color:var(--ink-muted)' : ''}">${ev.nome}</p>
        <p class="meta-conta" style="margin:0">${ev.detalhe}</p>
      </div>
    </div>
  `;
}

function abrirFormularioAtividade(container, modalPai, chaveDia) {
  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.innerHTML = `
    <div class="modal-card">
      <p style="font-family:var(--font-display);font-size:16px;font-weight:500;margin:0 0 16px">Nova atividade</p>

      <label for="a-titulo">O que você precisa fazer?</label>
      <input id="a-titulo" type="text" placeholder="Ex: Ligar pro dentista">

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
    const horario = fundo.querySelector('#a-horario').value;

    if (!titulo) { alert('Escreve o que você precisa fazer.'); return; }

    const btn = fundo.querySelector('#btn-salvar');
    btn.textContent = 'Salvando...';
    btn.disabled = true;

    try {
      await addAtividade({ titulo, data: chaveDia, horario });
      fundo.remove();
      modalPai.remove();
      renderCalendario(container);
    } catch (erro) {
      btn.textContent = 'Salvar';
      btn.disabled = false;
      alert('Não deu pra salvar: ' + erro.message);
    }
  });
}
