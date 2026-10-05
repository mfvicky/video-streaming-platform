import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Input } from './Input';

describe('Input Component', () => {
  it('renders input element correctly', () => {
    render(<Input placeholder="Enter your email" />);
    expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument();
  });

  it('accepts and changes value upon user typing', () => {
    const handleChange = vi.fn();
    render(<Input placeholder="Email" onChange={handleChange} />);
    const input = screen.getByPlaceholderText(/email/i);
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('renders error message when error prop is provided', () => {
    render(<Input error="Invalid email address" />);
    expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
  });
});