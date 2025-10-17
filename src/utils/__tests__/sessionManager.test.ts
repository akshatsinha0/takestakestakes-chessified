import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Supabase before importing sessionManager
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      refreshSession: vi.fn()
    }
  }
}))

import { sessionManager } from '../sessionManager'

describe('SessionManager', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('hasValidSession', () => {
    it('should return false when no session exists', () => {
      expect(sessionManager.hasValidSession()).toBe(false)
    })

    it('should return false when session is expired', () => {
      const oldTimestamp = Date.now() - (8 * 24 * 60 * 60 * 1000) // 8 days ago
      localStorage.setItem('takestakestakes-auth-timestamp', oldTimestamp.toString())
      localStorage.setItem('takestakestakes-auth', 'some-session-data')
      
      expect(sessionManager.hasValidSession()).toBe(false)
    })

    it('should return true when session is valid', () => {
      const recentTimestamp = Date.now() - (1 * 24 * 60 * 60 * 1000) // 1 day ago
      localStorage.setItem('takestakestakes-auth-timestamp', recentTimestamp.toString())
      localStorage.setItem('takestakestakes-auth', 'some-session-data')
      
      expect(sessionManager.hasValidSession()).toBe(true)
    })
  })

  describe('updateTimestamp', () => {
    it('should update the timestamp in localStorage', () => {
      const beforeTime = Date.now()
      sessionManager.updateTimestamp()
      const afterTime = Date.now()
      
      const storedTimestamp = parseInt(localStorage.getItem('takestakestakes-auth-timestamp') || '0', 10)
      
      expect(storedTimestamp).toBeGreaterThanOrEqual(beforeTime)
      expect(storedTimestamp).toBeLessThanOrEqual(afterTime)
    })
  })

  describe('clearSession', () => {
    it('should clear all session data from localStorage', () => {
      localStorage.setItem('takestakestakes-auth', 'session-data')
      localStorage.setItem('takestakestakes-auth-timestamp', Date.now().toString())
      
      sessionManager.clearSession()
      
      expect(localStorage.getItem('takestakestakes-auth')).toBeNull()
      expect(localStorage.getItem('takestakestakes-auth-timestamp')).toBeNull()
    })
  })
})
