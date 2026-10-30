/**
 * algorithms.js - Hand-Written Graph Pathfinding Algorithms
 * ==============================================================
 * City Navigation & Route Finder System - DSA Major Project
 *
 * All algorithms are implemented from first principles with zero library dependencies.
 *
 * Algorithmic Inventory:
 *   1. Dijkstra's Shortest Path       - O((V + E) log V) time | O(V) space
 *   2. A* Heuristic Search            - O((V + E) log V) time | O(V) space
 *   3. Breadth-First Search (BFS)     - O(V + E) time         | O(V) space
 *   4. Depth-First Search (DFS)       - O(V + E) time         | O(V) space
 *   5. Nearest Facility Finder (Top 3)- O((V + E) log V) time | O(V) space
 *   6. Alternate Route Generator      - O(k * (V+E) log V)    | O(V) space
 *   7. Multi-Stop TSP Permutations    - O(k! * (V+E) log V)   | O(V) space
 *   8. Graph Connectivity Checker     - O(V + E) time         | O(V) space
 */

'use strict';

// ===========================================================================
// 1. DIJKSTRA'S ALGORITHM
// ===========================================================================
/**
 * Single-Source Shortest Path using a custom Binary Min-Heap Priority Queue.
 *
 * Time Complexity:
 *   - Worst case: O((|V| + |E|) * log |V|)
 *   - Extract-min is called at most |V| times -> O(|V| log |V|)
 *   - Edge relaxation pushes at most |E| updates -> O(|E| log |V|)
 * Space Complexity:
 *   - O(|V|) to maintain dist map, predecessor map, visited set, and heap.
 *
 * @param {Graph}   graph
 * @param {string}  src         Source node ID
 * @param {string}  dst         Destination node ID
 * @param {boolean} [useTraffic=false] Multiply distance by traffic factor
 * @returns {{ path: string[], distance: number, visited: number, visitedOrder: string[], timeMs: number, found: boolean }}
 */
function dijkstra(graph, src, dst, useTraffic = false) {
  const t0 = performance.now();

  // Edge case validations
  if (!graph || !graph.getNode(src) || !graph.getNode(dst)) {
    return { path: [], distance: Infinity, visited: 0, visitedOrder: [], timeMs: 0, found: false };
  }

  // Same source and destination
  if (src === dst) {
    return {
      path: [src],
      distance: 0,
      visited: 1,
      visitedOrder: [src],
      timeMs: +(performance.now() - t0).toFixed(3),
      found: true
    };
  }

  const dist = new Map();
  const prev = new Map();
  const visited = new Set();
  const visitedOrder = [];
  const pq = new MinHeap();

  // Initialize distances
  for (const id of graph.getAllNodeIds()) {
    dist.set(id, Infinity);
  }
  dist.set(src, 0);
  pq.insert(0, src);

  while (!pq.isEmpty()) {
    const minItem = pq.extractMin();
    if (!minItem) break;
    const { key: currentDist, value: u } = minItem;

    // Skip stale heap entries (lazy deletion approach)
    if (visited.has(u)) continue;
    visited.add(u);
    visitedOrder.push(u);

    // Early termination once target is settled
    if (u === dst) break;

    // Relax neighbors
    const neighbors = graph.getNeighbors(u, true);
    for (const edge of neighbors) {
      if (visited.has(edge.to)) continue;

      const weight = useTraffic ? (edge.weight * edge.traffic) : edge.weight;
      const alt = currentDist + weight;

      if (alt < dist.get(edge.to)) {
        dist.set(edge.to, alt);
        prev.set(edge.to, u);
        pq.decreaseKey(alt, edge.to);
      }
    }
  }

  const timeMs = +(performance.now() - t0).toFixed(3);
  const targetDist = dist.get(dst);

  if (targetDist === undefined || targetDist === Infinity) {
    return {
      path: [],
      distance: Infinity,
      visited: visited.size,
      visitedOrder,
      timeMs,
      found: false
    };
  }

  const path = _reconstructPath(prev, src, dst);
  return {
    path,
    distance: +targetDist.toFixed(2),
    visited: visited.size,
    visitedOrder,
    timeMs,
    found: path.length > 0
  };
}

