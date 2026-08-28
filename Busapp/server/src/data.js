// Mock Database Store for Bus Tracking App

export const db = {
  routes: [
    {
      id: "route-1",
      name: "Express Route A - Campus to Downtown",
      stops: ["Campus Gate 1", "Tech Park Hub", "Central Station", "Downtown Mall"],
      color: "#3b82f6", // Blue
      path: [
        { lat: 9.9312, lng: 76.2673 },
        { lat: 9.9325, lng: 76.2685 },
        { lat: 9.9340, lng: 76.2710 },
        { lat: 9.9365, lng: 76.2740 },
        { lat: 9.9390, lng: 76.2775 }
      ]
    },
    {
      id: "route-2",
      name: "North Line B - Campus to Residential",
      stops: ["Campus Gate 2", "Stadium", "North Towers", "Green Valley"],
      color: "#10b981", // Green
      path: [
        { lat: 9.9350, lng: 76.2700 },
        { lat: 9.9370, lng: 76.2680 },
        { lat: 9.9400, lng: 76.2650 },
        { lat: 9.9430, lng: 76.2620 }
      ]
    }
  ],
  buses: [
    {
      id: "bus-101",
      number: "BUS #101 (KL-07-AB-1234)",
      routeId: "route-1",
      driverName: "John Doe",
      status: "Active", // Active, Maintenance, Off Duty
      location: { lat: 9.9312, lng: 76.2673 },
      speed: 32,
      lastUpdated: new Date().toISOString()
    },
    {
      id: "bus-102",
      number: "BUS #102 (KL-07-CD-5678)",
      routeId: "route-2",
      driverName: "Sarah Jenkins",
      status: "Active",
      location: { lat: 9.9350, lng: 76.2700 },
      speed: 28,
      lastUpdated: new Date().toISOString()
    },
    {
      id: "bus-103",
      number: "BUS #103 (KL-07-EF-9012)",
      routeId: null,
      driverName: "Unassigned",
      status: "Maintenance",
      location: { lat: 9.9300, lng: 76.2600 },
      speed: 0,
      lastUpdated: new Date().toISOString()
    }
  ],
  studentPasses: [
    {
      id: "S1001",
      name: "Alex Mercer",
      email: "alex.mercer@student.edu",
      passStatus: "Active", // Active, Expired, Pending
      validUntil: "2026-12-31",
      routeEntitlement: "All Routes"
    },
    {
      id: "S1002",
      name: "Elena Rostova",
      email: "elena.r@student.edu",
      passStatus: "Expired",
      validUntil: "2026-05-30",
      routeEntitlement: "Route 1 Only"
    },
    {
      id: "S1003",
      name: "David Kim",
      email: "david.kim@student.edu",
      passStatus: "Pending Approval",
      validUntil: "2026-12-31",
      routeEntitlement: "Route 2 Only"
    }
  ],
  drivers: [
    {
      id: "driver-1",
      username: "john.driver",
      password: "password123",
      name: "John Doe",
      phone: "+1-555-0101",
      assignedBusId: "bus-101",
      status: "Active"
    },
    {
      id: "driver-2",
      username: "sarah.driver",
      password: "password123",
      name: "Sarah Jenkins",
      phone: "+1-555-0102",
      assignedBusId: "bus-102",
      status: "Active"
    },
    {
      id: "driver-3",
      username: "mike.driver",
      password: "password123",
      name: "Mike Unassigned",
      phone: "+1-555-0103",
      assignedBusId: "bus-103",
      status: "Off Duty"
    }
  ],
  admins: [
    {
      id: "admin-1",
      username: "admin",
      password: "adminpassword",
      name: "Head Campus Administrator",
      role: "admin"
    }
  ]
};
