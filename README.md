# Meu Planner — Financeiro

Dashboard financeiro em Vite + Vanilla JS + Firebase (Firestore).

## Como rodar

```bash
npm install
npm run dev
```

## Configurar o Firebase

1. Crie um projeto no [console do Firebase](https://console.firebase.google.com).
2. Ative o **Firestore Database** (modo de teste pra começar).
3. Em *Configurações do projeto > Seus apps*, crie um app Web e copie as credenciais.
4. Cole essas credenciais em `src/firebase.js`, no lugar de `firebaseConfig`.

## Configurar o login (Firebase Auth)

1. No console Firebase, menu lateral **Build → Authentication → Começar**.
2. Na aba **Sign-in method**, ative o provedor **E-mail/senha**.
3. Na aba **Users**, clique em **Add user** e cria as duas contas (a sua e a do seu parceiro), com e-mail e senha.
4. Pronto — só quem tiver uma dessas contas consegue entrar no app.

## Regras do Firestore (exigindo login)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Regras do Storage (exigindo login)

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Estrutura de dados esperada

- **categorias**: `{ nome, tipo: 'despesa'|'receita', cor }`
- **contas**: `{ nome, valor, categoriaId, natureza: 'despesa'|'receita', tipoFrequencia: 'fixa'|'variavel', dataVencimento, status: 'pago'|'pendente', compartilhada, mesReferencia: 'YYYY-MM' }`
- **gastosRapidos**: `{ valor, categoriaId, data, nota }`
- **orcamentos**: `{ categoriaId, mesReferencia: 'YYYY-MM', limite }`
- **investimentos**: `{ nome, tipo }` com subcoleção **lancamentos**: `{ tipo: 'aporte'|'resgate', valor, data }`

## Pra testar rápido

Sem dados no Firestore ainda, o Dashboard carrega com tudo zerado. Adicione manualmente alguns documentos em `contas`, `gastosRapidos`, `categorias` e `orcamentos` no console do Firebase pra ver os cálculos e alertas funcionando — ou use o botão flutuante "+" pra lançar um gasto rápido direto pelo app (isso já grava no Firestore de verdade).

## Próximos passos

- Autenticação (Firebase Auth) pra proteger os dados
- Telas de Despesas, Receitas, Investimentos, Casal, Orçamento e Calendário
- Formulário completo de "nova conta" (fixa/variável, vencimento, duplicar pro mês seguinte)
