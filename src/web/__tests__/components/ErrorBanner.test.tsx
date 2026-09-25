import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBanner } from '../../components/ErrorBanner.js';
import type { ApiError } from '../../types.js';

describe('ErrorBanner component', () => {
  it('returns null if no error provided', () => {
    const { container } = render(<ErrorBanner error={null} locale="en" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders string errors directly', () => {
    render(<ErrorBanner error="An unexpected error" locale="en" />);
    expect(screen.getByText('An unexpected error')).not.toBeNull();
  });

  it('translates known ApiError codes to vi locale', () => {
    const error: ApiError = { code: 'UNAUTHORIZED', message: 'Ignore this' };
    render(<ErrorBanner error={error} locale="vi" />);
    expect(screen.getByText('Phiên đăng nhập đã hết hạn')).not.toBeNull();
  });

  it('translates known ApiError codes to en locale', () => {
    const error: ApiError = { code: 'UNAUTHORIZED', message: 'Ignore this' };
    render(<ErrorBanner error={error} locale="en" />);
    expect(screen.getByText('Session expired')).not.toBeNull();
  });

  it('falls back to error.message if code is unknown', () => {
    const error: ApiError = { code: 'WEIRD_CODE', message: 'Server explosion' };
    render(<ErrorBanner error={error} locale="en" />);
    expect(screen.getByText('Server explosion')).not.toBeNull();
  });

  it('renders field-level validation details if present', () => {
    const error: ApiError = { 
      code: 'VALIDATION_ERROR', 
      message: 'Invalid input',
      details: [
        { field: 'amountVnd', code: 'INVALID', message: 'Must be positive' },
        { field: 'categoryId', code: 'REQUIRED', message: 'Is required' }
      ]
    };
    render(<ErrorBanner error={error} locale="en" />);
    
    // Check main translated message
    expect(screen.getByText('Invalid input')).not.toBeNull();
    // Check details list items
    expect(screen.getByText('amountVnd: Must be positive')).not.toBeNull();
    expect(screen.getByText('categoryId: Is required')).not.toBeNull();
  });
});
