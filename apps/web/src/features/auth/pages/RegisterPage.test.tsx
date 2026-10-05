import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RegisterPage } from './RegisterPage';

// Mock the nested RegisterForm component
vi.mock('../components/RegisterForm', () => ({
  RegisterForm: () => <div data-testid="register-form">Mock RegisterForm</div>,
}));

describe('RegisterPage Component', () => {
  it('renders without crashing and displays the RegisterForm component', () => {
    render(<RegisterPage />);

    expect(screen.getByTestId('register-form')).toBeInTheDocument();
    expect(screen.getByText('Mock RegisterForm')).toBeInTheDocument();
  });

  it('renders outer container with centering and background layout classes', () => {
    const { container } = render(<RegisterPage />);

    const outerContainer = container.firstChild as HTMLElement;
    expect(outerContainer).toHaveClass(
      'min-h-screen',
      'flex',
      'items-center',
      'justify-center'
    );
  });
});