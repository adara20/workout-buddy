import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  User
} from '@firebase/auth';
import { auth } from './firebase-config';

export const signUp = (email: string, pass: string) => 
  createUserWithEmailAndPassword(auth, email, pass);

export const signIn = (email: string, pass: string) => 
  signInWithEmailAndPassword(auth, email, pass);

export const signOut = () => firebaseSignOut(auth);

export const onAuthChange = (callback: (user: User | null) => void) => 
  onAuthStateChanged(auth, callback);

export const getToken = async (): Promise<string | null> => {
  if (!auth.currentUser) return null;
  return auth.currentUser.getIdToken();
};
