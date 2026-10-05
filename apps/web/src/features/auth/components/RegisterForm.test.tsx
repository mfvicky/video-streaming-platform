import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { RegisterForm } from './RegisterForm';
import { useRegister } from '../hooks/useAuth';

vi.mock('../hooks/useAuth', () => ({
  useRegister: vi.fn(),
}));

describe('RegisterForm Component', () => {
  const mockMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRegister).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useRegister>);
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <RegisterForm />
      </MemoryRouter>
    );

  it('renders all form input fields, select option, and submit button', () => {
    renderComponent();

    expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
  });

  it('submits form with user inputs when submitted', async () => {
    renderComponent();

    fireEvent.change(screen.getByPlaceholderText('John Doe'), {
      target: { value: 'John Doe' },
    });
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'john@example.com' },
    });
    // Updated password to meet the uppercase requirement:
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'Password123' },
    });
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'CREATOR' },
    });

    fireEvent.click(screen.getByRole('button', { name: /get started/i }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123',
        role: 'CREATOR',
      });
    });
  });

  it('disables or shows loading state when registration is pending', () => {
    vi.mocked(useRegister).mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    } as unknown as ReturnType<typeof useRegister>);

    renderComponent();

    const submitButton = screen.getByRole('button');
    expect(submitButton).toBeDisabled();
  });
});