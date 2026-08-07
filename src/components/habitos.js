import {
  getHabitosAtivos,
  addHabito,
  desativarHabito,
  getRegistros,
  marcarConcluido,
  desmarcarConcluido,
  getStreakAtual,
  paraChaveData,
  segundaDaSemana,
} from '../services/habitosService.js';
import {
  getConsultas,
  addConsulta,
  alternarConsultaConcluida,
  excluirConsulta,
  getMedicacoes,
  addMedicacao,
  desativarMedicacao,
} from '../services/saudeService.js';

const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

let semanaExibida = segundaDaSemana(new Date());

function formatarData(chave) {
  const [ano, mes, dia] = chave.split('-');
  return `${dia}/${mes}/${ano}`;
}

export async function renderHabitos(container) {
  container.innerHTML = '<p class="estado-carregando">Carregando seus hábitos...</p>';

  const diasDaSemana = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(semanaExibida);
    d.setDate(d.getDate() + i);
    diasDaSemana.push(d);
  }
  const chaves = diasDaSemana.map(paraChaveData);

  let habitos, registros, streak, consultas, medicacoes;
  try {
    habitos = await getHabitosAtivos();
    [registros, streak, consultas, medicacoes] = await Promise.all([
      getRegistros(chaves),
      getStreakAtual(habitos),
      getConsultas(),
      getMedicacoes(),
    ]);
  } catch (erro) {
    container.innerHTML = `<p class="estado-carregando">Não deu pra carregar. ${erro.message}</p>`;
    return;
  }

  desenharTela(container, { habitos, registros, streak, diasDaSemana, consultas, medicacoes });
}

