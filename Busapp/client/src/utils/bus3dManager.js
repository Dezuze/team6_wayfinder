import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

/**
 * Bus3DManager
 * Loads and renders the real 3D bus.obj model into canvas pointers for Leaflet.
 * Ensures the front side of the bus (+X in the OBJ) points forward along the route bearing.
 */
class Bus3DManager {
  constructor() {
    this.isLoaded = false;
    this.isLoading = false;
    this.loadCallbacks = [];
    this.modelTemplate = null;

    // Single shared offscreen WebGL renderer (prevents WebGL context exhaustion)
    this.canvasSize = 128; // 128x128 high-res texture
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.busGroup = null;
    this.bodyMesh = null;
    this.bodyMaterial = null;
    this.windowMaterial = null;
    this.wheelMaterial = null;
    this.roofMaterial = null;
    this.headlightMaterial = null;
    this.taillightMaterial = null;

    this.initThree();
  }

  initThree() {
    if (typeof window === 'undefined') return;

    try {
      this.scene = new THREE.Scene();

      // Camera positioned overhead at a 65° tilt for realistic 3D depth and volume
      const aspect = 1;
      this.camera = new THREE.PerspectiveCamera(36, aspect, 0.1, 100);
      // Looking down from above-south at the bus
      this.camera.position.set(0, 14, 8);
      this.camera.lookAt(0, 0, 0);

      // Studio 3D Lighting setup
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
      this.scene.add(ambientLight);

      const sunLight = new THREE.DirectionalLight(0xffffff, 1.4);
      sunLight.position.set(8, 20, 12);
      this.scene.add(sunLight);

      const fillLight = new THREE.DirectionalLight(0x94a3b8, 0.6);
      fillLight.position.set(-10, 10, -10);
      this.scene.add(fillLight);

      // Offscreen canvas and renderer
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = this.canvasSize;
      offscreenCanvas.height = this.canvasSize;

      this.renderer = new THREE.WebGLRenderer({
        canvas: offscreenCanvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(this.canvasSize, this.canvasSize);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.setClearColor(0x000000, 0);

      this.busGroup = new THREE.Group();
      this.scene.add(this.busGroup);

      // Load bus.obj from public folder
      this.loadModel();
    } catch (err) {
      console.error('Failed to initialize Three.js for 3D Bus:', err);
    }
  }

  loadModel() {
    if (this.isLoaded || this.isLoading) return;
    this.isLoading = true;

    const loader = new OBJLoader();
    loader.load(
      '/bus.obj',
      (obj) => {
        try {
          this.setupBusMesh(obj);
          this.isLoaded = true;
          this.isLoading = false;
          this.loadCallbacks.forEach(cb => cb());
          this.loadCallbacks = [];
          this.notifySubscribers();
        } catch (err) {
          console.error('Error setting up 3D bus mesh:', err);
          this.isLoading = false;
        }
      },
      undefined,
      (err) => {
        console.error('Failed to load /bus.obj:', err);
        this.isLoading = false;
      }
    );
  }

  setupBusMesh(obj) {
    let sourceMesh = null;
    obj.traverse(child => {
      if (child.isMesh && !sourceMesh) {
        sourceMesh = child;
      }
    });

    if (!sourceMesh) {
      console.warn('No mesh found in bus.obj');
      return;
    }

    const geometry = sourceMesh.geometry.clone();
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();

    // Center geometry so it pivots cleanly around center
    const bbox = geometry.boundingBox;
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    // Keep wheels at bottom (y=0 relative to pivot)
    geometry.translate(-center.x, -bbox.min.y, -center.z);

    // Compute size for scaling (bus length ~ 8m, normalize to ~ 6 units in scene)
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scaleFactor = 6.2 / maxDim;
    geometry.scale(scaleFactor, scaleFactor, scaleFactor);

    // Differentiate materials by geometry zones (Wheels, Windows, Roof, Body, Headlights)
    // We add groups to geometry for multi-material rendering
    const pos = geometry.attributes.position;
    const numTriangles = pos.count / 3;

    // Materials:
    // 0: Body (colorizable)
    // 1: Windows (dark tinted glass with specular shine)
    // 2: Wheels (matte charcoal rubber)
    // 3: Roof/Trims (crisp white)
    // 4: Headlights (bright luminous yellow-white)
    // 5: Taillights (ruby red)

    this.bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      metalness: 0.25,
      roughness: 0.35
    });

    this.windowMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.8,
      roughness: 0.15,
      transparent: true,
      opacity: 0.92
    });

    this.wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.1,
      roughness: 0.85
    });

    this.roofMaterial = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.1,
      roughness: 0.4
    });

    this.headlightMaterial = new THREE.MeshBasicMaterial({
      color: 0xfffbeb
    });

    this.taillightMaterial = new THREE.MeshBasicMaterial({
      color: 0xef4444
    });

    const materials = [
      this.bodyMaterial,     // 0
      this.windowMaterial,   // 1
      this.wheelMaterial,    // 2
      this.roofMaterial,     // 3
      this.headlightMaterial,// 4
      this.taillightMaterial // 5
    ];

    // Assign material groups per triangle
    geometry.clearGroups();
    
    // Scaled coordinates check (approx bounds after scaling)
    for (let t = 0; t < numTriangles; t++) {
      const idx = t * 3;
      const x = (pos.getX(idx) + pos.getX(idx + 1) + pos.getX(idx + 2)) / 3;
      const y = (pos.getY(idx) + pos.getY(idx + 1) + pos.getY(idx + 2)) / 3;
      const z = (pos.getZ(idx) + pos.getZ(idx + 1) + pos.getZ(idx + 2)) / 3;

      let matIdx = 0; // Default body

      if (y < 0.65 && Math.abs(z) > 0.65) {
        matIdx = 2; // Wheels
      } else if (x > 2.7 && y < 1.0 && y > 0.4 && Math.abs(z) > 0.5) {
        matIdx = 4; // Headlights (front +X)
      } else if (x < -2.7 && y < 1.0 && y > 0.4 && Math.abs(z) > 0.5) {
        matIdx = 5; // Taillights (rear -X)
      } else if (y > 0.95 && y < 1.85 && (Math.abs(z) > 0.85 || x > 2.6 || x < -2.6)) {
        matIdx = 1; // Windows / windshield
      } else if (y >= 1.95) {
        matIdx = 3; // Roof
      }

      geometry.addGroup(idx, 3, matIdx);
    }

    this.bodyMesh = new THREE.Mesh(geometry, materials);
    this.busGroup.add(this.bodyMesh);

    // Add 3D Headlight Beams / Ground Shadow Disc
    const shadowGeo = new THREE.PlaneGeometry(6.6, 2.8);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.02;
    this.busGroup.add(shadowMesh);

    // Front Headlight Glow Indicator Cone (Forward direction: +X)
    const glowGeo = new THREE.BufferGeometry();
    const glowVerts = new Float32Array([
      // Triangle 1 (Left headlight beam)
      2.9, 0.4, 0.6,
      5.2, 0.05, 1.4,
      5.2, 0.05, 0.2,
      // Triangle 2 (Right headlight beam)
      2.9, 0.4, -0.6,
      5.2, 0.05, -0.2,
      5.2, 0.05, -1.4,
    ]);
    glowGeo.setAttribute('position', new THREE.BufferAttribute(glowVerts, 3));
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    this.busGroup.add(glowMesh);
  }

  onReady(cb) {
    if (this.isLoaded) {
      cb();
    } else {
      this.loadCallbacks.push(cb);
    }
  }


  subscribe(callback) {
    this.subscribers = this.subscribers || [];
    this.subscribers.push(callback);
    if (this.isLoaded) {
      callback();
    }
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  notifySubscribers() {
    if (this.subscribers) {
      this.subscribers.forEach(cb => cb());
    }
  }

  /**
   * Generates or retrieves a cached high-res PNG dataURL of the 3D bus oriented at `bearing`.
   */
  getBusIconDataUrl({ bearing = 0, color = '#2563eb', status = 'Active', isSelected = false } = {}) {
    if (!this.isLoaded || !this.renderer) return null;

    if (!this.dataUrlCache) {
      this.dataUrlCache = new Map();
    }

    // Quantize bearing to 2-degree increments [0, 2, 4, ..., 358] for instant cache hits
    const normBearing = (((Math.round(bearing / 2) * 2) % 360) + 360) % 360;
    const cacheKey = `${normBearing}_${color}_${status}_${isSelected ? 1 : 0}`;

    if (this.dataUrlCache.has(cacheKey)) {
      return this.dataUrlCache.get(cacheKey);
    }

    // Update body color matching bus status or route color
    let hexColor = color;
    if (status) {
      const s = String(status).toUpperCase();
      if (s.includes('SOS') || s.includes('EMERGENCY')) hexColor = '#ef4444';
      else if (s.includes('DELAY')) hexColor = '#f59e0b';
      else if (s.includes('IDLE') || s.includes('MAINTENANCE') || s.includes('OFF')) hexColor = '#64748b';
    }
    if (this.bodyMaterial) {
      this.bodyMaterial.color.set(hexColor);
    }

    // In bus.obj, +X is the FRONT of the bus.
    // Orient the front to bearing:
    // Bearing 0 (North): rotation.y = +90° (+X -> -Z = North)
    // Bearing 90 (East): rotation.y = 0° (+X -> +X = East)
    const rad = ((90 - normBearing) * Math.PI) / 180;
    this.busGroup.rotation.y = rad;

    if (isSelected) {
      this.busGroup.scale.set(1.15, 1.15, 1.15);
    } else {
      this.busGroup.scale.set(1.0, 1.0, 1.0);
    }

    this.renderer.render(this.scene, this.camera);
    const dataUrl = this.renderer.domElement.toDataURL('image/png');

    // Limit cache size to 720 entries (~2.5MB)
    if (this.dataUrlCache.size > 720) {
      const firstKey = this.dataUrlCache.keys().next().value;
      this.dataUrlCache.delete(firstKey);
    }
    this.dataUrlCache.set(cacheKey, dataUrl);
    return dataUrl;
  }

  // Copy to target 2D canvas
  renderBusToCanvas(targetCanvas, { bearing = 0, color = '#2563eb', status = 'Active', isSelected = false } = {}) {
    if (!this.isLoaded || !this.renderer || !targetCanvas) return;

    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return;

    let hexColor = color;
    if (status) {
      const s = String(status).toUpperCase();
      if (s.includes('SOS') || s.includes('EMERGENCY')) hexColor = '#ef4444';
      else if (s.includes('DELAY')) hexColor = '#f59e0b';
      else if (s.includes('IDLE') || s.includes('MAINTENANCE') || s.includes('OFF')) hexColor = '#64748b';
    }
    this.bodyMaterial.color.set(hexColor);

    const rad = ((90 - bearing) * Math.PI) / 180;
    this.busGroup.rotation.y = rad;

    if (isSelected) {
      this.busGroup.scale.set(1.15, 1.15, 1.15);
    } else {
      this.busGroup.scale.set(1.0, 1.0, 1.0);
    }

    this.renderer.render(this.scene, this.camera);

    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    ctx.drawImage(
      this.renderer.domElement,
      0,
      0,
      targetCanvas.width,
      targetCanvas.height
    );
  }
}

// Export singleton instance
export const bus3dManager = new Bus3DManager();
