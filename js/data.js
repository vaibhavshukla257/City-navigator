/**
 * data.js - City Network Data Models & Importers
 * ==============================================================
 * City Navigation & Route Finder System - DSA Major Project
 *
 * Responsibilities:
 *   1. Node type color palettes and labels for map visualization.
 *   2. Graph dataset parser for user-imported JSON network files.
 *   3. On-demand loader for standard benchmark city topologies.
 *   4. Clean empty state defaults (zero fabricated runtime data).
 */

'use strict';

// ---------------------------------------------------------------------------
// Node Type Visual Palettes (High contrast on #F4F7F3 light map)
// ---------------------------------------------------------------------------
const NODE_COLORS = {
  hospital:        '#DC2626', // Crimson Red
  police:          '#2563EB', // Cobalt Blue
  fire_station:    '#EA580C', // Deep Orange
  school:          '#7C3AED', // Royal Purple
  mall:            '#DB2777', // Magenta Pink
  park:            '#16A34A', // Emerald Green
  railway_station: '#CA8A04', // Golden Amber
  petrol_pump:     '#0891B2', // Cyan Teal
  airport:         '#D97706', // Amber Bronze
  landmark:        '#9333EA', // Violet
  junction:        '#64756F'  // Neutral Slate
};

const NODE_TYPE_LABELS = {
  hospital:        'Hospital',
  police:          'Police Station',
  fire_station:    'Fire Station',
  school:          'School',
  mall:            'Mall / Commercial',
  park:            'Park / Green Space',
  railway_station: 'Railway Station',
  petrol_pump:     'Petrol Pump',
  airport:         'Airport Hub',
  landmark:        'Landmark Tower',
  junction:        'Road Junction'
};

// ---------------------------------------------------------------------------
// JSON Graph Dataset Parser
// ---------------------------------------------------------------------------
/**
 * Parse and validate a raw JSON network payload into { nodes: Map, edges: Array }.
 * @param {string|Object} rawData
 * @returns {{ nodes: Map<string, Object>, edges: Array<Object> }}
 */
function parseCityJSON(rawData) {
  let parsed = rawData;
  if (typeof rawData === 'string') {
    try {
      parsed = JSON.parse(rawData);
    } catch (err) {
      throw new Error('Invalid JSON format: ' + err.message);
    }
  }

  if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
    throw new Error('Dataset must contain "nodes" and "edges" arrays.');
  }

  const nodesMap = new Map();
  for (const n of parsed.nodes) {
    if (!n.id || !n.name) continue;

    const lat = typeof n.lat === 'number' ? n.lat : (typeof n.latitude === 'number' ? n.latitude : (typeof n.y === 'number' ? n.y : undefined));
    const lng = typeof n.lng === 'number' ? n.lng : (typeof n.lon === 'number' ? n.lon : (typeof n.longitude === 'number' ? n.longitude : (typeof n.x === 'number' ? n.x : undefined)));
    const x = typeof n.x === 'number' ? n.x : (lng !== undefined ? lng : 0);
    const y = typeof n.y === 'number' ? n.y : (lat !== undefined ? lat : 0);

    nodesMap.set(String(n.id), {
      id: String(n.id),
      name: String(n.name),
      lat: lat !== undefined ? lat : 0,
      lng: lng !== undefined ? lng : 0,
      x: Number(x),
      y: Number(y),
      type: String(n.type || 'junction')
    });
  }

  const edges = [];
  for (const e of parsed.edges) {
    let u, v, weight, traffic, oneway, meta;
    if (Array.isArray(e)) {
      u = String(e[0]);
      v = String(e[1]);
      traffic = Number(e[2] || 1.0);
    } else {
      u = String(e.u);
      v = String(e.v);
      traffic = Number(e.traffic || 1.0);
      weight = typeof e.weight === 'number' ? Number(e.weight) : undefined;
      oneway = !!e.oneway;
      meta = e.meta || null;
    }

    const nU = nodesMap.get(u);
    const nV = nodesMap.get(v);
    if (!nU || !nV) continue;

    // Calculate distance in km if not explicitly provided
    if (weight === undefined) {
      if (typeof nU.lat === 'number' && typeof nU.lng === 'number' && typeof nV.lat === 'number' && typeof nV.lng === 'number' &&
          (Math.abs(nU.lat) <= 90 && Math.abs(nV.lat) <= 90)) {
        // Use Haversine for geographic coordinates
        const R = 6371.0;
        const toRad = Math.PI / 180;
        const dLat = (nV.lat - nU.lat) * toRad;
        const dLon = (nV.lng - nU.lng) * toRad;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(nU.lat * toRad) * Math.cos(nV.lat * toRad) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        weight = +(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(3);
      } else {
        const dx = nU.x - nV.x;
        const dy = nU.y - nV.y;
        weight = +(Math.sqrt(dx * dx + dy * dy) / 40).toFixed(1);
      }
    }

    edges.push({
      u,
      v,
      weight: Math.max(weight, 0.05),
      traffic: Math.max(traffic, 1.0),
      oneway: !!oneway,
      meta
    });
  }

  return { nodes: nodesMap, edges, name: parsed.name || 'City Network' };
}

