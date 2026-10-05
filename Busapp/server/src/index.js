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

// Live Driver Active Tracking Map (to give precedence to live driver GPS)
const liveDriverActivity = {};

// Detailed simulation state per bus: index, direction, dwellTimer, speeds
const busSimMap = new Map();

// Initialize initial progress positions by finding closest route path index
db.buses.forEach(bus => {
  if (bus.routeId) {
    const route = db.routes.find(r => r.id === bus.routeId);
    if (route && route.path && route.path.length > 0) {
      let closestIdx = 0;
      let minD = Infinity;
      route.path.forEach((pt, idx) => {
        const d = Math.hypot(pt.lat - bus.location.lat, pt.lng - bus.location.lng);
        if (d < minD) {
          minD = d;
          closestIdx = idx;
        }
      });
      
      const nextIdx = Math.min(closestIdx + 1, route.path.length - 1);
      bus.bearing = Math.round(calculateBearing(
        route.path[closestIdx].lat, route.path[closestIdx].lng,
        route.path[nextIdx].lat, route.path[nextIdx].lng
      ));

      const initialSpeed = bus.status === 'Active' ? (bus.speed || 35) : 0;
      busSimMap.set(bus.id, {
        currIdx: closestIdx,
        direction: 1,
        dwellTimer: 0,
        baseSpeed: Math.max(initialSpeed, 32),
        currSpeed: initialSpeed
      });
    }
  }
});

