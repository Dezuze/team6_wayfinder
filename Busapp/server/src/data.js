export const db = {
  routes: [],
  buses: [],
  studentPasses: [
    {
      id: "S1001",
      name: "Student",
      email: "student@edu.com",
      passStatus: "Active",
      validUntil: "2030-12-31",
      routeEntitlement: "All Routes"
    }
  ],
  drivers: [
    {
      id: "driver-1",
      username: "driver",
      password: "password123",
      name: "Driver One",
      phone: "+1-555-0101",
      assignedBusId: null,
      status: "Active"
    }
  ],
  admins: [
    {
      id: "admin-1",
      username: "admin",
      password: "password123",
      name: "Administrator",
      role: "admin"
    }
  ]
};
