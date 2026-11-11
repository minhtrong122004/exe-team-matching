import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '../api/client';

export interface RealtimeContextType {
  connection: HubConnection | null;
  isConnected: boolean;
  joinSpace: (spaceId: string) => Promise<void>;
  leaveSpace: (spaceId: string) => Promise<void>;
  joinGroup: (groupId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

// Xác định URL của SignalR Hub linh hoạt theo baseURL
const getHubUrl = (): string => {
  if (API_BASE_URL.startsWith('http://') || API_BASE_URL.startsWith('https://')) {
    try {
      const parsed = new URL(API_BASE_URL);
      return `${parsed.origin}/hubs/realtime`;
    } catch {
      return '/hubs/realtime';
    }
  }
  return '/hubs/realtime';
};

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const connectionRef = useRef<HubConnection | null>(null);
  const activeSpacesRef = useRef<Set<string>>(new Set());
  const activeGroupsRef = useRef<Set<string>>(new Set());

  // Khởi tạo và quản lý vòng đời kết nối SignalR
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!user || !token) {
      if (connectionRef.current) {
        void connectionRef.current.stop();
        connectionRef.current = null;
        setConnection(null);
        setIsConnected(false);
      }
      return;
    }

    const hubUrl = getHubUrl();
    const newConn = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => localStorage.getItem('access_token') || '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build();

    // Đăng ký toàn bộ event listeners từ Server bắn về
    newConn.on('UserRegistered', (payload) => {
      window.dispatchEvent(new CustomEvent('realtime:user-registered', { detail: payload }));
    });

    newConn.on('JoinRequestCreated', (payload) => {
      window.dispatchEvent(new CustomEvent('realtime:join-request-created', { detail: payload }));
      window.dispatchEvent(new Event('notifications:updated'));
      window.dispatchEvent(new CustomEvent('realtime:group-updated', { detail: payload }));
    });

    newConn.on('JoinRequestDecided', (payload) => {
      window.dispatchEvent(new CustomEvent('realtime:join-request-decided', { detail: payload }));
      window.dispatchEvent(new Event('notifications:updated'));
      window.dispatchEvent(new CustomEvent('realtime:group-updated', { detail: payload }));
      window.dispatchEvent(new CustomEvent('realtime:space-updated', { detail: payload }));
    });

    newConn.on('MemberJoined', (payload) => {
      window.dispatchEvent(new CustomEvent('realtime:member-joined', { detail: payload }));
      window.dispatchEvent(new CustomEvent('realtime:group-updated', { detail: payload }));
      window.dispatchEvent(new CustomEvent('realtime:space-updated', { detail: payload }));
    });

    newConn.on('MemberLeft', (payload) => {
      window.dispatchEvent(new CustomEvent('realtime:member-left', { detail: payload }));
      window.dispatchEvent(new CustomEvent('realtime:group-updated', { detail: payload }));
      window.dispatchEvent(new CustomEvent('realtime:space-updated', { detail: payload }));
    });

    newConn.on('MemberRemoved', (payload) => {
      window.dispatchEvent(new CustomEvent('realtime:member-removed', { detail: payload }));
      window.dispatchEvent(new Event('notifications:updated'));
      window.dispatchEvent(new CustomEvent('realtime:group-updated', { detail: payload }));
      window.dispatchEvent(new CustomEvent('realtime:space-updated', { detail: payload }));
    });

    newConn.on('RoomOccupancyChanged', (payload) => {
      window.dispatchEvent(new CustomEvent('realtime:room-occupancy-changed', { detail: payload }));
      window.dispatchEvent(new CustomEvent('realtime:space-updated', { detail: payload }));
    });

    newConn.on('SpaceFinalized', (payload) => {
      window.dispatchEvent(new CustomEvent('realtime:space-finalized', { detail: payload }));
      window.dispatchEvent(new CustomEvent('realtime:space-updated', { detail: payload }));
      window.dispatchEvent(new Event('notifications:updated'));
    });

    newConn.on('SpaceStatusChanged', (payload) => {
      window.dispatchEvent(new CustomEvent('realtime:space-status-changed', { detail: payload }));
      window.dispatchEvent(new CustomEvent('realtime:space-updated', { detail: payload }));
    });

    newConn.on('MemberTransferred', (payload) => {
      window.dispatchEvent(new CustomEvent('realtime:member-transferred', { detail: payload }));
      window.dispatchEvent(new CustomEvent('realtime:space-updated', { detail: payload }));
      window.dispatchEvent(new CustomEvent('realtime:group-updated', { detail: payload }));
      window.dispatchEvent(new CustomEvent('realtime:transfer-updated', { detail: payload }));
    });

    newConn.on('TransferRequestApproved', (payload) => {
      window.dispatchEvent(new CustomEvent('realtime:transfer-approved', { detail: payload }));
      window.dispatchEvent(new CustomEvent('realtime:transfer-updated', { detail: payload }));
      window.dispatchEvent(new CustomEvent('realtime:space-updated', { detail: payload }));
    });

    newConn.on('TransferRequestCreated', (payload) => {
      window.dispatchEvent(new CustomEvent('realtime:transfer-created', { detail: payload }));
      window.dispatchEvent(new CustomEvent('realtime:transfer-updated', { detail: payload }));
      window.dispatchEvent(new Event('notifications:updated'));
    });

