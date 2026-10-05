import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LoginPage } from './LoginPage';

// Mock the nested LoginForm component
vi.mock('../components/LoginForm', () => ({
  LoginForm: () => <div data-testid="login-form">Mock LoginForm</div>,
}));

describe('LoginPage Component', () => {
  it('renders without crashing and renders the LoginForm component', () => {
    render(<LoginPage />);

    expect(screen.getByTestId('login-form')).toBeInTheDocument();
    expect(screen.getByText('Mock LoginForm')).toBeInTheDocument();
  });

  it('renders container with full min-screen layout styling', () => {
    const { container } = render(<LoginPage />);

    const outerContainer = container.firstChild as HTMLElement;
    expect(outerContainer).toHaveClass(
      'min-h-screen',
      'flex',
      'items-center',
      'justify-center'
    );
  });
});