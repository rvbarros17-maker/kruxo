import { db } from '../firebase.js';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { uidAtual, filtroUsuario } from './userScope.js';

// Coleções esperadas:
// consultas    { userId, titulo, data: 'YYYY-MM-DD', local, concluida: bool }
// medicacoes   { userId, nome, dosagem, horario, ativo: bool }

export async function getConsultas() {
  const q = query(collection(db, 'consultas'), filtroUsuario());
  const snap = await getDocs(q);
  const consultas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return consultas.sort((a, b) => (a.data > b.data ? 1 : -1));
}

export async function addConsulta({ titulo, data, local }) {
  return addDoc(collection(db, 'consultas'), { userId: uidAtual(), titulo, data, local: local || '', concluida: false });
}

export async function atualizarConsulta(id, dados) {
  await updateDoc(doc(db, 'consultas', id), dados);
}

export async function alternarConsultaConcluida(id, concluida) {
  await updateDoc(doc(db, 'consultas', id), { concluida });
}

export async function excluirConsulta(id) {
  await deleteDoc(doc(db, 'consultas', id));
}

export async function getMedicacoes() {
  const q = query(collection(db, 'medicacoes'), filtroUsuario(), where('ativo', '==', true));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addMedicacao({ nome, dosagem, horario }) {
  return addDoc(collection(db, 'medicacoes'), {
    userId: uidAtual(),
    nome,
    dosagem: dosagem || '',
    horario: horario || '',
    ativo: true,
  });
}

export async function atualizarMedicacao(id, dados) {
  await updateDoc(doc(db, 'medicacoes', id), dados);
}

export async function desativarMedicacao(id) {
  await updateDoc(doc(db, 'medicacoes', id), { ativo: false });
}