    newConn.on('TransferRequestCancelled', (payload) => {
      window.dispatchEvent(new CustomEvent('realtime:transfer-cancelled', { detail: payload }));
      window.dispatchEvent(new CustomEvent('realtime:transfer-updated', { detail: payload }));
    });

    newConn.on('TransferRequestRejected', (payload) => {
      window.dispatchEvent(new CustomEvent('realtime:transfer-rejected', { detail: payload }));
      window.dispatchEvent(new CustomEvent('realtime:transfer-updated', { detail: payload }));
      window.dispatchEvent(new Event('notifications:updated'));
    });

    newConn.on('NewNotification', (payload) => {
      window.dispatchEvent(new CustomEvent('realtime:new-notification', { detail: payload }));
      window.dispatchEvent(new Event('notifications:updated'));
    });

    newConn.on('TeamStateChanged', (payload) => {
      window.dispatchEvent(new CustomEvent('realtime:team-state-changed', { detail: payload }));
      window.dispatchEvent(new CustomEvent('realtime:group-updated', { detail: payload }));
    });

    // Bắt đầu kết nối
    newConn.start()
      .then(() => {
        setIsConnected(true);
        setConnection(newConn);
        connectionRef.current = newConn;

        // Tự động re-join các space/group đang mở sau khi kết nối thành công
        activeSpacesRef.current.forEach((sId) => {
          void newConn.invoke('JoinSpace', sId).catch(() => {});
        });
        activeGroupsRef.current.forEach((gId) => {
          void newConn.invoke('JoinGroup', gId).catch(() => {});
        });
      })
      .catch((err) => {
        console.warn('[SignalR] Không thể khởi tạo kết nối realtime (sẽ tự động retry ngầm):', err?.message || err);
      });

    newConn.onreconnected(() => {
      setIsConnected(true);
      // Khi kết nối lại, tự động join lại các space/group đang theo dõi
      activeSpacesRef.current.forEach((sId) => {
        void newConn.invoke('JoinSpace', sId).catch(() => {});
      });
      activeGroupsRef.current.forEach((gId) => {
        void newConn.invoke('JoinGroup', gId).catch(() => {});
      });
    });

    newConn.onreconnecting(() => setIsConnected(false));
    newConn.onclose(() => setIsConnected(false));

    return () => {
      void newConn.stop();
      connectionRef.current = null;
      setConnection(null);
      setIsConnected(false);
    };
  }, [user]);

  const joinSpace = useCallback(async (spaceId: string) => {
    if (!spaceId) return;
    activeSpacesRef.current.add(spaceId);
    if (connectionRef.current && connectionRef.current.state === HubConnectionState.Connected) {
      try {
        await connectionRef.current.invoke('JoinSpace', spaceId);
      } catch (err) {
        console.debug('[SignalR] JoinSpace error:', err);
      }
    }
  }, []);

  const leaveSpace = useCallback(async (spaceId: string) => {
    if (!spaceId) return;
    activeSpacesRef.current.delete(spaceId);
    if (connectionRef.current && connectionRef.current.state === HubConnectionState.Connected) {
      try {
        await connectionRef.current.invoke('LeaveSpace', spaceId);
      } catch (err) {
        console.debug('[SignalR] LeaveSpace error:', err);
      }
    }
  }, []);

  const joinGroup = useCallback(async (groupId: string) => {
    if (!groupId) return;
    activeGroupsRef.current.add(groupId);
    if (connectionRef.current && connectionRef.current.state === HubConnectionState.Connected) {
      try {
        await connectionRef.current.invoke('JoinGroup', groupId);
      } catch (err) {
        console.debug('[SignalR] JoinGroup error:', err);
      }
    }
  }, []);

  const leaveGroup = useCallback(async (groupId: string) => {
    if (!groupId) return;
    activeGroupsRef.current.delete(groupId);
    if (connectionRef.current && connectionRef.current.state === HubConnectionState.Connected) {
      try {
        await connectionRef.current.invoke('LeaveGroup', groupId);
      } catch (err) {
        console.debug('[SignalR] LeaveGroup error:', err);
      }
    }
  }, []);

  // Lắng nghe ý định tham gia space từ useSelectedSpace hook
  useEffect(() => {
    const handleJoinIntent = (e: Event) => {
      const spaceId = (e as CustomEvent<string>).detail;
      if (spaceId) {
        void joinSpace(spaceId);
      }
    };
    window.addEventListener('realtime:join-space-intent', handleJoinIntent);
    return () => {
      window.removeEventListener('realtime:join-space-intent', handleJoinIntent);
    };
  }, [joinSpace]);

  // Lắng nghe ý định tham gia group từ MyGroupPage hoặc group details
  useEffect(() => {
    const handleJoinGroupIntent = (e: Event) => {
      const groupId = (e as CustomEvent<string>).detail;
      if (groupId) {
        void joinGroup(groupId);
      }
    };
    window.addEventListener('realtime:join-group-intent', handleJoinGroupIntent);
    return () => {
      window.removeEventListener('realtime:join-group-intent', handleJoinGroupIntent);
    };
  }, [joinGroup]);

  return (
    <RealtimeContext.Provider value={{ connection, isConnected, joinSpace, leaveSpace, joinGroup, leaveGroup }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = (): RealtimeContextType => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime phải được sử dụng bên trong RealtimeProvider');
  }
  return context;
};
