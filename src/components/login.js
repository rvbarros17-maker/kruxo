import { auth } from '../firebase.js';
import { signInWithEmailAndPassword } from 'firebase/auth';

export function renderLogin(root) {
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px;background:var(--bg)">
      <div style="max-width:340px;width:100%;background:var(--surface);border-radius:12px;padding:28px;border:1px solid var(--border)">
        <p style="font-family:var(--font-display);font-size:20px;font-weight:600;margin:0 0 4px">Meu Planner</p>
        <p style="font-size:13px;color:var(--ink-muted);margin:0 0 20px">Entre com seu e-mail e senha</p>

        <label for="login-email">E-mail</label>
        <input id="login-email" type="email" placeholder="voce@exemplo.com">

        <label for="login-senha">Senha</label>
        <input id="login-senha" type="password" placeholder="••••••••">

        <p id="login-erro" style="color:var(--red);font-size:13px;margin:-8px 0 12px;display:none"></p>

        <button id="btn-entrar" style="width:100%;height:40px;border-radius:8px;border:none;background:var(--ink);color:#fff;font-family:var(--font-body);font-size:14px;cursor:pointer">
          Entrar
        </button>
      </div>
    </div>
  `;

  const erroEl = root.querySelector('#login-erro');
  const btn = root.querySelector('#btn-entrar');

  async function tentarLogin() {
    const email = root.querySelector('#login-email').value.trim();
    const senha = root.querySelector('#login-senha').value;
    erroEl.style.display = 'none';

    if (!email || !senha) {
      erroEl.textContent = 'Preenche e-mail e senha.';
      erroEl.style.display = 'block';
      return;
    }

    btn.textContent = 'Entrando...';
    btn.disabled = true;
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      // onAuthStateChanged no main.js cuida do resto
    } catch (erro) {
      erroEl.textContent = 'E-mail ou senha incorretos.';
      erroEl.style.display = 'block';
      btn.textContent = 'Entrar';
      btn.disabled = false;
    }
  }

  btn.addEventListener('click', tentarLogin);
  root.querySelector('#login-senha').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tentarLogin();
  });
}
