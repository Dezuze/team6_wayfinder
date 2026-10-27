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
  dbUpdateAdminPassword,
  isConnected
} from '../db/index.js';
import {
  verifyAuthToken,
  sanitizeString,
  isValidCoordinate,
  verifyPassQr,
  verifyPassword
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

      // Reflect driver assignment to driver directory if assigned
      if (newBus.driverName && newBus.driverName !== 'Unassigned') {
        const matchedDriver = db.drivers.find(d => 
          (d.name || '').toLowerCase() === newBus.driverName.toLowerCase() ||
          (d.username || '').toLowerCase() === newBus.driverName.toLowerCase()
        );
        if (matchedDriver) {
          matchedDriver.assignedBusId = newBus.id;
          await dbUpsertDriver(matchedDriver);
        }
      }

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

    // If driver assignment changed on the bus, sync drivers directory
    if (driverName !== undefined && driverName !== existingBus.driverName) {
      if (existingBus.driverName && existingBus.driverName !== 'Unassigned') {
        const prevDriver = db.drivers.find(d => 
          (d.name || '').toLowerCase() === existingBus.driverName.toLowerCase() &&
          d.assignedBusId === id
        );
        if (prevDriver) {
          prevDriver.assignedBusId = null;
          await dbUpsertDriver(prevDriver);
        }
      }
      if (driverName && driverName !== 'Unassigned') {
        const nextDriver = db.drivers.find(d => 
          (d.name || '').toLowerCase() === driverName.toLowerCase() ||
          (d.username || '').toLowerCase() === driverName.toLowerCase()
        );
        if (nextDriver) {
          nextDriver.assignedBusId = id;
          await dbUpsertDriver(nextDriver);
        }
      }
    }

    await dbUpsertBus(updatedBus);

    if (fastify.broadcastBuses) fastify.broadcastBuses();
    if (fastify.broadcastSync) fastify.broadcastSync();

    return { success: true, bus: updatedBus };
  });

  fastify.delete('/api/buses/:id', async (request, reply) => {
    const user = authenticate(request, reply, ['admin']);
    if (!user) return;

    const { id } = request.params;
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

  const handleUpdatePass = async (request, reply) => {
    const user = authenticate(request, reply, ['admin']);
    if (!user) return;

    const rawId = request.params['*'] || request.params.id;
    const id = rawId ? decodeURIComponent(rawId) : '';
    const { passStatus, validUntil, routeEntitlement, name, email, username, password, newId } = request.body || {};

    let existingPass = db.studentPasses.find(p => p.id === id || p.id === rawId);
    if (!existingPass && isConnected && isConnected()) {
      await dbGetPasses(true);
      existingPass = db.studentPasses.find(p => p.id === id || p.id === rawId);
    }

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
      ...(newId !== undefined && newId.trim() && newId !== existingPass.id ? { id: sanitizeString(newId.trim(), 50) } : {})
    };

    if (newId && newId.trim() && newId !== existingPass.id) {
      await dbDeletePass(existingPass.id);
    }
    const saved = await dbUpsertPass(updatedPass);

    if (fastify.broadcastSync) fastify.broadcastSync();

    return { success: true, pass: saved };
  };

  fastify.put('/api/passes/:id', handleUpdatePass);
  fastify.put('/api/passes/*', handleUpdatePass);

  const handleDeletePass = async (request, reply) => {
    const user = authenticate(request, reply, ['admin']);
    if (!user) return;

    const rawId = request.params['*'] || request.params.id;
    const id = rawId ? decodeURIComponent(rawId) : '';
    await dbDeletePass(id);

    if (fastify.broadcastSync) fastify.broadcastSync();

    return { success: true, message: 'Student pass deleted successfully' };
  };

  fastify.delete('/api/passes/:id', handleDeletePass);
  fastify.delete('/api/passes/*', handleDeletePass);

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

      // Link and immediately reflect to the bus in fleet section
      if (newDriver.assignedBusId) {
        const targetBus = db.buses.find(b => b.id === newDriver.assignedBusId);
        if (targetBus) {
          targetBus.driverName = newDriver.name;
          await dbUpsertBus(targetBus);
        }
      }

      created.push(savedDriver);
    }

    if (fastify.broadcastBuses) fastify.broadcastBuses();
    if (fastify.broadcastSync) fastify.broadcastSync();

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

      // Link and immediately reflect to the bus in fleet section
      if (newDriver.assignedBusId) {
        const targetBus = db.buses.find(b => b.id === newDriver.assignedBusId);
        if (targetBus) {
          targetBus.driverName = newDriver.name;
          await dbUpsertBus(targetBus);
        }
      }

      created.push(savedDriver);
    }

    if (fastify.broadcastBuses) fastify.broadcastBuses();
    if (fastify.broadcastSync) fastify.broadcastSync();

    return { success: true, drivers: created, count: created.length };
  });

  const handleUpdateDriver = async (request, reply) => {
    const user = authenticate(request, reply, ['admin']);
    if (!user) return;

    const rawId = request.params['*'] || request.params.id;
    const id = rawId ? decodeURIComponent(rawId) : '';
    const { name, username, password, phone, assignedBusId, status } = request.body || {};

    let existingDriver = db.drivers.find(d => d.id === id || d.id === rawId);
    if (!existingDriver && isConnected && isConnected()) {
      await dbGetDrivers();
      existingDriver = db.drivers.find(d => d.id === id || d.id === rawId);
    }

    if (!existingDriver) {
      return reply.status(404).send({ success: false, error: 'Driver not found' });
    }

    const driverName = name !== undefined ? sanitizeString(name, 100) : existingDriver.name;
    const prevBusId = existingDriver.assignedBusId;
    const newBusId = assignedBusId !== undefined ? (assignedBusId ? sanitizeString(assignedBusId, 50) : null) : prevBusId;

    const updatedDriver = {
      ...existingDriver,
      name: driverName,
      ...(username !== undefined ? { username: sanitizeString(username, 50) } : {}),
      ...(password !== undefined && password.trim() ? { password: password.trim() } : {}),
      ...(phone !== undefined ? { phone: sanitizeString(phone, 30) } : {}),
      assignedBusId: newBusId,
      ...(status !== undefined ? { status: sanitizeString(status, 30) } : {})
    };

    const saved = await dbUpsertDriver(updatedDriver);

    // If bus assignment changed or driver name changed, sync fleet buses
    if (prevBusId && prevBusId !== newBusId) {
      const oldBus = db.buses.find(b => b.id === prevBusId);
      if (oldBus && oldBus.driverName === existingDriver.name) {
        oldBus.driverName = 'Unassigned';
        await dbUpsertBus(oldBus);
      }
    }
    if (newBusId) {
      const newBus = db.buses.find(b => b.id === newBusId);
      if (newBus) {
        newBus.driverName = driverName;
        await dbUpsertBus(newBus);
      }
    }

    if (fastify.broadcastBuses) fastify.broadcastBuses();
    if (fastify.broadcastSync) fastify.broadcastSync();

    return { success: true, driver: saved };
  };

  fastify.put('/api/drivers/:id', handleUpdateDriver);
  fastify.put('/api/drivers/*', handleUpdateDriver);

  const handleDeleteDriver = async (request, reply) => {
    const user = authenticate(request, reply, ['admin']);
    if (!user) return;

    const rawId = request.params['*'] || request.params.id;
    const id = rawId ? decodeURIComponent(rawId) : '';
    const driver = db.drivers.find(d => d.id === id || d.id === rawId);
    if (driver && driver.assignedBusId) {
      const bus = db.buses.find(b => b.id === driver.assignedBusId || b.driverName === driver.name);
      if (bus) {
        bus.driverName = 'Unassigned';
        await dbUpsertBus(bus);
      }
    }

    await dbDeleteDriver(id);

    if (fastify.broadcastBuses) fastify.broadcastBuses();
    if (fastify.broadcastSync) fastify.broadcastSync();

    return { success: true, message: 'Driver deleted successfully' };
  };

  fastify.delete('/api/drivers/:id', handleDeleteDriver);
  fastify.delete('/api/drivers/*', handleDeleteDriver);

  // --- ADMIN UPDATE OWN PASSWORD ---
  fastify.put('/api/admin/password', async (request, reply) => {
    const user = authenticate(request, reply, ['admin']);
    if (!user) return;

    const { currentPassword, newPassword } = request.body || {};
    if (!newPassword || newPassword.trim().length < 4) {
      return reply.status(400).send({ success: false, error: 'New password must be at least 4 characters long.' });
    }

    const adminRecord = db.admins.find(a => a.id === user.id || a.username === user.username);
    if (adminRecord && currentPassword) {
      const { valid } = verifyPassword(currentPassword, adminRecord.password);
      if (!valid) {
        return reply.status(400).send({ success: false, error: 'Current password is incorrect.' });
      }
    }

    await dbUpdateAdminPassword(adminRecord ? adminRecord.id : user.id, newPassword);
    return { success: true, message: 'Admin password updated successfully.' };
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
      const driver = db.drivers.find(d => d.id === id);
      if (driver && driver.assignedBusId) {
        const bus = db.buses.find(b => b.id === driver.assignedBusId || b.driverName === driver.name);
        if (bus) {
          bus.driverName = 'Unassigned';
          await dbUpsertBus(bus);
        }
      }
      await dbDeleteDriver(id);
    }
    if (fastify.broadcastBuses) fastify.broadcastBuses();
    if (fastify.broadcastSync) fastify.broadcastSync();
    return { success: true, count: ids.length, message: `${ids.length} drivers deleted successfully` };
  });

  // --- EMERGENCY SOS REST ENDPOINTS ---
  fastify.get('/api/sos', async (request, reply) => {
    return {
      success: true,
      alerts: db.activeSosAlerts || []
    };
  });

  fastify.post('/api/sos', async (request, reply) => {
    const { busId, reason, senderName, senderRole, location } = request.body || {};
    let targetBus = null;
    let busIndex = busId ? db.buses.findIndex(b => b.id === busId) : -1;

    if (busIndex === -1 && busId) {
      targetBus = {
        id: busId || `bus-${Date.now()}`,
        number: `BUS #${busId}`,
        routeId: null,
        driverName: senderName || 'Live Driver',
        status: "EMERGENCY / SOS",
        sosReason: reason || "Emergency SOS assistance reported",
        location: location || { lat: 9.67416, lng: 76.82573 },
        speed: 0,
        isLive: true,
        lastUpdated: new Date().toISOString()
      };
      db.buses.push(targetBus);
      await dbUpsertBus(targetBus).catch(() => {});
    } else if (busIndex !== -1) {
      db.buses[busIndex].status = "EMERGENCY / SOS";
      db.buses[busIndex].sosReason = reason || "Emergency SOS assistance reported";
      db.buses[busIndex].isLive = true;
      if (location && location.lat && location.lng) {
        db.buses[busIndex].location = location;
      }
      db.buses[busIndex].lastUpdated = new Date().toISOString();
      targetBus = db.buses[busIndex];
      await dbUpsertBus(targetBus).catch(() => {});
    }

    const alertObj = {
      id: `sos-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      busId: busId || targetBus?.id || null,
      busNumber: targetBus?.number || (busId ? `BUS #${busId}` : 'Campus Emergency Alert'),
      senderName: senderName || targetBus?.driverName || 'User',
      senderRole: senderRole || 'student',
      reason: reason || "Emergency distress signal pushed",
      location: location || targetBus?.location || { lat: 9.67416, lng: 76.82573 },
      timestamp: new Date().toISOString(),
      active: true
    };

    db.activeSosAlerts = db.activeSosAlerts || [];
    db.activeSosAlerts.push(alertObj);

    if (fastify.broadcastBuses) fastify.broadcastBuses();
    if (fastify.broadcastSosAlert) fastify.broadcastSosAlert(alertObj);

    return {
      success: true,
      alert: alertObj
    };
  });

  fastify.post('/api/sos/resolve', async (request, reply) => {
    const { busId, alertId } = request.body || {};
    if (busId) {
      const busIndex = db.buses.findIndex(b => b.id === busId);
      if (busIndex !== -1) {
        db.buses[busIndex].status = 'In Transit';
        delete db.buses[busIndex].sosReason;
        db.buses[busIndex].lastUpdated = new Date().toISOString();
        await dbUpsertBus(db.buses[busIndex]).catch(() => {});
      }
    }
    if (db.activeSosAlerts) {
      db.activeSosAlerts = db.activeSosAlerts.filter(a => {
        if (busId && a.busId === busId) return false;
        if (alertId && a.id === alertId) return false;
        return true;
      });
    }

    if (fastify.broadcastBuses) fastify.broadcastBuses();
    if (fastify.broadcastSosResolved) fastify.broadcastSosResolved(busId, alertId);

    return {
      success: true,
      message: 'Emergency SOS alert resolved successfully'
    };
  });
}
