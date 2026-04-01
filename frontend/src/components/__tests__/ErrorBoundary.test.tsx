import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

// Component that throws an error
const ThrowError = () => {
  throw new Error('Test error');
};

describe('ErrorBoundary', () => {
  // Suppress console.error for error boundary tests
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  it('should render children when there is no error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <div>Test Content</div>
      </ErrorBoundary>
    );

    expect(getByText('Test Content')).toBeInTheDocument();
  });

  it('should display error message when child component throws', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(getByText('Oops! Something went wrong')).toBeInTheDocument();
  });

  it('should have reload button in error state', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const reloadButton = getByText('Reload Page');
    expect(reloadButton).toBeInTheDocument();
  });

  it('should have go home button in error state', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const homeButton = getByText('Go Home');
    expect(homeButton).toBeInTheDocument();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });
});

declare global {
  function getByText(text: string): HTMLElement;
}
