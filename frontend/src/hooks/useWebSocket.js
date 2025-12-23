import { useEffect, useRef, useCallback, useState } from 'react';
import { toast } from 'sonner';

// WebSocket notification types
export const NotificationType = {
  TOOL_ACCESS_UPDATED: 'tool_access_updated',
  TOOL_DELETED: 'tool_deleted',
  TOOL_CREATED: 'tool_created',
  ROLE_CHANGED: 'role_changed',
  USER_SUSPENDED: 'user_suspended',
  USER_REACTIVATED: 'user_reactivated',
  REFRESH_DASHBOARD: 'refresh_dashboard',
  CREDENTIALS_UPDATED: 'credentials_updated',
};

export const useWebSocket = (token, onMessage) => {
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!token) return;

    // Get WebSocket URL from backend URL
    const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
    const wsProtocol = backendUrl.startsWith('https') ? 'wss' : 'ws';
    const wsHost = backendUrl.replace(/^https?:\/\//, '').replace(/\/api$/, '');
    const wsUrl = `${wsProtocol}://${wsHost}/ws/${token}`;

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('[WS] Connected');
        setIsConnected(true);
        setReconnectAttempts(0);

        // Start ping interval to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send('ping');
          }
        }, 30000); // Ping every 30 seconds
      };

      wsRef.current.onmessage = (event) => {
        try {
          // Handle pong response
          if (event.data === 'pong') {
            return;
          }

          const data = JSON.parse(event.data);
          console.log('[WS] Message received:', data);

          // Call the onMessage callback
          if (onMessage) {
            onMessage(data);
          }

          // Show toast notification based on type
          handleNotification(data);
        } catch (error) {
          console.error('[WS] Error parsing message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('[WS] Disconnected:', event.code);
        setIsConnected(false);

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }

        // Attempt reconnection if not intentional close
        if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          console.log(`[WS] Reconnecting in ${delay}ms...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('[WS] Error:', error);
      };
    } catch (error) {
      console.error('[WS] Connection error:', error);
    }
  }, [token, onMessage, reconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close(1000);
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [token]); // Reconnect when token changes

  return { isConnected, disconnect, reconnect: connect };
};

// Handle notification display
const handleNotification = (data) => {
  const { type, message } = data;

  switch (type) {
    case NotificationType.TOOL_ACCESS_UPDATED:
      toast.info('Tool Access Updated', {
        description: message || 'Your tool access has been modified',
        action: {
          label: 'Refresh',
          onClick: () => window.location.reload(),
        },
      });
      break;

    case NotificationType.TOOL_DELETED:
      toast.warning('Tool Removed', {
        description: message || 'A tool has been removed from your account',
        action: {
          label: 'Refresh',
          onClick: () => window.location.reload(),
        },
      });
      break;

    case NotificationType.ROLE_CHANGED:
      toast.info('Role Changed', {
        description: message || 'Your account role has been updated',
        duration: 10000,
        action: {
          label: 'Refresh',
          onClick: () => window.location.reload(),
        },
      });
      break;

    case NotificationType.USER_SUSPENDED:
      toast.error('Account Suspended', {
        description: message || 'Your account has been suspended',
        duration: 10000,
      });
      // Force logout after short delay
      setTimeout(() => {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }, 3000);
      break;

    case NotificationType.USER_REACTIVATED:
      toast.success('Account Reactivated', {
        description: message || 'Your account has been reactivated',
      });
      break;

    case NotificationType.REFRESH_DASHBOARD:
      toast.info('Dashboard Update Available', {
        description: data.reason || 'New updates are available',
        action: {
          label: 'Refresh',
          onClick: () => window.location.reload(),
        },
      });
      break;

    default:
      console.log('[WS] Unknown notification type:', type);
  }
};

export default useWebSocket;
