import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useSupabaseAuthContext } from '../context/SupabaseAuthContext';

export interface Notification {
  id: string;
  type: 'challenge' | 'friend_request' | 'game_result' | 'system';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  created_at: string;
}

export const useNotifications = () => {
  const { user } = useSupabaseAuthContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch pending game invitations and friend requests
  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      // Fetch pending game invitations for this user
      const { data: invitations, error } = await supabase
        .from('game_invitations')
        .select(`
          id,
          from_user_id,
          time_control,
          message,
          status,
          created_at,
          expires_at
        `)
        .eq('to_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching invitations:', error);
      }

      // Fetch pending friend requests
      const { data: friendRequests, error: frError } = await supabase
        .from('friend_requests')
        .select('id, sender_id, status, created_at')
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (frError) {
        console.error('Error fetching friend requests:', frError);
      }

      // Get sender profiles for both invitations and friend requests
      const invitationSenderIds = invitations?.map(inv => inv.from_user_id) || [];
      const friendRequestSenderIds = friendRequests?.map(fr => fr.sender_id) || [];
      const allSenderIds = [...invitationSenderIds, ...friendRequestSenderIds];
      
      let senderProfiles: any[] = [];
      
      if (allSenderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, rating, avatar_url')
          .in('id', allSenderIds);
        
        senderProfiles = profiles || [];
      }

      // Convert invitations to notifications
      const invitationNotifs: Notification[] = (invitations || []).map(inv => {
        const sender = senderProfiles.find(p => p.id === inv.from_user_id);
        return {
          id: inv.id,
          type: 'challenge' as const,
          title: 'Game Challenge',
          message: `${sender?.username || 'Someone'} (${sender?.rating || 1200}) challenged you to a ${inv.time_control} game`,
          data: {
            invitation: inv,
            sender
          },
          read: false,
          created_at: inv.created_at
        };
      });

      // Convert friend requests to notifications
      const friendRequestNotifs: Notification[] = (friendRequests || []).map(fr => {
        const sender = senderProfiles.find(p => p.id === fr.sender_id);
        return {
          id: fr.id,
          type: 'friend_request' as const,
          title: 'Friend Request',
          message: `${sender?.username || 'Someone'} sent you a friend request`,
          data: {
            friendRequest: fr,
            sender
          },
          read: false,
          created_at: fr.created_at
        };
      });

      // Combine and sort all notifications
      const allNotifs = [...invitationNotifs, ...friendRequestNotifs].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setNotifications(allNotifs);
      setUnreadCount(allNotifs.length);
    } catch (error) {
      console.error('Error in fetchNotifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Remove notification
  const removeNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Subscribe to real-time updates for game invitations and friend requests
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'game_invitations',
        filter: `to_user_id=eq.${user.id}`
      }, async (payload) => {
        console.log('New invitation received:', payload);
        
        // Fetch sender profile
        const { data: sender } = await supabase
          .from('profiles')
          .select('id, username, rating, avatar_url')
          .eq('id', payload.new.from_user_id)
          .single();

        const newNotif: Notification = {
          id: payload.new.id,
          type: 'challenge',
          title: 'Game Challenge',
          message: `${sender?.username || 'Someone'} (${sender?.rating || 1200}) challenged you to a ${payload.new.time_control} game`,
          data: {
            invitation: payload.new,
            sender
          },
          read: false,
          created_at: payload.new.created_at
        };

        setNotifications(prev => [newNotif, ...prev]);
        setUnreadCount(prev => prev + 1);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_invitations',
        filter: `to_user_id=eq.${user.id}`
      }, (payload) => {
        // If invitation was accepted/declined/expired, remove it
        if (payload.new.status !== 'pending') {
          removeNotification(payload.new.id);
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'game_invitations',
        filter: `to_user_id=eq.${user.id}`
      }, (payload) => {
        removeNotification(payload.old.id);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'friend_requests',
        filter: `receiver_id=eq.${user.id}`
      }, async (payload) => {
        console.log('New friend request received:', payload);
        
        // Fetch sender profile
        const { data: sender } = await supabase
          .from('profiles')
          .select('id, username, rating, avatar_url')
          .eq('id', payload.new.sender_id)
          .single();

        const newNotif: Notification = {
          id: payload.new.id,
          type: 'friend_request',
          title: 'Friend Request',
          message: `${sender?.username || 'Someone'} sent you a friend request`,
          data: {
            friendRequest: payload.new,
            sender
          },
          read: false,
          created_at: payload.new.created_at
        };

        setNotifications(prev => [newNotif, ...prev]);
        setUnreadCount(prev => prev + 1);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'friend_requests',
        filter: `receiver_id=eq.${user.id}`
      }, (payload) => {
        // If friend request was accepted/rejected, remove it
        if (payload.new.status !== 'pending') {
          removeNotification(payload.new.id);
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'friend_requests',
        filter: `receiver_id=eq.${user.id}`
      }, (payload) => {
        removeNotification(payload.old.id);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, removeNotification]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    removeNotification,
    clearAll,
    refetch: fetchNotifications
  };
};
