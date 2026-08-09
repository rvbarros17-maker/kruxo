import { auth } from '../firebase.js';
import { where } from 'firebase/firestore';

export function uidAtual() {
  return auth.currentUser?.uid;
}

export function filtroUsuario() {
  return where('userId', '==', uidAtual());
}
