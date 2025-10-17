import { describe, it, expect, vi } from 'vitest'
import { authErrorHandler } from '../authErrorHandler'
import { toast } from 'react-toastify'

vi.mock('react-toastify', () => ({
  toast: {
    error: vi.fn()
  }
}))

describe('AuthErrorHandler', () => {
  describe('handleAuthError', () => {
    it('should handle invalid credentials error', () => {
      const error = new Error('Invalid login credentials')
      const result = authErrorHandler.handleAuthError(error)
      
      expect(result.message).toContain('Invalid email or password')
      expect(result.shouldRetry).toBe(false)
      expect(result.shouldClearSession).toBe(false)
    })

    it('should handle email not confirmed error', () => {
      const error = new Error('Email not confirmed')
      const result = authErrorHandler.handleAuthError(error)
      
      expect(result.message).toContain('check your email')
      expect(result.shouldRetry).toBe(false)
    })

    it('should handle rate limiting error', () => {
      const error = new Error('Too many requests')
      const result = authErrorHandler.handleAuthError(error)
      
      expect(result.message).toContain('Too many login attempts')
      expect(result.shouldRetry).toBe(true)
    })

    it('should handle network error', () => {
      const error = new Error('Failed to fetch')
      const result = authErrorHandler.handleAuthError(error)
      
      expect(result.message).toContain('Network error')
      expect(result.shouldRetry).toBe(true)
    })

    it('should handle session expired error', () => {
      const error = new Error('session expired')
      const result = authErrorHandler.handleAuthError(error)
      
      expect(result.message).toContain('session has expired')
      expect(result.shouldClearSession).toBe(true)
    })

    it('should handle 400 error', () => {
      const error = new Error('400 Bad Request')
      const result = authErrorHandler.handleAuthError(error)
      
      expect(result.shouldClearSession).toBe(true)
      expect(result.recoveryAction).toBeDefined()
    })
  })

  describe('isRecoverable', () => {
    it('should return true for network errors', () => {
      const error = new Error('Network error')
      expect(authErrorHandler.isRecoverable(error)).toBe(true)
    })

    it('should return false for invalid credentials', () => {
      const error = new Error('Invalid login credentials')
      expect(authErrorHandler.isRecoverable(error)).toBe(false)
    })
  })

  describe('shouldClearSession', () => {
    it('should return true for session errors', () => {
      const error = new Error('session expired')
      expect(authErrorHandler.shouldClearSession(error)).toBe(true)
    })

    it('should return false for credential errors', () => {
      const error = new Error('Invalid login credentials')
      expect(authErrorHandler.shouldClearSession(error)).toBe(false)
    })
  })
})
