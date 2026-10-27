import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import crypto from 'node:crypto';
import { db, initDatabase, dbUpsertBus } from './db/index.js';
import adminRoutes from './routes/admin.js';

const fastify = Fastify({ logger: true });

// Pre-Shared ChaCha20 Telemetry Secret Key (RFC 8439, 256-bit key shared with STM32 IoT hardware)
const TELEMETRY_SECRET_KEY = Buffer.from(
  (process.env.TRACKER_SECRET_KEY || 'TEAM6_WAYFINDER_SECRET_KEY_2026!').padEnd(32, '0').slice(0, 32),
  'utf8'
);

function decryptTelemetry(ivHexOrStr, dataHex) {
  try {
    if (!ivHexOrStr || !dataHex) return null;
    let ivBuffer;
    if (Buffer.isBuffer(ivHexOrStr)) {
      ivBuffer = ivHexOrStr;
    } else if (typeof ivHexOrStr === 'string') {
      if (ivHexOrStr.length === 32 && /^[0-9a-fA-F]+$/.test(ivHexOrStr)) {
        ivBuffer = Buffer.from(ivHexOrStr, 'hex');
      } else {
        ivBuffer = Buffer.from(ivHexOrStr.padEnd(16, '0').slice(0, 16), 'utf8');
      }
    } else {
      return null;
    }
    const decipher = crypto.createDecipheriv('chacha20', TELEMETRY_SECRET_KEY, ivBuffer);
    let dec = decipher.update(dataHex, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return JSON.parse(dec);
  } catch (err) {
    fastify.log.error(`[ChaCha20 Decryption Failed]: ${err.message}`);
    return null;
  }
}

await fastify.register(cors, { 
  origin: true 
});

// Security Response Headers (Anti-Clickjacking, MIME-Sniffing Defense, XSS Protection)
fastify.addHook('onSend', async (request, reply) => {
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'SAMEORIGIN');
  reply.header('X-XSS-Protection', '1; mode=block');
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  reply.header('Permissions-Policy', 'camera=(self), geolocation=(self), microphone=()');
});

await fastify.register(websocket);

// Helper to calculate geographic bearing between two coordinates
function calculateBearing(lat1, lng1, lat2, lng2) {
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const phi1 = lat1 * (Math.PI / 180);
  const phi2 = lat2 * (Math.PI / 180);
  const y = Math.sin(dLng) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLng);
  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return ((bearing % 360) + 360) % 360;
}

// Earth radius in meters
const EARTH_RADIUS_METERS = 6371000;

function calculateDistanceMeters(lat1, lng1, lat2, lng2) {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

// Live Driver Active Tracking Map (records last real GPS timestamp per bus)
const liveDriverActivity = {};

// Active emergency alerts cache
db.activeSosAlerts = db.activeSosAlerts || [];

// Helper to broadcast bus state to all connected websocket clients
fastify.decorate('broadcastBuses', () => {
  if (!fastify.websocketServer || !fastify.websocketServer.clients) return;
  const payload = JSON.stringify({
    type: 'BUS_LOCATION_UPDATE',
    buses: db.buses
  });
  
  fastify.websocketServer.clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(payload);
    }
  });
});

// Helper to broadcast full synchronized state (buses, routes, passes, alerts) to all connected websocket clients
fastify.decorate('broadcastSync', () => {
  if (!fastify.websocketServer || !fastify.websocketServer.clients) return;
  const payload = JSON.stringify({
    type: 'SYNC_DATA',
    buses: db.buses,
    routes: db.routes,
    passes: db.studentPasses,
    alerts: db.activeSosAlerts || []
  });
  
  fastify.websocketServer.clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(payload);
    }
  });
});

// Helper to broadcast emergency SOS push alerts to all connected websocket clients
fastify.decorate('broadcastSosAlert', (alert) => {
  if (!fastify.websocketServer || !fastify.websocketServer.clients) return;
  const payload = JSON.stringify({
    type: 'SOS_ALERT',
    alert,
    buses: db.buses
  });

  fastify.websocketServer.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(payload);
    }
  });
});

// Helper to broadcast SOS resolution to all connected websocket clients
fastify.decorate('broadcastSosResolved', (busId, alertId) => {
  if (!fastify.websocketServer || !fastify.websocketServer.clients) return;
  const payload = JSON.stringify({
    type: 'SOS_RESOLVED',
    busId,
    alertId,
    buses: db.buses
  });

  fastify.websocketServer.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(payload);
    }
  });
});

