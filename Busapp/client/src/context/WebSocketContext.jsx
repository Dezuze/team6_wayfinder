import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';

const WebSocketContext = createContext();

export function WebSocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [passes, setPasses] = useState([]);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // When running with Vite dev server on port 5173, proxy forwards /ws to 3001
    // If not proxied or running directly, default to localhost:3001
    const host = window.location.port === '5173' ? window.location.host : 'localhost:3001';
    const wsUrl = `${protocol}//${host}/ws`;

    console.log('Connecting to WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket Connected');
      setIsConnected(true);
      // Request initial snapshot just in case
      ws.send(JSON.stringify({ type: 'REQUEST_INIT' }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'INIT_DATA') {
          if (data.buses) setBuses(data.buses);
          if (data.routes) setRoutes(data.routes);
          if (data.passes) setPasses(data.passes);
        } else if (data.type === 'BUS_LOCATION_UPDATE') {
          if (data.buses) setBuses(data.buses);
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket Disconnected. Reconnecting in 3s...');
      setIsConnected(false);
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = (err) => {
      console.error('WebSocket Error:', err);
      ws.close();
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  // Method called by Driver View to send location stream
  const streamDriverLocation = useCallback((busId, lat, lng, speed, status) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'DRIVER_LOCATION',
        busId,
        lat,
        lng,
        speed,
        status
      }));
    }
  }, []);

  // Method called by Driver View when SOS is pressed
  const streamDriverSOS = useCallback((busId, reason) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'DRIVER_SOS',
        busId,
        reason
      }));
    }
  }, []);

  // Refresh data via REST or WS
  const refreshData = useCallback(async () => {
    try {
      const [resBuses, resRoutes, resPasses] = await Promise.all([
        fetch('/api/buses').then(r => r.json()),
        fetch('/api/routes').then(r => r.json()),
        fetch('/api/passes').then(r => r.json())
      ]);
      if (resBuses.success) setBuses(resBuses.buses);
      if (resRoutes.success) setRoutes(resRoutes.routes);
      if (resPasses.success) setPasses(resPasses.passes);
    } catch (err) {
      console.error('Error refreshing REST data:', err);
    }
  }, []);

  return (
    <WebSocketContext.Provider value={{
      isConnected,
      buses,
      routes,
      passes,
      streamDriverLocation,
      streamDriverSOS,
      refreshData
    }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export const useWebSocket = () => useContext(WebSocketContext);
