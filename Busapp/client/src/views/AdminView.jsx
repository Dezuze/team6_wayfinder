import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import FleetMap from '../components/FleetMap';
import BulkCsvUploader from '../components/BulkCsvUploader';
import { STUDENT_PASS_CSV_TEMPLATE, DRIVER_CSV_TEMPLATE, BUS_CSV_TEMPLATE, ROUTE_CSV_TEMPLATE } from '../utils/csv';
import { COLLEGE_DESTINATION } from '../constants/college';
import { fetchRoadRoute } from '../utils/routing';
import ConfirmModal from '../components/ConfirmModal';
import {
  Bus,
  GitFork,
  Cloud,
  Search,
  SlidersHorizontal,
  MoreVertical,
  Gauge,
  MapPin,
  Shield,
  LogOut,
  Sun,
  Moon,
  Trash2,
  ArrowDown,
  Loader,
  Users,
  Plus,
  Check,
  X,
  Clock,
  Navigation,
  GraduationCap,
  Building2,
  Flag,
  AlertTriangle,
  RefreshCw,
  FileText,
  Pencil,
  Key,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  CheckSquare,
  Square,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function AdminView({ activeRole: _activeRole, setActiveRole }) {
  const { buses, routes, passes, refreshData, createRoute, deleteRoute, updateBusRoute } = useWebSocket();
  const { user, logout } = useAuth();
  const { themeMode, cycleTheme, effectiveTheme } = useTheme();
  const [activeSection, setActiveSection] = useState('buses'); // buses, routes, passes
  const [newRouteName, setNewRouteName] = useState('');
  const [newRouteColor, setNewRouteColor] = useState('#7c3aed');
  
  // New Pass State
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentRoute, setNewStudentRoute] = useState('All Routes');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fleetFilter, setFleetFilter] = useState('Active'); // All, Active, Delayed, Idle
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [selectedBusId, setSelectedBusId] = useState(null);
  const [pickedStops, setPickedStops] = useState([]);
  const [candidatePlace, setCandidatePlace] = useState(null);
  const [driversDirectory, setDriversDirectory] = useState([]);
  const [isAddBusModalOpen, setIsAddBusModalOpen] = useState(false);
  const [newBusNumber, setNewBusNumber] = useState('');
  const [newBusRouteId, setNewBusRouteId] = useState('');
  const [newBusDriverName, setNewBusDriverName] = useState('');
  const [newBusStatus, setNewBusStatus] = useState('Active');

  // Mode toggles for bulk csv add
  const [passAddMode, setPassAddMode] = useState('single'); // single, bulk
  const [driverAddMode, setDriverAddMode] = useState('single'); // single, bulk
  const [busAddMode, setBusAddMode] = useState('single'); // single, bulk
  const [routeAddMode, setRouteAddMode] = useState('builder'); // builder, bulk

  // Driver management & modal states
  const [isAddDriverModalOpen, setIsAddDriverModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [showDriverPassword, setShowDriverPassword] = useState(false);
  const [showEditDriverPassword, setShowEditDriverPassword] = useState(false);
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverUsername, setNewDriverUsername] = useState('');
  const [newDriverPassword, setNewDriverPassword] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newDriverBusId, setNewDriverBusId] = useState('');
  const [newDriverStatus, setNewDriverStatus] = useState('Active');
  const [driverSearchQuery, setDriverSearchQuery] = useState('');

  const [editDriverName, setEditDriverName] = useState('');
  const [editDriverUsername, setEditDriverUsername] = useState('');
  const [editDriverPassword, setEditDriverPassword] = useState('');
  const [editDriverPhone, setEditDriverPhone] = useState('');
  const [editDriverBusId, setEditDriverBusId] = useState('');
  const [editDriverStatus, setEditDriverStatus] = useState('Active');

  // Student management & modal states
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [showEditStudentPassword, setShowEditStudentPassword] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [newStudentUsername, setNewStudentUsername] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [newStudentStatus, setNewStudentStatus] = useState('Valid');
  const [newStudentValidUntil, setNewStudentValidUntil] = useState('2026-12-31');

  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentUsername, setEditStudentUsername] = useState('');
  const [editStudentPassword, setEditStudentPassword] = useState('');
  const [editStudentId, setEditStudentId] = useState('');
  const [editStudentEmail, setEditStudentEmail] = useState('');
  const [editStudentRoute, setEditStudentRoute] = useState('All Routes');
  const [editStudentStatus, setEditStudentStatus] = useState('Valid');
  const [editStudentValidUntil, setEditStudentValidUntil] = useState('2026-12-31');

  // ── Bulk Selection States (Drivers, Passes, Routes) ──
  const [selectedDriverIds, setSelectedDriverIds] = useState(new Set());
  const [selectedPassIds, setSelectedPassIds] = useState(new Set());
  const [selectedRouteIds, setSelectedRouteIds] = useState(new Set());

  // ── Scalability (500 Students & 10 Drivers) ──
  const [passPage, setPassPage] = useState(1);
  const [passesPerPage, setPassPerPage] = useState(20);
  const [scaleStatus, setScaleStatus] = useState(null);

  // ── Built-in UI Confirmation / Deletion Modal ──
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    isDanger: true,
    onConfirm: () => {}
  });

  const getAuthHeaders = () => {
    const headers = { 'Content-Type': 'application/json' };
    if (user?.token) {
      headers['Authorization'] = `Bearer ${user.token}`;
    }
    return headers;
  };

  // ── Professional Add Pickup Stop Modal State ──
  const [isAddStopModalOpen, setIsAddStopModalOpen] = useState(false);
  const [modalStopData, setModalStopData] = useState({
    name: '',
    address: '',
    lat: 0,
    lng: 0,
    isSearch: false
  });
  const [stopNameInput, setStopNameInput] = useState('');

  // ── Real Road Routing Geometry & Metrics ──
  const [roadGeometry, setRoadGeometry] = useState([]);
  const [routeMetrics, setRouteMetrics] = useState({ distanceKm: 0, durationMin: 0 });
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [routeCalcError, setRouteCalcError] = useState(null);
  const [routeSuccessMsg, setRouteSuccessMsg] = useState(null);

  const fetchDrivers = async () => {
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/drivers');
      const data = await res.json();
      if (data.success && data.drivers) {
        setDriversDirectory(data.drivers);
      }
    } catch (err) {
      console.error('Error loading drivers directory:', err);
    }
  };

  // Fetch Drivers Directory from server on mount
  useEffect(() => {
    fetchDrivers();
  }, []);

  // Recalculate real road-following route whenever pickedStops change
  useEffect(() => {
    if (!pickedStops || pickedStops.length === 0) {
      setRoadGeometry([]);
      setRouteMetrics({ distanceKm: 0, durationMin: 0 });
      setRouteCalcError(null);
      return;
    }

    // Preserve exact authoritative waypoint order: [Pickup 1, Pickup 2, ..., Pickup N, College]
    const waypoints = [
      ...pickedStops.map(s => ({ lat: s.lat, lng: s.lng })),
      { lat: COLLEGE_DESTINATION.lat, lng: COLLEGE_DESTINATION.lng }
    ];

    let isMounted = true;
    setIsCalculatingRoute(true);
    setRouteCalcError(null);

    fetchRoadRoute(waypoints)
      .then(result => {
        if (isMounted) {
          setRoadGeometry(result.path);
          setRouteMetrics({ distanceKm: result.distanceKm, durationMin: result.durationMin });
          setRouteCalcError(null);
        }
      })
      .catch(err => {
        if (isMounted) {
          console.warn('Road routing failed:', err);
          setRoadGeometry([]);
          setRouteCalcError('Route preview unavailable (routing service error or offline)');
        }
      })
      .finally(() => {
        if (isMounted) setIsCalculatingRoute(false);
      });

    return () => {
      isMounted = false;
    };
  }, [pickedStops]);

  // Create New Bus
  const handleCreateBus = async (e) => {
    if (e) e.preventDefault();
    if (!newBusNumber.trim()) {
      alert('Please enter a bus number.');
      return;
    }
    setIsSubmitting(true);
    try {
      await fetch((import.meta.env.VITE_API_URL || '') + '/api/buses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: newBusNumber.trim(),
          routeId: newBusRouteId || null,
          driverName: newBusDriverName.trim() || 'Unassigned',
          status: newBusStatus
        })
      });
      setNewBusNumber('');
      setNewBusRouteId('');
      setNewBusDriverName('');
      setNewBusStatus('Active');
      setIsAddBusModalOpen(false);
      await refreshData();
    } catch (err) {
      console.error('Error adding bus:', err);
      alert('Failed to add bus: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Bus
  const handleDeleteBus = (busId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Campus Shuttle',
      message: 'Are you sure you want to delete this bus? Any assigned routes or drivers will be unassigned.',
      confirmText: 'Delete Bus',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await fetch((import.meta.env.VITE_API_URL || '') + `/api/buses/${busId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
          });
          setSelectedBusId(null);
          await refreshData();
        } catch (err) {
          console.error('Error deleting bus:', err);
        }
      }
    });
  };

  // Delete Student Pass
  const handleDeletePass = (passId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Student Transit Pass',
      message: 'Are you sure you want to permanently revoke and delete this student transit pass? This cannot be undone.',
      confirmText: 'Delete Pass',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await fetch((import.meta.env.VITE_API_URL || '') + `/api/passes/${passId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
          });
          setSelectedPassIds(prev => {
            const next = new Set(prev);
            next.delete(passId);
            return next;
          });
          await refreshData();
        } catch (err) {
          console.error('Error deleting pass:', err);
        }
      }
    });
  };

  // Toggle Single Pass Selection
  const toggleSelectPass = (passId) => {
    setSelectedPassIds(prev => {
      const next = new Set(prev);
      if (next.has(passId)) next.delete(passId);
      else next.add(passId);
      return next;
    });
  };

  // Toggle All Passes on Current View
  const toggleSelectAllPasses = (passList) => {
    setSelectedPassIds(prev => {
      const allSelected = passList.length > 0 && passList.every(p => prev.has(p.id));
      const next = new Set(prev);
      if (allSelected) {
        passList.forEach(p => next.delete(p.id));
      } else {
        passList.forEach(p => next.add(p.id));
      }
      return next;
    });
  };

  // Bulk Delete Student Passes
  const handleBulkDeletePasses = () => {
    if (selectedPassIds.size === 0) return;
    const ids = Array.from(selectedPassIds);
    setConfirmModal({
      isOpen: true,
      title: `Delete ${ids.length} Student Passes`,
      message: `Are you sure you want to permanently delete and revoke ${ids.length} selected student pass(es)? This action cannot be undone.`,
      confirmText: `Delete ${ids.length} Passes`,
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await fetch((import.meta.env.VITE_API_URL || '') + '/api/passes/bulk-delete', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ ids })
          });
          setSelectedPassIds(new Set());
          await refreshData();
        } catch (err) {
          console.error('Bulk delete passes failed:', err);
        }
      }
    });
  };

  // Scale Seeding: 10 Drivers & 500 Students
  const handleSeedScale = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Scale Transit Dataset',
      message: 'This will seed 10 verified campus drivers and 500 active student transit passes across all registered routes for high-capacity testing. Proceed?',
      confirmText: 'Seed 10 Drivers & 500 Students',
      isDanger: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setIsSubmitting(true);
        try {
          const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/seed/scale', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({})
          });
          const data = await res.json();
          if (data.success) {
            setScaleStatus('Dataset scaled successfully: 10 verified drivers & 500 students active!');
            await fetchDrivers();
            await refreshData();
            setTimeout(() => setScaleStatus(null), 6000);
          } else {
            setScaleStatus(`Scaling failed: ${data.error || 'Server error'}`);
          }
        } catch (err) {
          console.error('Scale dataset failed:', err);
          setScaleStatus(`Error: ${err.message}`);
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  // Update Bus Status
  const _handleUpdateBusStatus = async (busId, newStatus) => {
    try {
      await fetch((import.meta.env.VITE_API_URL || '') + `/api/buses/${busId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      await refreshData();
    } catch (err) {
      console.error('Error updating bus status:', err);
    }
  };

  // Update Bus Route Assignment
  const handleUpdateBusRoute = async (busId, newRouteId) => {
    try {
      if (updateBusRoute) {
        await updateBusRoute(busId, newRouteId);
      } else {
        await fetch((import.meta.env.VITE_API_URL || '') + `/api/buses/${busId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ routeId: newRouteId || null })
        });
        await refreshData();
      }
    } catch (err) {
      console.error('Error updating bus route:', err);
    }
  };

  // Update Student Pass Status
  const handleUpdatePassStatus = async (passId, newStatus) => {
    try {
      await fetch((import.meta.env.VITE_API_URL || '') + `/api/passes/${passId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passStatus: newStatus })
      });
      await refreshData();
    } catch (err) {
      console.error('Error updating pass status:', err);
    }
  };

  // Open Edit Student Modal
  const handleOpenEditStudent = (pass) => {
    setEditingStudent(pass);
    setEditStudentName(pass.name || pass.studentName || '');
    setEditStudentUsername(pass.username || pass.id || '');
    setEditStudentPassword(pass.password || 'student123');
    setEditStudentId(pass.id || '');
    setEditStudentEmail(pass.email || '');
    setEditStudentRoute(pass.routeEntitlement || 'All Routes');
    setEditStudentStatus(pass.passStatus || pass.status || 'Valid');
    setEditStudentValidUntil(pass.validUntil || '2026-12-31');
    setShowEditStudentPassword(false);
  };

  // Submit Student Edit
  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    if (!editingStudent || !editStudentName.trim() || !editStudentEmail.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/passes/${editingStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editStudentName.trim(),
          username: (editStudentUsername || '').trim(),
          password: editStudentPassword || 'student123',
          email: editStudentEmail.trim(),
          newId: editStudentId.trim(),
          routeEntitlement: editStudentRoute,
          passStatus: editStudentStatus,
          validUntil: editStudentValidUntil
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditingStudent(null);
        await refreshData();
      } else {
        alert(data.error || 'Failed to update student credentials');
      }
    } catch (err) {
      console.error('Error updating student pass:', err);
      alert('Error updating student pass: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create New Student Pass
  const handleCreatePass = async (e) => {
    e.preventDefault();
    if (!newStudentName || !newStudentEmail) return;
    setIsSubmitting(true);
    try {
      await fetch((import.meta.env.VITE_API_URL || '') + '/api/passes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newStudentName.trim(), 
          username: (newStudentUsername || '').trim(),
          password: newStudentPassword || 'student123',
          email: newStudentEmail.trim(), 
          routeEntitlement: newStudentRoute,
          passStatus: newStudentStatus || 'Valid',
          validUntil: newStudentValidUntil || '2026-12-31'
        })
      });
      setNewStudentName('');
      setNewStudentUsername('');
      setNewStudentPassword('');
      setNewStudentEmail('');
      setNewStudentRoute('All Routes');
      setNewStudentStatus('Valid');
      setNewStudentValidUntil('2026-12-31');
      setIsAddStudentModalOpen(false);
      await refreshData();
    } catch (err) {
      console.error('Error creating pass:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Driver Modal
  const handleOpenEditDriver = (driver) => {
    setEditingDriver(driver);
    setEditDriverName(driver.name || '');
    setEditDriverUsername(driver.username || '');
    setEditDriverPassword(driver.password || 'password123');
    setEditDriverPhone(driver.phone || '');
    setEditDriverBusId(driver.assignedBusId || '');
    setEditDriverStatus(driver.status || 'Active');
    setShowEditDriverPassword(false);
  };

  // Submit Driver Edit
  const handleUpdateDriver = async (e) => {
    e.preventDefault();
    if (!editingDriver || !editDriverName.trim() || !editDriverUsername.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/drivers/${editingDriver.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editDriverName.trim(),
          username: editDriverUsername.trim(),
          password: editDriverPassword || 'password123',
          phone: editDriverPhone.trim(),
          assignedBusId: editDriverBusId || '',
          status: editDriverStatus
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditingDriver(null);
        await fetchDrivers();
      } else {
        alert(data.error || 'Failed to update driver credentials');
      }
    } catch (err) {
      console.error('Error updating driver:', err);
      alert('Error updating driver: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create New Driver
  const handleCreateDriver = async (e) => {
    e.preventDefault();
    if (!newDriverName || !newDriverUsername) return;
    setIsSubmitting(true);
    try {
      await fetch((import.meta.env.VITE_API_URL || '') + '/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDriverName.trim(),
          username: newDriverUsername.trim(),
          password: newDriverPassword || 'password123',
          phone: newDriverPhone || '+1-555-0000',
          assignedBusId: newDriverBusId || '',
          status: newDriverStatus || 'Active'
        })
      });
      setNewDriverName('');
      setNewDriverUsername('');
      setNewDriverPassword('');
      setNewDriverPhone('');
      setNewDriverBusId('');
      setNewDriverStatus('Active');
      setIsAddDriverModalOpen(false);
      await fetchDrivers();
    } catch (err) {
      console.error('Error creating driver:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Driver
  const handleDeleteDriver = (driverId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Driver Account',
      message: 'Are you sure you want to delete this driver? Their assigned campus bus will become unassigned.',
      confirmText: 'Delete Driver',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await fetch((import.meta.env.VITE_API_URL || '') + `/api/drivers/${driverId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
          });
          setSelectedDriverIds(prev => {
            const next = new Set(prev);
            next.delete(driverId);
            return next;
          });
          await fetchDrivers();
        } catch (err) {
          console.error('Error deleting driver:', err);
        }
      }
    });
  };

  // Toggle Single Driver Selection
  const toggleSelectDriver = (driverId) => {
    setSelectedDriverIds(prev => {
      const next = new Set(prev);
      if (next.has(driverId)) next.delete(driverId);
      else next.add(driverId);
      return next;
    });
  };

  // Toggle All Drivers
  const toggleSelectAllDrivers = (driverList) => {
    setSelectedDriverIds(prev => {
      const allSelected = driverList.length > 0 && driverList.every(d => prev.has(d.id));
      if (allSelected) return new Set();
      return new Set(driverList.map(d => d.id));
    });
  };

  // Bulk Delete Drivers
  const handleBulkDeleteDrivers = () => {
    if (selectedDriverIds.size === 0) return;
    const ids = Array.from(selectedDriverIds);
    setConfirmModal({
      isOpen: true,
      title: `Delete ${ids.length} Drivers`,
      message: `Are you sure you want to permanently delete ${ids.length} selected driver account(s)? This action cannot be undone.`,
      confirmText: `Delete ${ids.length} Drivers`,
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await fetch((import.meta.env.VITE_API_URL || '') + '/api/drivers/bulk-delete', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ ids })
          });
          setSelectedDriverIds(new Set());
          await fetchDrivers();
        } catch (err) {
          console.error('Bulk delete drivers failed:', err);
        }
      }
    });
  };

  // Bulk Upload Student Passes
  const handleBulkUploadPasses = async (rows) => {
    setIsSubmitting(true);
    try {
      const passesToCreate = rows.map(r => ({
        name: r.name || r.studentname || 'Student',
        username: r.username || (r.email ? r.email.split('@')[0] : `student${Date.now()}`),
        password: r.password || 'student123',
        email: r.email || `student${Date.now()}@edu.com`,
        routeEntitlement: r.routeentitlement || r.route || 'All Routes',
        validUntil: r.validuntil || r.expiry || '2026-12-31',
        passStatus: r.status || r.passstatus || 'Valid'
      }));
      await fetch((import.meta.env.VITE_API_URL || '') + '/api/passes/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passes: passesToCreate })
      });
      setIsAddStudentModalOpen(false);
      await refreshData();
    } catch (err) {
      console.error('Error in bulk pass import:', err);
      alert('Bulk pass import failed: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bulk Upload Drivers
  const handleBulkUploadDrivers = async (rows) => {
    setIsSubmitting(true);
    try {
      const driversToCreate = rows.map((r, i) => ({
        name: r.name || r.drivername || 'Driver',
        username: r.username || `driver.${Date.now()}${i}`,
        password: r.password || 'password123',
        phone: r.phone || r.phonenumber || '+1-555-0000',
        assignedBusId: r.assignedbusid || r.bus || r.busid || '',
        status: r.status || 'Active'
      }));
      await fetch((import.meta.env.VITE_API_URL || '') + '/api/drivers/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drivers: driversToCreate })
      });
      setIsAddDriverModalOpen(false);
      await fetchDrivers();
    } catch (err) {
      console.error('Error in bulk driver import:', err);
      alert('Bulk driver import failed: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bulk Upload Buses
  const handleBulkUploadBuses = async (rows) => {
    setIsSubmitting(true);
    try {
      const busesToCreate = rows.map((r, i) => ({
        number: r.number || r.busnumber || `BUS #${Math.floor(100 + Math.random() * 900)}`,
        driverName: r.drivername || r.driver || 'Unassigned',
        routeId: r.routeid || r.route || null,
        status: r.status || 'Active'
      }));
      await fetch((import.meta.env.VITE_API_URL || '') + '/api/buses/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buses: busesToCreate })
      });
      await refreshData();
      setIsAddBusModalOpen(false);
    } catch (err) {
      console.error('Error in bulk bus import:', err);
      alert('Bulk bus import failed: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bulk Upload Routes
  const handleBulkUploadRoutes = async (rows) => {
    setIsSubmitting(true);
    try {
      const routesToCreate = rows.map((r, i) => ({
        name: r.name || r.routename || `Route ${Date.now()}`,
        color: r.color || '#7c3aed',
        stops: r.stops ? (typeof r.stops === 'string' ? r.stops.split(',').map(s => s.trim()) : r.stops) : ['Kottayam', COLLEGE_DESTINATION.shortName]
      }));
      await fetch((import.meta.env.VITE_API_URL || '') + '/api/routes/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routes: routesToCreate })
      });
      await refreshData();
    } catch (err) {
      console.error('Error in bulk route import:', err);
      alert('Bulk route import failed: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };


  // Trigger professional modal when a search suggestion is selected
  const handleCandidateSelectFromSearch = (place) => {
    if (!place) return;
    const isCollege = place.isCollege || (place.shortName || '').toLowerCase().includes('college of engineering poonjar');
    setCandidatePlace(place);

    if (isCollege) {
      // College is the fixed destination and cannot be added as an intermediate pickup stop
      return;
    }

    setModalStopData({
      name: place.shortName || place.name || '',
      address: place.displayName || '',
      lat: place.lat,
      lng: place.lng,
      isSearch: true
    });
    setStopNameInput(place.shortName || place.name || '');
    setIsAddStopModalOpen(true);
  };

  // Trigger professional modal when map is clicked directly
  const handleMapClick = (latlng) => {
    setModalStopData({
      name: '',
      address: `${latlng.lat.toFixed(5)}°, ${latlng.lng.toFixed(5)}°`,
      lat: latlng.lat,
      lng: latlng.lng,
      isSearch: false
    });
    setStopNameInput('');
    setIsAddStopModalOpen(true);
  };

  // Confirm Stop Modal - adds stop to sequence in authoritative order
  const handleConfirmAddStop = (e) => {
    if (e) e.preventDefault();
    const trimmed = stopNameInput.trim();
    if (!trimmed) {
      alert('Please enter a stop name.');
      return;
    }
    if (trimmed.toLowerCase().includes('college of engineering poonjar')) {
      alert(`${COLLEGE_DESTINATION.name} is the fixed final destination of every route and is automatically appended.`);
      setIsAddStopModalOpen(false);
      return;
    }

    setPickedStops(prev => {
      if (prev.some(s => s.name.toLowerCase() === trimmed.toLowerCase())) {
        return prev;
      }
      return [
        ...prev,
        {
          id: `stop-${Date.now()}-${prev.length}`,
          name: trimmed,
          lat: modalStopData.lat,
          lng: modalStopData.lng,
          number: prev.length + 1
        }
      ];
    });

    setIsAddStopModalOpen(false);
    setCandidatePlace(null);
  };

  // Remove a stop by index and automatically renumber remaining stops
  const handleRemoveStop = (index) => {
    setPickedStops(prev => {
      const next = prev.filter((_, idx) => idx !== index);
      return next.map((stop, idx) => ({ ...stop, number: idx + 1 }));
    });
  };

  // Create New Route with verified ordered pickup stops ending at College of Engineering Poonjar
  const handleCreateRoute = async (e) => {
    if (e) e.preventDefault();
    if (!newRouteName.trim()) {
      alert('Please enter a route name.');
      return;
    }
    if (pickedStops.length === 0) {
      alert('Please add at least one pickup stop before creating the route.');
      return;
    }

    setIsSubmitting(true);
    setRouteSuccessMsg(null);
    try {
      const cleanStops = pickedStops.map(s => s.name.trim()).filter(Boolean);
      const routeStopsWithCollege = [...cleanStops, COLLEGE_DESTINATION.name];

      // Format road geometry and stop coordinates for rich frontend persistence
      const customPath = roadGeometry.length >= 2
        ? roadGeometry.map(([lat, lng]) => ({ lat, lng }))
        : [
            ...pickedStops.map(s => ({ lat: s.lat, lng: s.lng })),
            { lat: COLLEGE_DESTINATION.lat, lng: COLLEGE_DESTINATION.lng }
          ];

      const stopCoords = [
        ...pickedStops.map((s, idx) => ({ name: s.name, lat: s.lat, lng: s.lng, number: idx + 1 })),
        { name: COLLEGE_DESTINATION.name, lat: COLLEGE_DESTINATION.lat, lng: COLLEGE_DESTINATION.lng, number: pickedStops.length + 1 }
      ];

      const payload = {
        name: newRouteName.trim(),
        stops: routeStopsWithCollege,
        color: newRouteColor
      };

      const result = await createRoute(payload, customPath, stopCoords, routeMetrics);

      if (result && result.success) {
        setRouteSuccessMsg(`Route "${newRouteName.trim()}" created successfully with ${pickedStops.length} pickup stop(s) ending at ${COLLEGE_DESTINATION.shortName}!`);
        setNewRouteName('');
        setPickedStops([]);
        setCandidatePlace(null);
        setRoadGeometry([]);
        setRouteMetrics({ distanceKm: 0, durationMin: 0 });

        // Clear success message after 6 seconds
        setTimeout(() => setRouteSuccessMsg(null), 6000);
      }
    } catch (err) {
      console.error('Error creating route:', err);
      alert('Error creating route: ' + (err.message || 'Please check server connection.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Route
  const handleDeleteRoute = (routeId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Transit Route',
      message: 'Are you sure you want to delete this route? Any buses assigned to this route will be unassigned.',
      confirmText: 'Delete Route',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          if (deleteRoute) {
            await deleteRoute(routeId);
          } else {
            await fetch((import.meta.env.VITE_API_URL || '') + `/api/routes/${routeId}`, {
              method: 'DELETE',
              headers: getAuthHeaders()
            });
            await refreshData();
          }
          setSelectedRouteIds(prev => {
            const next = new Set(prev);
            next.delete(routeId);
            return next;
          });
        } catch (err) {
          console.error('Error deleting route:', err);
        }
      }
    });
  };

  // Toggle Single Route Selection
  const toggleSelectRoute = (routeId) => {
    setSelectedRouteIds(prev => {
      const next = new Set(prev);
      if (next.has(routeId)) next.delete(routeId);
      else next.add(routeId);
      return next;
    });
  };

  // Toggle All Routes
  const toggleSelectAllRoutes = (routeList) => {
    setSelectedRouteIds(prev => {
      const allSelected = routeList.length > 0 && routeList.every(r => prev.has(r.id));
      if (allSelected) return new Set();
      return new Set(routeList.map(r => r.id));
    });
  };

  // Bulk Delete Routes
  const handleBulkDeleteRoutes = () => {
    if (selectedRouteIds.size === 0) return;
    const ids = Array.from(selectedRouteIds);
    setConfirmModal({
      isOpen: true,
      title: `Delete ${ids.length} Transit Routes`,
      message: `Are you sure you want to permanently delete ${ids.length} selected transit route(s)? Any buses assigned to these routes will be unassigned.`,
      confirmText: `Delete ${ids.length} Routes`,
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await fetch((import.meta.env.VITE_API_URL || '') + '/api/routes/bulk-delete', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ ids })
          });
          setSelectedRouteIds(new Set());
          await refreshData();
        } catch (err) {
          console.error('Bulk delete routes failed:', err);
        }
      }
    });
  };

  // Dynamic Fleet Cards mapping real live WebSocket buses
  const fleetCards = (buses || []).map(bus => {
    const assignedRoute = routes.find(r => r.id === bus.routeId);
    const isDelayed = (bus.status || '').toUpperCase().includes('DELAY');
    const isIdle = bus.status === 'Off Duty' || bus.status === 'Maintenance' || (bus.status || '').toUpperCase().includes('STANDBY') || (bus.status || '').toUpperCase().includes('IDLE');
    const isSos = (bus.status || '').toUpperCase().includes('SOS') || (bus.status || '').toUpperCase().includes('EMERGENCY');

    return {
      id: bus.id,
      rawBus: bus,
      number: bus.number?.replace(/^BUS\s*#\d+\s*\((.*)\)$/i, '$1') || bus.number || bus.id,
      displayTitle: bus.number || `BUS #${bus.id}`,
      routeName: assignedRoute ? assignedRoute.name : 'Unassigned Route',
      routeId: bus.routeId,
      driverName: bus.driverName || 'Unassigned Driver',
      avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80`,
      status: isSos ? 'SOS ALERT' : isDelayed ? 'DELAYED' : isIdle ? 'OFF DUTY' : (bus.status || 'ON TIME'),
      category: isSos || isDelayed ? 'Delayed' : isIdle ? 'Idle' : 'Active',
      battery: '88%',
      speed: `${bus.speed || 0} km/h`,
      progressPercent: bus.speed ? Math.min(100, Math.max(15, bus.speed * 2)) : 0,
      isDelayed,
      isIdle,
      isSos
    };
  });

  // Dynamic Filtering Logic
  const filteredFleetCards = fleetCards.filter(card => {
    // Category match
    if (fleetFilter === 'Active' && card.category !== 'Active') return false;
    if (fleetFilter === 'Delayed' && card.category !== 'Delayed') return false;
    if (fleetFilter === 'Idle' && card.category !== 'Idle') return false;

    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNumber = card.displayTitle.toLowerCase().includes(q);
      const matchDriver = card.driverName.toLowerCase().includes(q);
      const matchRoute = card.routeName.toLowerCase().includes(q);
      if (!matchNumber && !matchDriver && !matchRoute) return false;
    }

    return true;
  });

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        minHeight: '100dvh',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: "'Inter', sans-serif"
      }}
    >
      {/* 1. LEFT SIDEBAR */}
      <aside className="admin-sidebar">
        <div>
          {/* Brand Logo */}
          <div style={{ marginBottom: '2rem', paddingLeft: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src="/logo.png" alt="HopSpot Logo" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
            <span
              style={{
                color: '#7c3aed',
                fontSize: '1.25rem',
                fontWeight: 900,
                letterSpacing: '-0.03em',
                fontFamily: "'Outfit', 'Inter', sans-serif"
              }}
            >
              HopSpot
            </span>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setActiveSection('buses')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: activeSection === 'buses' ? '#7c3aed' : 'transparent',
                color: activeSection === 'buses' ? '#ffffff' : 'var(--text-secondary, #64748b)',
                fontWeight: activeSection === 'buses' ? 600 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: activeSection === 'buses' ? '0 4px 14px rgba(124, 58, 237, 0.3)' : 'none',
                transition: 'all 0.15s ease',
                textAlign: 'left'
              }}
            >
              <Bus size={18} />
              <span>Fleet</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setActiveSection('drivers')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: activeSection === 'drivers' ? '#7c3aed' : 'transparent',
                color: activeSection === 'drivers' ? '#ffffff' : 'var(--text-secondary, #64748b)',
                fontWeight: activeSection === 'drivers' ? 600 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: activeSection === 'drivers' ? '0 4px 14px rgba(124, 58, 237, 0.3)' : 'none',
                transition: 'all 0.15s ease',
                textAlign: 'left'
              }}
            >
              <Users size={18} />
              <span>Drivers</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setActiveSection('routes')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: activeSection === 'routes' ? '#7c3aed' : 'transparent',
                color: activeSection === 'routes' ? '#ffffff' : 'var(--text-secondary, #64748b)',
                fontWeight: activeSection === 'routes' ? 600 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: activeSection === 'routes' ? '0 4px 14px rgba(124, 58, 237, 0.3)' : 'none',
                transition: 'all 0.15s ease',
                textAlign: 'left'
              }}
            >
              <GitFork size={18} />
              <span>Routes</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setActiveSection('passes')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: activeSection === 'passes' ? '#7c3aed' : 'transparent',
                color: activeSection === 'passes' ? '#ffffff' : 'var(--text-secondary, #64748b)',
                fontWeight: activeSection === 'passes' ? 600 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: activeSection === 'passes' ? '0 4px 14px rgba(124, 58, 237, 0.3)' : 'none',
                transition: 'all 0.15s ease',
                textAlign: 'left'
              }}
            >
              <Shield size={18} />
              <span>Passes</span>
            </motion.button>
          </nav>
        </div>

        {/* Bottom Sidebar: System Health & Admin Profile / Sign Out / Theme */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>

          {/* Admin Profile, Theme Change & Sign Out Block */}
          <div
            style={{
              backgroundColor: 'var(--bg-card, #ffffff)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '12px',
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
            }}
          >
            {/* Top row: Avatar + Name + Theme Change Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#7c3aed',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.76rem',
                    flexShrink: 0
                  }}
                >
                  {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'AD'}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                    title={user?.name || 'Administrator'}
                  >
                    {user?.name || 'Administrator'}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary, #64748b)' }}>
                    Admin
                  </div>
                </div>
              </div>

              {/* Theme Change Button */}
              <button
                type="button"
                onClick={cycleTheme}
                style={{
                  background: 'none',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  borderRadius: '8px',
                  width: '30px',
                  height: '30px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary, #475569)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
                title={`Theme: ${themeMode} (${effectiveTheme}). Click to cycle.`}
              >
                {effectiveTheme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            </div>

            {/* Bottom row: Sign Out Button */}
            <button
              type="button"
              onClick={logout}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.65rem',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                backgroundColor: 'rgba(239, 68, 68, 0.06)',
                color: '#dc2626',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.14)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.06)'; }}
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* 2. RIGHT MAIN CONTENT AREA - Extends all the way to top */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100%', height: '100vh' }}>
        {/* CENTER VIEWPORT + RIGHT LIVE STATUS */}
        <AnimatePresence mode="wait">
        {activeSection === 'buses' && (
          <motion.div 
            key="buses"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) clamp(300px, 30%, 400px)', overflow: 'hidden', gap: 0 }}
          >
            {/* Map Area */}
            <FleetMap
              buses={buses}
              routes={routes}
              selectedMarkerId={selectedBusId}
              onMarkerClick={setSelectedBusId}
              borderRadius="0"
            />

            {/* Right Live Status Sidebar - Scrollable on Mobile */}
            <aside
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderLeft: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                padding: 'clamp(0.75rem, 3vw, 1.25rem)',
                overflow: 'hidden',
                minWidth: '280px'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Live Fleet ({filteredFleetCards.length})
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsAddBusModalOpen(true)}
                    className="btn btn-primary"
                    style={{
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      cursor: 'pointer'
                    }}
                  >
                    + Add Bus
                  </button>
                  <SlidersHorizontal size={17} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} />
                </div>
              </div>

              {/* Selected Driver / Vehicle Detail Panel (when a driver/bus is clicked) */}
              {(() => {
                const selectedCard = fleetCards.find(c => c.id === selectedBusId);
                if (!selectedCard) return null;
                const matchedDriver = driversDirectory.find(d => d.assignedBusId === selectedCard.id || d.name === selectedCard.driverName);

                return (
                  <div
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--primary)',
                      borderRadius: '14px',
                      padding: '1rem',
                      marginBottom: '1rem',
                      boxShadow: '0 4px 14px rgba(124, 58, 237, 0.12)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.04em' }}>
                        SELECTED DRIVER DETAILS
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedBusId(null)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                      >
                        <X size={14} /> Close
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <img
                        src={selectedCard.avatarUrl}
                        alt={selectedCard.driverName}
                        style={{ width: '42px', height: '42px', borderRadius: '10px', objectFit: 'cover' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                          {selectedCard.driverName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          ID: {matchedDriver?.id || matchedDriver?.username || 'N/A'} · Bus: {selectedCard.displayTitle}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          backgroundColor: selectedCard.isSos ? '#fee2e2' : selectedCard.isDelayed ? '#fef3c7' : '#dcfce7',
                          color: selectedCard.isSos ? '#b91c1c' : selectedCard.isDelayed ? '#b45309' : '#15803d'
                        }}
                      >
                        {selectedCard.status}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.78rem', backgroundColor: 'var(--bg-subtle)', padding: '0.65rem 0.75rem', borderRadius: '10px' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Contact Phone</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{matchedDriver?.phone || 'Not configured'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Assigned Route</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{selectedCard.routeName}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Live GPS Location</span>
                        <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                          {selectedCard.rawBus?.location ? `${selectedCard.rawBus.location.lat.toFixed(4)}°, ${selectedCard.rawBus.location.lng.toFixed(4)}°` : 'No GPS'}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Live Speed</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{selectedCard.speed}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.65rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-color)', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Status:</span>
                        <select
                          value={selectedCard.rawBus?.status || 'Active'}
                          onChange={(e) => _handleUpdateBusStatus(selectedCard.id, e.target.value)}
                          className="form-select"
                          style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem', fontWeight: 600, width: 'auto' }}
                        >
                          <option value="Active">Active</option>
                          <option value="Delayed">Delayed</option>
                          <option value="Idle">Idle</option>
                          <option value="Maintenance">Maintenance</option>
                          <option value="Off Duty">Off Duty</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteBus(selectedCard.id)}
                        className="btn"
                        style={{
                          padding: '0.25rem 0.6rem',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          backgroundColor: 'var(--danger-light, #fee2e2)',
                          color: 'var(--danger, #ef4444)',
                          borderColor: '#fca5a5',
                          cursor: 'pointer'
                        }}
                      >
                        Delete Bus
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Filter Pills with Working Filters */}
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {['All', 'Active', 'Delayed', 'Idle'].map(filter => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setFleetFilter(filter)}
                    style={{
                      padding: '0.35rem 0.85rem',
                      borderRadius: '9999px',
                      border: 'none',
                      backgroundColor: fleetFilter === filter ? '#7c3aed' : 'var(--bg-subtle)',
                      color: fleetFilter === filter ? '#ffffff' : 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {/* Driver / Bus Cards (Scrollable) */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  paddingRight: '0.2rem'
                }}
              >
                {filteredFleetCards.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    <Bus size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>No Vehicles Found</div>
                    <div style={{ fontSize: '0.8rem' }}>No buses match filter: "{fleetFilter}"</div>
                  </div>
                ) : (
                  filteredFleetCards.map(bus => (
                    <div
                      key={bus.id}
                      onClick={() => setSelectedBusId(bus.id)}
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        border: selectedBusId === bus.id ? '2px solid #7c3aed' : '1px solid var(--border-color)',
                        borderLeft: bus.isDelayed
                          ? '4px solid #ef4444'
                          : bus.isIdle
                            ? '4px solid #94a3b8'
                            : '4px solid #10b981',
                        borderRadius: '14px',
                        padding: '0.9rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.65rem',
                        boxShadow: selectedBusId === bus.id ? '0 4px 12px rgba(124, 58, 237, 0.15)' : '0 1px 3px rgba(0,0,0,0.03)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {/* Top Row: Driver info & Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <img
                            src={bus.avatarUrl}
                            alt={bus.driverName}
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '10px',
                              objectFit: 'cover',
                              backgroundColor: 'var(--bg-subtle)'
                            }}
                          />
                          <div>
                            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {bus.driverName}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.1rem' }}>
                              <span>{bus.displayTitle}</span>
                            </div>
                          </div>
                        </div>

                        <span
                          style={{
                            backgroundColor: bus.isDelayed
                              ? '#fee2e2'
                              : bus.isIdle
                                ? '#f1f5f9'
                                : '#dcfce7',
                            color: bus.isDelayed
                              ? '#b91c1c'
                              : bus.isIdle
                                ? '#475569'
                                : '#15803d',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            letterSpacing: '0.03em'
                          }}
                        >
                          {bus.status}
                        </span>
                      </div>

                      {/* Route Assignment Select Control */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                          backgroundColor: 'var(--bg-subtle, #f8fafc)',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color, #e2e8f0)'
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #64748b)' }}>
                          Assigned Route:
                        </span>
                        <select
                          value={bus.routeId || ''}
                          onChange={(e) => handleUpdateBusRoute(bus.id, e.target.value)}
                          className="form-select"
                          style={{
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            width: 'auto',
                            maxWidth: '180px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color, #cbd5e1)'
                          }}
                        >
                          <option value="">-- Unassigned --</option>
                          {routes.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Metrics: Speed and Live Status */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Gauge size={13} color="#7c3aed" />
                          <span>Speed: <strong>{bus.speed || '0 km/h'}</strong></span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Click card for details
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </aside>
          </motion.div>
        )}

        {/* SECTION: ROUTES */}
        {activeSection === 'routes' && (
          <motion.div 
            key="routes"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '2rem', overflowY: 'auto', gap: '1.75rem' }}
          >
            
            {/* 1. ROUTE CREATION STUDIO WITH EMBEDDED MAP */}
            <div className="clean-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <GitFork size={20} color="#7c3aed" />
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      Transit Route Creator
                    </h2>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', margin: 0 }}>
                    Build ordered pickup routes terminating at <strong>{COLLEGE_DESTINATION.name}</strong>.
                  </p>
                </div>

                <div style={{ display: 'inline-flex', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px', padding: '3px', border: '1px solid var(--border-color)' }}>
                  <button
                    type="button"
                    onClick={() => setRouteAddMode('builder')}
                    style={{
                      padding: '0.35rem 0.85rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: routeAddMode === 'builder' ? '#7c3aed' : 'transparent',
                      color: routeAddMode === 'builder' ? '#ffffff' : 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    Interactive Map Builder
                  </button>
                  <button
                    type="button"
                    onClick={() => setRouteAddMode('bulk')}
                    style={{
                      padding: '0.35rem 0.85rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: routeAddMode === 'bulk' ? '#7c3aed' : 'transparent',
                      color: routeAddMode === 'bulk' ? '#ffffff' : 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    Bulk Import (CSV)
                  </button>
                </div>
              </div>

              {routeAddMode === 'bulk' ? (
                <BulkCsvUploader
                  title="Bulk Import Transit Routes"
                  templateFilename="transit_routes_template.csv"
                  templateContent={ROUTE_CSV_TEMPLATE}
                  columns={[
                    { key: 'name', label: 'Route Name', required: true },
                    { key: 'color', label: 'Color Hex' },
                    { key: 'stops', label: 'Stops (Comma Separated)', required: true }
                  ]}
                  onUpload={handleBulkUploadRoutes}
                  isSubmitting={isSubmitting}
                  entityName="Routes"
                />
              ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '1.5rem', alignItems: 'stretch' }}>
                {/* Left: Embedded Kottayam/Poonjar Map for Route Construction */}
                <div style={{ height: '560px', minHeight: '560px', position: 'relative', borderRadius: '0', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <FleetMap
                    buses={buses}
                    routes={routes}
                    isPickingStops={true}
                    searchRegion="kottayam"
                    center={[COLLEGE_DESTINATION.lat, COLLEGE_DESTINATION.lng]}
                    zoom={12}
                    pickedStops={pickedStops}
                    roadGeometry={roadGeometry}
                    previewColor={newRouteColor}
                    routeCalcError={routeCalcError}
                    isCalculatingRoute={isCalculatingRoute}
                    onAddCandidateStop={handleCandidateSelectFromSearch}
                    onCandidateSelect={handleCandidateSelectFromSearch}
                    onMapClick={handleMapClick}
                    hideStatCards={true}
                    borderRadius="0"
                  />
                </div>

                {/* Right: Route Configuration and Ordered Stops Form */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem', backgroundColor: 'var(--bg-subtle)', padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                  <form onSubmit={handleCreateRoute} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                    {/* Route Creation Success Feedback Banner */}
                    {routeSuccessMsg && (
                      <div
                        style={{
                          backgroundColor: '#f0fdf4',
                          border: '1px solid #86efac',
                          color: '#15803d',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          lineHeight: '1.4'
                        }}
                      >
                        {routeSuccessMsg}
                      </div>
                    )}

                    {/* Route Name Input */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>Route Name</label>
                      <input
                        type="text"
                        value={newRouteName}
                        onChange={(e) => setNewRouteName(e.target.value)}
                        placeholder="e.g. Pala - Poonjar Campus Route"
                        className="form-input"
                        required
                      />
                    </div>

                    {/* Road Routing Live Status / Metrics */}
                    {isCalculatingRoute && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#7c3aed', padding: '0.2rem 0' }}>
                        <Loader size={13} className="spin-animation" />
                        <span>Calculating real road geometry...</span>
                      </div>
                    )}

                    {routeMetrics.distanceKm > 0 && !isCalculatingRoute && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: '#15803d', backgroundColor: '#f0fdf4', padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Navigation size={13} /> Road Route: <strong>{routeMetrics.distanceKm} km</strong></span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Clock size={13} /> ~<strong>{routeMetrics.durationMin} min</strong> to Campus</span>
                      </div>
                    )}

                    {routeCalcError && (
                      <div style={{ fontSize: '0.75rem', color: '#b91c1c', backgroundColor: '#fee2e2', padding: '0.4rem 0.6rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <AlertTriangle size={13} /> {routeCalcError}
                      </div>
                    )}

                    {/* Candidate Searched Location Banner (if selected from map search) */}
                    {candidatePlace && (
                      <div
                        style={{
                          padding: '0.75rem',
                          backgroundColor: candidatePlace.isCollege || (candidatePlace.shortName || '').toLowerCase().includes('college of engineering poonjar') ? '#f0fdf4' : '#f5f3ff',
                          borderRadius: '10px',
                          border: candidatePlace.isCollege || (candidatePlace.shortName || '').toLowerCase().includes('college of engineering poonjar') ? '1px solid #16a34a' : '1px solid #7c3aed',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.4rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: candidatePlace.isCollege || (candidatePlace.shortName || '').toLowerCase().includes('college of engineering poonjar') ? '#15803d' : '#7c3aed', letterSpacing: '0.04em' }}>
                            {candidatePlace.isCollege || (candidatePlace.shortName || '').toLowerCase().includes('college of engineering poonjar') ? 'COLLEGE DESTINATION' : 'SELECTED LOCATION'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCandidatePlace(null)}
                            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <MapPin size={14} color="#7c3aed" /> {candidatePlace.shortName || candidatePlace.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {candidatePlace.displayName}
                        </div>

                        {candidatePlace.isCollege || (candidatePlace.shortName || '').toLowerCase().includes('college of engineering poonjar') ? (
                          <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 600, marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <GraduationCap size={15} /> Fixed final destination of all routes. It will automatically be appended as the destination.
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleCandidateSelectFromSearch(candidatePlace)}
                            style={{
                              marginTop: '0.2rem',
                              padding: '0.45rem 0.75rem',
                              backgroundColor: '#7c3aed',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 2px 8px rgba(124, 58, 237, 0.35)'
                            }}
                          >
                            + Add as Pickup Stop #{pickedStops.length + 1}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Ordered Pickup Stops Sequence Container */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: 0 }}>
                          Ordered Route Sequence ({pickedStops.length} pickup{pickedStops.length === 1 ? '' : 's'})
                        </label>
                        {pickedStops.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setPickedStops([])}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--danger, #ef4444)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Clear All
                          </button>
                        )}
                      </div>

                      <div
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          borderRadius: '10px',
                          border: '1px solid var(--border-color)',
                          padding: '0.75rem',
                          maxHeight: '210px',
                          overflowY: 'auto',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.4rem'
                        }}
                      >
                        {pickedStops.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '1rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            <MapPin size={20} color="#94a3b8" style={{ margin: '0 auto 0.35rem' }} />
                            <div>No pickup stops added yet.</div>
                            <div style={{ fontSize: '0.72rem', marginTop: '0.2rem' }}>
                              Search Kottayam/Poonjar places above or click on the map to add pickup stops in order.
                            </div>
                          </div>
                        ) : (
                          pickedStops.map((stop, idx) => (
                            <React.Fragment key={stop.id || `stop-${idx}`}>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '0.45rem 0.65rem',
                                  backgroundColor: 'var(--bg-subtle)',
                                  borderRadius: '8px',
                                  border: '1px solid var(--border-color)'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                                  <span
                                    style={{
                                      width: '20px',
                                      height: '20px',
                                      borderRadius: '50%',
                                      backgroundColor: '#7c3aed',
                                      color: '#ffffff',
                                      fontSize: '0.72rem',
                                      fontWeight: 800,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0
                                    }}
                                  >
                                    {idx + 1}
                                  </span>
                                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {stop.name}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStop(idx)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--danger, #ef4444)',
                                    cursor: 'pointer',
                                    padding: '0 2px',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                  title="Remove Stop"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>

                              {/* Down arrow indicator between stops */}
                              <div style={{ display: 'flex', justifyContent: 'center', padding: '0.05rem 0' }}>
                                <ArrowDown size={12} color="#94a3b8" />
                              </div>
                            </React.Fragment>
                          ))
                        )}

                        {/* Fixed Final Destination: College of Engineering Poonjar */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 0.65rem',
                            backgroundColor: 'var(--success-light, #f0fdf4)',
                            borderRadius: '8px',
                            border: '1px dashed var(--success, #16a34a)'
                          }}
                        >
                          <GraduationCap size={18} color="#16a34a" />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--success, #15803d)' }}>
                              {COLLEGE_DESTINATION.name}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              Fixed Final Destination
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Route Accent Color */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: 0 }}>Route Accent Color</label>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="color"
                          value={newRouteColor}
                          onChange={(e) => setNewRouteColor(e.target.value)}
                          style={{ width: '32px', height: '30px', padding: '2px', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'transparent' }}
                        />
                        <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{newRouteColor}</span>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting || pickedStops.length === 0}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: pickedStops.length === 0 ? 'var(--border-color, #cbd5e1)' : '#7c3aed',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: pickedStops.length === 0 ? 'not-allowed' : 'pointer',
                        boxShadow: pickedStops.length === 0 ? 'none' : '0 4px 14px rgba(124, 58, 237, 0.35)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {isSubmitting ? 'Creating Route...' : `Create Route (${pickedStops.length} Pickup${pickedStops.length === 1 ? '' : 's'} → ${COLLEGE_DESTINATION.shortName})`}
                    </button>
                  </form>
                </div>
              </div>
              )}
            </div>

            {/* 2. REGISTERED ACTIVE TRANSIT ROUTES */}
            <div className="clean-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Registered Active Routes ({routes.length})
                  </h2>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    All routes terminate at <strong>{COLLEGE_DESTINATION.name}</strong> and are live on the Student Radar & Driver Navigation
                  </div>
                </div>
                {routes.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <button
                      type="button"
                      onClick={() => toggleSelectAllRoutes(routes)}
                      className="btn btn-secondary"
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.78rem',
                        borderRadius: '7px',
                        border: '1px solid var(--border-color)',
                        cursor: 'pointer'
                      }}
                    >
                      {routes.length > 0 && routes.every(r => selectedRouteIds.has(r.id)) ? 'Deselect All' : 'Select All Routes'}
                    </button>
                    {selectedRouteIds.size > 0 && (
                      <button
                        type="button"
                        onClick={handleBulkDeleteRoutes}
                        style={{
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.78rem',
                          backgroundColor: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '7px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={13} />
                        <span>Delete Selected ({selectedRouteIds.size})</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {routes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <GitFork size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>No routes registered</div>
                  <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Use the Route Creator above to create your first pickup route.</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
                  {routes.map(route => {
                    const rawStops = (route.stops || []).map(s => String(s).trim()).filter(Boolean);
                    const isCollegeLast = rawStops.length > 0 && rawStops[rawStops.length - 1].toLowerCase().includes('college of engineering poonjar');
                    const pickupStops = isCollegeLast ? rawStops.slice(0, -1) : rawStops;
                    const assignedBuses = buses.filter(b => b.routeId === route.id);

                    return (
                      <div
                        key={route.id}
                        style={{
                          padding: '1.15rem',
                          borderRadius: '12px',
                          border: '1px solid var(--border-color)',
                          borderLeft: `4px solid ${route.color || '#7c3aed'}`,
                          backgroundColor: selectedRouteIds.has(route.id) ? 'rgba(124, 58, 237, 0.05)' : 'var(--bg-card)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '0.85rem'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <input
                                type="checkbox"
                                checked={selectedRouteIds.has(route.id)}
                                onChange={() => toggleSelectRoute(route.id)}
                                style={{ cursor: 'pointer', accentColor: '#7c3aed', width: '16px', height: '16px' }}
                                title="Select route for bulk action"
                              />
                              <strong style={{ fontSize: '0.98rem', color: 'var(--text-primary)' }}>{route.name}</strong>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteRoute(route.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--danger, #ef4444)',
                                cursor: 'pointer',
                                padding: '0.2rem',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="Delete Route"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          {/* Ordered Stops Flow */}
                          <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '0.65rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem', letterSpacing: '0.04em' }}>
                              ORDERED PICKUP SEQUENCE
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              {pickupStops.map((stop, sIdx) => (
                                <div key={sIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)' }}>
                                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: route.color || '#7c3aed' }}>{sIdx + 1}.</span>
                                  <span>{stop}</span>
                                </div>
                              ))}
                              {/* Destination Indicator */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success, #16a34a)', fontWeight: 700, marginTop: '0.15rem' }}>
                                <Flag size={14} color="#16a34a" />
                                <span>{COLLEGE_DESTINATION.name}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Route Footer: Assigned Bus Info */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '0.6rem' }}>
                          <span>
                            {assignedBuses.length > 0
                              ? `Assigned to: ${assignedBuses.map(b => b.number || b.id).join(', ')}`
                              : 'No buses assigned'}
                          </span>
                          <span className="badge" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
                            {pickupStops.length} Pickups
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* SECTION: DRIVERS */}
        {/* SECTION: DRIVERS */}
        {activeSection === 'drivers' && (
          <motion.div 
            key="drivers"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}
          >
            <div className="clean-card" style={{ padding: '1.5rem' }}>
              {/* Header with Top Right Corner Button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    Drivers Directory ({driversDirectory.length})
                  </h2>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Manage driver login credentials, fleet assignments, and active duty status
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      placeholder="Search drivers..."
                      value={driverSearchQuery}
                      onChange={e => setDriverSearchQuery(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: '2rem', paddingRight: '0.75rem', height: '36px', fontSize: '0.8rem', width: '200px' }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={fetchDrivers}
                    className="btn btn-secondary"
                    style={{ height: '36px', padding: '0 0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', cursor: 'pointer' }}
                    title="Refresh drivers"
                  >
                    <RefreshCw size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDriverAddMode('single');
                      setIsAddDriverModalOpen(true);
                    }}
                    className="btn btn-primary"
                    style={{
                      height: '36px',
                      padding: '0 1rem',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={15} />
                    <span>Add Driver</span>
                  </button>
                </div>
              </div>

              {/* Bulk Selection Bar for Drivers */}
              {selectedDriverIds.size > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 1rem',
                  marginBottom: '1rem',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#ef4444'
                }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckSquare size={16} />
                    <span>{selectedDriverIds.size} driver(s) selected</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedDriverIds(new Set())}
                      className="btn btn-secondary"
                      style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}
                    >
                      Clear Selection
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkDeleteDrivers}
                      style={{
                        padding: '0.3rem 0.75rem',
                        fontSize: '0.78rem',
                        backgroundColor: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={13} />
                      <span>Delete Selected ({selectedDriverIds.size})</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={(() => {
                            const filtered = driversDirectory.filter(d => 
                              (d.name || '').toLowerCase().includes(driverSearchQuery.toLowerCase()) || 
                              (d.username || '').toLowerCase().includes(driverSearchQuery.toLowerCase()) ||
                              (d.phone || '').toLowerCase().includes(driverSearchQuery.toLowerCase())
                            );
                            return filtered.length > 0 && filtered.every(d => selectedDriverIds.has(d.id));
                          })()}
                          onChange={() => {
                            const filtered = driversDirectory.filter(d => 
                              (d.name || '').toLowerCase().includes(driverSearchQuery.toLowerCase()) || 
                              (d.username || '').toLowerCase().includes(driverSearchQuery.toLowerCase()) ||
                              (d.phone || '').toLowerCase().includes(driverSearchQuery.toLowerCase())
                            );
                            toggleSelectAllDrivers(filtered);
                          }}
                          style={{ cursor: 'pointer', accentColor: '#7c3aed', width: '15px', height: '15px' }}
                          title="Select all filtered drivers"
                        />
                      </th>
                      <th>Driver Name</th>
                      <th>Username</th>
                      <th>Password</th>
                      <th>Phone</th>
                      <th>Assigned Bus</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driversDirectory.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No drivers registered
                        </td>
                      </tr>
                    ) : (
                      driversDirectory
                        .filter(d => 
                          (d.name || '').toLowerCase().includes(driverSearchQuery.toLowerCase()) || 
                          (d.username || '').toLowerCase().includes(driverSearchQuery.toLowerCase()) ||
                          (d.phone || '').toLowerCase().includes(driverSearchQuery.toLowerCase())
                        )
                        .map(driver => {
                          const assignedBus = buses.find(b => b.id === driver.assignedBusId);
                          const isOffDuty = driver.status === 'Off Duty';
                          return (
                            <tr key={driver.id} style={{ backgroundColor: selectedDriverIds.has(driver.id) ? 'rgba(124, 58, 237, 0.05)' : undefined }}>
                              <td style={{ textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={selectedDriverIds.has(driver.id)}
                                  onChange={() => toggleSelectDriver(driver.id)}
                                  style={{ cursor: 'pointer', accentColor: '#7c3aed', width: '15px', height: '15px' }}
                                />
                              </td>
                              <td style={{ fontWeight: 600 }}>{driver.name}</td>
                              <td style={{ fontFamily: 'monospace', fontSize: '0.84rem', fontWeight: 600, color: '#7c3aed' }}>{driver.username}</td>
                              <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'var(--bg-subtle)', padding: '0.2rem 0.5rem', borderRadius: '5px' }}>
                                  <Lock size={11} color="var(--text-muted)" />
                                  <span>{driver.password ? '••••••••' : 'default'}</span>
                                </span>
                              </td>
                              <td>{driver.phone || '-'}</td>
                              <td>
                                {assignedBus ? (
                                  <span className="badge" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', fontWeight: 600 }}>
                                    {assignedBus.number || assignedBus.id}
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Unassigned</span>
                                )}
                              </td>
                              <td>
                                <span className="badge" style={{
                                  backgroundColor: isOffDuty ? 'rgba(100, 116, 139, 0.12)' : 'rgba(34, 197, 94, 0.12)',
                                  color: isOffDuty ? '#64748b' : '#16a34a',
                                  fontWeight: 700
                                }}>
                                  {driver.status || 'Active'}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditDriver(driver)}
                                    className="btn btn-secondary"
                                    style={{
                                      padding: '0.3rem 0.65rem',
                                      fontSize: '0.78rem',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.35rem',
                                      borderRadius: '6px',
                                      border: '1px solid var(--border-color)',
                                      color: '#7c3aed',
                                      cursor: 'pointer'
                                    }}
                                    title="Edit Driver Credentials"
                                  >
                                    <Pencil size={13} />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDriver(driver.id)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: 'var(--danger, #ef4444)',
                                      cursor: 'pointer',
                                      padding: '0.3rem',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      borderRadius: '6px'
                                    }}
                                    title="Delete Driver"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* SECTION: PASSES (STUDENTS) */}
        {activeSection === 'passes' && (
          <motion.div 
            key="passes"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}
          >
            <div className="clean-card" style={{ padding: '1.5rem' }}>
              {/* Header with Top Right Corner Button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    Student Transit Passes ({passes.length})
                  </h2>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Manage student user credentials, transit pass access, and status entitlements
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      placeholder="Search students..."
                      value={studentSearchQuery}
                      onChange={e => {
                        setStudentSearchQuery(e.target.value);
                        setPassPage(1);
                      }}
                      className="form-input"
                      style={{ paddingLeft: '2rem', paddingRight: '0.75rem', height: '36px', fontSize: '0.8rem', width: '200px' }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={refreshData}
                    className="btn btn-secondary"
                    style={{ height: '36px', padding: '0 0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', cursor: 'pointer' }}
                    title="Refresh student passes"
                  >
                    <RefreshCw size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={handleSeedScale}
                    disabled={isSubmitting}
                    className="btn btn-secondary"
                    style={{
                      height: '36px',
                      padding: '0 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(0, 229, 255, 0.4)',
                      backgroundColor: 'rgba(0, 229, 255, 0.08)',
                      color: '#00e5ff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                    title="Scale dataset to 10 verified drivers and 500 enrolled students"
                  >
                    <Sparkles size={14} />
                    <span>Scale (10 Drivers, 500 Students)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPassAddMode('single');
                      setIsAddStudentModalOpen(true);
                    }}
                    className="btn btn-primary"
                    style={{
                      height: '36px',
                      padding: '0 1rem',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={15} />
                    <span>Add Student</span>
                  </button>
                </div>
              </div>

              {/* Scale Status Banner */}
              {scaleStatus && (
                <div style={{
                  padding: '0.65rem 1rem',
                  marginBottom: '1rem',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(0, 229, 255, 0.1)',
                  border: '1px solid rgba(0, 229, 255, 0.3)',
                  color: '#00e5ff',
                  fontSize: '0.82rem',
                  fontWeight: 600
                }}>
                  {scaleStatus}
                </div>
              )}

              {/* Bulk Selection Bar for Passes */}
              {selectedPassIds.size > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 1rem',
                  marginBottom: '1rem',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#ef4444'
                }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckSquare size={16} />
                    <span>{selectedPassIds.size} student pass(es) selected</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedPassIds(new Set())}
                      className="btn btn-secondary"
                      style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}
                    >
                      Clear Selection
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkDeletePasses}
                      style={{
                        padding: '0.3rem 0.75rem',
                        fontSize: '0.78rem',
                        backgroundColor: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={13} />
                      <span>Delete Selected ({selectedPassIds.size})</span>
                    </button>
                  </div>
                </div>
              )}

              {(() => {
                const filtered = passes.filter(p => {
                  const q = studentSearchQuery.toLowerCase();
                  return (
                    (p.name || p.studentName || '').toLowerCase().includes(q) ||
                    (p.username || '').toLowerCase().includes(q) ||
                    (p.id || '').toLowerCase().includes(q) ||
                    (p.email || '').toLowerCase().includes(q)
                  );
                });
                const totalPages = Math.max(1, Math.ceil(filtered.length / passesPerPage));
                const currentPage = Math.min(passPage, totalPages);
                const paginatedList = filtered.slice((currentPage - 1) * passesPerPage, currentPage * passesPerPage);
                const allOnPageSelected = paginatedList.length > 0 && paginatedList.every(p => selectedPassIds.has(p.id));

                return (
                  <>
                    <div className="data-table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th style={{ width: '40px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={allOnPageSelected}
                                onChange={() => toggleSelectAllPasses(paginatedList)}
                                style={{ cursor: 'pointer', accentColor: '#7c3aed', width: '15px', height: '15px' }}
                                title="Select all passes on current page"
                              />
                            </th>
                            <th>Student Name</th>
                            <th>Username</th>
                            <th>Student ID</th>
                            <th>Email</th>
                            <th>Route Entitlement</th>
                            <th>Valid Until</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedList.length === 0 ? (
                            <tr>
                              <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                No student passes found
                              </td>
                            </tr>
                          ) : (
                            paginatedList.map(pass => {
                              const rawStatus = pass.passStatus || pass.status || 'Valid';
                              const s = String(rawStatus).toLowerCase();
                              let badgeStyle, badgeText;
                              if (s.includes('suspend')) {
                                badgeStyle = { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.3)' };
                                badgeText = 'Suspended';
                              } else if (s.includes('cancel') || s.includes('expir') || s.includes('inactive')) {
                                badgeStyle = { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.3)' };
                                badgeText = 'Canceled';
                              } else {
                                badgeStyle = { backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#16a34a', border: '1px solid rgba(34, 197, 94, 0.3)' };
                                badgeText = 'Valid';
                              }

                              return (
                                <tr key={pass.id} style={{ backgroundColor: selectedPassIds.has(pass.id) ? 'rgba(124, 58, 237, 0.05)' : undefined }}>
                                  <td style={{ textAlign: 'center' }}>
                                    <input
                                      type="checkbox"
                                      checked={selectedPassIds.has(pass.id)}
                                      onChange={() => toggleSelectPass(pass.id)}
                                      style={{ cursor: 'pointer', accentColor: '#7c3aed', width: '15px', height: '15px' }}
                                    />
                                  </td>
                                  <td style={{ fontWeight: 600 }}>{pass.name || pass.studentName || 'Student Pass'}</td>
                                  <td style={{ fontFamily: 'monospace', fontSize: '0.84rem', fontWeight: 600, color: '#7c3aed' }}>
                                    {pass.username || pass.id}
                                  </td>
                                  <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{pass.id}</td>
                                  <td>{pass.email || '-'}</td>
                                  <td>{pass.routeEntitlement || 'All Routes'}</td>
                                  <td>{pass.validUntil || '2026-12-31'}</td>
                                  <td>
                                    <span
                                      className="badge"
                                      style={{
                                        ...badgeStyle,
                                        fontWeight: 700,
                                        padding: '0.25rem 0.6rem',
                                        borderRadius: '6px'
                                      }}
                                    >
                                      {badgeText}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                      <select
                                        value={badgeText}
                                        onChange={(e) => handleUpdatePassStatus(pass.id, e.target.value)}
                                        className="form-select"
                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem', width: 'auto' }}
                                      >
                                        <option value="Valid">Valid</option>
                                        <option value="Suspended">Suspended</option>
                                        <option value="Canceled">Canceled</option>
                                      </select>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditStudent(pass)}
                                        className="btn btn-secondary"
                                        style={{
                                          padding: '0.25rem 0.55rem',
                                          fontSize: '0.78rem',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '0.3rem',
                                          borderRadius: '6px',
                                          border: '1px solid var(--border-color)',
                                          color: '#7c3aed',
                                          cursor: 'pointer'
                                        }}
                                        title="Edit Student Credentials"
                                      >
                                        <Pencil size={13} />
                                        <span>Edit</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeletePass(pass.id)}
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          color: 'var(--danger, #ef4444)',
                                          cursor: 'pointer',
                                          padding: '0.2rem',
                                          display: 'flex',
                                          alignItems: 'center'
                                        }}
                                        title="Delete Student Pass"
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Footer */}
                    {filtered.length > 0 && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem 0.5rem 0.2rem',
                        borderTop: '1px solid var(--border-color)',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                        fontSize: '0.82rem',
                        color: 'var(--text-secondary)'
                      }}>
                        <div>
                          Showing <strong>{(currentPage - 1) * passesPerPage + 1}</strong> to <strong>{Math.min(currentPage * passesPerPage, filtered.length)}</strong> of <strong>{filtered.length}</strong> students (Total: {passes.length})
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span>Per page:</span>
                            <select
                              value={passesPerPage}
                              onChange={e => {
                                setPassPerPage(Number(e.target.value));
                                setPassPage(1);
                              }}
                              className="form-select"
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', height: '30px' }}
                            >
                              <option value={10}>10</option>
                              <option value={20}>20</option>
                              <option value={50}>50</option>
                              <option value={100}>100</option>
                              <option value={500}>500</option>
                            </select>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <button
                              type="button"
                              disabled={currentPage <= 1}
                              onClick={() => setPassPage(p => Math.max(1, p - 1))}
                              className="btn btn-secondary"
                              style={{ padding: '0.25rem 0.5rem', height: '30px', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', opacity: currentPage <= 1 ? 0.5 : 1 }}
                            >
                              <ChevronLeft size={14} />
                            </button>
                            <span style={{ fontWeight: 600, padding: '0 0.4rem' }}>
                              Page {currentPage} of {totalPages}
                            </span>
                            <button
                              type="button"
                              disabled={currentPage >= totalPages}
                              onClick={() => setPassPage(p => Math.min(totalPages, p + 1))}
                              className="btn btn-secondary"
                              style={{ padding: '0.25rem 0.5rem', height: '30px', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', opacity: currentPage >= totalPages ? 0.5 : 1 }}
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      {/* ── PROFESSIONAL ADD PICKUP STOP IN-APP MODAL (NO WINDOW.PROMPT) ── */}
      <AnimatePresence>
      {isAddStopModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
          onClick={() => setIsAddStopModalOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              backgroundColor: 'var(--bg-card, #ffffff)',
              borderRadius: '16px',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 20px 35px -10px rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={20} color="#7c3aed" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary, #1e293b)' }}>
                  Add Pickup Stop
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddStopModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted, #64748b)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.2rem'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Selected Location / Coordinates Details */}
            <div style={{ backgroundColor: 'var(--bg-subtle, #f8fafc)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {modalStopData.isSearch ? 'Selected Location' : 'Selected Coordinates'}
              </span>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary, #1e293b)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <MapPin size={15} color="#7c3aed" /> {modalStopData.name || modalStopData.address}
              </div>
              {modalStopData.isSearch && modalStopData.address && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)', marginTop: '0.2rem', lineHeight: '1.3' }}>
                  {modalStopData.address}
                </div>
              )}
            </div>

            {/* Stop Name Form */}
            <form onSubmit={handleConfirmAddStop} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.35rem', color: 'var(--text-primary, #1e293b)' }}>
                  Stop Name
                </label>
                <input
                  type="text"
                  autoFocus
                  value={stopNameInput}
                  onChange={e => setStopNameInput(e.target.value)}
                  placeholder="Enter pickup location name"
                  className="form-input"
                  style={{ width: '100%', fontSize: '0.9rem', padding: '0.65rem 0.85rem' }}
                  required
                />
                <div style={{ fontSize: '0.78rem', color: '#7c3aed', fontWeight: 600, marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Check size={14} /> This will become <strong>Pickup Stop #{pickedStops.length + 1}</strong> in the route sequence
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddStopModalOpen(false)}
                  style={{
                    padding: '0.6rem 1.1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary, #64748b)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#7c3aed',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    boxShadow: '0 3px 10px rgba(124, 58, 237, 0.35)'
                  }}
                >
                  Add Pickup Stop
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
      {/* Professional Add Bus Modal */}
      {isAddBusModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 9999
          }}
          onClick={() => setIsAddBusModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 16 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              backgroundColor: 'var(--bg-card, #ffffff)',
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: busAddMode === 'bulk' ? '600px' : '440px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-color, #cbd5e1)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(124, 58, 237, 0.12)',
                    color: '#7c3aed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Bus size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Register Fleet Buses
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Add vehicles to the campus transit system
                  </div>
                </div>
              </div>

              {/* Mode Switch */}
              <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: 'var(--bg-secondary, #f1f5f9)', padding: '0.25rem', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => setBusAddMode('single')}
                  style={{
                    padding: '0.35rem 0.85rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: busAddMode === 'single' ? '#7c3aed' : 'transparent',
                    color: busAddMode === 'single' ? '#ffffff' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  Single Bus
                </button>
                <button
                  type="button"
                  onClick={() => setBusAddMode('bulk')}
                  style={{
                    padding: '0.35rem 0.85rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: busAddMode === 'bulk' ? '#7c3aed' : 'transparent',
                    color: busAddMode === 'bulk' ? '#ffffff' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  Bulk Add (CSV)
                </button>
              </div>
            </div>

            {busAddMode === 'single' ? (
              <form onSubmit={handleCreateBus} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Bus Number & Registration</label>
                  <input
                    type="text"
                    autoFocus
                    value={newBusNumber}
                    onChange={e => setNewBusNumber(e.target.value)}
                    placeholder="e.g. BUS #105 (KL-05-ZZ-9999)"
                    className="form-input"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Driver Name</label>
                  <input
                    type="text"
                    value={newBusDriverName}
                    onChange={e => setNewBusDriverName(e.target.value)}
                    placeholder="e.g. Anand Menon"
                    className="form-input"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Assign Route</label>
                  <select
                    value={newBusRouteId}
                    onChange={e => setNewBusRouteId(e.target.value)}
                    className="form-select"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                  >
                    <option value="">-- None (Unassigned) --</option>
                    {routes.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Initial Status</label>
                  <select
                    value={newBusStatus}
                    onChange={e => setNewBusStatus(e.target.value)}
                    className="form-select"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                  >
                    <option value="Active">Active</option>
                    <option value="Idle">Idle</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Off Duty">Off Duty</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsAddBusModalOpen(false)}
                    style={{
                      padding: '0.6rem 1.1rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      backgroundColor: 'transparent',
                      color: 'var(--text-secondary, #64748b)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      padding: '0.6rem 1.25rem',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#7c3aed',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      boxShadow: '0 3px 10px rgba(124, 58, 237, 0.35)'
                    }}
                  >
                    {isSubmitting ? 'Saving...' : 'Create Bus'}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <BulkCsvUploader
                  title="Bulk Import Fleet Buses"
                  templateFilename="fleet_buses_template.csv"
                  templateContent={BUS_CSV_TEMPLATE}
                  columns={[
                    { key: 'number', label: 'Bus Number', required: true },
                    { key: 'drivername', label: 'Driver' },
                    { key: 'routeid', label: 'Route ID' },
                    { key: 'status', label: 'Status' }
                  ]}
                  onUpload={handleBulkUploadBuses}
                  isSubmitting={isSubmitting}
                  entityName="Buses"
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsAddBusModalOpen(false)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      backgroundColor: 'transparent',
                      color: 'var(--text-secondary, #64748b)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* Professional Add Driver Modal (Single / Bulk CSV) */}
      {isAddDriverModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 9999
          }}
          onClick={() => setIsAddDriverModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 16 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              backgroundColor: 'var(--bg-card, #ffffff)',
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: driverAddMode === 'bulk' ? '640px' : '480px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-color, #cbd5e1)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(124, 58, 237, 0.12)',
                    color: '#7c3aed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <UserPlus size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Add Transit Driver
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Create driver login credentials and vehicle assignment
                  </div>
                </div>
              </div>

              {/* Mode Switch */}
              <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: 'var(--bg-secondary, #f1f5f9)', padding: '0.25rem', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => setDriverAddMode('single')}
                  style={{
                    padding: '0.35rem 0.85rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: driverAddMode === 'single' ? '#7c3aed' : 'transparent',
                    color: driverAddMode === 'single' ? '#ffffff' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  Single Driver
                </button>
                <button
                  type="button"
                  onClick={() => setDriverAddMode('bulk')}
                  style={{
                    padding: '0.35rem 0.85rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: driverAddMode === 'bulk' ? '#7c3aed' : 'transparent',
                    color: driverAddMode === 'bulk' ? '#ffffff' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  Bulk Add (CSV)
                </button>
              </div>
            </div>

            {driverAddMode === 'single' ? (
              <form onSubmit={handleCreateDriver} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Full Name *</label>
                  <input
                    type="text"
                    autoFocus
                    value={newDriverName}
                    onChange={e => setNewDriverName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="form-input"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Username *</label>
                    <input
                      type="text"
                      value={newDriverUsername}
                      onChange={e => setNewDriverUsername(e.target.value)}
                      placeholder="e.g. driver.ramesh"
                      className="form-input"
                      style={{ width: '100%', fontSize: '0.85rem' }}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Password *</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showDriverPassword ? 'text' : 'password'}
                        value={newDriverPassword}
                        onChange={e => setNewDriverPassword(e.target.value)}
                        placeholder="password123"
                        className="form-input"
                        style={{ width: '100%', fontSize: '0.85rem', paddingRight: '2.2rem' }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowDriverPassword(!showDriverPassword)}
                        style={{
                          position: 'absolute',
                          right: '0.5rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-muted)'
                        }}
                      >
                        {showDriverPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Phone Number</label>
                  <input
                    type="text"
                    value={newDriverPhone}
                    onChange={e => setNewDriverPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="form-input"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Assign Bus</label>
                    <select
                      value={newDriverBusId}
                      onChange={e => setNewDriverBusId(e.target.value)}
                      className="form-select"
                      style={{ width: '100%', fontSize: '0.85rem' }}
                    >
                      <option value="">-- None (Unassigned) --</option>
                      {buses.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.number} ({b.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Duty Status</label>
                    <select
                      value={newDriverStatus}
                      onChange={e => setNewDriverStatus(e.target.value)}
                      className="form-select"
                      style={{ width: '100%', fontSize: '0.85rem' }}
                    >
                      <option value="Active">Active</option>
                      <option value="Idle">Idle</option>
                      <option value="Off Duty">Off Duty</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsAddDriverModalOpen(false)}
                    style={{
                      padding: '0.6rem 1.1rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      backgroundColor: 'transparent',
                      color: 'var(--text-secondary, #64748b)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      padding: '0.6rem 1.25rem',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#7c3aed',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      boxShadow: '0 3px 10px rgba(124, 58, 237, 0.35)'
                    }}
                  >
                    {isSubmitting ? 'Saving...' : 'Add Driver'}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <BulkCsvUploader
                  title="Bulk Import Drivers"
                  templateFilename="drivers_template.csv"
                  templateContent={DRIVER_CSV_TEMPLATE}
                  columns={[
                    { key: 'name', label: 'Full Name', required: true },
                    { key: 'username', label: 'Username', required: true },
                    { key: 'password', label: 'Password' },
                    { key: 'phone', label: 'Phone' },
                    { key: 'assignedbusid', label: 'Assigned Bus ID' },
                    { key: 'status', label: 'Status' }
                  ]}
                  onUpload={handleBulkUploadDrivers}
                  isSubmitting={isSubmitting}
                  entityName="Drivers"
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsAddDriverModalOpen(false)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      backgroundColor: 'transparent',
                      color: 'var(--text-secondary, #64748b)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* Edit Driver Credentials Modal */}
      {editingDriver && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 9999
          }}
          onClick={() => setEditingDriver(null)}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 16 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              backgroundColor: 'var(--bg-card, #ffffff)',
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-color, #cbd5e1)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(124, 58, 237, 0.12)',
                  color: '#7c3aed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Key size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Edit Driver Credentials
                </h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Update credentials and assignments for {editingDriver.name}
                </div>
              </div>
            </div>

            <form onSubmit={handleUpdateDriver} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Full Name *</label>
                <input
                  type="text"
                  value={editDriverName}
                  onChange={e => setEditDriverName(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', fontSize: '0.85rem' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Username *</label>
                  <input
                    type="text"
                    value={editDriverUsername}
                    onChange={e => setEditDriverUsername(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showEditDriverPassword ? 'text' : 'password'}
                      value={editDriverPassword}
                      onChange={e => setEditDriverPassword(e.target.value)}
                      className="form-input"
                      style={{ width: '100%', fontSize: '0.85rem', paddingRight: '2.2rem' }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditDriverPassword(!showEditDriverPassword)}
                      style={{
                        position: 'absolute',
                        right: '0.5rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)'
                      }}
                    >
                      {showEditDriverPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Phone Number</label>
                <input
                  type="text"
                  value={editDriverPhone}
                  onChange={e => setEditDriverPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="form-input"
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Assigned Bus</label>
                  <select
                    value={editDriverBusId}
                    onChange={e => setEditDriverBusId(e.target.value)}
                    className="form-select"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                  >
                    <option value="">-- None (Unassigned) --</option>
                    {buses.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.number} ({b.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Duty Status</label>
                  <select
                    value={editDriverStatus}
                    onChange={e => setEditDriverStatus(e.target.value)}
                    className="form-select"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                  >
                    <option value="Active">Active</option>
                    <option value="Idle">Idle</option>
                    <option value="Off Duty">Off Duty</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingDriver(null)}
                  style={{
                    padding: '0.6rem 1.1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary, #64748b)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#7c3aed',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    boxShadow: '0 3px 10px rgba(124, 58, 237, 0.35)'
                  }}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* Professional Add Student Modal (Single / Bulk CSV) */}
      {isAddStudentModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 9999
          }}
          onClick={() => setIsAddStudentModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 16 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              backgroundColor: 'var(--bg-card, #ffffff)',
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: passAddMode === 'bulk' ? '640px' : '500px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-color, #cbd5e1)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(124, 58, 237, 0.12)',
                    color: '#7c3aed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <GraduationCap size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Issue Student Pass
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Add student transit credentials and pass entitlements
                  </div>
                </div>
              </div>

              {/* Mode Switch */}
              <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: 'var(--bg-secondary, #f1f5f9)', padding: '0.25rem', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => setPassAddMode('single')}
                  style={{
                    padding: '0.35rem 0.85rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: passAddMode === 'single' ? '#7c3aed' : 'transparent',
                    color: passAddMode === 'single' ? '#ffffff' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  Single Student
                </button>
                <button
                  type="button"
                  onClick={() => setPassAddMode('bulk')}
                  style={{
                    padding: '0.35rem 0.85rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: passAddMode === 'bulk' ? '#7c3aed' : 'transparent',
                    color: passAddMode === 'bulk' ? '#ffffff' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  Bulk Add (CSV)
                </button>
              </div>
            </div>

            {passAddMode === 'single' ? (
              <form onSubmit={handleCreatePass} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Student Full Name *</label>
                  <input
                    type="text"
                    autoFocus
                    value={newStudentName}
                    onChange={e => setNewStudentName(e.target.value)}
                    placeholder="e.g. Ananya Nair"
                    className="form-input"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Username / Student ID</label>
                    <input
                      type="text"
                      value={newStudentUsername}
                      onChange={e => setNewStudentUsername(e.target.value)}
                      placeholder="e.g. STU-2026-99"
                      className="form-input"
                      style={{ width: '100%', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showStudentPassword ? 'text' : 'password'}
                        value={newStudentPassword}
                        onChange={e => setNewStudentPassword(e.target.value)}
                        placeholder="student123"
                        className="form-input"
                        style={{ width: '100%', fontSize: '0.85rem', paddingRight: '2.2rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowStudentPassword(!showStudentPassword)}
                        style={{
                          position: 'absolute',
                          right: '0.5rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-muted)'
                        }}
                      >
                        {showStudentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Email Address *</label>
                  <input
                    type="email"
                    value={newStudentEmail}
                    onChange={e => setNewStudentEmail(e.target.value)}
                    placeholder="student@cep.ac.in"
                    className="form-input"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Route Entitlement</label>
                    <select
                      value={newStudentRoute}
                      onChange={e => setNewStudentRoute(e.target.value)}
                      className="form-select"
                      style={{ width: '100%', fontSize: '0.85rem' }}
                    >
                      <option value="All Routes">All Routes (Universal Pass)</option>
                      {routes.map(r => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Pass Status</label>
                    <select
                      value={newStudentStatus}
                      onChange={e => setNewStudentStatus(e.target.value)}
                      className="form-select"
                      style={{ width: '100%', fontSize: '0.85rem' }}
                    >
                      <option value="Valid">Valid</option>
                      <option value="Suspended">Suspended</option>
                      <option value="Canceled">Canceled</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Valid Until</label>
                  <input
                    type="date"
                    value={newStudentValidUntil}
                    onChange={e => setNewStudentValidUntil(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsAddStudentModalOpen(false)}
                    style={{
                      padding: '0.6rem 1.1rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      backgroundColor: 'transparent',
                      color: 'var(--text-secondary, #64748b)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      padding: '0.6rem 1.25rem',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#7c3aed',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      boxShadow: '0 3px 10px rgba(124, 58, 237, 0.35)'
                    }}
                  >
                    {isSubmitting ? 'Saving...' : 'Issue Pass'}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <BulkCsvUploader
                  title="Bulk Import Student Passes"
                  templateFilename="student_passes_template.csv"
                  templateContent={STUDENT_PASS_CSV_TEMPLATE}
                  columns={[
                    { key: 'name', label: 'Full Name', required: true },
                    { key: 'username', label: 'Username', required: true },
                    { key: 'password', label: 'Password' },
                    { key: 'email', label: 'Email', required: true },
                    { key: 'routeentitlement', label: 'Route Entitlement' },
                    { key: 'passstatus', label: 'Status' },
                    { key: 'validuntil', label: 'Valid Until' }
                  ]}
                  onUpload={handleBulkUploadPasses}
                  isSubmitting={isSubmitting}
                  entityName="Student Passes"
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsAddStudentModalOpen(false)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      backgroundColor: 'transparent',
                      color: 'var(--text-secondary, #64748b)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* Edit Student Credentials Modal */}
      {editingStudent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 9999
          }}
          onClick={() => setEditingStudent(null)}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 16 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              backgroundColor: 'var(--bg-card, #ffffff)',
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-color, #cbd5e1)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(124, 58, 237, 0.12)',
                  color: '#7c3aed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Key size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Edit Student Credentials
                </h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Update credentials and entitlements for {editingStudent.name || editingStudent.id}
                </div>
              </div>
            </div>

            <form onSubmit={handleUpdateStudent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Student Full Name *</label>
                <input
                  type="text"
                  value={editStudentName}
                  onChange={e => setEditStudentName(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', fontSize: '0.85rem' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Username *</label>
                  <input
                    type="text"
                    value={editStudentUsername}
                    onChange={e => setEditStudentUsername(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showEditStudentPassword ? 'text' : 'password'}
                      value={editStudentPassword}
                      onChange={e => setEditStudentPassword(e.target.value)}
                      className="form-input"
                      style={{ width: '100%', fontSize: '0.85rem', paddingRight: '2.2rem' }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditStudentPassword(!showEditStudentPassword)}
                      style={{
                        position: 'absolute',
                        right: '0.5rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)'
                      }}
                    >
                      {showEditStudentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Student ID / Pass ID *</label>
                  <input
                    type="text"
                    value={editStudentId}
                    onChange={e => setEditStudentId(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Email Address *</label>
                  <input
                    type="email"
                    value={editStudentEmail}
                    onChange={e => setEditStudentEmail(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Route Entitlement</label>
                  <select
                    value={editStudentRoute}
                    onChange={e => setEditStudentRoute(e.target.value)}
                    className="form-select"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                  >
                    <option value="All Routes">All Routes (Universal Pass)</option>
                    {routes.map(r => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Status</label>
                  <select
                    value={editStudentStatus}
                    onChange={e => setEditStudentStatus(e.target.value)}
                    className="form-select"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                  >
                    <option value="Valid">Valid</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Canceled">Canceled</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Valid Until</label>
                <input
                  type="date"
                  value={editStudentValidUntil}
                  onChange={e => setEditStudentValidUntil(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  style={{
                    padding: '0.6rem 1.1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary, #64748b)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#7c3aed',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    boxShadow: '0 3px 10px rgba(124, 58, 237, 0.35)'
                  }}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Built-in Custom Confirmation Modal for All Deletions & Destructive Actions */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        isDanger={confirmModal.isDanger}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