// Real Driver Inactivity Watchdog:
// If a real driver stops broadcasting GPS updates for more than 30 seconds without clean sign-off,
// update the bus to stationary / Off Duty and broadcast to all connected clients.
setInterval(() => {
  const now = Date.now();
  let hasChanged = false;

  db.buses.forEach(bus => {
    if (bus.isLive && liveDriverActivity[bus.id] && (now - liveDriverActivity[bus.id] > 30000)) {
      bus.isLive = false;
      bus.speed = 0;
      bus.status = 'Off Duty';
      bus.lastUpdated = new Date().toISOString();
      hasChanged = true;
      dbUpsertBus(bus).catch(() => {});
    }
  });

  if (hasChanged) {
    fastify.broadcastBuses();
  }
}, 10000);

// Register Admin REST routes
await fastify.register(adminRoutes);

// WebSocket Endpoint for Real-time Streaming
fastify.register(async function (fastifyInstance) {
  fastifyInstance.get('/ws', { websocket: true }, (connection, req) => {
    fastify.log.info('New WebSocket client connected');
    const socket = connection.socket || connection;

    // Send initial snapshot on connect
    socket.send(JSON.stringify({
      type: 'INIT_DATA',
      buses: db.buses,
      routes: db.routes,
      passes: db.studentPasses,
      alerts: db.activeSosAlerts || []
    }));

    socket.on('message', message => {
      try {
        let data = JSON.parse(message.toString());

        // Decrypt ChaCha20 payload if packet is encrypted from STM32 hardware
        if (data && data.type === 'ENCRYPTED_TELEMETRY') {
          const decrypted = decryptTelemetry(data.iv, data.data);
          if (decrypted) {
            fastify.log.info(`[STM32 IoT Encrypted Telemetry Decrypted]: Bus=${decrypted.busId || decrypted.bus_id}, Driver=${decrypted.driverName}`);
            data = decrypted;
          } else {
            fastify.log.warn('[STM32 IoT Security] Discarding unauthenticated / invalid encrypted packet');
            return;
          }
        }

        // Normalize legacy or alternate tracker keys
        if (data.bus_id && !data.busId) data.busId = data.bus_id;
        if (!data.type && data.busId && data.lat !== undefined) data.type = 'DRIVER_LOCATION';
        if (data.alert && !data.type) {
          data.type = 'DRIVER_SOS';
          data.reason = data.alert;
        }

        if (data.type === 'DRIVER_LOCATION') {
          const { busId, lat, lng, speed, status, driverName, driverUsername, bearing } = data;
          liveDriverActivity[busId] = Date.now();
          socket.broadcastingBusId = busId;

          let busIndex = db.buses.findIndex(b => b.id === busId);
          const isLiveNow = status !== 'Off Duty' && status !== 'Maintenance' && status !== 'Inactive';
          
          if (busIndex === -1) {
            const newBus = {
              id: busId || `bus-${Date.now()}`,
              number: `BUS #${busId}`,
              routeId: null,
              driverName: driverName || 'Live Driver',
              status: status || 'Active',
              location: { lat, lng },
              bearing: bearing || 0,
              speed: speed !== undefined ? speed : 0,
              isLive: isLiveNow,
              lastUpdated: new Date().toISOString()
            };
            db.buses.push(newBus);
            busIndex = db.buses.length - 1;
          } else {
            if (lat !== undefined && lng !== undefined) {
              const prevLoc = db.buses[busIndex].location;
              if (bearing !== undefined && bearing !== null && !isNaN(bearing)) {
                db.buses[busIndex].bearing = bearing;
              } else if (prevLoc && (prevLoc.lat !== lat || prevLoc.lng !== lng)) {
                db.buses[busIndex].bearing = Math.round(calculateBearing(prevLoc.lat, prevLoc.lng, lat, lng));
              }
              db.buses[busIndex].location = { lat, lng };
            }
            if (speed !== undefined) db.buses[busIndex].speed = speed;
            if (status !== undefined) db.buses[busIndex].status = status;
            if (driverName !== undefined) db.buses[busIndex].driverName = driverName;
            db.buses[busIndex].isLive = isLiveNow;
            db.buses[busIndex].lastUpdated = new Date().toISOString();
          }

          // Broadcast new coordinates to all connected students and admins
          fastify.broadcastBuses();

          // Persist updated telemetry to backend database
          if (busIndex >= 0) {
            dbUpsertBus(db.buses[busIndex]).catch(() => {});
          }
        } else if (data.type === 'DRIVER_SOS' || data.type === 'STUDENT_SOS' || data.type === 'EMERGENCY_SOS') {
          const { busId, reason, senderName, senderRole, location } = data;
          let targetBus = null;
          let busIndex = busId ? db.buses.findIndex(b => b.id === busId) : -1;

          if (busIndex === -1 && busId) {
            targetBus = {
              id: busId || `bus-${Date.now()}`,
              number: `BUS #${busId}`,
              routeId: null,
              driverName: senderName || 'Live Driver',
              status: "EMERGENCY / SOS",
              sosReason: reason || "Emergency breakdown or incident reported",
              location: location || { lat: 9.67416, lng: 76.82573 },
              speed: 0,
              isLive: true,
              lastUpdated: new Date().toISOString()
            };
            db.buses.push(targetBus);
          } else if (busIndex !== -1) {
            db.buses[busIndex].status = "EMERGENCY / SOS";
            db.buses[busIndex].sosReason = reason || "Emergency breakdown or incident reported";
            db.buses[busIndex].isLive = true;
            if (location && location.lat && location.lng) {
              db.buses[busIndex].location = location;
            }
            db.buses[busIndex].lastUpdated = new Date().toISOString();
            targetBus = db.buses[busIndex];
          }

          const alertObj = {
            id: `sos-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            busId: busId || targetBus?.id || null,
            busNumber: targetBus?.number || (busId ? `BUS #${busId}` : 'Campus Emergency Alert'),
            senderName: senderName || targetBus?.driverName || 'User',
            senderRole: senderRole || (data.type === 'STUDENT_SOS' ? 'student' : data.type === 'DRIVER_SOS' ? 'driver' : 'admin'),
            reason: reason || "Emergency breakdown or distress signal reported",
            location: location || targetBus?.location || { lat: 9.67416, lng: 76.82573 },
            timestamp: new Date().toISOString(),
            active: true
          };

          db.activeSosAlerts = db.activeSosAlerts || [];
          db.activeSosAlerts.push(alertObj);

          fastify.broadcastBuses();
          if (fastify.broadcastSosAlert) {
            fastify.broadcastSosAlert(alertObj);
          }

          if (targetBus) {
            dbUpsertBus(targetBus).catch(() => {});
          }
        } else if (data.type === 'RESOLVE_SOS') {
          const { busId, alertId } = data;
          if (busId) {
            const busIndex = db.buses.findIndex(b => b.id === busId);
            if (busIndex !== -1) {
              db.buses[busIndex].status = 'In Transit';
              delete db.buses[busIndex].sosReason;
              db.buses[busIndex].lastUpdated = new Date().toISOString();
              dbUpsertBus(db.buses[busIndex]).catch(() => {});
            }
          }
          if (db.activeSosAlerts) {
            db.activeSosAlerts = db.activeSosAlerts.filter(a => {
              if (busId && a.busId === busId) return false;
              if (alertId && a.id === alertId) return false;
              return true;
            });
          }
          fastify.broadcastBuses();
          if (fastify.broadcastSosResolved) {
            fastify.broadcastSosResolved(busId, alertId);
          }
        } else if (data.type === 'REQUEST_INIT') {
          socket.send(JSON.stringify({
            type: 'INIT_DATA',
            buses: db.buses,
            routes: db.routes,
            passes: db.studentPasses,
            alerts: db.activeSosAlerts || []
          }));
        }
      } catch (err) {
        fastify.log.error('WebSocket message parsing error: ' + err.message);
      }
    });

    socket.on('close', () => {
      fastify.log.info('WebSocket client disconnected');
      if (socket.broadcastingBusId) {
        const busIndex = db.buses.findIndex(b => b.id === socket.broadcastingBusId);
        if (busIndex !== -1) {
          db.buses[busIndex].speed = 0;
          db.buses[busIndex].isLive = false;
          db.buses[busIndex].status = 'Off Duty';
          db.buses[busIndex].lastUpdated = new Date().toISOString();
          fastify.broadcastBuses();
          dbUpsertBus(db.buses[busIndex]).catch(() => {});
        }
      }
    });
  });
});

const start = async () => {
  try {
    // Initialize PostgreSQL Database connection and schema migrations
    await initDatabase();

    const port = process.env.PORT || 3001;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Fastify Server listening on http://localhost:${port}`);
    console.log(`WebSocket Server ready at ws://localhost:${port}/ws`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
