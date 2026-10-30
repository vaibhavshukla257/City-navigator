/**
 * ui.js - Interactive HTML5 Canvas Map & Event Controller
 * ==============================================================
 * City Navigation & Route Finder System - DSA Major Project
 *
 * Responsibilities:
 *   1. Hardware-accelerated 2D Canvas rendering with HiDPI crispness on a clean light map.
 *   2. Responsive zoom in/out, pan, and coordinate projection.
 *   3. Color-coded traffic edges (Free, Moderate, Heavy) & Blocked Road simulation.
 *   4. Step-by-step exploration animation for Dijkstra vs A* frontier comparison.
 *   5. Animated marching dash lines for active routes in vibrant emerald.
 *   6. Node & road hover tooltips with distance and traffic metrics.
 *   7. Interactive node selection, search filtering, and road closure toggles.
 *   8. Undo history for road closures using custom Stack data structure.
 *   9. Compact horizontal results panel with breadcrumb route chips.
 */

'use strict';

class CityUI {
  /**
   * @param {Graph} graph
   * @param {HTMLCanvasElement} canvas
   */
  constructor(graph, canvas) {
    this.graph = graph;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Navigation & Routing State
    this.selectedSource = null;
    this.selectedDest   = null;
    this.currentAlgo    = 'dijkstra';
    this.useTraffic     = false;
    this.blockRoadMode  = false;
    this.multiStopMode  = false;
    this.multiStops     = []; // Array of intermediate node IDs

    // Undo History Stack for Road Closures
    this.undoStack = new Stack();

    // Active Path & Visual State
    this.activePath     = []; // Node IDs in primary route
    this.alternatePath  = []; // Node IDs in secondary route
    this.visitedOrder   = []; // Nodes in order of exploration for animation
    this.animStep       = 0;  // Current step in exploration animation
    this.animTimer      = null;
    this.animationSpeed = 40; // Milliseconds per step
    this.rafId          = null;

    // Hover detection
    this.hoveredNode    = null;
    this.hoveredEdge    = null;
    this.edgeMidpoints  = [];

    // Scaling & Viewport Transform
    this.baseScale   = 1;
    this.baseOffsetX = 0;
    this.baseOffsetY = 0;
    this.userScale   = 1.0;
    this.userPanX    = 0;
    this.userPanY    = 0;
    this.canvasWidth = 1000;
    this.canvasHeight = 650;

    // Pan state
    this.isPanning   = false;
    this.panStartX   = 0;
    this.panStartY   = 0;
    this.hasDragged  = false;

    // Initialize canvas sizing, listeners, and first draw
    this._initCanvas();
    this._bindEvents();
    this.redraw();
  }

  // =========================================================================
  // Canvas Setup & HiDPI Resizing
  // =========================================================================

