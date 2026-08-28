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
          const busIndex = db.buses.findIndex(b => b.id === busId);
          
          if (busIndex !== -1) {
            if (lat !== undefined && lng !== undefined) {
              db.buses[busIndex].location = { lat, lng };
            }
            if (speed !== undefined) db.buses[busIndex].speed = speed;
            if (status !== undefined) db.buses[busIndex].status = status;
            db.buses[busIndex].lastUpdated = new Date().toISOString();

            // Broadcast new coordinates to all connected students and admins
            fastify.broadcastBuses();
          }
        } else if (data.type === 'DRIVER_SOS') {
          const { busId, reason } = data;
          const busIndex = db.buses.findIndex(b => b.id === busId);
          if (busIndex !== -1) {
            db.buses[busIndex].status = "🚨 EMERGENCY / SOS";
            db.buses[busIndex].sosReason = reason || "Emergency breakdown or accident reported";
            db.buses[busIndex].lastUpdated = new Date().toISOString();
            fastify.broadcastBuses();
          }
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

    connection.socket.on('close', () => {
      fastify.log.info('WebSocket client disconnected');
    });
  });
});

const start = async () => {
  try {
    const port = process.env.PORT || 3001;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Fastify Server listening on http://localhost:${port}`);
    console.log(`🛰️ WebSocket Server ready at ws://localhost:${port}/ws`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
