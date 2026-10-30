/**
 * graph.js - Adjacency List Graph Data Structure
 * ==============================================================
 * City Navigation & Route Finder System - DSA Major Project
 *
 * Custom Implementation:
 *   - Nodes stored in Map for O(1) lookup
 *   - Adjacency list representation using Map<NodeId, Array<Edge>>
 *   - Road closures (blocked edges) tracked via Set
 *   - Supports directed (one-way) and undirected roads
 *   - Custom iterator and serialization methods
 */

'use strict';

class Graph {
  constructor() {
    this.nodes = new Map();
    this.adjacencyList = new Map();
    this.closedEdges = new Set();
  }

  addNode(node) {
    if (!node || !node.id) return;
    this.nodes.set(node.id, {
      id: node.id,
      name: node.name || node.id,
      lat: typeof node.lat === 'number' ? node.lat : (typeof node.latitude === 'number' ? node.latitude : undefined),
      lng: typeof node.lng === 'number' ? node.lng : (typeof node.lon === 'number' ? node.lon : (typeof node.longitude === 'number' ? node.longitude : undefined)),
      x: typeof node.x === 'number' ? node.x : 0,
      y: typeof node.y === 'number' ? node.y : 0,
      type: node.type || 'junction'
    });

    if (!this.adjacencyList.has(node.id)) {
      this.adjacencyList.set(node.id, []);
    }
  }

  getNode(id) {
    return this.nodes.get(id);
  }

  getAllNodes() {
    return Array.from(this.nodes.values());
  }

  getAllNodeIds() {
    return Array.from(this.nodes.keys());
  }

  nodeCount() {
    return this.nodes.size;
  }

  _edgeKey(u, v) {
    return u + '|' + v;
  }

  _undirectedKey(u, v) {
    return u < v ? (u + '|' + v) : (v + '|' + u);
  }

  addEdge(u, v, weight, traffic = 1.0, oneway = false, meta = null) {
    if (!this.adjacencyList.has(u)) this.adjacencyList.set(u, []);
    if (!this.adjacencyList.has(v)) this.adjacencyList.set(v, []);

    // Remove existing edge between u and v if present
    const listU = this.adjacencyList.get(u);
    const existingIdxU = listU.findIndex(e => e.to === v);
    if (existingIdxU >= 0) listU.splice(existingIdxU, 1);

    listU.push({
      to: v,
      weight: Math.max(weight, 0.001),
      traffic: Math.max(traffic, 1.0),
      oneway: !!oneway,
      meta: meta || null
    });

    if (!oneway) {
      const listV = this.adjacencyList.get(v);
      const existingIdxV = listV.findIndex(e => e.to === u);
      if (existingIdxV >= 0) listV.splice(existingIdxV, 1);

      listV.push({
        to: u,
        weight: Math.max(weight, 0.001),
        traffic: Math.max(traffic, 1.0),
        oneway: false,
        meta: meta || null
      });
    }
  }

  getNeighbors(u, excludeBlocked = false) {
    const rawList = this.adjacencyList.get(u) || [];
    const result = [];

    for (const edge of rawList) {
      const v = edge.to;
      const key = this._undirectedKey(u, v);
      const isBlocked = this.closedEdges.has(key) || this.closedEdges.has(this._edgeKey(u, v));

      if (excludeBlocked && isBlocked) {
        continue;
      }

      result.push({
        node: v,
        to: v,
        weight: edge.weight,
        traffic: edge.traffic,
        effectiveWeight: edge.weight * edge.traffic,
        blocked: isBlocked,
        oneway: edge.oneway,
        meta: edge.meta
      });
    }

    return result;
  }

  getEdgeWeight(u, v, useTraffic = false, excludeBlocked = false) {
    const list = this.adjacencyList.get(u);
    if (!list) return Infinity;
    if (excludeBlocked && this.isEdgeBlocked(u, v)) return Infinity;
    for (const edge of list) {
      if (edge.to === v) {
        return useTraffic ? (edge.weight * edge.traffic) : edge.weight;
      }
    }
    return Infinity;
  }

  blockEdge(u, v) {
    const key = this._undirectedKey(u, v);
    this.closedEdges.add(key);
  }

  unblockEdge(u, v) {
    const key = this._undirectedKey(u, v);
    this.closedEdges.delete(key);
    this.closedEdges.delete(this._edgeKey(u, v));
    this.closedEdges.delete(this._edgeKey(v, u));
  }

  isEdgeBlocked(u, v) {
    return this.closedEdges.has(this._undirectedKey(u, v)) ||
           this.closedEdges.has(this._edgeKey(u, v)) ||
           this.closedEdges.has(this._edgeKey(v, u));
  }

  edgeCount() {
    let count = 0;
    const seen = new Set();
    for (const [u, edges] of this.adjacencyList.entries()) {
      for (const e of edges) {
        const key = e.oneway ? (u + '->' + e.to) : this._undirectedKey(u, e.to);
        if (!seen.has(key)) {
          seen.add(key);
          count++;
        }
      }
    }
    return count;
  }

  getAllEdges() {
    const edges = [];
    const seen = new Set();

    for (const [u, list] of this.adjacencyList.entries()) {
      for (const e of list) {
        const key = e.oneway ? (u + '->' + e.to) : this._undirectedKey(u, e.to);
        if (!seen.has(key)) {
          seen.add(key);
          edges.push({
            u,
            v: e.to,
            weight: e.weight,
            traffic: e.traffic,
            blocked: this.isEdgeBlocked(u, e.to),
            oneway: e.oneway,
            meta: e.meta
          });
        }
      }
    }

    return edges;
  }

  clear() {
    this.nodes.clear();
    this.adjacencyList.clear();
    this.closedEdges.clear();
  }

  static fromCityData(cityData) {
    const g = new Graph();
    if (!cityData) return g;

    // Ingest nodes
    if (cityData.nodes instanceof Map) {
      for (const node of cityData.nodes.values()) {
        g.addNode(node);
      }
    } else if (Array.isArray(cityData.nodes)) {
      for (const node of cityData.nodes) {
        g.addNode(node);
      }
    }

    // Ingest edges (supports both objects {u, v, weight, ...} and tuples [u, v, traffic/weight])
    if (Array.isArray(cityData.edges)) {
      for (const edge of cityData.edges) {
        if (Array.isArray(edge)) {
          const u = String(edge[0]);
          const v = String(edge[1]);
          const nU = g.getNode(u);
          const nV = g.getNode(v);
          let weight = 1.0;
          let traffic = Number(edge[2] || 1.0);

          if (nU && nV) {
            if (typeof nU.lat === 'number' && typeof nU.lng === 'number' && typeof nV.lat === 'number' && typeof nV.lng === 'number') {
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
          g.addEdge(u, v, Math.max(weight, 0.05), traffic, false, null);
        } else if (edge && typeof edge === 'object') {
          g.addEdge(
            edge.u,
            edge.v,
            edge.weight,
            edge.traffic || 1.0,
            !!edge.oneway,
            edge.meta || null
          );
        }
      }
    }

    return g;
  }
}

// Support both property access and method calls for nodeCount/edgeCount
Object.defineProperty(Graph.prototype, 'totalNodes', {
  get: function() { return this.nodeCount(); }
});
Object.defineProperty(Graph.prototype, 'totalEdges', {
  get: function() { return this.edgeCount(); }
});

// Expose globally for browser usage without bundlers
if (typeof window !== 'undefined') {
  window.Graph = Graph;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Graph;
}