function desenharTela(container, dados) {
  const { habitos, registros, streak, diasDaSemana, consultas, medicacoes } = dados;

  const registroPorChave = {};
  registros.forEach((r) => {
    registroPorChave[`${r.habitoId}|${r.data}`] = r;
  });

  const inicio = diasDaSemana[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const fim = diasDaSemana[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  container.innerHTML = `
    <div class="cabecalho-tela">
      <h2>Hábitos &amp; Saúde</h2>
    </div>

    <div class="calendario-header" style="justify-content:flex-start;gap:16px">
      <button class="btn-duplicar" id="semana-anterior">‹</button>
      <h2 style="min-width:auto">${inicio} a ${fim}</h2>
      <button class="btn-duplicar" id="semana-seguinte">›</button>
    </div>

    <div style="overflow-x:auto;margin:16px 0 20px">
      <table class="tabela-habitos">
        <thead>
          <tr>
            <th>Dia</th>
            ${habitos.map((h) => `
              <th>
                ${h.nome}
                <button class="btn-remover-habito" data-acao="remover-habito" data-id="${h.id}" title="Remover hábito">×</button>
              </th>
            `).join('')}
            <th><button class="btn-nova" style="padding:6px 10px;font-size:12px" id="btn-novo-habito">+ Hábito</button></th>
          </tr>
        </thead>
        <tbody>
          ${diasDaSemana.map((data, i) => {
            const chave = paraChaveData(data);
            const ehHoje = paraChaveData(new Date()) === chave;
            return `
              <tr class="${ehHoje ? 'linha-hoje' : ''}">
                <td class="nome-dia">${DIAS_SEMANA[i]}</td>
                ${habitos.map((h) => {
                  const registro = registroPorChave[`${h.id}|${chave}`];
                  return `
                    <td style="text-align:center">
                      <input type="checkbox" class="check-habito" data-habito="${h.id}" data-data="${chave}"
                        data-registro="${registro?.id || ''}" ${registro ? 'checked' : ''}>
                    </td>
                  `;
                }).join('')}
                <td></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <div class="card-resumo" style="max-width:280px;margin-bottom:24px">
      <p class="eyebrow">Consistência</p>
      <p class="valor" style="color:var(--green)">🔥 ${streak} dia${streak === 1 ? '' : 's'} seguido${streak === 1 ? '' : 's'}</p>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px">
      <div>
        <div class="cabecalho-tela" style="margin-bottom:10px">
          <h2 style="font-size:15px">Consultas</h2>
          <button class="btn-nova" style="padding:6px 10px;font-size:12px" id="btn-nova-consulta">+ Nova</button>
        </div>
        <div class="lista-contas" style="background:transparent;gap:8px">
          ${consultas.length === 0
            ? '<p class="legenda-progresso">Nenhuma consulta marcada.</p>'
            : consultas.map((c) => cartaoConsulta(c)).join('')
          }
        </div>
      </div>

      <div>
        <div class="cabecalho-tela" style="margin-bottom:10px">
          <h2 style="font-size:15px">Medicações</h2>
          <button class="btn-nova" style="padding:6px 10px;font-size:12px" id="btn-nova-medicacao">+ Nova</button>
        </div>
        <div class="lista-contas" style="background:transparent;gap:8px">
          ${medicacoes.length === 0
            ? '<p class="legenda-progresso">Nenhuma medicação cadastrada.</p>'
            : medicacoes.map((m) => cartaoMedicacao(m)).join('')
          }
        </div>
      </div>
    </div>
  `;

  container.querySelector('#semana-anterior').addEventListener('click', () => {
    semanaExibida.setDate(semanaExibida.getDate() - 7);
    renderHabitos(container);
  });
  container.querySelector('#semana-seguinte').addEventListener('click', () => {
    semanaExibida.setDate(semanaExibida.getDate() + 7);
    renderHabitos(container);
  });

  container.querySelector('#btn-novo-habito').addEventListener('click', () => {
    abrirFormularioHabito(container);
  });

  container.querySelectorAll('[data-acao="remover-habito"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      if (!confirm('Remover esse hábito? O histórico dele é mantido, mas ele some da lista.')) return;
      await desativarHabito(e.currentTarget.dataset.id);
      renderHabitos(container);
    });
  });

  container.querySelectorAll('.check-habito').forEach((chk) => {
    chk.addEventListener('change', async (e) => {
      const habitoId = e.currentTarget.dataset.habito;
      const chave = e.currentTarget.dataset.data;
      const registroId = e.currentTarget.dataset.registro;
      e.currentTarget.disabled = true;
      try {
        if (e.currentTarget.checked) {
          await marcarConcluido(habitoId, chave);
        } else {
          await desmarcarConcluido(registroId);
        }
        renderHabitos(container);
      } catch (erro) {
        e.currentTarget.disabled = false;
        alert('Não deu pra atualizar: ' + erro.message);
      }
    });
  });

  container.querySelector('#btn-nova-consulta').addEventListener('click', () => {
    abrirFormularioConsulta(container);
  });
  container.querySelectorAll('[data-acao="concluir-consulta"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const consulta = consultas.find((c) => c.id === e.currentTarget.dataset.id);
      await alternarConsultaConcluida(consulta.id, !consulta.concluida);
      renderHabitos(container);
    });
  });
  container.querySelectorAll('[data-acao="excluir-consulta"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      if (!confirm('Excluir essa consulta?')) return;
      await excluirConsulta(e.currentTarget.dataset.id);
      renderHabitos(container);
    });
  });

  container.querySelector('#btn-nova-medicacao').addEventListener('click', () => {
    abrirFormularioMedicacao(container);
  });
  container.querySelectorAll('[data-acao="remover-medicacao"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      if (!confirm('Remover essa medicação?')) return;
      await desativarMedicacao(e.currentTarget.dataset.id);
      renderHabitos(container);
    });
  });
}

function cartaoConsulta(consulta) {
  return `
    <div style="background:var(--surface);border-radius:12px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;gap:8px">
      <div style="min-width:0">
        <p style="font-size:13px;font-weight:500;margin:0;${consulta.concluida ? 'text-decoration:line-through;color:var(--ink-muted)' : ''}">${consulta.titulo}</p>
        <p class="meta-conta" style="margin:0">${formatarData(consulta.data)}${consulta.local ? ' · ' + consulta.local : ''}</p>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <button class="badge-status ${consulta.concluida ? 'pago' : 'pendente'}" data-acao="concluir-consulta" data-id="${consulta.id}">
          ${consulta.concluida ? 'Feita' : 'Marcada'}
        </button>
        <button class="btn-remover-habito" data-acao="excluir-consulta" data-id="${consulta.id}">×</button>
      </div>
    </div>
  `;
}

function cartaoMedicacao(med) {
  return `
    <div style="background:var(--surface);border-radius:12px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;gap:8px">
      <div style="min-width:0">
        <p style="font-size:13px;font-weight:500;margin:0">${med.nome}</p>
        <p class="meta-conta" style="margin:0">${med.dosagem}${med.horario ? ' · ' + med.horario : ''}</p>
      </div>
      <button class="btn-remover-habito" data-acao="remover-medicacao" data-id="${med.id}">×</button>
    </div>
  `;
}

function abrirFormularioHabito(container) {
  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.innerHTML = `
    <div class="modal-card">
      <p style="font-family:var(--font-display);font-size:16px;font-weight:500;margin:0 0 16px">Novo hábito</p>
      <label for="h-nome">Nome</label>
      <input id="h-nome" type="text" placeholder="Ex: Beber 2L de água">
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
    const nome = fundo.querySelector('#h-nome').value.trim();
    if (!nome) { alert('Dá um nome pro hábito antes de salvar.'); return; }
    const btn = fundo.querySelector('#btn-salvar');
    btn.textContent = 'Salvando...';
    btn.disabled = true;
    try {
      await addHabito(nome);
      fundo.remove();
      renderHabitos(container);
    } catch (erro) {
      btn.textContent = 'Salvar';
      btn.disabled = false;
      alert('Não deu pra salvar: ' + erro.message);
    }
  });
}

