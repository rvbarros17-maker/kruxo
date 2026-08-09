import { db } from '../firebase.js';
import { collection, query, getDocs, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { uidAtual, filtroUsuario } from './userScope.js';

// Coleção esperada: diarioEntradas { userId, data: 'YYYY-MM-DD', texto, humor, horario, criadoEm (Timestamp) }

export async function getEntradas() {
  const q = query(collection(db, 'diarioEntradas'), filtroUsuario());
  const snap = await getDocs(q);
  const entradas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return entradas.sort((a, b) => (a.data < b.data ? 1 : -1));
}

export async function addEntrada({ data, texto, humor, horario }) {
  return addDoc(collection(db, 'diarioEntradas'), {
    userId: uidAtual(),
    data,
    texto,
    humor: humor || '',
    horario: horario || '',
    criadoEm: Timestamp.fromDate(new Date()),
  });
}

export async function excluirEntrada(id) {
  await deleteDoc(doc(db, 'diarioEntradas', id));
}
