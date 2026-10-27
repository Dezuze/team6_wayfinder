import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { playSosEmergencySiren, vibrateSos, pushSosNotification } from '../utils/sosEmergency';

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
  let stopCoordinates = Array.isArray(route.stopCoordinates) ? route.stopCoordinates : [];

  if (cachedData && Array.isArray(cachedData.path) && cachedData.path.length >= 2) {
    path = cachedData.path;
    stopCoordinates = cachedData.stopCoordinates || stopCoordinates;
  }

  return {
    ...route,
    path: Array.isArray(path) && path.length >= 2 ? path : [
      { lat: 9.67416, lng: 76.82573 },
      { lat: 9.7123, lng: 76.6834 }
    ],
    stopCoordinates,
    distanceKm: cachedData?.distanceKm ?? route.distanceKm,
    durationMin: cachedData?.durationMin ?? route.durationMin
  };
}

export function WebSocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [passes, setPasses] = useState([]);
  const [activeSosAlerts, setActiveSosAlerts] = useState([]);
  const [latestSosAlert, setLatestSosAlert] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // Allow override via environment variable for Vercel deployment
    let wsUrl = '';
    if (import.meta.env.VITE_WS_URL) {
      wsUrl = import.meta.env.VITE_WS_URL;
    } else {
      const host = window.location.port === '5173' ? `${window.location.hostname}:3001` : window.location.host;
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
        if (data.type === 'INIT_DATA' || data.type === 'SYNC_DATA') {
          if (data.buses) setBuses(data.buses);
          if (data.routes) {
            const enriched = data.routes.map(enrichRoute);
            setRoutes(enriched);
          }
          if (data.passes) setPasses(data.passes);
          if (Array.isArray(data.alerts)) {
            setActiveSosAlerts(data.alerts);
            if (data.alerts.length > 0) {
              setLatestSosAlert(data.alerts[data.alerts.length - 1]);
            }
          }
        } else if (data.type === 'BUS_LOCATION_UPDATE') {
          if (data.buses) {
            setBuses(data.buses);
            // Check if any bus transitioned to SOS
            const emergencyBus = data.buses.find(b => 
              (b.status || '').toUpperCase().includes('SOS') || 
              (b.status || '').toUpperCase().includes('EMERGENCY')
            );
            if (emergencyBus && emergencyBus.sosReason) {
              setActiveSosAlerts(prev => {
                if (prev.some(a => a.busId === emergencyBus.id)) return prev;
                const newAlert = {
                  id: `sos-bus-${emergencyBus.id}`,
                  busId: emergencyBus.id,
                  busNumber: emergencyBus.number || `BUS #${emergencyBus.id}`,
                  senderName: emergencyBus.driverName || 'Driver',
                  senderRole: 'driver',
                  reason: emergencyBus.sosReason,
                  location: emergencyBus.location,
                  timestamp: emergencyBus.lastUpdated || new Date().toISOString()
                };
                setLatestSosAlert(newAlert);
                return [...prev, newAlert];
              });
            }
          }
        } else if (data.type === 'SOS_ALERT') {
          if (data.buses) setBuses(data.buses);
          if (data.alert) {
            setActiveSosAlerts(prev => [...prev.filter(a => a.id !== data.alert.id), data.alert]);
            setLatestSosAlert(data.alert);
            playSosEmergencySiren();
            vibrateSos();
            pushSosNotification(data.alert);
          }
        } else if (data.type === 'SOS_RESOLVED') {
          if (data.buses) setBuses(data.buses);
          setActiveSosAlerts(prev => prev.filter(a => (data.busId ? a.busId !== data.busId : a.id !== data.alertId)));
          setLatestSosAlert(prev => (prev && (prev.busId === data.busId || prev.id === data.alertId)) ? null : prev);
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
  const streamDriverLocation = useCallback((busId, lat, lng, speed, status, driverName, bearing) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'DRIVER_LOCATION',
        busId,
        lat,
        lng,
        speed,
        status,
        driverName,
        bearing
      }));
    }
  }, []);

  // Universal SOS Trigger (Pushes SOS alert across app, WS, push notifications, and sound)
  const triggerSOS = useCallback(async ({ busId, reason, senderName, senderRole, location }) => {
    const alertPayload = {
      type: 'EMERGENCY_SOS',
      busId: busId || null,
      reason: reason || 'Emergency assistance requested',
      senderName: senderName || 'User',
      senderRole: senderRole || 'student',
      location: location || null,
      timestamp: new Date().toISOString()
    };

    // Local sensory feedback
    playSosEmergencySiren();
    vibrateSos();
    pushSosNotification({
      ...alertPayload,
      busNumber: busId ? `BUS #${busId}` : 'Campus Emergency Alert'
    });

    // 1. Broadcast over WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(alertPayload));
    }

    // 2. Synchronize via REST fallback
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      await fetch(`${apiUrl}/api/sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertPayload)
      });
    } catch (err) {
      console.warn('REST SOS fallback error:', err);
    }
  }, []);

  // Backwards-compatible driver SOS wrapper
  const streamDriverSOS = useCallback((busId, reason) => {
    triggerSOS({
      busId,
      reason,
      senderRole: 'driver'
    });
  }, [triggerSOS]);

  // Resolve an emergency alert
  const resolveSOS = useCallback(async (busId, alertId) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'RESOLVE_SOS',
        busId,
        alertId
      }));
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      await fetch(`${apiUrl}/api/sos/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ busId, alertId })
      });
    } catch (err) {
      console.warn('REST SOS resolve error:', err);
    }

    setActiveSosAlerts(prev => prev.filter(a => (busId ? a.busId !== busId : a.id !== alertId)));
    setLatestSosAlert(prev => (prev && (prev.busId === busId || prev.id === alertId)) ? null : prev);
  }, []);

  const dismissSosAlert = useCallback((alertId) => {
    setLatestSosAlert(null);
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
      const pathToSend = Array.isArray(customPath) && customPath.length >= 2 ? customPath : undefined;
      const response = await fetch((import.meta.env.VITE_API_URL || '') + '/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          path: pathToSend,
          stopCoordinates: stopCoords,
          distanceKm: metrics?.distanceKm,
          durationMin: metrics?.durationMin
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.route) {
        const newRoute = data.route;

        // Cache custom road geometry and stop coordinates for this route
        const cache = getRouteGeometryCache();
        const path = pathToSend || newRoute.path;

        cache[newRoute.id] = {
          path,
          stopCoordinates: stopCoords,
          distanceKm: metrics?.distanceKm,
          durationMin: metrics?.durationMin
        };
        cache[newRoute.name] = cache[newRoute.id];
        saveRouteGeometryCache(cache);

        const enrichedNewRoute = {
          ...newRoute,
          path,
          stopCoordinates: stopCoords,
          distanceKm: metrics?.distanceKm,
          durationMin: metrics?.durationMin
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

  // Route deletion that removes from backend and client cache cleanly
  const deleteRoute = useCallback(async (routeId) => {
    try {
      const response = await fetch((import.meta.env.VITE_API_URL || '') + `/api/routes/${routeId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete route');
      }

      // Remove from localStorage geometry cache
      const cache = getRouteGeometryCache();
      delete cache[routeId];
      saveRouteGeometryCache(cache);

      // Immediately remove from React state
      setRoutes(prev => prev.filter(r => r.id !== routeId));
      // Unassign buses assigned to this route in React state
      setBuses(prev => prev.map(b => b.routeId === routeId ? { ...b, routeId: null } : b));

      await refreshData();
      return { success: true };
    } catch (err) {
      console.error('Error deleting route in WebSocketContext:', err);
      throw err;
    }
  }, [refreshData]);

  // Bus route assignment update
  const updateBusRoute = useCallback(async (busId, newRouteId) => {
    try {
      const normalizedRouteId = newRouteId || null;
      const response = await fetch((import.meta.env.VITE_API_URL || '') + `/api/buses/${busId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routeId: normalizedRouteId })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update bus route');
      }

      // Optimistically update React state
      setBuses(prev => prev.map(b => b.id === busId ? { ...b, routeId: normalizedRouteId } : b));

      await refreshData();
      return { success: true };
    } catch (err) {
      console.error('Error updating bus route in WebSocketContext:', err);
      throw err;
    }
  }, [refreshData]);

  return (
    <WebSocketContext.Provider value={{
      isConnected,
      buses,
      routes,
      passes,
      activeSosAlerts,
      latestSosAlert,
      triggerSOS,
      resolveSOS,
      dismissSosAlert,
      streamDriverLocation,
      streamDriverSOS,
      refreshData,
      createRoute,
      deleteRoute,
      updateBusRoute
    }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export const useWebSocket = () => useContext(WebSocketContext);
