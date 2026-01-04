import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { vi } from 'vitest';

// Mock navigator.storage
Object.defineProperty(navigator, 'storage', {
  value: {
    persist: vi.fn().mockResolvedValue(true),
    persisted: vi.fn().mockResolvedValue(true),
  },
  writable: true,
});

// Mock window.confirm
window.confirm = vi.fn().mockReturnValue(true);

// Mock Firebase Auth to prevent initialization issues in tests
vi.mock('@firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: null,
    onAuthStateChanged: vi.fn(),
  })),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));