function abrirFormularioConsulta(container) {
  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.innerHTML = `
    <div class="modal-card">
      <p style="font-family:var(--font-display);font-size:16px;font-weight:500;margin:0 0 16px">Nova consulta</p>
      <label for="co-titulo">Título</label>
      <input id="co-titulo" type="text" placeholder="Ex: Dentista">
      <label for="co-data">Data</label>
      <input id="co-data" type="date">
      <label for="co-local">Local (opcional)</label>
      <input id="co-local" type="text" placeholder="Ex: Clínica Sorriso">
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
    const titulo = fundo.querySelector('#co-titulo').value.trim();
    const data = fundo.querySelector('#co-data').value;
    const local = fundo.querySelector('#co-local').value.trim();
    if (!titulo || !data) { alert('Preenche o título e a data.'); return; }
    const btn = fundo.querySelector('#btn-salvar');
    btn.textContent = 'Salvando...';
    btn.disabled = true;
    try {
      await addConsulta({ titulo, data, local });
      fundo.remove();
      renderHabitos(container);
    } catch (erro) {
      btn.textContent = 'Salvar';
      btn.disabled = false;
      alert('Não deu pra salvar: ' + erro.message);
    }
  });
}

function abrirFormularioMedicacao(container) {
  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.innerHTML = `
    <div class="modal-card">
      <p style="font-family:var(--font-display);font-size:16px;font-weight:500;margin:0 0 16px">Nova medicação</p>
      <label for="me-nome">Nome</label>
      <input id="me-nome" type="text" placeholder="Ex: Vitamina D">
      <label for="me-dosagem">Dosagem (opcional)</label>
      <input id="me-dosagem" type="text" placeholder="Ex: 1 cápsula">
      <label for="me-horario">Horário (opcional)</label>
      <input id="me-horario" type="text" placeholder="Ex: Após o almoço">
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
    const nome = fundo.querySelector('#me-nome').value.trim();
    const dosagem = fundo.querySelector('#me-dosagem').value.trim();
    const horario = fundo.querySelector('#me-horario').value.trim();
    if (!nome) { alert('Dá um nome pra medicação.'); return; }
    const btn = fundo.querySelector('#btn-salvar');
    btn.textContent = 'Salvando...';
    btn.disabled = true;
    try {
      await addMedicacao({ nome, dosagem, horario });
      fundo.remove();
      renderHabitos(container);
    } catch (erro) {
      btn.textContent = 'Salvar';
      btn.disabled = false;
      alert('Não deu pra salvar: ' + erro.message);
    }
  });
}