// ---------------------------------------------------------------------------
// Standard Benchmark Topology Definition (Available for on-demand loading)
// ---------------------------------------------------------------------------
const BENCHMARK_NETWORK_DEF = {
  nodes: [
    { id: 'n01', name: 'Nexus General Hospital', x: 500, y: 320, type: 'hospital' },
    { id: 'n02', name: 'North Star Hospital', x: 200, y: 90, type: 'hospital' },
    { id: 'n03', name: "St. Mary's Hospital", x: 820, y: 90, type: 'hospital' },
    { id: 'n04', name: 'Westside Medical Centre', x: 80, y: 560, type: 'hospital' },
    { id: 'n05', name: 'Apex South Hospital', x: 850, y: 580, type: 'hospital' },
    { id: 'n06', name: 'Central Police Station', x: 490, y: 180, type: 'police' },
    { id: 'n07', name: 'East Police Station', x: 870, y: 310, type: 'police' },
    { id: 'n08', name: 'West Police Station', x: 110, y: 320, type: 'police' },
    { id: 'n09', name: 'South Police Station', x: 500, y: 580, type: 'police' },
    { id: 'n10', name: 'Central Fire Station', x: 350, y: 310, type: 'fire_station' },
    { id: 'n11', name: 'East Fire Station', x: 720, y: 420, type: 'fire_station' },
    { id: 'n12', name: 'West Fire Station', x: 200, y: 430, type: 'fire_station' },
    { id: 'n13', name: 'Nexus Public School', x: 310, y: 160, type: 'school' },
    { id: 'n14', name: 'Eastview High School', x: 750, y: 170, type: 'school' },
    { id: 'n15', name: 'Southside Academy', x: 340, y: 490, type: 'school' },
    { id: 'n16', name: 'Northern Grammar School', x: 600, y: 80, type: 'school' },
    { id: 'n17', name: 'City Centre Mall', x: 490, y: 440, type: 'mall' },
    { id: 'n18', name: 'Eastgate Mall', x: 780, y: 480, type: 'mall' },
    { id: 'n19', name: 'Westfield Shopping Centre', x: 150, y: 460, type: 'mall' },
    { id: 'n20', name: 'North Plaza', x: 430, y: 80, type: 'mall' },
    { id: 'n21', name: 'Central Park', x: 500, y: 250, type: 'park' },
    { id: 'n22', name: 'Riverside Park', x: 260, y: 380, type: 'park' },
    { id: 'n23', name: 'East Gardens', x: 730, y: 250, type: 'park' },
    { id: 'n24', name: 'South Meadows', x: 630, y: 540, type: 'park' },
    { id: 'n25', name: 'Central Railway Station', x: 490, y: 520, type: 'railway_station' },
    { id: 'n26', name: 'North Railway Station', x: 360, y: 90, type: 'railway_station' },
    { id: 'n27', name: 'East Railway Station', x: 870, y: 440, type: 'railway_station' },
    { id: 'n28', name: 'CityFuel - Central', x: 450, y: 360, type: 'petrol_pump' },
    { id: 'n29', name: 'QuickFill - North', x: 240, y: 200, type: 'petrol_pump' },
    { id: 'n30', name: 'EastPetrol Station', x: 800, y: 360, type: 'petrol_pump' },
    { id: 'n31', name: 'WestFuel - South', x: 160, y: 540, type: 'petrol_pump' },
    { id: 'n32', name: 'SpeedFuel - South', x: 660, y: 590, type: 'petrol_pump' },
    { id: 'n33', name: 'Nexus International Airport', x: 900, y: 180, type: 'airport' },
    { id: 'n34', name: 'Millennium Tower', x: 500, y: 390, type: 'landmark' },
    { id: 'n35', name: 'North Junction', x: 500, y: 130, type: 'junction' },
    { id: 'n36', name: 'NW Junction', x: 210, y: 160, type: 'junction' },
    { id: 'n37', name: 'NE Junction', x: 700, y: 130, type: 'junction' },
    { id: 'n38', name: 'West Junction', x: 150, y: 380, type: 'junction' },
    { id: 'n39', name: 'East Junction', x: 800, y: 310, type: 'junction' },
    { id: 'n40', name: 'Central Junction', x: 490, y: 310, type: 'junction' },
    { id: 'n41', name: 'SW Junction', x: 230, y: 510, type: 'junction' },
    { id: 'n42', name: 'SE Junction', x: 720, y: 520, type: 'junction' },
    { id: 'n43', name: 'South Junction', x: 490, y: 620, type: 'junction' },
    { id: 'n44', name: 'Ring Road North', x: 500, y: 40, type: 'junction' },
    { id: 'n45', name: 'Midway Junction', x: 620, y: 360, type: 'junction' }
  ],
  edges: [
    ['n44','n02', 1.2], ['n44','n26', 1.0], ['n44','n16', 1.1], ['n44','n03', 1.3], ['n44','n33', 1.4],
    ['n02','n36', 1.0], ['n36','n13', 1.1], ['n13','n26', 1.0], ['n26','n35', 1.0], ['n35','n16', 1.1],
    ['n16','n37', 1.0], ['n37','n14', 1.1], ['n14','n03', 1.0], ['n03','n33', 1.2],
    ['n33','n07', 1.5], ['n07','n39', 1.3], ['n39','n30', 1.2], ['n30','n23', 1.1],
    ['n23','n11', 1.2], ['n11','n27', 1.3], ['n27','n18', 1.1], ['n18','n42', 1.2],
    ['n42','n05', 1.4], ['n05','n32', 1.1], ['n32','n24', 1.0], ['n24','n25', 1.1],
    ['n25','n09', 1.2], ['n09','n43', 1.0], ['n43','n04', 1.3], ['n04','n31', 1.0],
    ['n31','n41', 1.1], ['n41','n19', 1.0], ['n19','n12', 1.1], ['n12','n38', 1.0],
    ['n38','n08', 1.2], ['n08','n29', 1.0], ['n29','n36', 1.1], ['n02','n29', 1.0],
    ['n44','n35', 1.0], ['n35','n06', 1.2], ['n06','n21', 1.1], ['n21','n01', 1.0],
    ['n01','n40', 1.2], ['n40','n34', 1.1], ['n34','n28', 1.0], ['n28','n17', 1.1],
    ['n17','n25', 1.2], ['n25','n43', 1.1], ['n08','n38', 1.3], ['n38','n22', 1.1],
    ['n22','n10', 1.2], ['n10','n40', 1.2], ['n40','n45', 1.3], ['n45','n39', 1.2],
    ['n39','n07', 1.4], ['n36','n29', 1.0], ['n29','n06', 1.1], ['n06','n37', 1.2],
    ['n37','n23', 1.1], ['n23','n39', 1.0], ['n39','n45', 1.2], ['n45','n11', 1.1],
    ['n11','n42', 1.2], ['n42','n24', 1.0], ['n24','n09', 1.1], ['n09','n41', 1.0],
    ['n41','n12', 1.1], ['n12','n22', 1.0], ['n22','n28', 1.1], ['n28','n34', 1.0],
    ['n13','n06', 1.1], ['n06','n16', 1.2], ['n16','n14', 1.0], ['n14','n37', 1.0],
    ['n36','n08', 1.1], ['n38','n19', 1.0], ['n19','n31', 1.0], ['n31','n04', 1.1],
    ['n15','n22', 1.0], ['n15','n41', 1.1], ['n15','n28', 1.2], ['n17','n24', 1.1],
    ['n17','n15', 1.0], ['n20','n26', 1.1], ['n20','n35', 1.1], ['n30','n07', 1.3],
    ['n30','n45', 1.2], ['n33','n37', 1.2], ['n27','n05', 1.2], ['n43','n41', 1.0]
  ]
};

function loadSampleCityData() {
  return parseCityJSON(BENCHMARK_NETWORK_DEF);
}

// ---------------------------------------------------------------------------
// Initial State: Clean Empty Dataset (No fabricated runtime data)
// ---------------------------------------------------------------------------
const CITY_DATA = {
  nodes: new Map(),
  edges: []
};

// Global Exports
if (typeof window !== 'undefined') {
  window.NODE_COLORS = NODE_COLORS;
  window.NODE_TYPE_LABELS = NODE_TYPE_LABELS;
  window.CITY_DATA = CITY_DATA;
  window.parseCityJSON = parseCityJSON;
  window.loadSampleCityData = loadSampleCityData;
  window.BENCHMARK_NETWORK_DEF = BENCHMARK_NETWORK_DEF;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    NODE_COLORS,
    NODE_TYPE_LABELS,
    CITY_DATA,
    parseCityJSON,
    loadSampleCityData
  };
}
