import { db } from '../data.js';

export default async function adminRoutes(fastify, options) {
  // --- BUSES ---
  fastify.get('/api/buses', async (request, reply) => {
    return { success: true, buses: db.buses };
  });

  fastify.post('/api/buses', async (request, reply) => {
    const body = request.body || {};
    const items = Array.isArray(body) ? body : Array.isArray(body.buses) ? body.buses : [body];
    const created = [];
    
    for (const item of items) {
      const { number, routeId, driverName, status, location, speed } = item;
      const newBus = {
        id: item.id || `bus-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 1000)}`,
        number: number || `BUS #${Math.floor(100 + Math.random() * 900)}`,
        routeId: routeId || null,
        driverName: driverName || 'Unassigned',
        status: status || 'Active',
        location: location || { lat: 9.67416, lng: 76.82573 },
        speed: speed !== undefined ? speed : 0,
        lastUpdated: new Date().toISOString()
      };
      db.buses.push(newBus);
      created.push(newBus);
    }

    if (fastify.broadcastBuses) {
      fastify.broadcastBuses();
    }

    return { success: true, bus: created[0], buses: created, count: created.length };
  });

  fastify.post('/api/buses/bulk', async (request, reply) => {
    const body = request.body || {};
    const items = Array.isArray(body) ? body : Array.isArray(body.buses) ? body.buses : [];
    const created = [];

    for (const item of items) {
      const { number, routeId, driverName, status, location, speed } = item;
      const newBus = {
        id: item.id || `bus-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 1000)}`,
        number: number || `BUS #${Math.floor(100 + Math.random() * 900)}`,
        routeId: routeId || null,
        driverName: driverName || 'Unassigned',
        status: status || 'Active',
        location: location || { lat: 9.67416, lng: 76.82573 },
        speed: speed !== undefined ? speed : 0,
        lastUpdated: new Date().toISOString()
      };
      db.buses.push(newBus);
      created.push(newBus);
    }

    if (fastify.broadcastBuses) {
      fastify.broadcastBuses();
    }

    return { success: true, buses: created, count: created.length };
  });

  fastify.put('/api/buses/:id', async (request, reply) => {
    const { id } = request.params;
    const { status, driverName, routeId, number, speed, location } = request.body || {};
    
    const busIndex = db.buses.findIndex(b => b.id === id);
    if (busIndex === -1) {
      return reply.status(404).send({ success: false, error: 'Bus not found' });
    }

    if (status !== undefined) db.buses[busIndex].status = status;
    if (driverName !== undefined) db.buses[busIndex].driverName = driverName;
    if (routeId !== undefined) db.buses[busIndex].routeId = routeId;
    if (number !== undefined) db.buses[busIndex].number = number;
    if (speed !== undefined) db.buses[busIndex].speed = speed;
    if (location !== undefined) db.buses[busIndex].location = location;
    db.buses[busIndex].lastUpdated = new Date().toISOString();

    if (fastify.broadcastBuses) {
      fastify.broadcastBuses();
    }

    return { success: true, bus: db.buses[busIndex] };
  });

  fastify.delete('/api/buses/:id', async (request, reply) => {
    const { id } = request.params;
    const busIndex = db.buses.findIndex(b => b.id === id);
    if (busIndex === -1) {
      return reply.status(404).send({ success: false, error: 'Bus not found' });
    }
    db.buses.splice(busIndex, 1);
    if (fastify.broadcastBuses) {
      fastify.broadcastBuses();
    }
    return { success: true, message: 'Bus deleted successfully' };
  });

  // --- ROUTES ---
  fastify.get('/api/routes', async (request, reply) => {
    return { success: true, routes: db.routes };
  });

  fastify.post('/api/routes', async (request, reply) => {
    const body = request.body || {};
    const items = Array.isArray(body) ? body : Array.isArray(body.routes) ? body.routes : [body];
    const created = [];

    for (const item of items) {
      const { name, stops, color, path } = item;
      const newRoute = {
        id: item.id || `route-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: name || "New Custom Route",
        stops: Array.isArray(stops) ? stops : typeof stops === 'string' ? stops.split(',').map(s => s.trim()).filter(Boolean) : ["Stop 1", "Stop 2"],
        color: color || "#8b5cf6",
        path: Array.isArray(path) && path.length >= 2 ? path : [
          { lat: 9.67416, lng: 76.82573 },
          { lat: 9.7123, lng: 76.6834 }
        ]
      };
      db.routes.push(newRoute);
      created.push(newRoute);
    }
    return { success: true, route: created[0], routes: created, count: created.length };
  });

  fastify.post('/api/routes/bulk', async (request, reply) => {
    const body = request.body || {};
    const items = Array.isArray(body) ? body : Array.isArray(body.routes) ? body.routes : [];
    const created = [];

    for (const item of items) {
      const { name, stops, color, path } = item;
      const newRoute = {
        id: item.id || `route-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: name || "New Custom Route",
        stops: Array.isArray(stops) ? stops : typeof stops === 'string' ? stops.split(',').map(s => s.trim()).filter(Boolean) : ["Stop 1", "Stop 2"],
        color: color || "#8b5cf6",
        path: Array.isArray(path) && path.length >= 2 ? path : [
          { lat: 9.67416, lng: 76.82573 },
          { lat: 9.7123, lng: 76.6834 }
        ]
      };
      db.routes.push(newRoute);
      created.push(newRoute);
    }
    return { success: true, routes: created, count: created.length };
  });

  fastify.put('/api/routes/:id', async (request, reply) => {
    const { id } = request.params;
    const { name, stops, color, path } = request.body || {};
    const routeIndex = db.routes.findIndex(r => r.id === id);
    if (routeIndex === -1) {
      return reply.status(404).send({ success: false, error: 'Route not found' });
    }
    if (name !== undefined) db.routes[routeIndex].name = name;
    if (stops !== undefined) db.routes[routeIndex].stops = stops;
    if (color !== undefined) db.routes[routeIndex].color = color;
    if (Array.isArray(path) && path.length >= 2) db.routes[routeIndex].path = path;
    return { success: true, route: db.routes[routeIndex] };
  });

  fastify.delete('/api/routes/:id', async (request, reply) => {
    const { id } = request.params;
    const routeIndex = db.routes.findIndex(r => r.id === id);
    if (routeIndex === -1) {
      return reply.status(404).send({ success: false, error: 'Route not found' });
    }
    db.routes.splice(routeIndex, 1);
    return { success: true, message: 'Route deleted successfully' };
  });

  // --- STUDENT PASSES ---
  fastify.get('/api/passes', async (request, reply) => {
    return { success: true, passes: db.studentPasses };
  });

  fastify.post('/api/passes', async (request, reply) => {
    const body = request.body || {};
    const items = Array.isArray(body) ? body : Array.isArray(body.passes) ? body.passes : [body];
    const created = [];

    for (const item of items) {
      const { name, email, routeEntitlement, validUntil, passStatus, status, username, password } = item;
      const studentId = item.id || (username && !username.includes('@') ? username : `S${Math.floor(1000 + Math.random() * 9000)}`);
      const studentUsername = username || studentId;
      const newPass = {
        id: studentId,
        username: studentUsername,
        password: password || "student123",
        name: name || item.studentName || "New Student",
        studentName: name || item.studentName || "New Student",
        email: email || `${studentUsername.toLowerCase()}@student.edu`,
        routeEntitlement: routeEntitlement || "All Routes",
        validUntil: validUntil || "2026-12-31",
        passStatus: passStatus || status || "Valid",
        qrCodeString: `PASS-${studentId}`
      };
      db.studentPasses.push(newPass);
      created.push(newPass);
    }
    return { success: true, pass: created[0], passes: created, count: created.length };
  });

  fastify.post('/api/passes/bulk', async (request, reply) => {
    const body = request.body || {};
    const items = Array.isArray(body) ? body : Array.isArray(body.passes) ? body.passes : [];
    const created = [];

    for (const item of items) {
      const { name, email, routeEntitlement, validUntil, passStatus, status, username, password } = item;
      const studentId = item.id || (username && !username.includes('@') ? username : `S${Math.floor(1000 + Math.random() * 9000)}`);
      const studentUsername = username || studentId;
      const newPass = {
        id: studentId,
        username: studentUsername,
        password: password || "student123",
        name: name || item.studentName || "New Student",
        studentName: name || item.studentName || "New Student",
        email: email || `${studentUsername.toLowerCase()}@student.edu`,
        routeEntitlement: routeEntitlement || "All Routes",
        validUntil: validUntil || "2026-12-31",
        passStatus: passStatus || status || "Valid",
        qrCodeString: `PASS-${studentId}`
      };
      db.studentPasses.push(newPass);
      created.push(newPass);
    }
    return { success: true, passes: created, count: created.length };
  });

  fastify.put('/api/passes/:id', async (request, reply) => {
    const { id } = request.params;
    const { passStatus, validUntil, routeEntitlement, name, email, username, password, newId } = request.body || {};
    const passIndex = db.studentPasses.findIndex(p => p.id === id);
    if (passIndex === -1) {
      return reply.status(404).send({ success: false, error: 'Student pass not found' });
    }
    if (passStatus !== undefined) db.studentPasses[passIndex].passStatus = passStatus;
    if (validUntil !== undefined) db.studentPasses[passIndex].validUntil = validUntil;
    if (routeEntitlement !== undefined) db.studentPasses[passIndex].routeEntitlement = routeEntitlement;
    if (name !== undefined) {
      db.studentPasses[passIndex].name = name;
      db.studentPasses[passIndex].studentName = name;
    }
    if (email !== undefined) db.studentPasses[passIndex].email = email;
    if (username !== undefined) db.studentPasses[passIndex].username = username;
    if (password !== undefined) db.studentPasses[passIndex].password = password;
    if (newId !== undefined && newId.trim() && newId !== id) {
      db.studentPasses[passIndex].id = newId.trim();
      db.studentPasses[passIndex].qrCodeString = `PASS-${newId.trim()}`;
    }

    return { success: true, pass: db.studentPasses[passIndex] };
  });

  fastify.delete('/api/passes/:id', async (request, reply) => {
    const { id } = request.params;
    const passIndex = db.studentPasses.findIndex(p => p.id === id);
    if (passIndex === -1) {
      return reply.status(404).send({ success: false, error: 'Student pass not found' });
    }
    db.studentPasses.splice(passIndex, 1);
    return { success: true, message: 'Student pass deleted successfully' };
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
      // Find pass matching username, student ID, email, or exact name
      const exactStudent = db.studentPasses.find(s => 
        (s.username && s.username.toLowerCase() === username.toLowerCase()) ||
        (s.id && s.id.toLowerCase() === username.toLowerCase()) || 
        (s.email && s.email.toLowerCase() === username.toLowerCase()) || 
        (s.name && s.name.toLowerCase() === username.toLowerCase())
      );
      if (exactStudent) {
        // If password is set on student and provided, verify match
        if (exactStudent.password && password && exactStudent.password !== password) {
          return reply.status(401).send({ success: false, error: 'Invalid password' });
        }
        return { success: true, user: { id: exactStudent.id, username: exactStudent.username || exactStudent.id, name: exactStudent.name, role: 'student', email: exactStudent.email } };
      }
    }

    return reply.status(401).send({ success: false, error: 'Invalid username or password' });
  });

  // --- DRIVERS DIRECTORY ---
  fastify.get('/api/drivers', async (request, reply) => {
    return { success: true, drivers: db.drivers };
  });

  fastify.post('/api/drivers', async (request, reply) => {
    const body = request.body || {};
    const items = Array.isArray(body) ? body : Array.isArray(body.drivers) ? body.drivers : [body];
    const created = [];

    for (const item of items) {
      const { username, password, name, phone, assignedBusId, status } = item;
      const newDriver = {
        id: item.id || `driver-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        username: username || `driver.${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 100)}`,
        password: password || "password123",
        name: name || "New Bus Driver",
        phone: phone || "+1-555-0000",
        assignedBusId: assignedBusId || "bus-101",
        status: status || "Active"
      };
      db.drivers.push(newDriver);
      created.push(newDriver);
    }
    return { success: true, driver: created[0], drivers: created, count: created.length };
  });

  fastify.post('/api/drivers/bulk', async (request, reply) => {
    const body = request.body || {};
    const items = Array.isArray(body) ? body : Array.isArray(body.drivers) ? body.drivers : [];
    const created = [];

    for (const item of items) {
      const { username, password, name, phone, assignedBusId, status } = item;
      const newDriver = {
        id: item.id || `driver-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        username: username || `driver.${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 100)}`,
        password: password || "password123",
        name: name || "New Bus Driver",
        phone: phone || "+1-555-0000",
        assignedBusId: assignedBusId || "bus-101",
        status: status || "Active"
      };
      db.drivers.push(newDriver);
      created.push(newDriver);
    }
    return { success: true, drivers: created, count: created.length };
  });

  fastify.put('/api/drivers/:id', async (request, reply) => {
    const { id } = request.params;
    const { name, username, password, phone, assignedBusId, status } = request.body || {};
    const driverIndex = db.drivers.findIndex(d => d.id === id);
    if (driverIndex === -1) {
      return reply.status(404).send({ success: false, error: 'Driver not found' });
    }
    if (name !== undefined) db.drivers[driverIndex].name = name;
    if (username !== undefined) db.drivers[driverIndex].username = username;
    if (password !== undefined) db.drivers[driverIndex].password = password;
    if (phone !== undefined) db.drivers[driverIndex].phone = phone;
    if (assignedBusId !== undefined) db.drivers[driverIndex].assignedBusId = assignedBusId;
    if (status !== undefined) db.drivers[driverIndex].status = status;
    return { success: true, driver: db.drivers[driverIndex] };
  });

  fastify.delete('/api/drivers/:id', async (request, reply) => {
    const { id } = request.params;
    const driverIndex = db.drivers.findIndex(d => d.id === id);
    if (driverIndex === -1) {
      return reply.status(404).send({ success: false, error: 'Driver not found' });
    }
    db.drivers.splice(driverIndex, 1);
    return { success: true, message: 'Driver deleted successfully' };
  });
}