// ===========================================================================
// 2. A* SEARCH ALGORITHM
// ===========================================================================
/**
 * A* Pathfinding using Euclidean Distance as an Admissible Heuristic.
 *
 * Admissibility Proof:
 *   Straight-line Euclidean distance h(u) = sqrt((x_u - x_dst)^2 + (y_u - y_dst)^2) / 40.
 *   Because real roads curve or turn, physical road distance >= Euclidean distance.
 *   Thus h(u) <= h*(u) for all u, ensuring optimality.
 *
 * Time Complexity:
 *   - Best case (direct line): O(|V| log |V|) with heavily pruned search cone
 *   - Worst case: O((|V| + |E|) * log |V|)
 * Space Complexity:
 *   - O(|V|)
 *
 * @param {Graph}   graph
 * @param {string}  src
 * @param {string}  dst
 * @param {boolean} [useTraffic=false]
 * @returns {{ path: string[], distance: number, visited: number, visitedOrder: string[], timeMs: number, found: boolean }}
 */
function astar(graph, src, dst, useTraffic = false) {
  const t0 = performance.now();

  const dstNode = graph.getNode(dst);
  const srcNode = graph.getNode(src);
  if (!dstNode || !srcNode) {
    return { path: [], distance: Infinity, visited: 0, visitedOrder: [], timeMs: 0, found: false };
  }

  if (src === dst) {
    return {
      path: [src],
      distance: 0,
      visited: 1,
      visitedOrder: [src],
      timeMs: +(performance.now() - t0).toFixed(3),
      found: true
    };
  }

  /**
   * Admissible Heuristic Function in kilometers:
   * - Uses Great-Circle Haversine distance for real-world OpenStreetMap coordinates (lat/lng).
   *   Because geodesic distance <= actual curved road distance, Haversine is mathematically guaranteed admissible.
   * - Uses Euclidean straight-line distance for Cartesian canvas coordinates (x/y).
   */
  const heuristic = (nodeId) => {
    const node = graph.getNode(nodeId);
    if (!node) return 0;

    // Real OpenStreetMap geographic coordinates
    if (typeof node.lat === 'number' && typeof node.lng === 'number' &&
        typeof dstNode.lat === 'number' && typeof dstNode.lng === 'number') {
      const R = 6371.0;
      const toRad = Math.PI / 180;
      const dLat = (dstNode.lat - node.lat) * toRad;
      const dLon = (dstNode.lng - node.lng) * toRad;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(node.lat * toRad) * Math.cos(dstNode.lat * toRad) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // Planar Cartesian coordinates (unit test reference graph & benchmark synthesis)
    const dx = node.x - dstNode.x;
    const dy = node.y - dstNode.y;
    return Math.sqrt(dx * dx + dy * dy) / 40;
  };

  const gScore = new Map(); // Actual exact cost from src to u
  const fScore = new Map(); // Estimated total cost: gScore + heuristic
  const prev = new Map();
  const visited = new Set();
  const visitedOrder = [];
  const pq = new MinHeap();

  for (const id of graph.getAllNodeIds()) {
    gScore.set(id, Infinity);
    fScore.set(id, Infinity);
  }

  gScore.set(src, 0);
  const initialF = heuristic(src);
  fScore.set(src, initialF);
  pq.insert(initialF, src);

  while (!pq.isEmpty()) {
    const minItem = pq.extractMin();
    if (!minItem) break;
    const { value: u } = minItem;

    if (visited.has(u)) continue;
    visited.add(u);
    visitedOrder.push(u);

    // Target reached
    if (u === dst) break;

    const currentG = gScore.get(u);
    const neighbors = graph.getNeighbors(u, true);

    for (const edge of neighbors) {
      if (visited.has(edge.to)) continue;

      const weight = useTraffic ? (edge.weight * edge.traffic) : edge.weight;
      const tentativeG = currentG + weight;

      if (tentativeG < gScore.get(edge.to)) {
        gScore.set(edge.to, tentativeG);
        prev.set(edge.to, u);
        const newF = tentativeG + heuristic(edge.to);
        fScore.set(edge.to, newF);
        pq.decreaseKey(newF, edge.to);
      }
    }
  }

  const timeMs = +(performance.now() - t0).toFixed(3);
  const finalG = gScore.get(dst);

  if (finalG === undefined || finalG === Infinity) {
    return {
      path: [],
      distance: Infinity,
      visited: visited.size,
      visitedOrder,
      timeMs,
      found: false
    };
  }

  const path = _reconstructPath(prev, src, dst);
  return {
    path,
    distance: +finalG.toFixed(2),
    visited: visited.size,
    visitedOrder,
    timeMs,
    found: path.length > 0
  };
}

// ===========================================================================
// 3. BREADTH-FIRST SEARCH (BFS) - Fewest Road Hops
// ===========================================================================
/**
 * BFS evaluates shortest path in terms of hop count (unweighted edges).
 * Time:  O(|V| + |E|)
 * Space: O(|V|)
 *
 * @param {Graph}  graph
 * @param {string} src
 * @param {string} dst
 * @returns {{ path: string[], hops: number, distance: number, visited: number, visitedOrder: string[], timeMs: number, found: boolean }}
 */
function bfs(graph, src, dst) {
  const t0 = performance.now();

  if (!graph || !graph.getNode(src) || !graph.getNode(dst)) {
    return { path: [], hops: 0, distance: 0, visited: 0, visitedOrder: [], timeMs: 0, found: false };
  }

  if (src === dst) {
    return {
      path: [src],
      hops: 0,
      distance: 0,
      visited: 1,
      visitedOrder: [src],
      timeMs: +(performance.now() - t0).toFixed(3),
      found: true
    };
  }

  const visited = new Set();
  const visitedOrder = [];
  const prev = new Map();
  const queue = new Queue();

  queue.enqueue(src);
  visited.add(src);
  visitedOrder.push(src);

  let targetFound = false;

  while (!queue.isEmpty()) {
    const u = queue.dequeue();
    if (u === dst) {
      targetFound = true;
      break;
    }

    const neighbors = graph.getNeighbors(u, true);
    for (const edge of neighbors) {
      if (!visited.has(edge.to)) {
        visited.add(edge.to);
        visitedOrder.push(edge.to);
        prev.set(edge.to, u);
        queue.enqueue(edge.to);
        if (edge.to === dst) {
          targetFound = true;
          break;
        }
      }
    }
    if (targetFound) break;
  }

  const timeMs = +(performance.now() - t0).toFixed(3);

  if (!targetFound) {
    return {
      path: [],
      hops: 0,
      distance: Infinity,
      visited: visited.size,
      visitedOrder,
      timeMs,
      found: false
    };
  }

  const path = _reconstructPath(prev, src, dst);
  const distance = _computePathDistance(graph, path, false);

  return {
    path,
    hops: Math.max(0, path.length - 1),
    distance: +distance.toFixed(2),
    visited: visited.size,
    visitedOrder,
    timeMs,
    found: true
  };
}

// ===========================================================================
// 4. DEPTH-FIRST SEARCH (DFS) - Reachability & Connectivity
// ===========================================================================
/**
 * Iterative DFS using our custom Stack class.
 * Time:  O(|V| + |E|)
 * Space: O(|V|)
 *
 * @param {Graph}  graph
 * @param {string} src
 * @param {string} [dst=null] Optional target; stops when reached if supplied
 * @returns {{ path: string[], reachable: string[], visited: number, visitedOrder: string[], timeMs: number, found: boolean }}
 */
function dfs(graph, src, dst = null) {
  const t0 = performance.now();

  if (!graph || !graph.getNode(src)) {
    return { path: [], reachable: [], visited: 0, visitedOrder: [], timeMs: 0, found: false };
  }

  const visited = new Set();
  const visitedOrder = [];
  const reachable = [];
  const prev = new Map();
  const stack = new Stack();

  stack.push(src);
  let reachedTarget = (src === dst);

  while (!stack.isEmpty()) {
    const u = stack.pop();

    if (visited.has(u)) continue;
    visited.add(u);
    visitedOrder.push(u);
    reachable.push(u);

    if (dst && u === dst) {
      reachedTarget = true;
      break;
    }

    const neighbors = graph.getNeighbors(u, true);
    // Push neighbors in reverse order to explore first neighbor first
    for (let i = neighbors.length - 1; i >= 0; i--) {
      const v = neighbors[i].to;
      if (!visited.has(v)) {
        if (!prev.has(v)) {
          prev.set(v, u);
        }
        stack.push(v);
      }
    }
  }

  const timeMs = +(performance.now() - t0).toFixed(3);
  const path = (dst && reachedTarget) ? _reconstructPath(prev, src, dst) : [];
  const distance = path.length > 1 ? _computePathDistance(graph, path, false) : 0;

  return {
    path,
    distance: +distance.toFixed(2),
    reachable,
    visited: visited.size,
    visitedOrder,
    timeMs,
    found: dst ? reachedTarget : true
  };
}

// ===========================================================================
// 5. NEAREST FACILITY FINDER (Hospital, Police, Fire, Petrol)
// ===========================================================================
/**
 * Finds the nearest facility of a requested type using an early-exit Dijkstra traversal.
 * Also gathers the top 3 nearest facilities.
 *
 * Time:  O((|V| + |E|) log |V|)
 * Space: O(|V|)
 *
 * @param {Graph}   graph
 * @param {string}  src           Starting node ID
 * @param {string}  facilityType  'hospital' | 'police' | 'fire_station' | 'petrol_pump'
 * @param {boolean} [useTraffic=false]
 * @returns {{ nearest: {node: Object, path: string[], distance: number}|null, topThree: Array<{node: Object, path: string[], distance: number}>, visited: number, visitedOrder: string[], timeMs: number, found: boolean }}
 */
function findNearestFacility(graph, src, facilityType, useTraffic = false) {
  const t0 = performance.now();

  if (!graph || !graph.getNode(src)) {
    return { nearest: null, topThree: [], visited: 0, visitedOrder: [], timeMs: 0, found: false };
  }

  const dist = new Map();
  const prev = new Map();
  const visited = new Set();
  const visitedOrder = [];
  const pq = new MinHeap();
  const foundFacilities = [];

  for (const id of graph.getAllNodeIds()) {
    dist.set(id, Infinity);
  }
  dist.set(src, 0);
  pq.insert(0, src);

  while (!pq.isEmpty()) {
    const minItem = pq.extractMin();
    if (!minItem) break;
    const { key: currentDist, value: u } = minItem;

    if (visited.has(u)) continue;
    visited.add(u);
    visitedOrder.push(u);

    const node = graph.getNode(u);
    // If this node matches the facility type (and is not our starting point)
    if (u !== src && node && node.type === facilityType) {
      const path = _reconstructPath(prev, src, u);
      foundFacilities.push({
        node,
        path,
        distance: +currentDist.toFixed(2)
      });

      if (foundFacilities.length >= 3) {
        break; // Stop once we have top 3
      }
    }

    const neighbors = graph.getNeighbors(u, true);
    for (const edge of neighbors) {
      if (visited.has(edge.to)) continue;

      const weight = useTraffic ? (edge.weight * edge.traffic) : edge.weight;
      const alt = currentDist + weight;

      if (alt < dist.get(edge.to)) {
        dist.set(edge.to, alt);
        prev.set(edge.to, u);
        pq.decreaseKey(alt, edge.to);
      }
    }
  }

  const timeMs = +(performance.now() - t0).toFixed(3);

  if (foundFacilities.length === 0) {
    return {
      nearest: null,
      topThree: [],
      visited: visited.size,
      visitedOrder,
      timeMs,
      found: false
    };
  }

  return {
    nearest: foundFacilities[0],
    topThree: foundFacilities,
    visited: visited.size,
    visitedOrder,
    timeMs,
    found: true
  };
}

// ===========================================================================
// 6. ALTERNATE ROUTE FINDER
// ===========================================================================
/**
 * Find second-best route by temporarily removing edges of the primary route
 * one by one and selecting the shortest valid alternative route.
 *
 * Time:  O(k * (|V| + |E|) log |V|) where k = edges in best path
 * Space: O(|V|)
 *
 * @param {Graph}   graph
 * @param {string}  src
 * @param {string}  dst
 * @param {boolean} [useTraffic=false]
 * @returns {{ path: string[], distance: number, diffKm: number, primaryDist: number, visited: number, visitedOrder: string[], timeMs: number, found: boolean }}
 */
function findAlternateRoute(graph, src, dst, useTraffic = false) {
  const t0 = performance.now();

  const primary = dijkstra(graph, src, dst, useTraffic);
  if (!primary.found || primary.path.length < 2) {
    return {
      path: [],
      distance: Infinity,
      diffKm: 0,
      primaryDist: primary.distance || 0,
      visited: primary.visited,
      visitedOrder: primary.visitedOrder,
      timeMs: +(performance.now() - t0).toFixed(3),
      found: false
    };
  }

  let bestAltPath = null;
  let bestAltDist = Infinity;
  let totalVisited = primary.visited;
  let altVisitedOrder = [...primary.visitedOrder];

  const primaryKey = primary.path.join('-');

  // Iterate over consecutive edge pairs in the primary path
  for (let i = 0; i < primary.path.length - 1; i++) {
    const u = primary.path[i];
    const v = primary.path[i + 1];

    // Temporarily close road u-v
    graph.blockEdge(u, v);

    const candidate = dijkstra(graph, src, dst, useTraffic);
    totalVisited += candidate.visited;

    // Must be found, different from primary, and shorter than previous alternatives
    if (candidate.found && candidate.path.join('-') !== primaryKey) {
      if (candidate.distance < bestAltDist) {
        bestAltDist = candidate.distance;
        bestAltPath = candidate.path;
        altVisitedOrder = candidate.visitedOrder;
      }
    }

    // Reopen road u-v
    graph.unblockEdge(u, v);
  }

  const timeMs = +(performance.now() - t0).toFixed(3);

  if (!bestAltPath) {
    return {
      path: [],
      distance: Infinity,
      diffKm: 0,
      primaryDist: primary.distance,
      visited: totalVisited,
      visitedOrder: altVisitedOrder,
      timeMs,
      found: false
    };
  }

  return {
    path: bestAltPath,
    distance: +bestAltDist.toFixed(2),
    diffKm: +(bestAltDist - primary.distance).toFixed(2),
    primaryDist: primary.distance,
    visited: totalVisited,
    visitedOrder: altVisitedOrder,
    timeMs,
    found: true
  };
}

// ===========================================================================
// 7. MULTI-STOP ROUTE (Brute-Force Permutations for Small N)
// ===========================================================================
/**
 * Calculates optimal sequence to visit intermediate stops using brute-force TSP.
 * Optimal for up to 5 waypoints.
 *
 * Time:  O(k! * (|V| + |E|) log |V|)
 * Space: O(|V|)
 *
 * @param {Graph}    graph
 * @param {string}   src
 * @param {string[]} stops
 * @param {string}   [dst=null]
 * @param {boolean}  [useTraffic=false]
 * @returns {{ orderedStops: string[], totalDistance: number, fullPath: string[], segments: Array<{from: string, to: string, path: string[], distance: number}>, timeMs: number, found: boolean }}
 */
function multiStopRoute(graph, src, stops, dst = null, useTraffic = false) {
  const t0 = performance.now();

  const cleanStops = (stops || []).filter(s => s && s !== src && s !== dst);
  if (cleanStops.length === 0) {
    if (dst) {
      const direct = dijkstra(graph, src, dst, useTraffic);
      return {
        orderedStops: [src, dst],
        totalDistance: direct.distance,
        fullPath: direct.path,
        segments: [{ from: src, to: dst, path: direct.path, distance: direct.distance }],
        timeMs: +(performance.now() - t0).toFixed(3),
        found: direct.found
      };
    }
    return { orderedStops: [], totalDistance: 0, fullPath: [], segments: [], timeMs: 0, found: false };
  }

  const endPoint = dst || null;
  const allWaypoints = [src, ...cleanStops];
  if (endPoint) allWaypoints.push(endPoint);

  // Precompute pairwise shortest paths between all waypoints
  const pairPaths = new Map();
  const pairDists = new Map();

  for (let i = 0; i < allWaypoints.length; i++) {
    for (let j = 0; j < allWaypoints.length; j++) {
      if (i === j) continue;
      const u = allWaypoints[i];
      const v = allWaypoints[j];
      const key = `${u}->${v}`;

      const res = dijkstra(graph, u, v, useTraffic);
      if (res.found) {
        pairPaths.set(key, res.path);
        pairDists.set(key, res.distance);
      } else {
        pairPaths.set(key, []);
        pairDists.set(key, Infinity);
      }
    }
  }

  // Generate all permutations of intermediate stops
  const perms = _arrayPermutations(cleanStops);
  let bestOrder = null;
  let bestDist = Infinity;

  for (const perm of perms) {
    const sequence = [src, ...perm];
    if (endPoint) sequence.push(endPoint);

    let currentCost = 0;
    let possible = true;

    for (let i = 0; i < sequence.length - 1; i++) {
      const legDist = pairDists.get(`${sequence[i]}->${sequence[i + 1]}`);
      if (legDist === undefined || legDist === Infinity) {
        possible = false;
        break;
      }
      currentCost += legDist;
    }

    if (possible && currentCost < bestDist) {
      bestDist = currentCost;
      bestOrder = sequence;
    }
  }

  const timeMs = +(performance.now() - t0).toFixed(3);

  if (!bestOrder || bestDist === Infinity) {
    return {
      orderedStops: [],
      totalDistance: Infinity,
      fullPath: [],
      segments: [],
      timeMs,
      found: false
    };
  }

  // Assemble full path and individual leg segments
  const fullPath = [];
  const segments = [];

  for (let i = 0; i < bestOrder.length - 1; i++) {
    const legU = bestOrder[i];
    const legV = bestOrder[i + 1];
    const legPath = pairPaths.get(`${legU}->${legV}`) || [];
    const legDist = pairDists.get(`${legU}->${legV}`) || 0;

    segments.push({
      from: legU,
      to: legV,
      path: legPath,
      distance: +legDist.toFixed(2)
    });

    if (i === 0) {
      fullPath.push(...legPath);
    } else {
      // Avoid duplicate consecutive waypoint
      fullPath.push(...legPath.slice(1));
    }
  }

  return {
    orderedStops: bestOrder,
    totalDistance: +bestDist.toFixed(2),
    fullPath,
    segments,
    timeMs,
    found: true
  };
}

// ===========================================================================
// 8. GRAPH CONNECTIVITY CHECKER
// ===========================================================================
/**
 * Uses DFS to verify graph connectivity and detect disconnected components.
 * Time:  O(|V| + |E|)
 * Space: O(|V|)
 *
 * @param {Graph} graph
 * @returns {{ connected: boolean, totalNodes: number, reachableNodes: number, isolatedNodes: string[] }}
 */
function checkConnectivity(graph) {
  const nodeIds = graph.getAllNodeIds();
  if (nodeIds.length === 0) {
    return { connected: true, totalNodes: 0, reachableNodes: 0, isolatedNodes: [] };
  }

  const { reachable } = dfs(graph, nodeIds[0]);
  const reachableSet = new Set(reachable);
  const isolatedNodes = nodeIds.filter(id => !reachableSet.has(id));

  return {
    connected: isolatedNodes.length === 0,
    totalNodes: nodeIds.length,
    reachableNodes: reachable.length,
    isolatedNodes
  };
}

// ===========================================================================
// HELPER ROUTINES
// ===========================================================================

/**
 * Reconstruct path from predecessors map backwards from destination to source.
 * Time: O(|path|)
 * @private
 */
function _reconstructPath(prevMap, src, dst) {
  const path = [];
  let curr = dst;

  while (curr !== undefined) {
    path.unshift(curr);
    if (curr === src) break;
    curr = prevMap.get(curr);
  }

  if (path[0] !== src) return [];
  return path;
}

/**
 * Calculate total physical distance along a path.
 * @private
 */
function _computePathDistance(graph, path, useTraffic = false) {
  let sum = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const w = graph.getEdgeWeight(path[i], path[i + 1], useTraffic, false);
    if (w !== Infinity) sum += w;
  }
  return sum;
}

/**
 * Generate all permutations of an array.
 * @private
 */
function _arrayPermutations(arr) {
  if (arr.length <= 1) return [arr.slice()];
  const perms = [];
  for (let i = 0; i < arr.length; i++) {
    const current = arr[i];
    const remaining = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const sub of _arrayPermutations(remaining)) {
      perms.push([current, ...sub]);
    }
  }
  return perms;
}

// Export for browser environment
if (typeof window !== 'undefined') {
  window.dijkstra = dijkstra;
  window.astar = astar;
  window.bfs = bfs;
  window.dfs = dfs;
  window.findNearestFacility = findNearestFacility;
  window.findAlternateRoute = findAlternateRoute;
  window.multiStopRoute = multiStopRoute;
  window.checkConnectivity = checkConnectivity;
  window._reconstructPath = _reconstructPath;
  window._computePathDistance = _computePathDistance;
}

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    dijkstra,
    astar,
    bfs,
    dfs,
    findNearestFacility,
    findAlternateRoute,
    multiStopRoute,
    checkConnectivity
  };
}
