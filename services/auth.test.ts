import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signUp, signIn, signOut, getToken } from './auth';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut
} from '@firebase/auth';
import { auth } from './firebase-config';

vi.mock('@firebase/auth', () => {
  return {
    getAuth: vi.fn(),
    createUserWithEmailAndPassword: vi.fn().mockResolvedValue({}),
    signInWithEmailAndPassword: vi.fn().mockResolvedValue({}),
    signOut: vi.fn().mockResolvedValue({}),
    onAuthStateChanged: vi.fn()
  };
});

vi.mock('./firebase-config', () => ({
  auth: {
    currentUser: null,
    // Add internal property to satisfy SDK
    _getRecaptchaConfig: vi.fn()
  }
}));

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).currentUser = null;
  });
  it('calls createUserWithEmailAndPassword on signUp', async () => {
    await signUp('test@example.com', 'password123');
    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'test@example.com', 'password123');
  });

  it('calls signInWithEmailAndPassword on signIn', async () => {
    await signIn('test@example.com', 'password123');
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'test@example.com', 'password123');
  });

  it('calls signOut on logout', async () => {
    await signOut();
    expect(firebaseSignOut).toHaveBeenCalled();
  });

  it('getToken returns null if no user logged in', async () => {
    const token = await getToken();
    expect(token).toBeNull();
  });

  it('getToken returns token if user logged in', async () => {
    const mockGetIdToken = vi.fn().mockResolvedValue('mock-token');
    (auth as any).currentUser = {
      getIdToken: mockGetIdToken
    };
    const token = await getToken();
    expect(token).toBe('mock-token');
    expect(mockGetIdToken).toHaveBeenCalled();
  });
});
