/**
 * Authentication Error Handler
 * Provides user-friendly error messages and recovery strategies
 */

import { AuthError } from '@supabase/supabase-js'
import { toast } from 'react-toastify'

export interface AuthErrorInfo {
  message: string
  shouldRetry: boolean
  shouldClearSession: boolean
  recoveryAction?: () => void
}

export const authErrorHandler = {
  /**
   * Parse and handle authentication errors
   */
  handleAuthError(error: AuthError | Error | unknown): AuthErrorInfo {
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    console.error('[AuthErrorHandler] Handling error:', errorMessage)

    // Invalid credentials
    if (errorMessage.includes('Invalid login credentials')) {
      return {
        message: 'Invalid email or password. Please check your credentials and try again.',
        shouldRetry: false,
        shouldClearSession: false
      }
    }

    // Email not confirmed
    if (errorMessage.includes('Email not confirmed')) {
      return {
        message: 'Please check your email and confirm your account before logging in.',
        shouldRetry: false,
        shouldClearSession: false
      }
    }

    // Rate limiting
    if (errorMessage.includes('Too many requests') || errorMessage.includes('rate limit')) {
      return {
        message: 'Too many login attempts. Please wait a few minutes and try again.',
        shouldRetry: true,
        shouldClearSession: false
      }
    }

    // Network errors
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network')) {
      return {
        message: 'Network error. Please check your internet connection and try again.',
        shouldRetry: true,
        shouldClearSession: false
      }
    }

    // Session expired or invalid
    if (errorMessage.includes('session') || errorMessage.includes('token') || errorMessage.includes('400')) {
      return {
        message: 'Your session has expired. Please log in again.',
        shouldRetry: false,
        shouldClearSession: true,
        recoveryAction: () => {
          // Clear all auth-related storage
          localStorage.removeItem('takestakestakes-auth')
          localStorage.removeItem('takestakestakes-auth-timestamp')
          sessionStorage.clear()
        }
      }
    }

    // User already registered
    if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
      return {
        message: 'An account with this email already exists. Please log in instead.',
        shouldRetry: false,
        shouldClearSession: false
      }
    }

    // Weak password
    if (errorMessage.includes('password') && errorMessage.includes('weak')) {
      return {
        message: 'Password is too weak. Please use a stronger password with at least 6 characters.',
        shouldRetry: false,
        shouldClearSession: false
      }
    }

    // Generic error
    return {
      message: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
      shouldRetry: true,
      shouldClearSession: false
    }
  },

  /**
   * Display error toast with appropriate message
   */
  showError(error: AuthError | Error | unknown): AuthErrorInfo {
    const errorInfo = this.handleAuthError(error)
    toast.error(errorInfo.message)
    
    // Execute recovery action if provided
    if (errorInfo.recoveryAction) {
      errorInfo.recoveryAction()
    }
    
    return errorInfo
  },

  /**
   * Check if error is recoverable
   */
  isRecoverable(error: AuthError | Error | unknown): boolean {
    const errorInfo = this.handleAuthError(error)
    return errorInfo.shouldRetry
  },

  /**
   * Check if session should be cleared
   */
  shouldClearSession(error: AuthError | Error | unknown): boolean {
    const errorInfo = this.handleAuthError(error)
    return errorInfo.shouldClearSession
  }
}