// Helper to broadcast bus state to all connected websocket clients
fastify.decorate('broadcastBuses', () => {
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

// Real-time Fleet Simulation Loop (moves active buses along their routes with physically accurate speed)
setInterval(() => {
  let hasMoved = false;
  const now = Date.now();

  db.buses.forEach(bus => {
    // If bus is not Active or has no route, speed must be 0
    if (bus.status !== 'Active' || !bus.routeId) {
      if (bus.speed !== 0) {
        bus.speed = 0;
        hasMoved = true;
      }
      return;
    }

    // If driver is currently broadcasting live GPS within last 15s, skip simulation
    if (liveDriverActivity[bus.id] && (now - liveDriverActivity[bus.id] < 15000)) return;

    const route = db.routes.find(r => r.id === bus.routeId);
    if (!route || !route.path || route.path.length < 2) return;

    const path = route.path;
    let sim = busSimMap.get(bus.id);
    if (!sim) {
      sim = {
        currIdx: 0,
        direction: 1,
        dwellTimer: 0,
        baseSpeed: 36,
        currSpeed: 36
      };
      busSimMap.set(bus.id, sim);
    }

    // Handle passenger dwell time at terminus stops (e.g. College of Engineering Poonjar or origin)
    if (sim.dwellTimer > 0) {
      sim.dwellTimer--;
      bus.speed = 0;
      hasMoved = true;
      return;
    }

    // Detect forward road curvature over next ~30m to realistically adjust speed
    let lookaheadIdx = sim.currIdx;
    let lookaheadDist = 0;
    while (lookaheadIdx >= 0 && lookaheadIdx < path.length - 1 && lookaheadDist < 30) {
      const nextIdx = lookaheadIdx + sim.direction;
      if (nextIdx < 0 || nextIdx >= path.length) break;
      lookaheadDist += calculateDistanceMeters(
        path[lookaheadIdx].lat, path[lookaheadIdx].lng,
        path[nextIdx].lat, path[nextIdx].lng
      );
      lookaheadIdx = nextIdx;
    }

    let targetSpeed = sim.baseSpeed;
    if (lookaheadIdx !== sim.currIdx) {
      const curNextIdx = Math.max(0, Math.min(sim.currIdx + sim.direction, path.length - 1));
      const curBearing = calculateBearing(
        path[sim.currIdx].lat, path[sim.currIdx].lng,
        path[curNextIdx].lat, path[curNextIdx].lng
      );
      const aheadNextIdx = Math.max(0, Math.min(lookaheadIdx + sim.direction, path.length - 1));
      const aheadBearing = calculateBearing(
        path[lookaheadIdx].lat, path[lookaheadIdx].lng,
        path[aheadNextIdx].lat, path[aheadNextIdx].lng
      );
      const curveDelta = Math.abs(((aheadBearing - curBearing + 540) % 360) - 180);
      
      // Sharp curve / hairpin bend -> slow down realistically to 18-24 km/h
      if (curveDelta > 40) {
        targetSpeed = Math.min(targetSpeed, 20);
      } else if (curveDelta > 20) {
        targetSpeed = Math.min(targetSpeed, 28);
      }
    }

    // Smooth vehicle acceleration / deceleration towards target speed (realistic transit bus cruise: 32-44 km/h)
    if (sim.currSpeed < targetSpeed) {
      sim.currSpeed = Math.min(sim.currSpeed + 4, targetSpeed);
    } else if (sim.currSpeed > targetSpeed) {
      sim.currSpeed = Math.max(sim.currSpeed - 5, targetSpeed);
    }

    // Target distance in meters for exactly 1.0 second of travel: (km/h) / 3.6
    let remainingMeters = (sim.currSpeed / 3.6) * 1.0;
    const prevLoc = bus.location || path[sim.currIdx];
    let currP = { lat: prevLoc.lat, lng: prevLoc.lng };
    let segIdx = sim.currIdx;

    while (remainingMeters > 0.05) {
      const nextSegIdx = segIdx + sim.direction;
      if (nextSegIdx < 0 || nextSegIdx >= path.length) {
        // Reached terminus of route
        sim.direction = -sim.direction;
        sim.dwellTimer = 4; // dwell for 4 seconds at terminus
        sim.currSpeed = 0;
        break;
      }

      const pNext = path[nextSegIdx];
      const distToNext = calculateDistanceMeters(currP.lat, currP.lng, pNext.lat, pNext.lng);

      if (distToNext <= remainingMeters) {
        currP = { lat: pNext.lat, lng: pNext.lng };
        remainingMeters -= distToNext;
        segIdx = nextSegIdx;
      } else {
        const ratio = distToNext > 0.001 ? remainingMeters / distToNext : 0;
        currP = {
          lat: currP.lat + (pNext.lat - currP.lat) * ratio,
          lng: currP.lng + (pNext.lng - currP.lng) * ratio
        };
        remainingMeters = 0;
        break;
      }
    }

    sim.currIdx = segIdx;

    // Compute EXACT physical meters traveled in this 1-second interval
    const actualMetersMoved = calculateDistanceMeters(prevLoc.lat, prevLoc.lng, currP.lat, currP.lng);
    // Physically accurate speed: meters/sec * 3.6 = km/h
    const calculatedSpeed = Math.round(actualMetersMoved * 3.6);

    // Calculate stable, smooth bearing by looking ahead along route path by 30 meters
    let lookaheadHeadingIdx = sim.currIdx;
    let lookaheadHeadingDist = 0;
    while (lookaheadHeadingIdx >= 0 && lookaheadHeadingIdx < path.length - 1 && lookaheadHeadingDist < 30) {
      const nextIdx = lookaheadHeadingIdx + sim.direction;
      if (nextIdx < 0 || nextIdx >= path.length) break;
      lookaheadHeadingDist += calculateDistanceMeters(
        path[lookaheadHeadingIdx].lat, path[lookaheadHeadingIdx].lng,
        path[nextIdx].lat, path[nextIdx].lng
      );
      lookaheadHeadingIdx = nextIdx;
    }

    let bearing = bus.bearing;
    if (lookaheadHeadingIdx !== sim.currIdx && lookaheadHeadingDist >= 2.5) {
      bearing = Math.round(calculateBearing(
        currP.lat, currP.lng,
        path[lookaheadHeadingIdx].lat, path[lookaheadHeadingIdx].lng
      ));
    }

    bus.location = { lat: currP.lat, lng: currP.lng };
    bus.bearing = bearing;
    bus.speed = calculatedSpeed;
    bus.lastUpdated = new Date().toISOString();
    hasMoved = true;
  });

  if (hasMoved && fastify.websocketServer && fastify.websocketServer.clients) {
    fastify.broadcastBuses();
  }
}, 1000);

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
          const { busId, lat, lng, speed, status } = data;
          liveDriverActivity[busId] = Date.now();
          let busIndex = db.buses.findIndex(b => b.id === busId);
          
          if (busIndex === -1) {
            const newBus = {
              id: busId || `bus-${Date.now()}`,
              number: `BUS #${busId}`,
              routeId: null,
              driverName: 'Live Driver',
              status: status || 'Active',
              location: { lat, lng },
              bearing: 0,
              speed: speed !== undefined ? speed : 0,
              lastUpdated: new Date().toISOString()
            };
            db.buses.push(newBus);
            busIndex = db.buses.length - 1;
          } else {
            if (lat !== undefined && lng !== undefined) {
              const prevLoc = db.buses[busIndex].location;
              if (prevLoc && (prevLoc.lat !== lat || prevLoc.lng !== lng)) {
                db.buses[busIndex].bearing = Math.round(calculateBearing(prevLoc.lat, prevLoc.lng, lat, lng));
              }
              db.buses[busIndex].location = { lat, lng };
            }
            if (speed !== undefined) db.buses[busIndex].speed = speed;
            if (status !== undefined) db.buses[busIndex].status = status;
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
              lastUpdated: new Date().toISOString()
            };
            db.buses.push(newBus);
          } else {
            db.buses[busIndex].status = "EMERGENCY / SOS";
            db.buses[busIndex].sosReason = reason || "Emergency breakdown or accident reported";
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
