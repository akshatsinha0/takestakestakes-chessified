/**
 * Session Manager Utility
 * Handles session persistence and recovery
 */

import { supabase } from '../lib/supabase'

const SESSION_KEY = 'takestakestakes-auth'
const SESSION_TIMESTAMP_KEY = 'takestakestakes-auth-timestamp'
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

export const sessionManager = {
  /**
   * Check if session exists and is valid
   */
  hasValidSession(): boolean {
    try {
      const sessionData = localStorage.getItem(SESSION_KEY)
      const timestamp = localStorage.getItem(SESSION_TIMESTAMP_KEY)
      
      if (!sessionData || !timestamp) {
        return false
      }
      
      const age = Date.now() - parseInt(timestamp, 10)
      return age < SESSION_MAX_AGE
    } catch (error) {
      console.error('[SessionManager] Error checking session:', error)
      return false
    }
  },

  /**
   * Update session timestamp
   */
  updateTimestamp(): void {
    try {
      localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString())
    } catch (error) {
      console.error('[SessionManager] Error updating timestamp:', error)
    }
  },

  /**
   * Clear session data
   */
  clearSession(): void {
    try {
      localStorage.removeItem(SESSION_KEY)
      localStorage.removeItem(SESSION_TIMESTAMP_KEY)
    } catch (error) {
      console.error('[SessionManager] Error clearing session:', error)
    }
  },

  /**
   * Recover session from storage
   */
  async recoverSession(): Promise<boolean> {
    try {
      console.log('[SessionManager] Attempting session recovery...')
      
      if (!this.hasValidSession()) {
        console.log('[SessionManager] No valid session found')
        return false
      }

      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('[SessionManager] Error recovering session:', error)
        this.clearSession()
        return false
      }

      if (session) {
        console.log('[SessionManager] Session recovered successfully')
        this.updateTimestamp()
        return true
      }

      console.log('[SessionManager] No session found in Supabase')
      this.clearSession()
      return false
    } catch (error) {
      console.error('[SessionManager] Error in recoverSession:', error)
      this.clearSession()
      return false
    }
  },

  /**
   * Refresh session token
   */
  async refreshSession(): Promise<boolean> {
    try {
      console.log('[SessionManager] Refreshing session...')
      
      const { data: { session }, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('[SessionManager] Error refreshing session:', error)
        return false
      }

      if (session) {
        console.log('[SessionManager] Session refreshed successfully')
        this.updateTimestamp()
        return true
      }

      return false
    } catch (error) {
      console.error('[SessionManager] Error in refreshSession:', error)
      return false
    }
  }
}
