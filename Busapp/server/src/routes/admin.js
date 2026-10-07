import {
  db,
  dbGetBuses,
  dbUpsertBus,
  dbDeleteBus,
  dbGetRoutes,
  dbUpsertRoute,
  dbDeleteRoute,
  dbGetPasses,
  dbUpsertPass,
  dbDeletePass,
  dbGetDrivers,
  dbUpsertDriver,
  dbDeleteDriver,
  dbAuthenticateUser,
  isConnected
} from '../db/index.js';
import {
  verifyAuthToken,
  sanitizeString,
  isValidCoordinate,
  verifyPassQr
} from '../utils/security.js';
import {
  checkLoginRateLimit,
  recordFailedLogin,
  resetLoginAttempts,
  checkGeneralRateLimit
} from '../utils/rateLimit.js';

export default async function adminRoutes(fastify, options) {
  // Authentication & Authorization Guard
  function authenticate(request, reply, allowedRoles = []) {
    const authHeader = request.headers['authorization'] || request.headers['x-auth-token'];
    let token = null;

    if (authHeader) {
      if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim();
      } else {
        token = authHeader.trim();
      }
    }

    if (!token) {
      if (process.env.NODE_ENV === 'production') {
        reply.status(401).send({
          success: false,
          error: 'Unauthorized. Authentication token is required.'
        });
        return null;
      }
      // Development mode fallback
      return { id: 'admin-dev', role: 'admin', username: 'admin' };
    }

    const payload = verifyAuthToken(token);
    if (!payload) {
      reply.status(401).send({
        success: false,
        error: 'Invalid or expired session token. Please log in again.'
      });
      return null;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(payload.role)) {
      reply.status(403).send({
        success: false,
        error: 'Forbidden. You do not have permission to access this resource.'
      });
      return null;
    }

    return payload;
  }

  // --- DATABASE & SECURITY STATUS ---
  fastify.get('/api/status', async (request, reply) => {
    return {
      success: true,
      server: 'Fastify',
      database: isConnected() ? 'PostgreSQL (Connected)' : 'Local Storage Fallback (PostgreSQL Offline)',
      pgConnected: isConnected(),
      security: {
        passwordHashing: 'scrypt with 16-byte random salt',
        tokenSigning: 'HMAC-SHA256 with constant-time verification',
        passVerification: 'Cryptographic HMAC-SHA256 signature',
        rateLimiterActive: true,
        xssSanitization: true
      },
      counts: {
        buses: db.buses.length,
        routes: db.routes.length,
        passes: db.studentPasses.length,
        drivers: db.drivers.length,
        admins: db.admins.length
      }
    };
  });

  // --- PASS CRYPTOGRAPHIC VERIFICATION (FOR DRIVERS & SCANNERS) ---
  fastify.post('/api/passes/verify', async (request, reply) => {
    const { qrString, passId } = request.body || {};
    if (!qrString) {
      return reply.status(400).send({ success: false, error: 'QR string is required for verification' });
    }

    // Lookup pass in DB
    const passes = await dbGetPasses(true);
    const targetPass = passes.find(p => p.qrCodeString === qrString || (passId && p.id === passId));

    if (!targetPass) {
      return reply.status(404).send({
        success: false,
        valid: false,
        error: 'Pass not found in system directory'
      });
    }

    const verification = verifyPassQr(qrString, targetPass.validUntil, targetPass.routeEntitlement);
    if (!verification.valid) {
      return reply.status(400).send({
        success: false,
        valid: false,
        error: verification.reason || 'Cryptographic verification failed: Counterfeit QR code.'
      });
    }

    const isExpired = new Date(targetPass.validUntil) < new Date();
    const isActive = targetPass.passStatus === 'Valid' || targetPass.passStatus === 'Active';

    return {
      success: true,
      valid: isActive && !isExpired,
      status: isExpired ? 'Expired' : targetPass.passStatus,
      studentName: targetPass.name || targetPass.studentName,
      routeEntitlement: targetPass.routeEntitlement,
      validUntil: targetPass.validUntil,
      signatureVerified: true,
      legacy: Boolean(verification.legacy)
    };
  });

  // --- BUSES ---
  fastify.get('/api/buses', async (request, reply) => {
    const buses = await dbGetBuses();
    return { success: true, buses };
  });

  fastify.post('/api/buses', async (request, reply) => {
    const user = authenticate(request, reply, ['admin']);
    if (!user) return;

    const body = request.body || {};
    const items = Array.isArray(body) ? body : Array.isArray(body.buses) ? body.buses : [body];
    const created = [];
    
    for (const item of items) {
      const { number, routeId, driverName, status, location, speed } = item;
      const cleanNumber = sanitizeString(number || `BUS #${Math.floor(100 + Math.random() * 900)}`, 50);
      const cleanDriver = sanitizeString(driverName || 'Unassigned', 100);
      const cleanStatus = sanitizeString(status || 'Active', 30);

      const newBus = {
        id: item.id ? sanitizeString(item.id, 50) : `bus-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 1000)}`,
        number: cleanNumber,
        routeId: routeId ? sanitizeString(routeId, 50) : null,
        driverName: cleanDriver,
        status: cleanStatus,
        location: location && isValidCoordinate(location.lat, location.lng) ? location : { lat: 9.67416, lng: 76.82573 },
        speed: typeof speed === 'number' && !isNaN(speed) ? Math.max(0, speed) : 0,
        lastUpdated: new Date().toISOString()
      };
      await dbUpsertBus(newBus);
      created.push(newBus);
    }

    if (fastify.broadcastBuses) fastify.broadcastBuses();
    if (fastify.broadcastSync) fastify.broadcastSync();

    return { success: true, bus: created[0], buses: created, count: created.length };
  });

  fastify.post('/api/buses/bulk', async (request, reply) => {
    const user = authenticate(request, reply, ['admin']);
    if (!user) return;

    const body = request.body || {};
    const items = Array.isArray(body) ? body : Array.isArray(body.buses) ? body.buses : [];
    const created = [];

    for (const item of items) {
      const { number, routeId, driverName, status, location, speed } = item;
      const newBus = {
        id: item.id ? sanitizeString(item.id, 50) : `bus-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 1000)}`,
        number: sanitizeString(number || `BUS #${Math.floor(100 + Math.random() * 900)}`, 50),
        routeId: routeId ? sanitizeString(routeId, 50) : null,
        driverName: sanitizeString(driverName || 'Unassigned', 100),
        status: sanitizeString(status || 'Active', 30),
        location: location && isValidCoordinate(location.lat, location.lng) ? location : { lat: 9.67416, lng: 76.82573 },
        speed: typeof speed === 'number' && !isNaN(speed) ? Math.max(0, speed) : 0,
        lastUpdated: new Date().toISOString()
      };
      await dbUpsertBus(newBus);
      created.push(newBus);
    }

    if (fastify.broadcastBuses) fastify.broadcastBuses();
    if (fastify.broadcastSync) fastify.broadcastSync();

    return { success: true, buses: created, count: created.length };
  });

  fastify.put('/api/buses/:id', async (request, reply) => {
    const user = authenticate(request, reply, ['admin', 'driver']);
    if (!user) return;

    const { id } = request.params;
    const { status, driverName, routeId, number, speed, location } = request.body || {};
    
    const existingBus = db.buses.find(b => b.id === id);
    if (!existingBus) {
      return reply.status(404).send({ success: false, error: 'Bus not found' });
    }

    const updatedBus = {
      ...existingBus,
      ...(status !== undefined ? { status: sanitizeString(status, 30) } : {}),
      ...(driverName !== undefined ? { driverName: sanitizeString(driverName, 100) } : {}),
      ...(routeId !== undefined ? { routeId: routeId ? sanitizeString(routeId, 50) : null } : {}),
      ...(number !== undefined ? { number: sanitizeString(number, 50) } : {}),
      ...(speed !== undefined ? { speed: Math.max(0, Number(speed) || 0) } : {}),
      ...(location !== undefined && isValidCoordinate(location?.lat, location?.lng) ? { location } : {}),
      lastUpdated: new Date().toISOString()
    };

    await dbUpsertBus(updatedBus);

    if (fastify.broadcastBuses) fastify.broadcastBuses();
    if (fastify.broadcastSync) fastify.broadcastSync();

    return { success: true, bus: updatedBus };
  });

  fastify.delete('/api/buses/:id', async (request, reply) => {
    const user = authenticate(request, reply, ['admin']);
    if (!user) return;

    const { id } = request.params;
    const existingBus = db.buses.find(b => b.id === id);
    if (!existingBus) {
      return reply.status(404).send({ success: false, error: 'Bus not found' });
    }

    await dbDeleteBus(id);

    if (fastify.broadcastBuses) fastify.broadcastBuses();
    if (fastify.broadcastSync) fastify.broadcastSync();
    return { success: true, message: 'Bus deleted successfully' };
  });

  // --- ROUTES ---
  fastify.get('/api/routes', async (request, reply) => {
    const routes = await dbGetRoutes();
    return { success: true, routes };
  });

  fastify.post('/api/routes', async (request, reply) => {
    const user = authenticate(request, reply, ['admin']);
    if (!user) return;

    const body = request.body || {};
    const items = Array.isArray(body) ? body : Array.isArray(body.routes) ? body.routes : [body];
    const created = [];

    for (const item of items) {
      const { name, stops, color, path, stopCoordinates, distanceKm, durationMin } = item;
      const cleanStops = Array.isArray(stops)
        ? stops.map(s => sanitizeString(s, 100))
        : typeof stops === 'string'
        ? stops.split(',').map(s => sanitizeString(s.trim(), 100)).filter(Boolean)
        : ["Stop 1", "Stop 2"];

      const newRoute = {
        id: item.id ? sanitizeString(item.id, 50) : `route-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: sanitizeString(name || "New Custom Route", 150),
        stops: cleanStops,
        color: sanitizeString(color || "#8b5cf6", 30),
        path: Array.isArray(path) && path.length >= 2 ? path : [
          { lat: 9.67416, lng: 76.82573 },
          { lat: 9.7123, lng: 76.6834 }
        ],
        stopCoordinates: Array.isArray(stopCoordinates) ? stopCoordinates : [],
        distanceKm: distanceKm !== undefined ? Number(distanceKm) || null : null,
        durationMin: durationMin !== undefined ? Number(durationMin) || null : null
      };
      await dbUpsertRoute(newRoute);
      created.push(newRoute);
    }

    if (fastify.broadcastSync) fastify.broadcastSync();

    return { success: true, route: created[0], routes: created, count: created.length };
  });

  fastify.post('/api/routes/bulk', async (request, reply) => {
    const user = authenticate(request, reply, ['admin']);
    if (!user) return;

    const body = request.body || {};
    const items = Array.isArray(body) ? body : Array.isArray(body.routes) ? body.routes : [];
    const created = [];

    for (const item of items) {
      const { name, stops, color, path, stopCoordinates, distanceKm, durationMin } = item;
      const newRoute = {
        id: item.id ? sanitizeString(item.id, 50) : `route-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: sanitizeString(name || "New Custom Route", 150),
        stops: Array.isArray(stops) ? stops.map(s => sanitizeString(s, 100)) : ["Stop 1", "Stop 2"],
        color: sanitizeString(color || "#8b5cf6", 30),
        path: Array.isArray(path) && path.length >= 2 ? path : [
          { lat: 9.67416, lng: 76.82573 },
          { lat: 9.7123, lng: 76.6834 }
        ],
        stopCoordinates: Array.isArray(stopCoordinates) ? stopCoordinates : [],
        distanceKm: distanceKm !== undefined ? Number(distanceKm) || null : null,
        durationMin: durationMin !== undefined ? Number(durationMin) || null : null
      };
      await dbUpsertRoute(newRoute);
      created.push(newRoute);
    }

    if (fastify.broadcastSync) fastify.broadcastSync();

    return { success: true, routes: created, count: created.length };
  });

  fastify.put('/api/routes/:id', async (request, reply) => {
    const user = authenticate(request, reply, ['admin']);
    if (!user) return;

    const { id } = request.params;
    const { name, stops, color, path, stopCoordinates, distanceKm, durationMin } = request.body || {};
    const existingRoute = db.routes.find(r => r.id === id);
    if (!existingRoute) {
      return reply.status(404).send({ success: false, error: 'Route not found' });
    }

    const updatedRoute = {
      ...existingRoute,
      ...(name !== undefined ? { name: sanitizeString(name, 150) } : {}),
      ...(stops !== undefined ? { stops: Array.isArray(stops) ? stops.map(s => sanitizeString(s, 100)) : existingRoute.stops } : {}),
      ...(color !== undefined ? { color: sanitizeString(color, 30) } : {}),
      ...(Array.isArray(path) && path.length >= 2 ? { path } : {}),
      ...(Array.isArray(stopCoordinates) ? { stopCoordinates } : {}),
      ...(distanceKm !== undefined ? { distanceKm: Number(distanceKm) || null } : {}),
      ...(durationMin !== undefined ? { durationMin: Number(durationMin) || null } : {})
    };

    await dbUpsertRoute(updatedRoute);

    if (fastify.broadcastSync) fastify.broadcastSync();

    return { success: true, route: updatedRoute };
  });

  fastify.delete('/api/routes/:id', async (request, reply) => {
    const user = authenticate(request, reply, ['admin']);
    if (!user) return;

    const { id } = request.params;
    const existingRoute = db.routes.find(r => r.id === id);
    if (!existingRoute) {
      return reply.status(404).send({ success: false, error: 'Route not found' });
    }

    await dbDeleteRoute(id);

    if (fastify.broadcastBuses) fastify.broadcastBuses();
    if (fastify.broadcastSync) fastify.broadcastSync();

    return { success: true, message: 'Route deleted successfully' };
  });

  // --- STUDENT PASSES ---
  fastify.get('/api/passes', async (request, reply) => {
    // Returns passes with sensitive password hashes securely stripped
    const passes = await dbGetPasses(false);
    return { success: true, passes };
  });

  fastify.post('/api/passes', async (request, reply) => {
    const user = authenticate(request, reply, ['admin']);
    if (!user) return;

    const body = request.body || {};
    const items = Array.isArray(body) ? body : Array.isArray(body.passes) ? body.passes : [body];
    const created = [];

    for (const item of items) {
      const { name, email, routeEntitlement, validUntil, passStatus, status, username, password } = item;
      const cleanUsername = sanitizeString(username || '', 50);
      const studentId = item.id ? sanitizeString(item.id, 50) : (cleanUsername && !cleanUsername.includes('@') ? cleanUsername : `S${Math.floor(1000 + Math.random() * 9000)}`);
      const studentUsername = cleanUsername || studentId;
      const cleanName = sanitizeString(name || item.studentName || "New Student", 100);

      const newPass = {
        id: studentId,
        username: studentUsername,
        password: password || "student123",
        name: cleanName,
        studentName: cleanName,
        email: sanitizeString(email || `${studentUsername.toLowerCase()}@student.edu`, 100),
        routeEntitlement: sanitizeString(routeEntitlement || "All Routes", 100),
        validUntil: sanitizeString(validUntil || "2026-12-31", 30),
        passStatus: sanitizeString(passStatus || status || "Valid", 30)
      };
      const savedPass = await dbUpsertPass(newPass);
      created.push(savedPass);
    }

    if (fastify.broadcastSync) fastify.broadcastSync();

    return { success: true, pass: created[0], passes: created, count: created.length };
  });

  fastify.post('/api/passes/bulk', async (request, reply) => {
    const user = authenticate(request, reply, ['admin']);
    if (!user) return;

    const body = request.body || {};
    const items = Array.isArray(body) ? body : Array.isArray(body.passes) ? body.passes : [];
    const created = [];

    for (const item of items) {
      const { name, email, routeEntitlement, validUntil, passStatus, status, username, password } = item;
      const cleanUsername = sanitizeString(username || '', 50);
      const studentId = item.id ? sanitizeString(item.id, 50) : (cleanUsername && !cleanUsername.includes('@') ? cleanUsername : `S${Math.floor(1000 + Math.random() * 9000)}`);
      const studentUsername = cleanUsername || studentId;
      const cleanName = sanitizeString(name || item.studentName || "New Student", 100);

      const newPass = {
        id: studentId,
        username: studentUsername,
        password: password || "student123",
        name: cleanName,
        studentName: cleanName,
        email: sanitizeString(email || `${studentUsername.toLowerCase()}@student.edu`, 100),
        routeEntitlement: sanitizeString(routeEntitlement || "All Routes", 100),
        validUntil: sanitizeString(validUntil || "2026-12-31", 30),
        passStatus: sanitizeString(passStatus || status || "Valid", 30)
      };
      const savedPass = await dbUpsertPass(newPass);
      created.push(savedPass);
    }

    if (fastify.broadcastSync) fastify.broadcastSync();

    return { success: true, passes: created, count: created.length };
  });

  fastify.put('/api/passes/:id', async (request, reply) => {
    const user = authenticate(request, reply, ['admin']);
    if (!user) return;

    const { id } = request.params;
    const { passStatus, validUntil, routeEntitlement, name, email, username, password, newId } = request.body || {};
    const existingPass = db.studentPasses.find(p => p.id === id);
    if (!existingPass) {
      return reply.status(404).send({ success: false, error: 'Student pass not found' });
    }

    const updatedPass = {
      ...existingPass,
      ...(passStatus !== undefined ? { passStatus: sanitizeString(passStatus, 30) } : {}),
      ...(validUntil !== undefined ? { validUntil: sanitizeString(validUntil, 30) } : {}),
      ...(routeEntitlement !== undefined ? { routeEntitlement: sanitizeString(routeEntitlement, 100) } : {}),
      ...(name !== undefined ? { name: sanitizeString(name, 100), studentName: sanitizeString(name, 100) } : {}),
      ...(email !== undefined ? { email: sanitizeString(email, 100) } : {}),
      ...(username !== undefined ? { username: sanitizeString(username, 50) } : {}),
      ...(password !== undefined && password.trim() ? { password: password.trim() } : {}),
      ...(newId !== undefined && newId.trim() && newId !== id ? { id: sanitizeString(newId.trim(), 50) } : {})
    };

    if (newId && newId.trim() && newId !== id) {
      await dbDeletePass(id);
    }
    const saved = await dbUpsertPass(updatedPass);

    if (fastify.broadcastSync) fastify.broadcastSync();

    return { success: true, pass: saved };
  });

  fastify.delete('/api/passes/:id', async (request, reply) => {
    const user = authenticate(request, reply, ['admin']);
    if (!user) return;

    const { id } = request.params;
    const existingPass = db.studentPasses.find(p => p.id === id);
    if (!existingPass) {
      return reply.status(404).send({ success: false, error: 'Student pass not found' });
    }

    await dbDeletePass(id);

    if (fastify.broadcastSync) fastify.broadcastSync();

    return { success: true, message: 'Student pass deleted successfully' };
  });

  // --- AUTH / LOGIN (RATE-LIMITED & HARDENED) ---
  fastify.post('/api/login', async (request, reply) => {
    const clientIp = request.ip || '127.0.0.1';

    // 1. Check Rate Limit (Anti Brute-Force)
    const rateCheck = checkLoginRateLimit(clientIp);
    if (!rateCheck.allowed) {
      reply.header('Retry-After', rateCheck.remainingSeconds);
      return reply.status(429).send({
        success: false,
        error: rateCheck.message
      });
    }

    const { username, password, role } = request.body || {};
    const cleanUsername = (username || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!cleanUsername || !cleanPassword) {
      return reply.status(400).send({ success: false, error: 'Please enter both username and password' });
    }

    const user = await dbAuthenticateUser(cleanUsername, cleanPassword, role);
    if (user) {
      // Reset rate limit counter on valid credentials
      resetLoginAttempts(clientIp);

      return {
        success: true,
        user,
        token: user.token
      };
    }

    // Record failed attempt for rate limiting
    recordFailedLogin(clientIp);

    return reply.status(401).send({ success: false, error: 'Invalid username or password' });
  });

  // --- DRIVERS DIRECTORY (RESTRICTED TO ADMINS) ---
  fastify.get('/api/drivers', async (request, reply) => {
    const user = authenticate(request, reply, ['admin']);
    if (!user) return;

    // Strips password hashes from response
    const drivers = await dbGetDrivers(false);
    return { success: true, drivers };
  });

  fastify.post('/api/drivers', async (request, reply) => {
    const user = authenticate(request, reply, ['admin']);
    if (!user) return;

    const body = request.body || {};
    const items = Array.isArray(body) ? body : Array.isArray(body.drivers) ? body.drivers : [body];
    const created = [];

    for (const item of items) {
      const { username, password, name, phone, assignedBusId, status } = item;
      const cleanUsername = sanitizeString(username || `driver.${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 100)}`, 50);
      const newDriver = {
        id: item.id ? sanitizeString(item.id, 50) : `driver-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        username: cleanUsername,
        password: password || "password123",
        name: sanitizeString(name || "New Bus Driver", 100),
        phone: sanitizeString(phone || "+1-555-0000", 30),
        assignedBusId: assignedBusId ? sanitizeString(assignedBusId, 50) : null,
        status: sanitizeString(status || "Active", 30)
      };
      const savedDriver = await dbUpsertDriver(newDriver);
      created.push(savedDriver);
    }

    return { success: true, driver: created[0], drivers: created, count: created.length };
  });

  fastify.post('/api/drivers/bulk', async (request, reply) => {
    const user = authenticate(request, reply, ['admin']);
    if (!user) return;

    const body = request.body || {};
    const items = Array.isArray(body) ? body : Array.isArray(body.drivers) ? body.drivers : [];
    const created = [];

    for (const item of items) {
      const { username, password, name, phone, assignedBusId, status } = item;
      const cleanUsername = sanitizeString(username || `driver.${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 100)}`, 50);
      const newDriver = {
        id: item.id ? sanitizeString(item.id, 50) : `driver-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        username: cleanUsername,
        password: password || "password123",
        name: sanitizeString(name || "New Bus Driver", 100),
        phone: sanitizeString(phone || "+1-555-0000", 30),
        assignedBusId: assignedBusId ? sanitizeString(assignedBusId, 50) : null,
        status: sanitizeString(status || "Active", 30)
      };
      const savedDriver = await dbUpsertDriver(newDriver);
      created.push(savedDriver);
    }

    return { success: true, drivers: created, count: created.length };
  });

  fastify.put('/api/drivers/:id', async (request, reply) => {
    const user = authenticate(request, reply, ['admin']);
    if (!user) return;

    const { id } = request.params;
    const { name, username, password, phone, assignedBusId, status } = request.body || {};
    const existingDriver = db.drivers.find(d => d.id === id);
    if (!existingDriver) {
      return reply.status(404).send({ success: false, error: 'Driver not found' });
    }

    const updatedDriver = {
      ...existingDriver,
      ...(name !== undefined ? { name: sanitizeString(name, 100) } : {}),
      ...(username !== undefined ? { username: sanitizeString(username, 50) } : {}),
      ...(password !== undefined && password.trim() ? { password: password.trim() } : {}),
      ...(phone !== undefined ? { phone: sanitizeString(phone, 30) } : {}),
      ...(assignedBusId !== undefined ? { assignedBusId: assignedBusId ? sanitizeString(assignedBusId, 50) : null } : {}),
      ...(status !== undefined ? { status: sanitizeString(status, 30) } : {})
    };

    const saved = await dbUpsertDriver(updatedDriver);

    return { success: true, driver: saved };
  });

  fastify.delete('/api/drivers/:id', async (request, reply) => {
    const user = authenticate(request, reply, ['admin']);
    if (!user) return;

    const { id } = request.params;
    const existingDriver = db.drivers.find(d => d.id === id);
    if (!existingDriver) {
      return reply.status(404).send({ success: false, error: 'Driver not found' });
    }

    await dbDeleteDriver(id);

    return { success: true, message: 'Driver deleted successfully' };
  });

  // --- BULK DELETE ENDPOINTS ---
  fastify.post('/api/buses/bulk-delete', async (request, reply) => {
    const user = authenticate(request, reply, ['admin']);
    if (!user) return;
    const { ids = [] } = request.body || {};
    for (const id of ids) {
      await dbDeleteBus(id);
    }
    if (fastify.broadcastBuses) fastify.broadcastBuses();
    if (fastify.broadcastSync) fastify.broadcastSync();
    return { success: true, count: ids.length, message: `${ids.length} buses deleted successfully` };
  });

  fastify.post('/api/routes/bulk-delete', async (request, reply) => {
    const user = authenticate(request, reply, ['admin']);
    if (!user) return;
    const { ids = [] } = request.body || {};
    for (const id of ids) {
      await dbDeleteRoute(id);
    }
    if (fastify.broadcastBuses) fastify.broadcastBuses();
    if (fastify.broadcastSync) fastify.broadcastSync();
    return { success: true, count: ids.length, message: `${ids.length} routes deleted successfully` };
  });

  fastify.post('/api/passes/bulk-delete', async (request, reply) => {
    const user = authenticate(request, reply, ['admin']);
    if (!user) return;
    const { ids = [] } = request.body || {};
    for (const id of ids) {
      await dbDeletePass(id);
    }
    if (fastify.broadcastSync) fastify.broadcastSync();
    return { success: true, count: ids.length, message: `${ids.length} student passes deleted successfully` };
  });

  fastify.post('/api/drivers/bulk-delete', async (request, reply) => {
    const user = authenticate(request, reply, ['admin']);
    if (!user) return;
    const { ids = [] } = request.body || {};
    for (const id of ids) {
      await dbDeleteDriver(id);
    }
    return { success: true, count: ids.length, message: `${ids.length} drivers deleted successfully` };
  });

  // --- SCALE SEEDING ENDPOINT (FOR 10 DRIVERS & 500 STUDENTS) ---
  fastify.post('/api/seed/scale', async (request, reply) => {
    const user = authenticate(request, reply, ['admin']);
    if (!user) return;

    // 1. Seed 10 Drivers
    const driverFirstNames = ['Rahul', 'Suresh', 'Anand', 'Biju', 'Manoj', 'Vishnu', 'Joseph', 'Pradeep', 'Renjith', 'Vijayan'];
    const driverLastNames = ['Nair', 'Kumar', 'Pillai', 'Kurian', 'Menon', 'Varghese', 'Mathew', 'Thomas', 'Chandran', 'Panicker'];
    
    for (let i = 0; i < 10; i++) {
      const id = `driver-${101 + i}`;
      const username = `driver.${driverFirstNames[i].toLowerCase()}`;
      const name = `${driverFirstNames[i]} ${driverLastNames[i]}`;
      const phone = `+91-9847${Math.floor(100000 + Math.random() * 900000)}`;
      const assignedBusId = i < db.buses.length ? db.buses[i].id : `bus-${101 + i}`;

      await dbUpsertDriver({
        id,
        username,
        password: 'password123',
        name,
        phone,
        assignedBusId,
        status: i === 0 || i === 1 ? 'Active' : 'Off Duty'
      });
    }

    // 2. Seed 500 Students
    const studentFirstNames = ['Aarav', 'Aditi', 'Alok', 'Ananya', 'Arya', 'Dev', 'Diya', 'Gautam', 'Isha', 'Kavya', 'Madhav', 'Neha', 'Pranav', 'Rhea', 'Rohan', 'Sneha', 'Tanvi', 'Varun', 'Ved', 'Zoya'];
    const studentLastNames = ['Sharma', 'Verma', 'Patel', 'Menon', 'Nair', 'Pillai', 'Iyer', 'Kurian', 'Varghese', 'Mathew', 'Thomas', 'Joseph', 'Reddy', 'Rao', 'Chopra', 'Kapoor', 'Singh', 'Babu', 'Mohan', 'Das'];
    const routesList = db.routes.length > 0 ? db.routes.map(r => r.name) : ['Express Route A - Kottayam to CEP', 'Transit Route B - Kanjirappally', 'All Routes'];

    for (let i = 1; i <= 500; i++) {
      const studentId = `S${1000 + i}`;
      const fName = studentFirstNames[(i - 1) % studentFirstNames.length];
      const lName = studentLastNames[(Math.floor((i - 1) / studentFirstNames.length)) % studentLastNames.length];
      const fullName = `${fName} ${lName}`;
      const email = `${fName.toLowerCase()}.${lName.toLowerCase()}${i}@student.edu`;
      const routeEntitlement = i % 5 === 0 ? 'All Routes' : routesList[i % routesList.length];
      const passStatus = i % 15 === 0 ? 'Expired' : i % 25 === 0 ? 'Pending Approval' : 'Active';

      await dbUpsertPass({
        id: studentId,
        username: studentId,
        password: 'student123',
        name: fullName,
        studentName: fullName,
        email,
        routeEntitlement,
        validUntil: '2026-12-31',
        passStatus
      });
    }

    if (fastify.broadcastSync) fastify.broadcastSync();

    return {
      success: true,
      message: 'Successfully scaled dataset to 10 drivers and 500 students!',
      driversCount: db.drivers.length,
      passesCount: db.studentPasses.length
    };
  });
}