  _initCanvas() {
    this.resizeCanvas();
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      this.redraw();
    });
  }

  resizeCanvas() {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const dpr = window.devicePixelRatio || 1;
    const width = parent.clientWidth;
    const height = parent.clientHeight;

    this.canvasWidth = width;
    this.canvasHeight = height;

    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    // Compute bounding box dynamically from loaded nodes
    let minX = 0, maxX = 1000, minY = 0, maxY = 650;
    const allNodes = (this.graph && typeof this.graph.getAllNodes === 'function') ? this.graph.getAllNodes() : [];
    if (allNodes.length > 0) {
      minX = Math.min(...allNodes.map(n => n.x));
      maxX = Math.max(...allNodes.map(n => n.x));
      minY = Math.min(...allNodes.map(n => n.y));
      maxY = Math.max(...allNodes.map(n => n.y));
    }
    const dataW = Math.max(maxX - minX + 100, 320);
    const dataH = Math.max(maxY - minY + 100, 320);
    const scaleX = width / dataW;
    const scaleY = height / dataH;
    this.baseScale = Math.min(scaleX, scaleY) * 0.90;
    this.baseOffsetX = (width - dataW * this.baseScale) / 2 - (minX - 50) * this.baseScale;
    this.baseOffsetY = (height - dataH * this.baseScale) / 2 - (minY - 50) * this.baseScale;
  }

  /**
   * Set and re-bind new Graph model into canvas UI
   * @param {Graph} newGraph
   */
  setGraph(newGraph) {
    this._stopAnimation();
    this.graph = newGraph;
    this.selectedSource = null;
    this.selectedDest   = null;
    this.activePath     = [];
    this.alternatePath  = [];
    this.visitedOrder   = [];
    this.animStep       = 0;
    this.multiStops     = [];
    this.undoStack      = new Stack();
    this.userScale      = 1.0;
    this.userPanX       = 0;
    this.userPanY       = 0;
    this.resizeCanvas();
    this.redraw();
  }

  /**
   * Convert dataset coordinates (x, y) to screen coordinates including user pan & zoom
   */
  _toScreen(x, y) {
    const bx = x * this.baseScale + this.baseOffsetX;
    const by = y * this.baseScale + this.baseOffsetY;

    // Zoom centered around canvas midpoint
    const cx = this.canvasWidth / 2;
    const cy = this.canvasHeight / 2;

    return {
      x: (bx - cx) * this.userScale + cx + this.userPanX,
      y: (by - cy) * this.userScale + cy + this.userPanY
    };
  }

  /**
   * Convert screen coordinates back to dataset coordinates
   */
  _toWorld(sx, sy) {
    const cx = this.canvasWidth / 2;
    const cy = this.canvasHeight / 2;

    const unpannedX = (sx - cx - this.userPanX) / this.userScale + cx;
    const unpannedY = (sy - cy - this.userPanY) / this.userScale + cy;

    return {
      x: (unpannedX - this.baseOffsetX) / this.baseScale,
      y: (unpannedY - this.baseOffsetY) / this.baseScale
    };
  }

  // =========================================================================
  // Zoom & Pan API
  // =========================================================================

  zoomIn() {
    this.userScale = Math.min(this.userScale * 1.25, 4.0);
    this.redraw();
  }

  zoomOut() {
    this.userScale = Math.max(this.userScale / 1.25, 0.5);
    this.redraw();
  }

  resetView() {
    this.userScale = 1.0;
    this.userPanX  = 0;
    this.userPanY  = 0;
    this.redraw();
    this._updateStatusBar('Map view reset to default.');
  }

  // =========================================================================
  // Public Selection Setters
  // =========================================================================

  setSource(nodeId) {
    this.selectedSource = nodeId || null;
    const sel = document.getElementById('source-select');
    if (sel && sel.value !== nodeId) sel.value = nodeId || '';
    this._updateStatusBar(`Source location: ${this._getNodeName(nodeId)}`);
    this.redraw();
  }

  setDest(nodeId) {
    this.selectedDest = nodeId || null;
    const sel = document.getElementById('dest-select');
    if (sel && sel.value !== nodeId) sel.value = nodeId || '';
    this._updateStatusBar(`Destination location: ${this._getNodeName(nodeId)}`);
    this.redraw();
  }

  clear() {
    this._stopAnimation();
    this.selectedSource = null;
    this.selectedDest   = null;
    this.activePath     = [];
    this.alternatePath  = [];
    this.visitedOrder   = [];
    this.animStep       = 0;
    this.multiStops     = [];

    const srcSel  = document.getElementById('source-select');
    const destSel = document.getElementById('dest-select');
    if (srcSel)  srcSel.value = '';
    if (destSel) destSel.value = '';

    const panel = document.getElementById('results-panel');
    if (panel) {
      panel.innerHTML = `<div class="result-placeholder">No route calculated yet</div>`;
    }

    const badge = document.getElementById('results-algo-badge');
    if (badge) badge.textContent = '';

    this._updateStatusBar('Ready — route and selections cleared.');
    this.redraw();
  }

  // =========================================================================
  // Pathfinding Actions
  // =========================================================================

  runAlgorithm() {
    if (!this.graph || this.graph.nodeCount() === 0) {
      this._showError('No city data available. Please load a dataset first.');
      return;
    }

    if (!this.selectedSource || !this.selectedDest) {
      this._showError('Please select both a Source and a Destination.');
      return;
    }

    if (this.selectedSource === this.selectedDest) {
      this._showInfo('Source and Destination are identical (0.0 km). No travel needed.');
      this.activePath = [this.selectedSource];
      this.visitedOrder = [this.selectedSource];
      this.redraw();
      return;
    }

    this._stopAnimation();
    this.alternatePath = [];

    let result = null;
    const algo = this.currentAlgo;

    if (algo === 'dijkstra') {
      result = dijkstra(this.graph, this.selectedSource, this.selectedDest, this.useTraffic);
    } else if (algo === 'astar') {
      result = astar(this.graph, this.selectedSource, this.selectedDest, this.useTraffic);
    } else if (algo === 'bfs') {
      result = bfs(this.graph, this.selectedSource, this.selectedDest);
    } else if (algo === 'dfs') {
      result = dfs(this.graph, this.selectedSource, this.selectedDest);
    } else {
      result = dijkstra(this.graph, this.selectedSource, this.selectedDest, this.useTraffic);
    }

    if (!result.found || result.path.length === 0) {
      this._showError('No path found! Route is blocked or locations are disconnected.');
      this.activePath = [];
      this.visitedOrder = result.visitedOrder || [];
      this.redraw();
      return;
    }

    this.activePath   = result.path;
    this.visitedOrder = result.visitedOrder || [];

    // Render results telemetry
    this._renderResultsPanel(algo, result);

    // Start animated exploration
    this._animateExploration();
  }

  runAlternateRoute() {
    if (!this.graph || this.graph.nodeCount() === 0) {
      this._showError('No city data available. Please load a dataset first.');
      return;
    }

    if (!this.selectedSource || !this.selectedDest) {
      this._showError('Select Source and Destination first.');
      return;
    }

    this._stopAnimation();
    const result = findAlternateRoute(this.graph, this.selectedSource, this.selectedDest, this.useTraffic);

    if (!result.found) {
      this._showError('No viable alternate detour found around primary corridor.');
      return;
    }

    this.alternatePath = result.path;
    this.visitedOrder  = result.visitedOrder || [];

    const estTime = (result.distance / 35 * 60).toFixed(1);
    const panel = document.getElementById('results-panel');

    if (panel) {
      const chips = result.path.map((id, i) => {
        const isStart = i === 0;
        const isEnd = i === result.path.length - 1;
        const cls = isStart ? 'chip-start' : isEnd ? 'chip-dest' : 'chip-mid';
        return `<span class="route-chip ${cls}">${this._getNodeName(id)}</span>`;
      }).join('<span class="chip-arrow">➔</span>');

      panel.innerHTML = `
        <div class="stats-strip">
          <div class="stat-item">
            <span class="stat-label">Alt Distance</span>
            <span class="stat-val" style="color:var(--warning)">${result.distance} km</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-label">Detour Delta</span>
            <span class="stat-val">+${result.diffKm} km</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-label">Est. Time</span>
            <span class="stat-val">${estTime} min</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-label">Compute Time</span>
            <span class="stat-val">${result.timeMs} ms</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-label">Routing Mode</span>
            <span class="stat-val" style="color:var(--warning)">Alternate Bypass</span>
          </div>
        </div>
        <div class="route-breadcrumb-container">
          <div class="route-breadcrumb">${chips}</div>
        </div>
      `;
    }

    this._updateStatusBar(`Alternate route computed: ${result.distance} km (+${result.diffKm} km detour)`);
    this.redraw();
  }

  runNearestFacility(facilityType) {
    if (!this.graph || this.graph.nodeCount() === 0) {
      this._showError('No city data available. Please load a dataset first.');
      return;
    }

    if (!this.selectedSource) {
      this._showError('Please select a starting Source location on the map or dropdown first.');
      return;
    }

    this._stopAnimation();
    this.alternatePath = [];

    const result = findNearestFacility(this.graph, this.selectedSource, facilityType, this.useTraffic);

    if (!result.found || !result.nearest) {
      const typeLabel = (window.NODE_TYPE_LABELS || {})[facilityType] || facilityType;
      this._showError(`No ${typeLabel} is currently reachable from this location.`);
      return;
    }

    this.activePath   = result.nearest.path;
    this.visitedOrder = result.visitedOrder || [];
    this.selectedDest = result.nearest.node.id;

    // Sync dropdown
    const destSel = document.getElementById('dest-select');
    if (destSel) destSel.value = this.selectedDest;

    const typeLabel = (window.NODE_TYPE_LABELS || {})[facilityType] || facilityType;
    const estTime = (result.nearest.distance / 35 * 60).toFixed(1);

    const chips = result.nearest.path.map((id, i) => {
      const isStart = i === 0;
      const isEnd = i === result.nearest.path.length - 1;
      const cls = isStart ? 'chip-start' : isEnd ? 'chip-dest' : 'chip-mid';
      return `<span class="route-chip ${cls}">${this._getNodeName(id)}</span>`;
    }).join('<span class="chip-arrow">➔</span>');

    let top3Html = '';
    if (result.topThree && result.topThree.length > 1) {
      top3Html = `<div class="top3-strip">`;
      result.topThree.forEach((fac, i) => {
        top3Html += `<span class="top3-badge"><strong>#${i + 1}</strong> ${fac.node.name} (${fac.distance} km)</span>`;
      });
      top3Html += `</div>`;
    }

    const panel = document.getElementById('results-panel');
    if (panel) {
      panel.innerHTML = `
        <div class="stats-strip">
          <div class="stat-item">
            <span class="stat-label">Nearest ${typeLabel}</span>
            <span class="stat-val" style="color:var(--primary)">${result.nearest.node.name}</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-label">Distance</span>
            <span class="stat-val">${result.nearest.distance} km</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-label">Est. Time</span>
            <span class="stat-val">${estTime} min</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-label">Search Runtime</span>
            <span class="stat-val">${result.timeMs} ms</span>
          </div>
        </div>
        <div class="route-breadcrumb-container">
          <div class="route-breadcrumb">${chips}</div>
          ${top3Html}
        </div>
      `;
    }

    this._updateStatusBar(`Nearest ${typeLabel}: ${result.nearest.node.name} (${result.nearest.distance} km away)`);
    this._animateExploration();
  }

  runMultiStop() {
    if (!this.graph || this.graph.nodeCount() === 0) {
      this._showError('No city data available. Please load a dataset first.');
      return;
    }

    if (!this.selectedSource) {
      this._showError('Select a Source starting point first.');
      return;
    }

    if (this.multiStops.length === 0) {
      this._showError('Add at least one waypoint stop on the map.');
      return;
    }

    this._stopAnimation();
    this.alternatePath = [];

    const result = multiStopRoute(
      this.graph,
      this.selectedSource,
      this.multiStops,
      this.selectedDest || null,
      this.useTraffic
    );

    if (!result.found) {
      this._showError('Could not find connected route passing through all requested waypoints.');
      return;
    }

    this.activePath   = result.fullPath;
    this.visitedOrder = [];

    const estTime = (result.totalDistance / 35 * 60).toFixed(1);

    const chips = result.orderedStops.map((id, i) => {
      const isStart = i === 0;
      const isEnd = i === result.orderedStops.length - 1;
      const cls = isStart ? 'chip-start' : isEnd ? 'chip-dest' : 'chip-mid';
      return `<span class="route-chip ${cls}">Stop ${i + 1}: ${this._getNodeName(id)}</span>`;
    }).join('<span class="chip-arrow">➔</span>');

    const panel = document.getElementById('results-panel');
    if (panel) {
      panel.innerHTML = `
        <div class="stats-strip">
          <div class="stat-item">
            <span class="stat-label">Multi-Stop Dist</span>
            <span class="stat-val" style="color:var(--primary)">${result.totalDistance} km</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-label">Waypoints</span>
            <span class="stat-val">${result.orderedStops.length} stops</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-label">Total Est. Time</span>
            <span class="stat-val">${estTime} min</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-label">TSP Runtime</span>
            <span class="stat-val">${result.timeMs} ms</span>
          </div>
        </div>
        <div class="route-breadcrumb-container">
          <div class="route-breadcrumb">${chips}</div>
        </div>
      `;
    }

    this._updateStatusBar(`Multi-stop TSP route optimized (${result.totalDistance} km total)`);
    this.redraw();
  }

  undoLastBlock() {
    if (!this.undoStack || this.undoStack.isEmpty()) {
      this._updateStatusBar('Nothing to undo in road closure stack.');
      return;
    }

    const last = this.undoStack.pop();
    if (last.wasBlocked) {
      this.graph.blockEdge(last.u, last.v);
    } else {
      this.graph.unblockEdge(last.u, last.v);
    }

    this._updateStatusBar(`Undid road block: ${this._getNodeName(last.u)} ↔ ${this._getNodeName(last.v)}`);
    if (this.activePath.length > 0 && this.selectedSource && this.selectedDest) {
      this.runAlgorithm();
    } else {
      this.redraw();
    }
  }

  // =========================================================================
  // Canvas Rendering Loop (Premium Light Theme)
  // =========================================================================

  redraw() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const W = this.canvasWidth;
    const H = this.canvasHeight;

    ctx.clearRect(0, 0, W, H);

    // If graph has no nodes loaded, render clean empty state
    if (!this.graph || this.graph.nodeCount() === 0) {
      this._drawEmptyState(ctx, W, H);
      return;
    }

    // 1. Draw light map background and soft coordinates grid
    this._drawBackground(ctx, W, H);

    // 2. Draw roads (edges)
    this._drawEdges(ctx);

    // 3. Draw animated visited exploration nodes (subtle highlight)
    this._drawVisitedAnimation(ctx);

    // 4. Draw active route and alternate route
    this._drawActiveRoute(ctx);

    // 5. Draw city nodes and badges
    this._drawNodes(ctx);

    // 6. Smooth dash animation loop for active route
    if ((this.activePath.length > 1 || this.alternatePath.length > 1) && !this.rafId) {
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null;
        this.redraw();
      });
    }
  }

  _drawEmptyState(ctx, W, H) {
    // 1. Background grid
    this._drawBackground(ctx, W, H);

    // 2. Centered empty state card
    const cx = W / 2;
    const cy = H / 2;

    const cardW = Math.min(460, W - 40);
    const cardH = 220;
    const cardX = cx - cardW / 2;
    const cardY = cy - cardH / 2;

    ctx.save();
    // Card backdrop
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#DCE4E0';
    ctx.lineWidth = 1;
    ctx.shadowColor = 'rgba(23, 43, 42, 0.06)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 4;

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(cardX, cardY, cardW, cardH, 12);
    } else {
      ctx.rect(cardX, cardY, cardW, cardH);
    }
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();

    // Icon Circle
    const iconR = 26;
    const iconY = cardY + 46;
    ctx.beginPath();
    ctx.arc(cx, iconY, iconR, 0, Math.PI * 2);
    ctx.fillStyle = '#E7F5EF';
    ctx.fill();
    ctx.strokeStyle = '#159B72';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = '24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🗺️', cx, iconY);

    // Heading: "No city data available"
    ctx.font = 'bold 16px Inter, system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#172B2A';
    ctx.fillText('No city data available', cx, cardY + 104);

    // Subtitle
    ctx.font = '12.5px Inter, system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#64756F';
    ctx.fillText('Import a network JSON file or click "Load Sample Network"', cx, cardY + 132);
    ctx.fillText('to view locations, simulate road closures, and find routes.', cx, cardY + 152);

    // Status pill
    ctx.font = '600 11px Inter, system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#159B72';
    ctx.fillText('⚡ 100% Offline • Graph Adjacency List & MinHeap Engine', cx, cardY + 185);

    ctx.restore();
  }

  _drawBackground(ctx, W, H) {
    ctx.fillStyle = '#F4F7F3';
    ctx.fillRect(0, 0, W, H);

    // Subtle modern grid
    ctx.strokeStyle = '#E8EFEA';
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = 0; x < W; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }

  _drawEdges(ctx) {
    this.edgeMidpoints = [];
    const edges = this.graph.getAllEdges();

    for (const e of edges) {
      const u = this.graph.getNode(e.u);
      const v = this.graph.getNode(e.v);
      if (!u || !v) continue;

      const p1 = this._toScreen(u.x, u.y);
      const p2 = this._toScreen(v.x, v.y);
      const isBlocked = e.blocked;

      let strokeColor = '#D1DCD6';
      let lineWidth = 2.5;

      if (isBlocked) {
        strokeColor = '#E45B55'; // Danger Red
        lineWidth = 2.5;
      } else if (this.useTraffic) {
        if (e.traffic <= 1.2)      strokeColor = '#159B72'; // Free Flow (Primary Green)
        else if (e.traffic <= 1.8) strokeColor = '#E9A23B'; // Moderate Traffic (Warning Amber)
        else                       strokeColor = '#E45B55'; // Heavy Traffic (Danger Red)
        lineWidth = 3.0;
      }

      ctx.save();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';

      if (isBlocked) {
        ctx.setLineDash([7, 5]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Road midpoint marker if blocked
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;

      if (isBlocked) {
        ctx.fillStyle = '#E45B55';
        ctx.beginPath();
        ctx.arc(mx, my, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✕', mx, my);
      }

      ctx.restore();

      this.edgeMidpoints.push({
        u: e.u,
        v: e.v,
        screenX: mx,
        screenY: my,
        weight: e.weight,
        traffic: e.traffic,
        blocked: isBlocked
      });
    }
  }

  _drawVisitedAnimation(ctx) {
    if (!this.visitedOrder || this.visitedOrder.length === 0) return;
    const limit = Math.min(this.animStep, this.visitedOrder.length);

    ctx.save();
    for (let i = 0; i < limit; i++) {
      const node = this.graph.getNode(this.visitedOrder[i]);
      if (!node) continue;
      const p = this._toScreen(node.x, node.y);

      // Subtle light expansion ring
      ctx.beginPath();
      ctx.arc(p.x, p.y, 20 * this.userScale, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(21, 155, 114, 0.16)';
      ctx.fill();

      ctx.strokeStyle = 'rgba(21, 155, 114, 0.4)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawActiveRoute(ctx) {
    // Draw alternate route if present (amber dashed)
    if (this.alternatePath && this.alternatePath.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#E9A23B';
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.setLineDash([10, 6]);
      ctx.beginPath();
      for (let i = 0; i < this.alternatePath.length; i++) {
        const node = this.graph.getNode(this.alternatePath[i]);
        if (!node) continue;
        const p = this._toScreen(node.x, node.y);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Draw primary route (thick emerald #159B72 line with marching dashes)
    if (this.activePath && this.activePath.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#159B72';
      ctx.lineWidth = 5.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Marching dashes
      ctx.setLineDash([14, 8]);
      ctx.lineDashOffset = -(Date.now() / 45) % 22;

      ctx.beginPath();
      for (let i = 0; i < this.activePath.length; i++) {
        const node = this.graph.getNode(this.activePath[i]);
        if (!node) continue;
        const p = this._toScreen(node.x, node.y);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  _drawNodes(ctx) {
    const nodes = this.graph.getAllNodes();
    const colors = window.NODE_COLORS || {
      hospital: '#DC2626', police: '#2563EB', fire_station: '#EA580C',
      school: '#7C3AED', mall: '#DB2777', park: '#16A34A',
      railway_station: '#CA8A04', petrol_pump: '#0891B2',
      airport: '#D97706', landmark: '#9333EA', junction: '#64756F'
    };

    const icons = {
      junction: '•', hospital: '🏥', police: '🚔', fire_station: '🚒',
      school: '🏫', mall: '🏪', park: '🌳', railway_station: '🚂',
      petrol_pump: '⛽', airport: '✈', landmark: '📍'
    };

    for (const node of nodes) {
      const p = this._toScreen(node.x, node.y);
      const isSrc = (node.id === this.selectedSource);
      const isDst = (node.id === this.selectedDest);
      const stopIdx = this.multiStops.indexOf(node.id);
      const isStop = (stopIdx !== -1);
      const isHovered = (this.hoveredNode && this.hoveredNode.id === node.id);

      const r = isSrc || isDst ? 13 : isStop ? 11 : isHovered ? 11 : 9;

      // Glow ring for selected nodes
      if (isSrc || isDst || isStop) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 6, 0, Math.PI * 2);
        if (isSrc)      ctx.fillStyle = 'rgba(21, 155, 114, 0.25)';
        else if (isDst) ctx.fillStyle = 'rgba(228, 91, 85, 0.25)';
        else            ctx.fillStyle = 'rgba(124, 58, 237, 0.25)';
        ctx.fill();
        ctx.restore();
      }

      // Base Circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);

      let nodeColor = colors[node.type] || '#64756F';
      if (isSrc) nodeColor = '#159B72';
      if (isDst) nodeColor = '#E45B55';

      ctx.fillStyle = nodeColor;
      ctx.fill();

      // Crisp White Border
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Icon / emoji / stop number
      ctx.font = `${Math.round(r * 1.05)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (isStop) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px system-ui, sans-serif';
        ctx.fillText(`${stopIdx + 1}`, p.x, p.y);
      } else {
        const icon = icons[node.type] || '•';
        ctx.fillText(icon, p.x, p.y);
      }
      ctx.restore();

      // Text Labels
      const shouldLabel = isSrc || isDst || isStop || isHovered || node.type === 'hospital' || node.type === 'airport';
      if (shouldLabel) {
        ctx.save();
        ctx.font = '600 10px system-ui, -apple-system, sans-serif';
        let labelText = node.name;
        if (isSrc) labelText = `🚩 START: ${node.name}`;
        if (isDst) labelText = `🏁 END: ${node.name}`;

        const textW = ctx.measureText(labelText).width;

        // Label pill background
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#DCE4E0';
        ctx.lineWidth = 1;

        const pillX = p.x - textW / 2 - 6;
        const pillY = p.y + r + 3;
        const pillW = textW + 12;
        const pillH = 16;

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(pillX, pillY, pillW, pillH, 4);
        } else {
          ctx.rect(pillX, pillY, pillW, pillH);
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isSrc ? '#159B72' : isDst ? '#E45B55' : isStop ? '#7C3AED' : '#172B2A';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, p.x, pillY + pillH / 2);
        ctx.restore();
      }
    }
  }

  // =========================================================================
  // Animation Controller
  // =========================================================================

  _animateExploration() {
    this._stopAnimation();
    if (!this.visitedOrder || this.visitedOrder.length === 0) {
      this.redraw();
      return;
    }

    this.animStep = 0;
    const speed = this.animationSpeed;

    const tick = () => {
      this.animStep++;
      this.redraw();
      if (this.animStep < this.visitedOrder.length) {
        this.animTimer = setTimeout(tick, speed);
      } else {
        this.animTimer = null;
        this.redraw();
      }
    };

    tick();
  }

  _stopAnimation() {
    if (this.animTimer) {
      clearTimeout(this.animTimer);
      this.animTimer = null;
    }
  }

  // =========================================================================
  // Canvas Mouse & Interaction Events (with Pan & Zoom)
  // =========================================================================

  _bindEvents() {
    // Mouse interaction
    this.canvas.addEventListener('mousemove',  (e) => this._onMouseMove(e));
    this.canvas.addEventListener('mousedown',  (e) => this._onMouseDown(e));
    this.canvas.addEventListener('mouseup',    (e) => this._onMouseUp(e));
    this.canvas.addEventListener('click',      (e) => this._onClick(e));
    this.canvas.addEventListener('mouseleave', () => this._onMouseLeave());
    this.canvas.addEventListener('wheel',      (e) => this._onWheel(e), { passive: false });

    // Touch interaction for mobile/tablet
    this.canvas.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove',  (e) => this._onTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend',    (e) => this._onTouchEnd(e));
  }

  _onWheel(e) {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const newScale = Math.min(Math.max(this.userScale * zoomFactor, 0.5), 4.0);
    this.userScale = newScale;
    this.redraw();
  }

  _onMouseDown(e) {
    if (e.button === 0) { // Left click
      this.isPanning = true;
      this.hasDragged = false;
      this.panStartX = e.clientX - this.userPanX;
      this.panStartY = e.clientY - this.userPanY;
    }
  }

  _onMouseUp(e) {
    this.isPanning = false;
  }

  _onMouseMove(e) {
    if (this.isPanning) {
      const curX = e.clientX - this.panStartX;
      const curY = e.clientY - this.panStartY;
      if (Math.abs(curX - this.userPanX) > 3 || Math.abs(curY - this.userPanY) > 3) {
        this.hasDragged = true;
      }
      this.userPanX = curX;
      this.userPanY = curY;
      this.redraw();
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const tooltip = document.getElementById('map-tooltip');

    // 1. Check Node Hover
    let hoveredNode = null;
    for (const node of this.graph.getAllNodes()) {
      const p = this._toScreen(node.x, node.y);
      const distSq = (mx - p.x) ** 2 + (my - p.y) ** 2;
      if (distSq <= 169) { // 13px hit radius
        hoveredNode = node;
        break;
      }
    }

    if (hoveredNode) {
      this.hoveredNode = hoveredNode;
      this.hoveredEdge = null;
      if (tooltip) {
        const typeLabel = (window.NODE_TYPE_LABELS || {})[hoveredNode.type] || hoveredNode.type;
        tooltip.style.display = 'block';
        tooltip.style.left = `${e.clientX + 14}px`;
        tooltip.style.top  = `${e.clientY + 14}px`;
        tooltip.innerHTML = `
          <div class="tooltip-title">${hoveredNode.name}</div>
          <div class="tooltip-sub">${typeLabel} • Node ID: ${hoveredNode.id}</div>
          <div class="tooltip-stat">Location: (${Math.round(hoveredNode.x)}, ${Math.round(hoveredNode.y)})</div>
        `;
      }
      this.redraw();
      return;
    }

    // 2. Check Edge Midpoint Hover
    let hoveredEdge = null;
    for (const em of this.edgeMidpoints) {
      const distSq = (mx - em.screenX) ** 2 + (my - em.screenY) ** 2;
      if (distSq <= 144) { // 12px hit radius
        hoveredEdge = em;
        break;
      }
    }

    if (hoveredEdge) {
      this.hoveredEdge = hoveredEdge;
      this.hoveredNode = null;
      if (tooltip) {
        const uNode = this.graph.getNode(hoveredEdge.u);
        const vNode = this.graph.getNode(hoveredEdge.v);
        const statusText = hoveredEdge.blocked
          ? '<span style="color:#E45B55; font-weight:bold;">CLOSED / BLOCKED</span>'
          : '<span style="color:#159B72; font-weight:bold;">OPEN</span>';

        tooltip.style.display = 'block';
        tooltip.style.left = `${e.clientX + 14}px`;
        tooltip.style.top  = `${e.clientY + 14}px`;
        tooltip.innerHTML = `
          <div class="tooltip-title">${uNode ? uNode.name : hoveredEdge.u} ↔ ${vNode ? vNode.name : hoveredEdge.v}</div>
          <div class="tooltip-sub">Distance: ${hoveredEdge.weight} km • Traffic Factor: ${hoveredEdge.traffic}×</div>
          <div class="tooltip-stat">Status: ${statusText}</div>
        `;
      }
      this.redraw();
      return;
    }

    if (this.hoveredNode || this.hoveredEdge) {
      this.hoveredNode = null;
      this.hoveredEdge = null;
      this.redraw();
    }
    if (tooltip) tooltip.style.display = 'none';
  }

  _onMouseLeave() {
    this.isPanning = false;
    this.hoveredNode = null;
    this.hoveredEdge = null;
    const tooltip = document.getElementById('map-tooltip');
    if (tooltip) tooltip.style.display = 'none';
    this.redraw();
  }

  _onClick(e) {
    if (this.hasDragged) {
      this.hasDragged = false;
      return; // Ignore click after a pan drag
    }

    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Check if in Block Road Mode (edge click toggle)
    if (this.blockRoadMode) {
      for (const em of this.edgeMidpoints) {
        const distSq = (mx - em.screenX) ** 2 + (my - em.screenY) ** 2;
        if (distSq <= 196) {
          const wasBlocked = this.graph.isEdgeBlocked(em.u, em.v);
          const isNowBlocked = this.graph.toggleEdge(em.u, em.v);

          this.undoStack.push({ u: em.u, v: em.v, wasBlocked });
          const roadLabel = `${this._getNodeName(em.u)} ↔ ${this._getNodeName(em.v)}`;
          this._updateStatusBar(isNowBlocked ? `⛔ Closed road: ${roadLabel}` : `✅ Reopened road: ${roadLabel}`);

          if (this.activePath.length > 0 && this.selectedSource && this.selectedDest) {
            this.runAlgorithm();
          } else {
            this.redraw();
          }
          return;
        }
      }
    }

    // Check Node Clicks
    for (const node of this.graph.getAllNodes()) {
      const p = this._toScreen(node.x, node.y);
      const distSq = (mx - p.x) ** 2 + (my - p.y) ** 2;
      if (distSq <= 225) { // 15px hit radius
        if (this.multiStopMode) {
          const idx = this.multiStops.indexOf(node.id);
          if (idx !== -1) {
            this.multiStops.splice(idx, 1);
            this._updateStatusBar(`Removed waypoint: ${node.name}`);
          } else {
            if (this.multiStops.length >= 4) {
              this._showError('Maximum 4 intermediate waypoints supported.');
              return;
            }
            this.multiStops.push(node.id);
            this._updateStatusBar(`Added waypoint #${this.multiStops.length}: ${node.name}`);
          }
          this.redraw();
          return;
        }

        // Standard 2-point routing selection cycle
        if (!this.selectedSource) {
          this.setSource(node.id);
        } else if (!this.selectedDest && node.id !== this.selectedSource) {
          this.setDest(node.id);
        } else {
          this.setSource(node.id);
          this.setDest(null);
        }
        return;
      }
    }
  }

  // Touch handlers for mobile
  _onTouchStart(e) {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      this.isPanning = true;
      this.hasDragged = false;
      this.panStartX = t.clientX - this.userPanX;
      this.panStartY = t.clientY - this.userPanY;
    }
  }

  _onTouchMove(e) {
    if (this.isPanning && e.touches.length === 1) {
      e.preventDefault();
      const t = e.touches[0];
      const curX = t.clientX - this.panStartX;
      const curY = t.clientY - this.panStartY;
      if (Math.abs(curX - this.userPanX) > 4 || Math.abs(curY - this.userPanY) > 4) {
        this.hasDragged = true;
      }
      this.userPanX = curX;
      this.userPanY = curY;
      this.redraw();
    }
  }

  _onTouchEnd(e) {
    this.isPanning = false;
  }

  // =========================================================================
  // Telemetry & Results UI Helper (Clean Horizontal Strip + Breadcrumbs)
  // =========================================================================

  _renderResultsPanel(algo, result) {
    const panel = document.getElementById('results-panel');
    const badge = document.getElementById('results-algo-badge');
    if (!panel) return;

    const names = { dijkstra: "Dijkstra's", astar: 'A* Search', bfs: 'BFS', dfs: 'DFS' };
    if (badge) badge.textContent = names[algo] || algo;

    const estTime = (result.distance / 35 * 60).toFixed(1);

    // Styled breadcrumb chips
    const chips = result.path.map((id, i) => {
      const isStart = i === 0;
      const isEnd = i === result.path.length - 1;
      const cls = isStart ? 'chip-start' : isEnd ? 'chip-dest' : 'chip-mid';
      return `<span class="route-chip ${cls}">${this._getNodeName(id)}</span>`;
    }).join('<span class="chip-arrow">➔</span>');

    let algoNote = '';
    if (algo === 'astar') {
      algoNote = `<span class="stat-tag tag-green">Euclidean Pruned</span>`;
    } else if (algo === 'bfs') {
      algoNote = `<span class="stat-tag tag-amber">Min Hops (${result.hops})</span>`;
    }

    panel.innerHTML = `
      <div class="stats-strip">
        <div class="stat-item">
          <span class="stat-label">Total Distance</span>
          <span class="stat-val" style="color:var(--primary)">${result.distance} km</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-label">Est. Transit Time</span>
          <span class="stat-val">${estTime} min</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-label">Nodes Explored</span>
          <span class="stat-val">${result.visited} nodes</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-label">Execution Time</span>
          <span class="stat-val">${result.timeMs} ms</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-label">Algorithm</span>
          <span class="stat-val">${names[algo] || algo} ${algoNote}</span>
        </div>
      </div>
      <div class="route-breadcrumb-container">
        <div class="route-breadcrumb">${chips}</div>
      </div>
    `;

    this._updateStatusBar(`Found route via ${names[algo] || algo}: ${result.distance} km (${result.visited} nodes explored in ${result.timeMs} ms)`);
  }

  _showError(msg) {
    const panel = document.getElementById('results-panel');
    if (panel) {
      panel.innerHTML = `<div class="status-msg msg-error">⚠️ ${msg}</div>`;
    }
    this._updateStatusBar(`Error: ${msg}`);
  }

  _showInfo(msg) {
    const panel = document.getElementById('results-panel');
    if (panel) {
      panel.innerHTML = `<div class="status-msg msg-info">ℹ️ ${msg}</div>`;
    }
    this._updateStatusBar(msg);
  }

  _updateStatusBar(msg) {
    const bar = document.getElementById('status-bar');
    if (bar) bar.textContent = msg;
  }

  _getNodeName(id) {
    if (!id) return '';
    const node = this.graph.getNode(id);
    return node ? node.name : id;
  }
}

// Global exports
if (typeof window !== 'undefined') {
  window.CityUI = CityUI;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CityUI;
}
