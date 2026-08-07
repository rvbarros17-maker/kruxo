import { db } from '../firebase.js';
import { collection, getDocs, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';

// Coleção esperada: diarioEntradas { data: 'YYYY-MM-DD', texto, humor, criadoEm (Timestamp) }

export async function getEntradas() {
  const snap = await getDocs(collection(db, 'diarioEntradas'));
  const entradas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return entradas.sort((a, b) => (a.data < b.data ? 1 : -1));
}

export async function addEntrada({ data, texto, humor }) {
  return addDoc(collection(db, 'diarioEntradas'), {
    data,
    texto,
    humor: humor || '',
    criadoEm: Timestamp.fromDate(new Date()),
  });
}

export async function excluirEntrada(id) {
  await deleteDoc(doc(db, 'diarioEntradas', id));
}
