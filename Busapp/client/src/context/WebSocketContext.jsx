import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';

const WebSocketContext = createContext();
const ROUTE_CACHE_KEY = 'wayfinder_custom_route_geometry';

function getRouteGeometryCache() {
  try {
    const raw = localStorage.getItem(ROUTE_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveRouteGeometryCache(cache) {
  try {
    localStorage.setItem(ROUTE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

function enrichRoute(route) {
  if (!route) return route;
  const cache = getRouteGeometryCache();
  const cachedData = cache[route.id] || cache[route.name];

  let path = route.path;
  let stopCoordinates = [];

  if (cachedData && Array.isArray(cachedData.path) && cachedData.path.length >= 2) {
    path = cachedData.path;
    stopCoordinates = cachedData.stopCoordinates || [];
  }

  return {
    ...route,
    path: Array.isArray(path) && path.length >= 2 ? path : [
      { lat: 9.6709, lng: 76.8273 },
      { lat: 9.7123, lng: 76.6834 }
    ],
    stopCoordinates,
    distanceKm: cachedData?.distanceKm,
    durationMin: cachedData?.durationMin
  };
}

export function WebSocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [passes, setPasses] = useState([]);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // Allow override via environment variable for Vercel deployment
    let wsUrl = '';
    if (import.meta.env.VITE_WS_URL) {
      wsUrl = import.meta.env.VITE_WS_URL;
    } else {
      const host = window.location.port === '5173' ? 'localhost:3001' : window.location.host;
      wsUrl = `${protocol}//${host}/ws`;
    }

    console.log('Connecting to WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket Connected');
      setIsConnected(true);
      ws.send(JSON.stringify({ type: 'REQUEST_INIT' }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'INIT_DATA') {
          if (data.buses) setBuses(data.buses);
          if (data.routes) {
            const enriched = data.routes.map(enrichRoute);
            setRoutes(enriched);
          }
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
        fetch((import.meta.env.VITE_API_URL || '') + '/api/buses').then(r => r.json()),
        fetch((import.meta.env.VITE_API_URL || '') + '/api/routes').then(r => r.json()),
        fetch((import.meta.env.VITE_API_URL || '') + '/api/passes').then(r => r.json())
      ]);
      if (resBuses.success) setBuses(resBuses.buses);
      if (resRoutes.success && Array.isArray(resRoutes.routes)) {
        const enriched = resRoutes.routes.map(enrichRoute);
        setRoutes(enriched);
      }
      if (resPasses.success) setPasses(resPasses.passes);
    } catch (err) {
      console.error('Error refreshing REST data:', err);
    }
  }, []);

  // Explicit route creation that links backend route with rich frontend road geometry
  const createRoute = useCallback(async (payload, customPath = [], stopCoords = [], metrics = {}) => {
    try {
      const response = await fetch((import.meta.env.VITE_API_URL || '') + '/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.route) {
        const newRoute = data.route;

        // Cache custom road geometry and stop coordinates for this route
        const cache = getRouteGeometryCache();
        const path = Array.isArray(customPath) && customPath.length >= 2
          ? customPath
          : newRoute.path;

        cache[newRoute.id] = {
          path,
          stopCoordinates: stopCoords,
          distanceKm: metrics.distanceKm,
          durationMin: metrics.durationMin
        };
        cache[newRoute.name] = cache[newRoute.id];
        saveRouteGeometryCache(cache);

        const enrichedNewRoute = {
          ...newRoute,
          path,
          stopCoordinates: stopCoords,
          distanceKm: metrics.distanceKm,
          durationMin: metrics.durationMin
        };

        // Immediately update routes in state so it appears everywhere synchronously
        setRoutes(prev => {
          const existing = prev.filter(r => r.id !== newRoute.id && r.name !== newRoute.name);
          return [...existing, enrichedNewRoute];
        });

        // Also refresh data to ensure backend sync
        await refreshData();

        return { success: true, route: enrichedNewRoute };
      } else {
        throw new Error(data.error || 'Failed to create route');
      }
    } catch (err) {
      console.error('Error creating route in WebSocketContext:', err);
      throw err;
    }
  }, [refreshData]);

  return (
    <WebSocketContext.Provider value={{
      isConnected,
      buses,
      routes,
      passes,
      streamDriverLocation,
      streamDriverSOS,
      refreshData,
      createRoute
    }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export const useWebSocket = () => useContext(WebSocketContext);
