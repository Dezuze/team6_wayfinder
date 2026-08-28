// OpenStreetMap / OSRM Frontend Road-Following Routing Service
// Calculates real driving road geometry between ordered waypoints

/**
 * Fetch road-following route geometry from OSRM Driving API
 * @param {Array<{lat: number, lng: number}>} waypoints - Array of ordered waypoints
 * @returns {Promise<{ path: Array<[number, number]>, distanceKm: number, durationMin: number }>}
 */
export async function fetchRoadRoute(waypoints) {
  if (!Array.isArray(waypoints) || waypoints.length < 2) {
    return { path: [], distanceKm: 0, durationMin: 0 };
  }

  // OSRM expects coordinates formatted as lng,lat separated by semicolons
  const coordinatesString = waypoints
    .map(wp => `${wp.lng.toFixed(6)},${wp.lat.toFixed(6)}`)
    .join(';');

  const url = `https://router.project-osrm.org/route/v1/driving/${coordinatesString}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Routing API responded with status ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error(data.message || 'No valid road route found');
    }

    const route = data.routes[0];
    // GeoJSON coordinates are [longitude, latitude] -> convert to Leaflet [latitude, longitude]
    const leafletPath = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
    const distanceKm = Number((route.distance / 1000).toFixed(2));
    const durationMin = Math.round(route.duration / 60);

    return {
      path: leafletPath,
      distanceKm,
      durationMin
    };
  } catch (error) {
    console.warn('Road routing service error:', error);
    throw error;
  }
}
