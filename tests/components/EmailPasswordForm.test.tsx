import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import EmailPasswordForm from '@/components/EmailPasswordForm';

expect.extend(toHaveNoViolations);

describe('EmailPasswordForm', () => {
  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders email and password input fields', () => {
      render(
        <EmailPasswordForm
          mode="login"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('renders submit button with correct text for login mode', () => {
      render(
        <EmailPasswordForm
          mode="login"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('renders submit button with correct text for signup mode', () => {
      render(
        <EmailPasswordForm
          mode="signup"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const submitButton = screen.getByRole('button', { name: /sign up/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('renders confirm password field in signup mode', () => {
      render(
        <EmailPasswordForm
          mode="signup"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      expect(confirmPasswordInput).toBeInTheDocument();
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    });

    it('does not render confirm password field in login mode', () => {
      render(
        <EmailPasswordForm
          mode="login"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const confirmPasswordInput = screen.queryByLabelText(/confirm password/i);
      expect(confirmPasswordInput).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('calls API with correct data on successful login', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: '123', email: 'test@example.com' } }),
      });

      render(
        <EmailPasswordForm
          mode="login"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
          }),
        });
      });

      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('calls API with correct data on successful signup', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: '123', email: 'test@example.com' } }),
      });

      render(
        <EmailPasswordForm
          mode="signup"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      await user.type(emailInput, 'newuser@example.com');
      await user.type(passwordInput, 'SecurePass123!');
      await user.type(confirmPasswordInput, 'SecurePass123!');
      await user.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'newuser@example.com',
            password: 'SecurePass123!',
          }),
        });
      });

      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('handles API error responses correctly', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid credentials' }),
      });

      render(
        <EmailPasswordForm
          mode="login"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Invalid credentials');
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('handles network errors correctly', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      render(
        <EmailPasswordForm
          mode="login"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.stringContaining('Network error')
        );
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('displays error for invalid email format', async () => {
      const user = userEvent.setup();

      render(
        <EmailPasswordForm
          mode="login"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'invalidemail');
      await user.click(submitButton);

      const errorMessage = await screen.findByText(/valid email/i);
      expect(errorMessage).toBeInTheDocument();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('displays error for empty email field', async () => {
      const user = userEvent.setup();

      render(
        <EmailPasswordForm
          mode="login"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      const errorMessage = await screen.findByText(/email.*required/i);
      expect(errorMessage).toBeInTheDocument();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('displays error for empty password field', async () => {
      const user = userEvent.setup();

      render(
        <EmailPasswordForm
          mode="login"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      const errorMessage = await screen.findByText(/password.*required/i);
      expect(errorMessage).toBeInTheDocument();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('displays error for short password in signup mode', async () => {
      const user = userEvent.setup();

      render(
        <EmailPasswordForm
          mode="signup"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'short');
      await user.click(submitButton);

      const errorMessage = await screen.findByText(/password.*at least.*characters/i);
      expect(errorMessage).toBeInTheDocument();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('displays error when passwords do not match in signup mode', async () => {
      const user = userEvent.setup();

      render(
        <EmailPasswordForm
          mode="signup"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password456');
      await user.click(submitButton);

      const errorMessage = await screen.findByText(/passwords.*match/i);
      expect(errorMessage).toBeInTheDocument();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('clears validation errors when user corrects input', async () => {
      const user = userEvent.setup();

      render(
        <EmailPasswordForm
          mode="login"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Trigger validation error
      await user.type(emailInput, 'invalidemail');
      await user.click(submitButton);

      const errorMessage = await screen.findByText(/valid email/i);
      expect(errorMessage).toBeInTheDocument();

      // Correct the input
      await user.clear(emailInput);
      await user.type(emailInput, 'valid@example.com');

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/valid email/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Account Lockout', () => {
    it('displays lockout message when account is locked', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Account locked',
          lockedUntil: new Date(Date.now() + 900000).toISOString(), // 15 minutes
        }),
      });

      render(
        <EmailPasswordForm
          mode="login"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'locked@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      const lockoutMessage = await screen.findByText(/account.*locked/i);
      expect(lockoutMessage).toBeInTheDocument();
      expect(lockoutMessage).toHaveTextContent(/15.*minute/i);
    });

    it('disables form inputs when account is locked', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Account locked',
          lockedUntil: new Date(Date.now() + 600000).toISOString(),
        }),
      });

      render(
        <EmailPasswordForm
          mode="login"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'locked@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(emailInput).toBeDisabled();
        expect(passwordInput).toBeDisabled();
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Submit Button State', () => {
    it('disables submit button during form submission', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: any) => void;
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (global.fetch as jest.Mock).mockReturnValueOnce(delayedPromise);

      render(
        <EmailPasswordForm
          mode="login"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      expect(submitButton).not.toBeDisabled();

      await user.click(submitButton);

      // Button should be disabled during submission
      expect(submitButton).toBeDisabled();

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: async () => ({ user: { id: '123' } }),
      });

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('shows loading state on submit button during submission', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: any) => void;
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (global.fetch as jest.Mock).mockReturnValueOnce(delayedPromise);

      render(
        <EmailPasswordForm
          mode="login"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Button should show loading text/state
      expect(
        screen.getByRole('button', { name: /signing in|loading/i })
      ).toBeInTheDocument();

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: async () => ({ user: { id: '123' } }),
      });

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('re-enables submit button after submission completes', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid credentials' }),
      });

      render(
        <EmailPasswordForm
          mode="login"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalled();
      });

      // Button should be re-enabled after error
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('has no accessibility violations in login mode', async () => {
      const { container } = render(
        <EmailPasswordForm
          mode="login"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations in signup mode', async () => {
      const { container } = render(
        <EmailPasswordForm
          mode="signup"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper ARIA labels for all form fields', () => {
      render(
        <EmailPasswordForm
          mode="signup"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      expect(emailInput).toHaveAccessibleName();
      expect(passwordInput).toHaveAccessibleName();
      expect(confirmPasswordInput).toHaveAccessibleName();
    });

    it('associates error messages with form fields using aria-describedby', async () => {
      const user = userEvent.setup();

      render(
        <EmailPasswordForm
          mode="login"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'invalidemail');
      await user.click(submitButton);

      const errorMessage = await screen.findByText(/valid email/i);
      const errorId = errorMessage.getAttribute('id');

      expect(emailInput).toHaveAttribute('aria-describedby', errorId);
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();

      render(
        <EmailPasswordForm
          mode="login"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Tab through form elements
      await user.tab();
      expect(emailInput).toHaveFocus();

      await user.tab();
      expect(passwordInput).toHaveFocus();

      await user.tab();
      expect(submitButton).toHaveFocus();
    });

    it('allows form submission via Enter key', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: '123' } }),
      });

      render(
        <EmailPasswordForm
          mode="login"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123{Enter}');

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('announces error messages to screen readers', async () => {
      const user = userEvent.setup();

      render(
        <EmailPasswordForm
          mode="login"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      const errorMessage = await screen.findByText(/email.*required/i);

      // Error region should have role="alert" or aria-live="polite"
      const errorContainer = errorMessage.closest('[role="alert"], [aria-live]');
      expect(errorContainer).toBeInTheDocument();
    });
  });

  describe('Form Reset', () => {
    it('clears form fields after successful submission', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: '123' } }),
      });

      render(
        <EmailPasswordForm
          mode="signup"
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      );

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement;
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i) as HTMLInputElement;
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });

      // Form should be cleared
      expect(emailInput.value).toBe('');
      expect(passwordInput.value).toBe('');
      expect(confirmPasswordInput.value).toBe('');
    });
  });
});
