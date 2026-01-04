
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Sync from './Sync';
import { onAuthChange, signIn, signOut } from '../services/auth';
import { uploadToCloud, downloadFromCloud } from '../services/cloud-rest';

vi.mock('../services/auth', () => ({
  onAuthChange: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('../services/cloud-rest', () => ({
  uploadToCloud: vi.fn(),
  downloadFromCloud: vi.fn(),
}));

describe('Sync Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sign in form when not logged in', () => {
    (onAuthChange as any).mockImplementation((cb: any) => {
      cb(null);
      return () => {};
    });

    const { container } = render(<Sync />);
    
    expect(screen.getByText(/Email/i)).toBeInTheDocument();
    expect(screen.getByText(/Password/i)).toBeInTheDocument();
    expect(container.querySelector('input[type="email"]')).toBeInTheDocument();
    expect(container.querySelector('input[type="password"]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });

  it('toggles between Sign In and Sign Up', () => {
    (onAuthChange as any).mockImplementation((cb: any) => {
      cb(null);
      return () => {};
    });

    render(<Sync />);
    
    const toggleBtn = screen.getByText(/Need an account\? Sign Up/i);
    fireEvent.click(toggleBtn);

    expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument();
    expect(screen.getByText(/Already have an account\? Sign In/i)).toBeInTheDocument();
  });

  it('calls signIn on form submission', async () => {
    (onAuthChange as any).mockImplementation((cb: any) => {
      cb(null);
      return () => {};
    });

    const { container } = render(<Sync />);
    
    const emailInput = container.querySelector('input[type="email"]');
    const passwordInput = container.querySelector('input[type="password"]');
    const form = container.querySelector('form');

    fireEvent.change(emailInput!, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput!, { target: { value: 'password123' } });
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('calls uploadToCloud when push button is clicked', async () => {
    (onAuthChange as any).mockImplementation((cb: any) => {
      cb({ email: 'test@example.com' });
      return () => {};
    });
    window.confirm = vi.fn().mockReturnValue(true);

    render(<Sync />);
    
    const pushBtn = screen.getByText(/Push to Cloud/i);
    fireEvent.click(pushBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(uploadToCloud).toHaveBeenCalled();
  });
});
