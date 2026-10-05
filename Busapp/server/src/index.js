import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { db } from './data.js';
import adminRoutes from './routes/admin.js';

const fastify = Fastify({ logger: true });

await fastify.register(cors, { 
  origin: true 
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
      passes: db.studentPasses
    }));

    socket.on('message', message => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'DRIVER_LOCATION') {
          const { busId, lat, lng, speed, status, driverName, bearing } = data;
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
        } else if (data.type === 'DRIVER_SOS') {
          const { busId, reason } = data;
          let busIndex = db.buses.findIndex(b => b.id === busId);
          if (busIndex === -1) {
            const newBus = {
              id: busId || `bus-${Date.now()}`,
              number: `BUS #${busId}`,
              routeId: null,
              driverName: 'Live Driver',
              status: "EMERGENCY / SOS",
              sosReason: reason || "Emergency breakdown or accident reported",
              location: { lat: 9.67416, lng: 76.82573 },
              speed: 0,
              isLive: true,
              lastUpdated: new Date().toISOString()
            };
            db.buses.push(newBus);
          } else {
            db.buses[busIndex].status = "EMERGENCY / SOS";
            db.buses[busIndex].sosReason = reason || "Emergency breakdown or accident reported";
            db.buses[busIndex].isLive = true;
            db.buses[busIndex].lastUpdated = new Date().toISOString();
          }
          fastify.broadcastBuses();
        } else if (data.type === 'REQUEST_INIT') {
          socket.send(JSON.stringify({
            type: 'INIT_DATA',
            buses: db.buses,
            routes: db.routes,
            passes: db.studentPasses
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
        }
      }
    });
  });
});

const start = async () => {
  try {
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
