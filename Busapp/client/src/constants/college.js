// Dedicated Frontend Configuration for College Destination & Region Boundary
// Institution: College of Engineering Poonjar (CEP Poonjar), Kottayam, Kerala

export const COLLEGE_DESTINATION = {
  name: "College of Engineering Poonjar",
  shortName: "CEP Poonjar",
  lat: 9.6709,
  lng: 76.8273,
  address: "Poonjar Thekkekara, Kottayam District, Kerala - 686581"
};

// Geographic bounding box for Kottayam / Poonjar / Pala / Erattupetta transit area
export const KOTTAYAM_POONJAR_BOUNDS = {
  minLat: 9.40,
  maxLat: 9.80,
  minLng: 76.35,
  maxLng: 76.95,
  // Nominatim viewbox parameter: left,top,right,bottom (minLng, maxLat, maxLng, minLat)
  viewbox: "76.35,9.80,76.95,9.40"
};
