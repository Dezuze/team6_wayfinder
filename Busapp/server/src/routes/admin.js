import { db } from '../data.js';

export default async function adminRoutes(fastify, options) {
  // --- BUSES ---
  fastify.get('/api/buses', async (request, reply) => {
    return { success: true, buses: db.buses };
  });

  fastify.put('/api/buses/:id', async (request, reply) => {
    const { id } = request.params;
    const { status, driverName, routeId } = request.body;
    
    const busIndex = db.buses.findIndex(b => b.id === id);
    if (busIndex === -1) {
      return reply.status(404).send({ success: false, error: 'Bus not found' });
    }

    if (status !== undefined) db.buses[busIndex].status = status;
    if (driverName !== undefined) db.buses[busIndex].driverName = driverName;
    if (routeId !== undefined) db.buses[busIndex].routeId = routeId;
    db.buses[busIndex].lastUpdated = new Date().toISOString();

    // Broadcast updated buses via WebSocket if server instance has broadcast method
    if (fastify.broadcastBuses) {
      fastify.broadcastBuses();
    }

    return { success: true, bus: db.buses[busIndex] };
  });

  // --- ROUTES ---
  fastify.get('/api/routes', async (request, reply) => {
    return { success: true, routes: db.routes };
  });

  fastify.post('/api/routes', async (request, reply) => {
    const { name, stops, color } = request.body;
    const newRoute = {
      id: `route-${Date.now()}`,
      name: name || "New Custom Route",
      stops: stops || ["Stop 1", "Stop 2"],
      color: color || "#8b5cf6",
      path: [
        { lat: 9.9312, lng: 76.2673 },
        { lat: 9.9350, lng: 76.2700 }
      ]
    };
    db.routes.push(newRoute);
    return { success: true, route: newRoute };
  });

  fastify.put('/api/routes/:id', async (request, reply) => {
    const { id } = request.params;
    const { name, stops, color } = request.body;
    const routeIndex = db.routes.findIndex(r => r.id === id);
    if (routeIndex === -1) {
      return reply.status(404).send({ success: false, error: 'Route not found' });
    }
    if (name !== undefined) db.routes[routeIndex].name = name;
    if (stops !== undefined) db.routes[routeIndex].stops = stops;
    if (color !== undefined) db.routes[routeIndex].color = color;
    return { success: true, route: db.routes[routeIndex] };
  });

  // --- STUDENT PASSES ---
  fastify.get('/api/passes', async (request, reply) => {
    return { success: true, passes: db.studentPasses };
  });

  fastify.put('/api/passes/:id', async (request, reply) => {
    const { id } = request.params;
    const { passStatus, validUntil, routeEntitlement } = request.body;
    const passIndex = db.studentPasses.findIndex(p => p.id === id);
    if (passIndex === -1) {
      return reply.status(404).send({ success: false, error: 'Student pass not found' });
    }
    if (passStatus !== undefined) db.studentPasses[passIndex].passStatus = passStatus;
    if (validUntil !== undefined) db.studentPasses[passIndex].validUntil = validUntil;
    if (routeEntitlement !== undefined) db.studentPasses[passIndex].routeEntitlement = routeEntitlement;

    return { success: true, pass: db.studentPasses[passIndex] };
  });

  // --- AUTH / LOGIN ---
  fastify.post('/api/login', async (request, reply) => {
    const { username, password, role } = request.body;

    if (role === 'driver' || !role) {
      const driver = db.drivers.find(d => d.username === username && d.password === password);
      if (driver) {
        return { success: true, user: { ...driver, role: 'driver' } };
      }
    }
    
    if (role === 'admin' || !role) {
      const admin = db.admins.find(a => a.username === username && a.password === password);
      if (admin) {
        return { success: true, user: { ...admin, role: 'admin' } };
      }
    }

    if (role === 'student' || !role) {
      // Demo: allow any student username matching pass id or email
      const student = db.studentPasses.find(s => s.id === username || s.email === username || username.startsWith('student'));
      if (student || username === 'student') {
        return { success: true, user: { id: student?.id || 'S1001', name: student?.name || 'Alex Mercer', role: 'student', email: student?.email || 'alex@student.edu' } };
      }
    }

    return reply.status(401).send({ success: false, error: 'Invalid username or password' });
  });

  // --- DRIVERS DIRECTORY ---
  fastify.get('/api/drivers', async (request, reply) => {
    return { success: true, drivers: db.drivers };
  });

  fastify.post('/api/drivers', async (request, reply) => {
    const { username, password, name, phone, assignedBusId } = request.body;
    const newDriver = {
      id: `driver-${Date.now()}`,
      username: username || `driver.${Date.now().toString().slice(-4)}`,
      password: password || "password123",
      name: name || "New Bus Driver",
      phone: phone || "+1-555-0000",
      assignedBusId: assignedBusId || "bus-101",
      status: "Active"
    };
    db.drivers.push(newDriver);
    return { success: true, driver: newDriver };
  });
}
