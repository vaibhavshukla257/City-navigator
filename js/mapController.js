'use strict';

/**
 * mapController.js — Leaflet map visualization controller for City Navigator DSA project.
 * Handles all map rendering: markers, routes, exploration animation, geocoding search,
 * geolocation, OSM/Overpass data loading, and road blocking.
 *
 * Depends on: Leaflet.js (window.L), osmService.js (window.osmService),
 *             graph.js, ui.js (window.cityUI), and window.loadNetworkData.
 */

(function () {

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  const DEFAULT_CENTER = [28.6328, 77.2197];
  const DEFAULT_ZOOM   = 14;

  const TILE_SERVERS = [
    {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      subdomains: ['a', 'b', 'c'],
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
    },
    {
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      subdomains: ['a', 'b', 'c', 'd'],
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, © <a href="https://carto.com/attributions">CARTO</a>'
    }
  ];
  const TILE_URL = TILE_SERVERS[0].url;
  const ATTRIBUTION = TILE_SERVERS[0].attribution;

  const NODE_TYPE_CONFIG = {
    hospital:        { color: '#DC2626', emoji: '🏥' },
    police:          { color: '#2563EB', emoji: '🚔' },
    fire_station:    { color: '#EA580C', emoji: '🚒' },
    petrol_pump:     { color: '#0891B2', emoji: '⛽' },
    school:          { color: '#7C3AED', emoji: '🏫' },
    mall:            { color: '#DB2777', emoji: '🏪' },
    park:            { color: '#16A34A', emoji: '🌳' },
    railway_station: { color: '#CA8A04', emoji: '🚉' },
    junction:        { color: '#64756F', emoji: '●' },
  };

  const PRIMARY_ROUTE_COLOR   = '#159B72';
  const ALT_ROUTE_COLOR       = '#E9A23B';
  const EDGE_BASE_COLOR       = '#B8C8C0';
  const EDGE_BLOCKED_COLOR    = '#E45B55';
  const SEARCH_DEBOUNCE_MS    = 500;
  const NODE_CLICK_RADIUS_PX  = 60;

  // ---------------------------------------------------------------------------
  // No-op fallback when Leaflet is absent
  // ---------------------------------------------------------------------------

  function buildNoOpController() {
    const noop = () => {};
    const noopPromise = () => Promise.resolve();
    return {
      addMarker: noop, removeMarker: noop, clearMarkers: noop,
      drawRoute: noop, drawAlternateRoute: noop, clearRoutes: noop, clearAll: noop,
      fitBounds: noop, zoomIn: noop, zoomOut: noop, resetView: noop,
      animateExploration: noop,
      highlightSourceDest: noop,
      setBlockRoadMode: noop,
      flyTo: noop,
      showTemporaryMarker: noop,
      showExplorationStep: noop, clearExploration: noop,
      loadGraphData: noop,
      handleSearchInput: noop, showSearchResults: noop, hideSearchResults: noop,
      locateUser: noop,
      loadPresetCity: noopPromise, fetchVisibleArea: noopPromise,
      _loadOverpassData: noopPromise,
      showStatus: noop, hideStatus: noop,
      map: null, selectedSource: null, selectedDest: null,
    };
  }

  // ---------------------------------------------------------------------------
  // MapController class
  // ---------------------------------------------------------------------------

  class MapController {
    /**
     * @param {string} containerId  ID of the div that will host the Leaflet map.
     */
    constructor(containerId) {
      this.containerId = containerId;

      // State
      this.markers        = new Map();   // nodeId → L.marker
      this.routeLines     = [];          // primary route polylines
      this.altRouteLines  = [];          // alternate route polylines
      this.edgeLines      = new Map();   // 'u|v' → L.polyline  (road network)
      this.explorationCircles = [];      // pulsing circles per exploration step
      this.userMarker     = null;        // blue dot for geolocation
      this.tempMarkers    = [];          // ephemeral markers (search results)
      this.undoStack      = [];          // for block/unblock
      this._searchTimer   = null;

      // Map initialisation
      this.map            = null;
      this._defaultCenter = DEFAULT_CENTER;
      this._defaultZoom   = DEFAULT_ZOOM;

      if (!window.L) {
        console.warn('[MapController] Leaflet not loaded. Map features disabled.');
        this._showOfflineFallback(containerId);
        return;
      }

      this._initLeaflet(containerId);
      this._bindUIButtons();
      this._bindSearchInput();

      // Hide loading overlay once map is ready
      this._hideLoadingOverlay();

      // Traffic notice once
      console.info('[MapController] Traffic factor is road-classification-based, not live OSM data.');
    }

    // -------------------------------------------------------------------------
    // Map initialisation
    // -------------------------------------------------------------------------

    _initLeaflet(containerId) {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error(`[MapController] Container #${containerId} not found. Aborting map init.`);
        return;
      }

      this.map = L.map(containerId, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: false,       // hide default zoom buttons; we use custom ones
        attributionControl: true,
      });

      this.tileLayer = L.tileLayer(TILE_SERVERS[0].url, {
        attribution: TILE_SERVERS[0].attribution,
        maxZoom: 19,
        subdomains: TILE_SERVERS[0].subdomains
      }).addTo(this.map);

      let tileErrorCount = 0;
      let switchedToFallback = false;

      this.tileLayer.on('tileerror', () => {
        tileErrorCount++;
        // If 3 or more tiles fail to load, automatically failover to CARTO OSM mirror
        if (tileErrorCount >= 3 && !switchedToFallback && TILE_SERVERS.length > 1) {
          switchedToFallback = true;
          console.warn('[MapController] OSM standard tile server timed out. Automatically failing over to secondary mirror.');
          this.map.removeLayer(this.tileLayer);
          this.tileLayer = L.tileLayer(TILE_SERVERS[1].url, {
            attribution: TILE_SERVERS[1].attribution,
            maxZoom: 19,
            subdomains: TILE_SERVERS[1].subdomains
          }).addTo(this.map);
        }
      });

      // Map click handler
      this.map.on('click', (e) => this._onMapClick(e));
    }

    _showOfflineFallback(containerId) {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;height:100%;' +
        'background:#1a2b24;color:#8ab8a0;font-size:1rem;text-align:center;padding:2rem;">' +
        '<div><div style="font-size:3rem">🗺️</div>' +
        '<p>Leaflet.js not loaded.<br>Map features are unavailable in offline mode.</p></div></div>';
    }

    _hideLoadingOverlay() {
      const overlay = document.getElementById('map-loading-overlay');
      if (overlay) overlay.style.display = 'none';
    }

    _showLoadingOverlay(msg) {
      const overlay = document.getElementById('map-loading-overlay');
      if (!overlay) return;
      overlay.style.display = 'flex';
      const txt = overlay.querySelector('[data-loading-text]') ||
                  overlay.querySelector('p') ||
                  overlay.querySelector('span');
      if (txt && msg) txt.textContent = msg;
    }

    // -------------------------------------------------------------------------
    // Marker helpers
    // -------------------------------------------------------------------------

    _buildDivIcon(type, label, size) {
      const cfg   = NODE_TYPE_CONFIG[type] || NODE_TYPE_CONFIG['junction'];
      const sz    = size || 28;
      const inner = label || cfg.emoji;
      const html  =
        `<div style="width:${sz}px;height:${sz}px;border-radius:50%;` +
        `background:${cfg.color};display:flex;align-items:center;justify-content:center;` +
        `color:#fff;font-size:${Math.max(10, sz * 0.45)}px;box-shadow:0 2px 6px rgba(0,0,0,0.4);` +
        `border:2px solid rgba(255,255,255,0.7);cursor:pointer;">${inner}</div>`;
      return L.divIcon({ html, className: '', iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2] });
    }

    _buildSourceIcon() {
      const html =
        `<div style="width:36px;height:36px;border-radius:50%;background:#16A34A;` +
        `display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;` +
        `font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.5);border:3px solid #fff;">S</div>`;
      return L.divIcon({ html, className: '', iconSize: [36, 36], iconAnchor: [18, 18] });
    }

    _buildDestIcon() {
      const html =
        `<div style="width:36px;height:36px;border-radius:50%;background:#DC2626;` +
        `display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;` +
        `font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.5);border:3px solid #fff;">D</div>`;
      return L.divIcon({ html, className: '', iconSize: [36, 36], iconAnchor: [18, 18] });
    }

    /**
     * Add a node marker to the map.
     * @param {string|number} nodeId
     * @param {number} lat
     * @param {number} lng
     * @param {string} type
     * @param {string} label
     */
    addMarker(nodeId, lat, lng, type, label) {
      if (!this.map) return;
      if (this.markers.has(nodeId)) this.removeMarker(nodeId);

      const icon   = this._buildDivIcon(type, null, type === 'junction' ? 14 : 24);
      const marker = L.marker([lat, lng], { icon, title: label || String(nodeId) })
        .addTo(this.map);

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        this._onNodeClick(nodeId);
      });

      this.markers.set(nodeId, marker);
    }

    /** Remove a single marker by nodeId. */
    removeMarker(nodeId) {
      const m = this.markers.get(nodeId);
      if (m && this.map) { this.map.removeLayer(m); }
      this.markers.delete(nodeId);
    }

    /** Remove all node markers. */
    clearMarkers() {
      this.markers.forEach((m) => { if (this.map) this.map.removeLayer(m); });
      this.markers.clear();
    }

    /** Update edge polyline styles to match graph.isEdgeBlocked states. */
    refreshEdgeStyles() {
      const graph = window.cityGraph;
      if (!graph || !this.map) return;
      this.edgeLines.forEach((line) => {
        if (line._edgeU && line._edgeV) {
          const blocked = typeof graph.isEdgeBlocked === 'function'
            ? graph.isEdgeBlocked(line._edgeU, line._edgeV)
            : false;
          line.setStyle({ color: blocked ? EDGE_BLOCKED_COLOR : EDGE_BASE_COLOR });
        }
      });
    }

    /** Update a specific marker icon (e.g. source/dest highlight). */
    _refreshSpecialMarkers() {
      if (!window.cityUI) return;
      const src  = window.cityUI.selectedSource;
      const dest = window.cityUI.selectedDest;
      const graph = window.cityGraph;

      this.markers.forEach((marker, nodeId) => {
        if (nodeId === src) {
          marker.setIcon(this._buildSourceIcon());
        } else if (nodeId === dest) {
          marker.setIcon(this._buildDestIcon());
        } else {
          const node = graph && typeof graph.getNode === 'function' ? graph.getNode(nodeId) : null;
          const type = node ? (node.type || 'junction') : 'junction';
          marker.setIcon(this._buildDivIcon(type, null, type === 'junction' ? 14 : 24));
        }
      });
    }

    // -------------------------------------------------------------------------
    // Route drawing
    // -------------------------------------------------------------------------

    /**
     * Draw a route polyline from an ordered list of node IDs.
     * Uses edge meta.geometry when available, otherwise straight lines.
     *
     * @param {Array} pathNodeIds   Ordered array of node IDs.
     * @param {object} graphInstance  Graph instance.
     * @param {string} color        Hex color string.
     * @param {boolean} isDashed    Whether to use dash pattern.
     * @returns {L.polyline|null}
     */
    drawRoute(pathNodeIds, graphInstance, color, isDashed) {
      if (!this.map || !pathNodeIds || pathNodeIds.length < 2) return null;

      // Clear existing primary route lines before drawing the new route
      if (!isDashed) {
        this.routeLines.forEach((l) => { if (this.map) this.map.removeLayer(l); });
        this.routeLines = [];
      } else {
        this.altRouteLines.forEach((l) => { if (this.map) this.map.removeLayer(l); });
        this.altRouteLines = [];
      }

      color    = color    || PRIMARY_ROUTE_COLOR;
      isDashed = isDashed || false;

      const latLngs = this._buildRouteLatLngs(pathNodeIds, graphInstance);
      if (latLngs.length < 2) return null;

      const options = {
        color,
        weight: 4,
        opacity: 0.9,
        lineJoin: 'round',
        lineCap: 'round',
      };
      if (isDashed) {
        options.dashArray = '10,8';
        options.weight    = 3;
      }

      const line = L.polyline(latLngs, options).addTo(this.map);
      if (isDashed) {
        this.altRouteLines.push(line);
      } else {
        this.routeLines.push(line);
      }
      return line;
    }

    /**
     * Draw an alternate route in warning (amber) color.
     */
    drawAlternateRoute(pathNodeIds, graphInstance) {
      return this.drawRoute(pathNodeIds, graphInstance, ALT_ROUTE_COLOR, true);
    }

    /**
     * Build LatLng array for route, using geometry metadata when available.
     */
    _buildRouteLatLngs(pathNodeIds, graphInstance) {
      const latLngs = [];

      for (let i = 0; i < pathNodeIds.length - 1; i++) {
        const u = pathNodeIds[i];
        const v = pathNodeIds[i + 1];

        // Try to find edge with geometry
        const edge = this._findEdge(u, v, graphInstance);
        if (edge && edge.meta && Array.isArray(edge.meta.geometry) && edge.meta.geometry.length > 0) {
          edge.meta.geometry.forEach((pt) => {
            latLngs.push(L.latLng(pt[0], pt[1]));
          });
        } else {
          // Fallback: straight line
          const nodeU = graphInstance.getNode(u);
          const nodeV = graphInstance.getNode(v);
          if (nodeU) latLngs.push(L.latLng(nodeU.lat || nodeU.y, nodeU.lng || nodeU.x));
          if (nodeV) latLngs.push(L.latLng(nodeV.lat || nodeV.y, nodeV.lng || nodeV.x));
        }
      }

      // Deduplicate consecutive identical points
      const deduped = [];
      for (let i = 0; i < latLngs.length; i++) {
        if (i === 0 || latLngs[i].lat !== latLngs[i - 1].lat || latLngs[i].lng !== latLngs[i - 1].lng) {
          deduped.push(latLngs[i]);
        }
      }
      return deduped;
    }

    /** Find edge (u→v) or (v→u if bidirectional) in graphInstance. */
    _findEdge(u, v, graphInstance) {
      if (!graphInstance) return null;
      const edges = graphInstance.getAllEdges();
      for (const e of edges) {
        if ((e.u === u && e.v === v) || (!e.oneway && e.u === v && e.v === u)) return e;
      }
      return null;
    }

    /** Remove all primary route lines. */
    clearRoutes() {
      this.routeLines.forEach((l) => { if (this.map) this.map.removeLayer(l); });
      this.routeLines = [];
      this.altRouteLines.forEach((l) => { if (this.map) this.map.removeLayer(l); });
      this.altRouteLines = [];
    }

    /** Clear everything: markers + routes + exploration circles + temp markers. */
    clearAll() {
      this.clearMarkers();
      this.clearRoutes();
      this.clearExploration();
      this._clearEdgeLines();
      this._clearTempMarkers();
    }

    // -------------------------------------------------------------------------
    // Map controls
    // -------------------------------------------------------------------------

    /** Auto-zoom to fit all given node IDs. */
    fitBounds(nodeIds, graphInstance) {
      if (!this.map) return;
      graphInstance = graphInstance || window.cityGraph;
      const nodes   = nodeIds
        ? nodeIds.map((id) => graphInstance && graphInstance.getNode(id)).filter(Boolean)
        : (graphInstance ? graphInstance.getAllNodes() : []);

      if (nodes.length === 0) return;

      const latLngs = nodes.map((n) => [n.lat || n.y, n.lng || n.x]);
      try {
        this.map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40], maxZoom: 17 });
      } catch (_) { /* ignore invalid bounds */ }
    }

    zoomIn()    { if (this.map) this.map.zoomIn(); }
    zoomOut()   { if (this.map) this.map.zoomOut(); }
    resetView() { if (this.map) this.map.setView(this._defaultCenter, this._defaultZoom); }

    // -------------------------------------------------------------------------
    // Exploration animation
    // -------------------------------------------------------------------------

    /**
     * Show a pulsing circle at the explored node.
     * @param {string|number} nodeId
     * @param {object} graphInstance
     * @param {number} stepIndex  Used to vary radius slightly for visual depth.
     */
    showExplorationStep(nodeId, graphInstance, stepIndex) {
      if (!this.map) return;
      graphInstance = graphInstance || window.cityGraph;
      const node    = graphInstance && graphInstance.getNode(nodeId);
      if (!node) return;

      const lat = node.lat || node.y;
      const lng = node.lng || node.x;

      const circle = L.circleMarker([lat, lng], {
        radius:      8 + (stepIndex % 3),
        color:       '#159B72',
        fillColor:   '#159B72',
        fillOpacity: 0.25,
        weight:      2,
        opacity:     0.7,
      }).addTo(this.map);

      this.explorationCircles.push(circle);
    }

    /** Remove all exploration circles. */
    clearExploration() {
      if (this._animTimer) {
        clearInterval(this._animTimer);
        this._animTimer = null;
      }
      this.explorationCircles.forEach((c) => { if (this.map) this.map.removeLayer(c); });
      this.explorationCircles = [];
    }

    /**
     * Animate frontier exploration sequentially step-by-step.
     * @param {Array<string>} visitedOrder
     * @param {object} graphInstance
     * @param {number} delayMs
     */
    animateExploration(visitedOrder, graphInstance, delayMs = 35) {
      this.clearExploration();
      if (!visitedOrder || visitedOrder.length === 0 || !this.map) return;

      let idx = 0;
      this._animTimer = setInterval(() => {
        if (idx >= visitedOrder.length) {
          clearInterval(this._animTimer);
          this._animTimer = null;
          return;
        }
        this.showExplorationStep(visitedOrder[idx], graphInstance, idx);
        idx++;
      }, Math.max(delayMs, 10));
    }

    /**
     * Explicitly update and highlight source & destination markers.
     * @param {string|null} srcId
     * @param {string|null} destId
     */
    highlightSourceDest(srcId, destId) {
      this._refreshSpecialMarkers();
    }

    /**
     * Toggle or set road closure mode.
     * @param {boolean} active
     */
    setBlockRoadMode(active) {
      if (window.cityUI) {
        window.cityUI.blockRoadMode = !!active;
      }
    }

    /**
     * Pan & zoom map to coordinates.
     * @param {number} lat
     * @param {number} lng
     * @param {number} zoom
     */
    flyTo(lat, lng, zoom = 16) {
      if (this.map && !isNaN(lat) && !isNaN(lng)) {
        this.map.flyTo([lat, lng], zoom, { duration: 1.2 });
      }
    }

    /**
     * Show a temporary marker (e.g. from geocoding search result).
     * @param {number} lat
     * @param {number} lng
     * @param {string} label
     * @param {string} category
     */
    showTemporaryMarker(lat, lng, label = '', category = 'location') {
      if (!this.map || isNaN(lat) || isNaN(lng)) return;
      this._clearTempMarkers();

      const icon = L.divIcon({
        html: '<div style="width:22px;height:22px;border-radius:50%;background:#E9A23B;' +
              'border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;' +
              'align-items:center;justify-content:center;font-size:11px;color:#fff;">📍</div>',
        className: '',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const m = L.marker([lat, lng], { icon, title: label }).addTo(this.map);
      if (label) {
        m.bindPopup(`<strong>${label}</strong><br><small style="color:#64756F">${category}</small>`).openPopup();
      }
      this.tempMarkers.push(m);
    }

    // -------------------------------------------------------------------------
    // Graph data loading
    // -------------------------------------------------------------------------

    /**
     * Load all nodes from graphInstance onto the map as markers,
     * and draw the road network as light gray polylines.
     * @param {object} graphInstance
     */
    loadGraphData(graphInstance) {
      if (!this.map || !graphInstance) return;

      this.clearAll();

      const nodes = graphInstance.getAllNodes();
      nodes.forEach((node) => {
        const lat = node.lat || node.y;
        const lng = node.lng || node.x;
        if (lat == null || lng == null) return;
        this.addMarker(node.id, lat, lng, node.type || 'junction', node.name || String(node.id));
      });

      // Draw road edges as light gray background lines
      this._drawEdgeNetwork(graphInstance);

      // Auto-fit
      this.fitBounds(null, graphInstance);

      this.showStatus(`Loaded ${nodes.length} nodes`, 'success');
      setTimeout(() => this.hideStatus(), 3000);
    }

    /** Draw all graph edges as thin gray polylines (road network background). */
    _drawEdgeNetwork(graphInstance) {
      this._clearEdgeLines();
      if (!graphInstance) return;

      const edges = graphInstance.getAllEdges();
      const seen  = new Set();

      edges.forEach((edge) => {
        const key = `${edge.u}|${edge.v}`;
        const rev = `${edge.v}|${edge.u}`;
        if (seen.has(key) || seen.has(rev)) return;
        seen.add(key);

        const nodeU = graphInstance.getNode(edge.u);
        const nodeV = graphInstance.getNode(edge.v);
        if (!nodeU || !nodeV) return;

        let latLngs;
        if (edge.meta && Array.isArray(edge.meta.geometry) && edge.meta.geometry.length > 0) {
          latLngs = edge.meta.geometry.map((pt) => [pt[0], pt[1]]);
        } else {
          latLngs = [
            [nodeU.lat || nodeU.y, nodeU.lng || nodeU.x],
            [nodeV.lat || nodeV.y, nodeV.lng || nodeV.x],
          ];
        }

        const isBlocked = edge.blocked === true;
        const line = L.polyline(latLngs, {
          color:   isBlocked ? EDGE_BLOCKED_COLOR : EDGE_BASE_COLOR,
          weight:  2,
          opacity: 0.5,
        }).addTo(this.map);

        line._edgeKey = key;
        line._edgeU   = edge.u;
        line._edgeV   = edge.v;

        // Click on edge line for block-road mode
        line.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          this._onEdgeClick(edge.u, edge.v, line);
        });

        this.edgeLines.set(key, line);
      });
    }

    _clearEdgeLines() {
      this.edgeLines.forEach((l) => { if (this.map) this.map.removeLayer(l); });
      this.edgeLines.clear();
    }

    // -------------------------------------------------------------------------
    // Map click → node / edge selection
    // -------------------------------------------------------------------------

    _onMapClick(e) {
      if (!this.map) return;

      const isBlockMode = window.cityUI && window.cityUI.blockRoadMode;

      if (isBlockMode) {
        this._handleBlockModeClick(e);
      } else {
        this._handleNodeSelectionClick(e);
      }
    }

    _handleNodeSelectionClick(e) {
      const clickPt  = this.map.latLngToContainerPoint(e.latlng);
      let   bestId   = null;
      let   bestDist = Infinity;

      this.markers.forEach((marker, nodeId) => {
        const markerPt = this.map.latLngToContainerPoint(marker.getLatLng());
        const dx       = clickPt.x - markerPt.x;
        const dy       = clickPt.y - markerPt.y;
        const dist     = Math.sqrt(dx * dx + dy * dy);
        if (dist < bestDist) { bestDist = dist; bestId = nodeId; }
      });

      if (bestId !== null && bestDist <= NODE_CLICK_RADIUS_PX) {
        this._onNodeClick(bestId);
      }
    }

    _onNodeClick(nodeId) {
      if (!window.cityUI) return;

      if (!window.cityUI.selectedSource) {
        window.cityUI.setSource(nodeId);
      } else if (!window.cityUI.selectedDest) {
        window.cityUI.setDest(nodeId);
      } else {
        // Both set: update destination
        window.cityUI.setDest(nodeId);
      }

      this._refreshSpecialMarkers();
    }

    // -------------------------------------------------------------------------
    // Block-road mode
    // -------------------------------------------------------------------------

    _handleBlockModeClick(e) {
      const clickPt  = this.map.latLngToContainerPoint(e.latlng);
      let   bestLine = null;
      let   bestKey  = null;
      let   bestDist = Infinity;

      this.edgeLines.forEach((line, key) => {
        const latLngs = line.getLatLngs();
        // Check midpoint of each segment of the polyline
        for (let i = 0; i < latLngs.length - 1; i++) {
          const midLat   = (latLngs[i].lat + latLngs[i + 1].lat) / 2;
          const midLng   = (latLngs[i].lng + latLngs[i + 1].lng) / 2;
          const midPt    = this.map.latLngToContainerPoint([midLat, midLng]);
          const dx       = clickPt.x - midPt.x;
          const dy       = clickPt.y - midPt.y;
          const dist     = Math.sqrt(dx * dx + dy * dy);
          if (dist < bestDist) { bestDist = dist; bestLine = line; bestKey = key; }
        }
      });

      if (bestLine && bestDist <= NODE_CLICK_RADIUS_PX) {
        this._onEdgeClick(bestLine._edgeU, bestLine._edgeV, bestLine);
      }
    }

    _onEdgeClick(u, v, line) {
      const graph = window.cityGraph;
      if (!graph) return;

      // Find the edge and toggle its blocked state
      const edges = graph.getAllEdges();
      let   found = null;
      for (const e of edges) {
        if ((e.u === u && e.v === v) || (e.u === v && e.v === u)) { found = e; break; }
      }
      if (!found) return;

      const wasBlocked = found.blocked === true;
      if (wasBlocked) {
        if (typeof graph.unblockEdge === 'function') graph.unblockEdge(u, v);
        else found.blocked = false;
        line.setStyle({ color: EDGE_BASE_COLOR });
      } else {
        if (typeof graph.blockEdge === 'function') graph.blockEdge(u, v);
        else found.blocked = true;
        line.setStyle({ color: EDGE_BLOCKED_COLOR });
      }

      // Push to undo stack (custom Stack class with .push)
      if (window.cityUI && window.cityUI.undoStack) {
        if (typeof window.cityUI.undoStack.push === 'function') {
          window.cityUI.undoStack.push({ type: 'block', u, v, wasBlocked: !wasBlocked });
        } else if (Array.isArray(window.cityUI.undoStack)) {
          window.cityUI.undoStack.push({ type: 'block', u, v, wasBlocked: !wasBlocked });
        }
      }

      // Re-run algorithm if route exists
      if (window.cityUI && typeof window.cityUI.runAlgorithm === 'function') {
        if (window.cityUI.selectedSource && window.cityUI.selectedDest) {
          window.cityUI.runAlgorithm();
        }
      }
    }

    // -------------------------------------------------------------------------
    // Geocoding search
    // -------------------------------------------------------------------------

    /** Bind the search input to debounced geocoder. */
    _bindSearchInput() {
      const input    = document.getElementById('city-search-input');
      const dropdown = document.getElementById('city-search-dropdown');
      if (!input) return;

      input.addEventListener('input', (e) => {
        this.handleSearchInput(e.target.value.trim());
      });

      input.addEventListener('blur', () => {
        // Small delay so click on dropdown item fires first
        setTimeout(() => this.hideSearchResults(), 200);
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.hideSearchResults();
      });
    }

    /**
     * Debounced handler for search input changes.
     * @param {string} query
     */
    handleSearchInput(query) {
      clearTimeout(this._searchTimer);
      if (!query || query.length < 2) { this.hideSearchResults(); return; }

      this._searchTimer = setTimeout(async () => {
        if (!window.osmService || !window.osmService.geocoder) {
          this.showStatus('Geocoder not available', 'error');
          return;
        }
        try {
          this.showStatus('Searching…', 'loading');
          const results = await window.osmService.geocoder.search(query);
          this.hideStatus();
          this.showSearchResults(results || []);
        } catch (err) {
          this.hideStatus();
          this.showStatus('Search failed: ' + (err.message || err), 'error');
        }
      }, SEARCH_DEBOUNCE_MS);
    }

    /**
     * Render geocoder results into the dropdown.
     * @param {Array} results  Array of {id, name, displayName, lat, lng, category}
     */
    showSearchResults(results) {
      const dropdown = document.getElementById('city-search-dropdown');
      if (!dropdown) return;

      dropdown.innerHTML = '';
      if (!results || results.length === 0) {
        dropdown.innerHTML = '<div class="search-no-results" style="padding:0.75rem 1rem;color:#8ab8a0;font-size:0.85rem;">No results found</div>';
        dropdown.style.display = 'block';
        return;
      }

      results.forEach((r) => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.style.cssText =
          'padding:0.6rem 1rem;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.05);' +
          'font-size:0.875rem;color:#d4e8df;transition:background 0.15s;';
        item.textContent = r.displayName || r.name || 'Unknown';
        item.addEventListener('mouseenter', () => { item.style.background = 'rgba(21,155,114,0.15)'; });
        item.addEventListener('mouseleave', () => { item.style.background = ''; });
        item.addEventListener('mousedown', () => {
          this._onSearchResultClick(r);
        });
        dropdown.appendChild(item);
      });

      dropdown.style.display = 'block';
    }

    hideSearchResults() {
      const dropdown = document.getElementById('city-search-dropdown');
      if (dropdown) { dropdown.style.display = 'none'; dropdown.innerHTML = ''; }
    }

    _onSearchResultClick(result) {
      this.hideSearchResults();
      if (!this.map) return;

      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lng);
      if (isNaN(lat) || isNaN(lng)) return;

      this.map.flyTo([lat, lng], 16, { duration: 1.2 });

      // Add a temporary highlighted marker
      this._clearTempMarkers();
      const icon = L.divIcon({
        html: '<div style="width:20px;height:20px;border-radius:50%;background:#E9A23B;' +
              'border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>',
        className: '',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      const m = L.marker([lat, lng], { icon, title: result.name || '' }).addTo(this.map);
      this.tempMarkers.push(m);

      const input = document.getElementById('city-search-input');
      if (input) input.value = result.displayName || result.name || '';
    }

    _clearTempMarkers() {
      this.tempMarkers.forEach((m) => { if (this.map) this.map.removeLayer(m); });
      this.tempMarkers = [];
    }

    // -------------------------------------------------------------------------
    // Geolocation
    // -------------------------------------------------------------------------

    /** Ask for user's location (only on explicit button click). */
    locateUser() {
      if (!navigator.geolocation) {
        this.showStatus('Geolocation not supported by this browser', 'error');
        return;
      }

      this.showStatus('Requesting location…', 'loading');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.hideStatus();
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          if (this.map) this.map.flyTo([lat, lng], 15, { duration: 1.5 });
          this._placeUserMarker(lat, lng);
        },
        (err) => {
          let msg = 'Location unavailable';
          if (err.code === 1) msg = 'Location permission denied';
          else if (err.code === 2) msg = 'Location unavailable (no signal)';
          else if (err.code === 3) msg = 'Location request timed out';
          this.showStatus(msg, 'error');
          setTimeout(() => this.hideStatus(), 4000);
        },
        { timeout: 10000 }
      );
    }

    _placeUserMarker(lat, lng) {
      if (!this.map) return;
      if (this.userMarker) { this.map.removeLayer(this.userMarker); }

      const icon = L.divIcon({
        html: '<div style="width:16px;height:16px;border-radius:50%;background:#2563EB;' +
              'border:3px solid #fff;box-shadow:0 2px 8px rgba(37,99,235,0.6);"></div>',
        className: '',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      this.userMarker = L.marker([lat, lng], { icon, title: 'Your location' }).addTo(this.map);
    }

    // -------------------------------------------------------------------------
    // OSM / Overpass data loading
    // -------------------------------------------------------------------------

    /**
     * Load a preset city: center map, fetch Overpass, convert, push to graph.
     * @param {string} presetKey  Key in osmService.PRESET_CITIES.
     */
    async loadPresetCity(presetKey) {
      if (!window.osmService || !window.osmService.PRESET_CITIES) {
        this.showStatus('osmService not available', 'error');
        return;
      }

      const preset = window.osmService.PRESET_CITIES[presetKey];
      if (!preset) {
        this.showStatus(`Unknown preset city: ${presetKey}`, 'error');
        return;
      }

      // Center map on preset
      if (this.map) {
        this.map.setView([preset.lat, preset.lng], preset.zoom || DEFAULT_ZOOM);
      }
      this._defaultCenter = [preset.lat, preset.lng];
      this._defaultZoom   = preset.zoom || DEFAULT_ZOOM;

      await this._loadOverpassData(preset.bbox, preset.name);
    }

    /**
     * Fetch Overpass data for the currently visible map bounds.
     */
    async fetchVisibleArea() {
      if (!this.map) { this.showStatus('Map not initialised', 'error'); return; }

      const bounds = this.map.getBounds();
      const bbox = {
        south: bounds.getSouth(),
        west:  bounds.getWest(),
        north: bounds.getNorth(),
        east:  bounds.getEast(),
      };

      await this._loadOverpassData(bbox, 'Visible Area');
    }

    /**
     * Internal: fetch Overpass → convert → loadNetworkData → loadGraphData.
     * @param {object} bbox   {south, west, north, east}
     * @param {string} regionName
     */
    async _loadOverpassData(bbox, regionName) {
      if (!window.osmService) {
        this.showStatus('osmService not available', 'error');
        return;
      }

      this.showStatus('Fetching OSM data…', 'loading');
      this._showLoadingOverlay('Fetching OSM data…');

      try {
        const onProgress = (msg) => {
          this.showStatus(msg || 'Loading…', 'loading');
        };

        const rawData  = await window.osmService.downloader.fetchBoundingBox(bbox, onProgress);
        this.showStatus('Converting graph data…', 'loading');

        const converted = window.osmService.convertOverpassToGraphData(rawData, regionName || 'Area');

        if (typeof window.loadNetworkData === 'function') {
          window.loadNetworkData(converted, regionName || 'Area');
        }

        if (window.cityGraph) {
          this.loadGraphData(window.cityGraph);
        }

        this.showStatus(`Loaded ${regionName || 'area'}`, 'success');
        setTimeout(() => this.hideStatus(), 4000);
      } catch (err) {
        console.error('[MapController] Overpass fetch error:', err);
        this.showStatus('Overpass API unavailable — internet required', 'error');
      } finally {
        this._hideLoadingOverlay();
      }
    }

    // -------------------------------------------------------------------------
    // Status display
    // -------------------------------------------------------------------------

    /**
     * Show a status message.
     * @param {string} msg
     * @param {'info'|'success'|'error'|'loading'} type
     */
    showStatus(msg, type) {
      // Try to find a status bar element (multiple possible IDs)
      const el = document.getElementById('map-status') ||
                 document.getElementById('status-bar') ||
                 document.getElementById('status-message');

      if (!el) {
        // Fallback: console
        const prefix = { info: 'ℹ️', success: '✅', error: '❌', loading: '⏳' }[type] || '•';
        console.info(`[MapController] ${prefix} ${msg}`);
        return;
      }

      el.textContent = msg;
      el.className   = `status-${type || 'info'}`;
      el.style.display = 'block';
    }

    hideStatus() {
      const el = document.getElementById('map-status') ||
                 document.getElementById('status-bar') ||
                 document.getElementById('status-message');
      if (el) el.style.display = 'none';
    }

    // -------------------------------------------------------------------------
    // UI button bindings
    // -------------------------------------------------------------------------

    _bindUIButtons() {
      // My Location button
      const btnLoc = document.getElementById('btn-my-location');
      if (btnLoc) btnLoc.addEventListener('click', () => this.locateUser());

      // Preset city load button
      const btnPreset  = document.getElementById('btn-load-preset');
      const selPreset  = document.getElementById('preset-city-select');
      if (btnPreset && selPreset) {
        btnPreset.addEventListener('click', () => {
          const key = selPreset.value;
          if (key) this.loadPresetCity(key);
        });
      }

      // Fetch visible area button
      const btnFetch = document.getElementById('btn-fetch-visible-area');
      if (btnFetch) btnFetch.addEventListener('click', () => this.fetchVisibleArea());
    }

  } // end class MapController

  // ---------------------------------------------------------------------------
  // Bootstrap: create global instance
  // ---------------------------------------------------------------------------

  // Guard: if Leaflet absent, expose a no-op controller
  if (!window.L) {
    console.warn('[MapController] Leaflet (window.L) not available. Exposing no-op controller.');
    window.mapController = buildNoOpController();
  } else {
    window.mapController = new MapController('map-container');
  }

})();
