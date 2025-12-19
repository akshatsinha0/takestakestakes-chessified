import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useUserPresence = (userId: string | undefined) => {
  useEffect(() => {
    if (!userId) return;

    // Update last_active in profiles table on mount and every 2 minutes
    const updatePresence = async () => {
      try {
        await supabase
          .from('profiles')
          .update({
            last_active: new Date().toISOString()
          })
          .eq('id', userId);
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    };

    // Update immediately
    updatePresence();

    // Update every 2 minutes
    const interval = setInterval(updatePresence, 2 * 60 * 1000);

    // Update on page visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId]);
};
