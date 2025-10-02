/**
 * Contract Tests: POST /api/auth/email-signin - Error Cases
 *
 * This test file validates error handling for the email sign-in API endpoint.
 * Tests cover validation errors, authentication failures, rate limiting, and OAuth precedence.
 *
 * EXPECTED: These tests will FAIL initially because the API route does not exist yet.
 * Once the route is implemented, these tests define the contract that must be satisfied.
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/email-signin/route';
import { createClient } from '@/lib/supabase/server';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

// Mock Next.js headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

describe('POST /api/auth/email-signin - Error Cases', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Create mock Supabase client
    mockSupabaseClient = {
      auth: {
        signInWithPassword: jest.fn(),
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
      })),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabaseClient);
  });

  describe('Validation Errors', () => {
    it('should return 400 when email is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/email-signin', {
        method: 'POST',
        body: JSON.stringify({
          password: 'ValidPass123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Validation error',
        details: {
          email: 'Email is required',
        },
      });
    });

    it('should return 400 when password is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/email-signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'user@example.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Validation error',
        details: {
          password: 'Password is required',
        },
      });
    });

    it('should return 400 when email format is invalid', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/email-signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'ValidPass123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Validation error',
        details: {
          email: 'Invalid email format',
        },
      });
    });

    it('should return 400 when both email and password are missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/email-signin', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Validation error',
        details: {
          email: 'Email is required',
          password: 'Password is required',
        },
      });
    });

    it('should return 400 when request body is malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/email-signin', {
        method: 'POST',
        body: 'invalid-json{',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Invalid request body',
      });
    });
  });

  describe('Authentication Failures', () => {
    it('should return 401 with generic error for invalid credentials', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials', status: 400 },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/email-signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'wrong@example.com',
          password: 'WrongPassword123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        error: 'Invalid credentials',
      });
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'wrong@example.com',
        password: 'WrongPassword123!',
      });
    });

    it('should return 401 with generic error for non-existent user', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email not confirmed', status: 400 },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/email-signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        error: 'Invalid credentials',
      });
    });

    it('should not expose specific failure reasons in error message', async () => {
      // Test that we don't leak information about whether email exists, password is wrong, etc.
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Password is incorrect', status: 400 },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/email-signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'WrongPassword123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid credentials');
      expect(data.error).not.toContain('password');
      expect(data.error).not.toContain('email');
      expect(data.error).not.toContain('incorrect');
    });
  });

  describe('Rate Limiting & Account Lockout', () => {
    it('should return 429 after 5 failed login attempts', async () => {
      // Mock failed login attempts tracking
      const loginAttempts = [
        { timestamp: Date.now() - 4000 },
        { timestamp: Date.now() - 3000 },
        { timestamp: Date.now() - 2000 },
        { timestamp: Date.now() - 1000 },
        { timestamp: Date.now() },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { failed_attempts: loginAttempts },
          error: null,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/auth/email-signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'locked@example.com',
          password: 'SomePassword123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data).toEqual({
        error: 'Too many login attempts. Please try again later.',
        retryAfter: expect.any(Number),
      });
      expect(data.retryAfter).toBeGreaterThan(0);
    });

    it('should enforce lockout window of 15 minutes after 5 failed attempts', async () => {
      const now = Date.now();
      const loginAttempts = [
        { timestamp: now - 14 * 60 * 1000 }, // 14 minutes ago
        { timestamp: now - 13 * 60 * 1000 },
        { timestamp: now - 12 * 60 * 1000 },
        { timestamp: now - 11 * 60 * 1000 },
        { timestamp: now - 10 * 60 * 1000 },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { failed_attempts: loginAttempts },
          error: null,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/auth/email-signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'locked@example.com',
          password: 'SomePassword123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.retryAfter).toBeLessThanOrEqual(15 * 60); // Max 15 minutes
      expect(data.retryAfter).toBeGreaterThan(0); // Still within lockout period
    });

    it('should allow login after lockout window expires', async () => {
      const now = Date.now();
      const loginAttempts = [
        { timestamp: now - 20 * 60 * 1000 }, // 20 minutes ago (outside lockout window)
        { timestamp: now - 19 * 60 * 1000 },
        { timestamp: now - 18 * 60 * 1000 },
        { timestamp: now - 17 * 60 * 1000 },
        { timestamp: now - 16 * 60 * 1000 },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { failed_attempts: loginAttempts },
          error: null,
        }),
      });

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'locked@example.com' },
          session: { access_token: 'token-123' },
        },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/email-signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'locked@example.com',
          password: 'CorrectPassword123!',
        }),
      });

      const response = await POST(request);

      // Should not be locked out - should proceed with normal auth flow
      expect(response.status).not.toBe(429);
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalled();
    });
  });

  describe('OAuth Precedence', () => {
    it('should return 403 when user signed up with OAuth provider', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            email: 'oauth@example.com',
            oauth_provider: 'google',
          },
          error: null,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/auth/email-signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'oauth@example.com',
          password: 'SomePassword123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({
        error: 'This account uses OAuth authentication. Please sign in with Google.',
        provider: 'google',
      });
      expect(mockSupabaseClient.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it('should return correct provider name for GitHub OAuth users', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            email: 'github@example.com',
            oauth_provider: 'github',
          },
          error: null,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/auth/email-signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'github@example.com',
          password: 'SomePassword123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({
        error: 'This account uses OAuth authentication. Please sign in with GitHub.',
        provider: 'github',
      });
    });

    it('should check OAuth precedence before attempting password authentication', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            email: 'oauth@example.com',
            oauth_provider: 'google',
          },
          error: null,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/auth/email-signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'oauth@example.com',
          password: 'ValidPassword123!',
        }),
      });

      await POST(request);

      // Verify Supabase signInWithPassword was never called
      expect(mockSupabaseClient.auth.signInWithPassword).not.toHaveBeenCalled();
    });
  });

  describe('Server Errors', () => {
    it('should return 500 when Supabase client creation fails', async () => {
      (createClient as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/auth/email-signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'ValidPass123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: 'An error occurred during sign in',
      });
    });

    it('should return 500 when Supabase auth throws unexpected error', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockRejectedValue(
        new Error('Unexpected database error')
      );

      const request = new NextRequest('http://localhost:3000/api/auth/email-signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'ValidPass123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: 'An error occurred during sign in',
      });
    });

    it('should not expose internal error details in response', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockRejectedValue(
        new Error('Internal: Database connection to auth.users table failed at row 42')
      );

      const request = new NextRequest('http://localhost:3000/api/auth/email-signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'ValidPass123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('An error occurred during sign in');
      expect(data.error).not.toContain('Database');
      expect(data.error).not.toContain('table');
      expect(data.error).not.toContain('row 42');
      expect(data).not.toHaveProperty('message');
      expect(data).not.toHaveProperty('stack');
    });

    it('should return 500 when user metadata lookup fails', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Database query timeout')),
      });

      const request = new NextRequest('http://localhost:3000/api/auth/email-signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'ValidPass123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: 'An error occurred during sign in',
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle email with mixed case consistently', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials', status: 400 },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/email-signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'User@Example.COM',
          password: 'ValidPass123!',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: expect.stringMatching(/^[a-z@.]+$/), // Should be normalized to lowercase
        password: 'ValidPass123!',
      });
    });

    it('should trim whitespace from email input', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials', status: 400 },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/email-signin', {
        method: 'POST',
        body: JSON.stringify({
          email: '  user@example.com  ',
          password: 'ValidPass123!',
        }),
      });

      const response = await POST(request);

      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com', // Trimmed
        password: 'ValidPass123!',
      });
    });

    it('should reject request with empty string email', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/email-signin', {
        method: 'POST',
        body: JSON.stringify({
          email: '',
          password: 'ValidPass123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Validation error',
        details: {
          email: 'Email is required',
        },
      });
    });

    it('should reject request with empty string password', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/email-signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'user@example.com',
          password: '',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Validation error',
        details: {
          password: 'Password is required',
        },
      });
    });
  });
});
