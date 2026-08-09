import './style.css';
import { auth } from './firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { renderLogin } from './components/login.js';
import { renderNav } from './components/nav.js';
import { renderDashboard } from './components/dashboard.js';
import { renderDespesas } from './components/despesas.js';
import { renderReceitas } from './components/receitas.js';
import { renderInvestimentos } from './components/investimentos.js';
import { renderCasal } from './components/casal.js';
import { renderOrcamento } from './components/orcamento.js';
import { renderCalendario } from './components/calendario.js';
import { renderHabitos } from './components/habitos.js';
import { renderDiario } from './components/diario.js';
import { renderMetas } from './components/metas.js';
import { renderLeituras } from './components/leituras.js';
import { addGastoRapido } from './services/financeService.js';
import { CATEGORIAS_DESPESA } from './constants/categorias.js';

const app = document.getElementById('app');
const ABAS_FINANCEIRO = ['dashboard', 'despesas', 'receitas', 'investimentos', 'casal', 'orcamento', 'calendario'];

let abaAtual = 'dashboard';

onAuthStateChanged(auth, (user) => {
  document.querySelectorAll('.fab-gasto').forEach((el) => el.remove());
  if (user) {
    montarApp(user);
  } else {
    app.innerHTML = '';
    renderLogin(app);
  }
});

function montarApp(user) {
  app.innerHTML = '';

  const layoutEl = document.createElement('div');
  layoutEl.className = 'layout-app';

  const navEl = document.createElement('nav');
  navEl.className = 'sidebar';

  const telaEl = document.createElement('div');
  telaEl.className = 'conteudo-principal';

  const rodapeEl = document.createElement('div');
  rodapeEl.className = 'sidebar-rodape';
  rodapeEl.innerHTML = `
    <p class="sidebar-email">${user.email}</p>
    <button id="btn-sair" class="btn-sair">Sair</button>
  `;
  navEl.appendChild(document.createElement('div')); // placeholder, substituído pelo renderNav
  navEl.appendChild(rodapeEl);

  layoutEl.appendChild(navEl);
  layoutEl.appendChild(telaEl);
  app.appendChild(layoutEl);

  rodapeEl.querySelector('#btn-sair').addEventListener('click', () => signOut(auth));

  function renderizarTela() {
    fab.style.display = ABAS_FINANCEIRO.includes(abaAtual) ? 'flex' : 'none';
    switch (abaAtual) {
      case 'dashboard':
        renderDashboard(telaEl);
        break;
      case 'despesas':
        renderDespesas(telaEl);
        break;
      case 'receitas':
        renderReceitas(telaEl);
        break;
      case 'investimentos':
        renderInvestimentos(telaEl);
        break;
      case 'casal':
        renderCasal(telaEl);
        break;
      case 'orcamento':
        renderOrcamento(telaEl);
        break;
      case 'calendario':
        renderCalendario(telaEl);
        break;
      case 'habitos':
        renderHabitos(telaEl);
        break;
      case 'diario':
        renderDiario(telaEl);
        break;
      case 'metas':
        renderMetas(telaEl);
        break;
      case 'leituras':
        renderLeituras(telaEl);
        break;
      default:
        telaEl.innerHTML = '<p class="em-construcao">Essa tela ainda está sendo construída 🚧</p>';
    }
  }

  function trocarAba(aba) {
    abaAtual = aba;
    renderNavCompleto();
    renderizarTela();
  }

  function renderNavCompleto() {
    const areaNav = document.createElement('div');
    renderNav(areaNav, abaAtual, trocarAba);
    navEl.replaceChild(areaNav, navEl.firstChild);
  }

  const fab = document.createElement('button');
  fab.className = 'fab-gasto';
  fab.textContent = '+';
  fab.setAttribute('aria-label', 'Novo gasto rápido');
  document.body.appendChild(fab);
  fab.addEventListener('click', abrirModalGasto);

  renderNavCompleto();
  renderizarTela();

  function abrirModalGasto() {
    const fundo = document.createElement('div');
    fundo.className = 'modal-fundo';
    fundo.innerHTML = `
      <div class="modal-card">
        <p style="font-family:var(--font-display);font-size:16px;font-weight:500;margin:0 0 4px">Novo gasto</p>
        <p style="font-size:13px;color:var(--ink-muted);margin:0 0 16px">Anota rápido e segue o dia</p>

        <label for="input-valor">Valor</label>
        <input id="input-valor" type="number" step="0.01" placeholder="0,00">

        <label for="input-categoria">Categoria</label>
        <select id="input-categoria">
          ${CATEGORIAS_DESPESA.map((cat) => `<option value="${cat.id}">${cat.nome}</option>`).join('')}
        </select>

        <label for="input-nota">Nota (opcional)</label>
        <input id="input-nota" type="text" placeholder="Ex: café com a equipe">

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
      const valor = parseFloat(fundo.querySelector('#input-valor').value);
      const categoriaId = fundo.querySelector('#input-categoria').value;
      const nota = fundo.querySelector('#input-nota').value;

      if (!valor || valor <= 0) {
        fundo.querySelector('#input-valor').focus();
        return;
      }

      const btn = fundo.querySelector('#btn-salvar');
      btn.textContent = 'Salvando...';
      btn.disabled = true;

      try {
        await addGastoRapido({ valor, categoriaId, nota });
        fundo.remove();
        renderizarTela();
      } catch (erro) {
        btn.textContent = 'Salvar';
        btn.disabled = false;
        alert('Não deu pra salvar. Confira sua conexão com o Firebase.');
      }
    });
  }
}
