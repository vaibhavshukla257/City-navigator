/**
 * benchmark.js - Algorithmic Benchmarking & Empirical Scaling Engine
 * ====================================================================
 * City Navigation & Route Finder System - DSA Major Project
 *
 * Responsibilities:
 *   1. 50-Trial Batch Comparison (Dijkstra vs A* vs BFS) on the real Nexus City graph.
 *   2. Empirical Scaling Analysis on synthetic graphs from 50 to 2000 vertices.
 *   3. Custom HTML5 2D Canvas Bar & Line Charts (zero charting libraries).
 *   4. Formatted HTML telemetry tables with node counts, runtimes, and optimality.
 */

'use strict';

class BenchmarkRunner {
  constructor(cityGraph) {
    this.cityGraph = cityGraph;
    this.cityResults = null;
    this.scalingResults = null;
  }

  // =========================================================================
  // 1. City Graph Comparison (50 random pairs)
  // =========================================================================

  /**
   * Run Dijkstra, A*, and BFS across N random source-destination pairs.
   * @param {number} [trials=50]
   * @returns {Object}
   */
  runComparison(trials = 50) {
    const ids = this.cityGraph.getAllNodeIds();
    const stats = {
      dijkstra: { visitedTotal: 0, timeTotal: 0, distTotal: 0, successful: 0 },
      astar:    { visitedTotal: 0, timeTotal: 0, distTotal: 0, successful: 0 },
      bfs:      { visitedTotal: 0, timeTotal: 0, distTotal: 0, successful: 0 }
    };

    let actualTrials = 0;

    for (let i = 0; i < trials; i++) {
      const src = ids[Math.floor(Math.random() * ids.length)];
      let dst = ids[Math.floor(Math.random() * ids.length)];
      while (dst === src) {
        dst = ids[Math.floor(Math.random() * ids.length)];
      }

      // Warm-up run / timing
      const d = dijkstra(this.cityGraph, src, dst, false);
      const a = astar(this.cityGraph, src, dst, false);
      const b = bfs(this.cityGraph, src, dst);

      if (d.found && a.found && b.found) {
        actualTrials++;
        stats.dijkstra.visitedTotal += d.visited;
        stats.dijkstra.timeTotal    += d.timeMs;
        stats.dijkstra.distTotal    += d.distance;
        stats.dijkstra.successful++;

        stats.astar.visitedTotal += a.visited;
        stats.astar.timeTotal    += a.timeMs;
        stats.astar.distTotal    += a.distance;
        stats.astar.successful++;

        stats.bfs.visitedTotal += b.visited;
        stats.bfs.timeTotal    += b.timeMs;
        stats.bfs.distTotal    += b.distance;
        stats.bfs.successful++;
      }
    }

    const n = Math.max(actualTrials, 1);

    this.cityResults = {
      trials: actualTrials,
      dijkstra: {
        avgVisited: +(stats.dijkstra.visitedTotal / n).toFixed(1),
        avgTime:    +(stats.dijkstra.timeTotal / n).toFixed(3),
        avgDist:    +(stats.dijkstra.distTotal / n).toFixed(2),
        successRate: Math.round((stats.dijkstra.successful / trials) * 100)
      },
      astar: {
        avgVisited: +(stats.astar.visitedTotal / n).toFixed(1),
        avgTime:    +(stats.astar.timeTotal / n).toFixed(3),
        avgDist:    +(stats.astar.distTotal / n).toFixed(2),
        successRate: Math.round((stats.astar.successful / trials) * 100)
      },
      bfs: {
        avgVisited: +(stats.bfs.visitedTotal / n).toFixed(1),
        avgTime:    +(stats.bfs.timeTotal / n).toFixed(3),
        avgDist:    +(stats.bfs.distTotal / n).toFixed(2),
        successRate: Math.round((stats.bfs.successful / trials) * 100)
      }
    };

    return this.cityResults;
  }

  /**
   * Render HTML table of city graph benchmark results.
   * @param {HTMLElement} container
   */
  renderResultsTable(container) {
    if (!container || !this.cityResults) return;
    const r = this.cityResults;

    const pruningPercent = r.dijkstra.avgVisited > 0
      ? Math.max(0, Math.round(((r.dijkstra.avgVisited - r.astar.avgVisited) / r.dijkstra.avgVisited) * 100))
      : 0;

    container.innerHTML = `
      <div class="bench-card">
        <h4 class="bench-subhead">Algorithm Comparison (50 Random Query Pairs on Nexus City)</h4>
        <table class="bench-table">
          <thead>
            <tr>
              <th>Algorithm</th>
              <th>Avg Nodes Visited</th>
              <th>Avg Runtime</th>
              <th>Avg Path Distance</th>
              <th>Optimality</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong><span class="dot-dijkstra">●</span> Dijkstra's</strong></td>
              <td>${r.dijkstra.avgVisited} nodes</td>
              <td>${r.dijkstra.avgTime} ms</td>
              <td>${r.dijkstra.avgDist} km</td>
              <td><span class="badge-opt">Guaranteed Shortest</span></td>
            </tr>
            <tr class="highlight-row">
              <td><strong><span class="dot-astar">●</span> A* Search</strong></td>
              <td>${r.astar.avgVisited} nodes <small class="text-green">(-${pruningPercent}% pruned)</small></td>
              <td>${r.astar.avgTime} ms</td>
              <td>${r.astar.avgDist} km</td>
              <td><span class="badge-opt">Guaranteed Shortest</span></td>
            </tr>
            <tr>
              <td><strong><span class="dot-bfs">●</span> BFS</strong></td>
              <td>${r.bfs.avgVisited} nodes</td>
              <td>${r.bfs.avgTime} ms</td>
              <td>${r.bfs.avgDist} km</td>
              <td><span class="badge-subopt">Fewest Hops (Suboptimal Dist)</span></td>
            </tr>
          </tbody>
        </table>
        <p class="bench-insight">
          💡 <strong>DSA Observation:</strong> A* achieves the exact same optimal distance as Dijkstra while exploring <strong>${pruningPercent}% fewer vertices</strong> because the admissible Euclidean heuristic guides the priority queue toward the target.
        </p>
      </div>
    `;
  }

  /**
   * Draw comparison bar chart on custom HTML5 Canvas.
   * @param {HTMLCanvasElement} canvas
   */
  drawComparisonChart(canvas) {
    if (!canvas || !this.cityResults) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);

    const r = this.cityResults;
    const bars = [
      { name: 'Dijkstra', visited: r.dijkstra.avgVisited, time: r.dijkstra.avgTime, color: '#3B82F6' },
      { name: 'A* Search', visited: r.astar.avgVisited, time: r.astar.avgTime, color: '#159B72' },
      { name: 'BFS', visited: r.bfs.avgVisited, time: r.bfs.avgTime, color: '#E9A23B' }
    ];

    const maxVisited = Math.max(...bars.map(b => b.visited), 1);

    // Layout
    const paddingLeft = 60;
    const paddingRight = 40;
    const paddingTop = 40;
    const paddingBottom = 45;
    const chartW = W - paddingLeft - paddingRight;
    const chartH = H - paddingTop - paddingBottom;

    // Title
    ctx.fillStyle = '#172B2A';
    ctx.font = '600 13px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Average Explored Nodes per Query (Nexus City)', W / 2, 22);

    // Draw grid lines
    ctx.strokeStyle = '#DCE4E0';
    ctx.lineWidth = 1;
    const gridSteps = 4;
    for (let i = 0; i <= gridSteps; i++) {
      const yVal = Math.round((maxVisited / gridSteps) * i);
      const y = paddingTop + chartH - (i / gridSteps) * chartH;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(paddingLeft + chartW, y);
      ctx.stroke();

      ctx.fillStyle = '#64756F';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(yVal, paddingLeft - 8, y + 3);
    }

    // Draw bars
    const barWidth = 65;
    const totalBarsWidth = bars.length * barWidth;
    const spacing = (chartW - totalBarsWidth) / (bars.length + 1);

    bars.forEach((b, idx) => {
      const x = paddingLeft + spacing + idx * (barWidth + spacing);
      const barH = (b.visited / maxVisited) * chartH;
      const y = paddingTop + chartH - barH;

      ctx.fillStyle = b.color;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, barWidth, barH, [6, 6, 0, 0]);
      } else {
        ctx.rect(x, y, barWidth, barH);
      }
      ctx.fill();

      // Top value label
      ctx.fillStyle = '#172B2A';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(b.visited.toFixed(1), x + barWidth / 2, y - 6);

      // Bottom X-axis label
      ctx.fillStyle = '#172B2A';
      ctx.font = '600 11px system-ui, -apple-system, sans-serif';
      ctx.fillText(b.name, x + barWidth / 2, paddingTop + chartH + 18);

      // Runtime subtitle
      ctx.fillStyle = '#64756F';
      ctx.font = '10px monospace';
      ctx.fillText(`${b.time} ms`, x + barWidth / 2, paddingTop + chartH + 32);
    });
  }

  // =========================================================================
  // 2. Synthetic Graph Scaling Tests (50 to 2000 Nodes)
  // =========================================================================

  /**
   * Generates a connected geometric graph with V vertices.
   * @param {number} V Vertex count
   * @param {number} avgDegree Average edges per vertex
   * @returns {Graph}
   */
  generateRandomGraph(V, avgDegree = 4) {
    const g = new Graph();
    const W = 1600;
    const H = 1000;

    // 1. Add nodes with random 2D coordinates
    for (let i = 0; i < V; i++) {
      g.addNode({
        id: `v${i}`,
        name: `Node ${i}`,
        x: Math.random() * W,
        y: Math.random() * H,
        type: 'junction'
      });
    }

    const ids = g.getAllNodeIds();

    // 2. Build a spanning ring backbone to guarantee total connectivity
    for (let i = 0; i < V; i++) {
      const u = ids[i];
      const v = ids[(i + 1) % V];
      const nU = g.getNode(u);
      const nV = g.getNode(v);
      const dist = Math.sqrt((nU.x - nV.x) ** 2 + (nU.y - nV.y) ** 2) / 40;
      g.addEdge(u, v, +dist.toFixed(2), 1.0);
    }

    // 3. Add random local geometric edges
    const targetEdges = Math.floor((V * avgDegree) / 2);
    let added = V;

    for (let attempt = 0; attempt < targetEdges * 3 && added < targetEdges; attempt++) {
      const idxA = Math.floor(Math.random() * V);
      // Pick another node nearby in index to preserve geometric locality
      const offset = Math.floor((Math.random() - 0.5) * Math.min(V, 30));
      let idxB = (idxA + offset + V) % V;
      if (idxA === idxB) continue;

      const u = ids[idxA];
      const v = ids[idxB];

      const nU = g.getNode(u);
      const nV = g.getNode(v);
      const dist = Math.sqrt((nU.x - nV.x) ** 2 + (nU.y - nV.y) ** 2) / 40;
      g.addEdge(u, v, +dist.toFixed(2), 1.0);
      added++;
    }

    return g;
  }

  /**
   * Run empirical scaling test on synthetic graphs of varying sizes.
   * Tests sizes: 50, 150, 300, 500, 1000, 2000 nodes.
   * @returns {Array<Object>}
   */
  runScalingTest() {
    const sizes = [50, 150, 300, 500, 1000, 2000];
    const rows = [];

    for (const V of sizes) {
      const g = this.generateRandomGraph(V, 4);
      const ids = g.getAllNodeIds();
      const src = ids[0];
      const dst = ids[Math.floor(ids.length / 2)];

      // Dijkstra measurement
      const tD0 = performance.now();
      const resD = dijkstra(g, src, dst, false);
      const timeDijkstra = +(performance.now() - tD0).toFixed(3);

      // A* measurement
      const tA0 = performance.now();
      const resA = astar(g, src, dst, false);
      const timeAstar = +(performance.now() - tA0).toFixed(3);

      rows.push({
        V,
        E: g.edgeCount(),
        dijkstraMs: timeDijkstra,
        dijkstraVisited: resD.visited,
        astarMs: timeAstar,
        astarVisited: resA.visited
      });
    }

    this.scalingResults = rows;
    return rows;
  }

  /**
   * Render HTML table of scaling benchmark results.
   * @param {HTMLElement} container
   */
  renderScalingTable(container) {
    if (!container || !this.scalingResults) return;

    let body = '';
    for (const r of this.scalingResults) {
      body += `
        <tr>
          <td><strong>${r.V}</strong></td>
          <td>${r.E}</td>
          <td>${r.dijkstraVisited}</td>
          <td>${r.dijkstraMs} ms</td>
          <td><strong class="text-green">${r.astarVisited}</strong></td>
          <td><strong class="text-green">${r.astarMs} ms</strong></td>
        </tr>
      `;
    }

    container.innerHTML = `
      <div class="bench-card" style="margin-top:16px;">
        <h4 class="bench-subhead">Empirical Scaling Analysis: $|V| = 50 \\rightarrow 2000$ Nodes</h4>
        <table class="bench-table">
          <thead>
            <tr>
              <th>Vertices (|V|)</th>
              <th>Edges (|E|)</th>
              <th>Dijkstra Visited</th>
              <th>Dijkstra Time</th>
              <th>A* Visited</th>
              <th>A* Time</th>
            </tr>
          </thead>
          <tbody>
            ${body}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Draw scaling line chart on HTML5 Canvas.
   * @param {HTMLCanvasElement} canvas
   */
  drawScalingChart(canvas) {
    if (!canvas || !this.scalingResults) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);

    const rows = this.scalingResults;
    const paddingLeft = 55;
    const paddingRight = 35;
    const paddingTop = 35;
    const paddingBottom = 45;
    const chartW = W - paddingLeft - paddingRight;
    const chartH = H - paddingTop - paddingBottom;

    // Title
    ctx.fillStyle = '#172B2A';
    ctx.font = '600 13px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Runtime Scaling (ms) vs Graph Size |V|', W / 2, 20);

    const maxTime = Math.max(...rows.map(r => Math.max(r.dijkstraMs, r.astarMs)), 1);
    const maxV = rows[rows.length - 1].V;

    // Grid lines
    ctx.strokeStyle = '#DCE4E0';
    ctx.lineWidth = 1;
    const gridSteps = 4;
    for (let i = 0; i <= gridSteps; i++) {
      const val = ((maxTime / gridSteps) * i).toFixed(2);
      const y = paddingTop + chartH - (i / gridSteps) * chartH;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(paddingLeft + chartW, y);
      ctx.stroke();

      ctx.fillStyle = '#64756F';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${val}ms`, paddingLeft - 6, y + 3);
    }

    const mapX = (v) => paddingLeft + (v / maxV) * chartW;
    const mapY = (t) => paddingTop + chartH - (t / maxTime) * chartH;

    // Dijkstra Line (Blue)
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    rows.forEach((r, idx) => {
      const px = mapX(r.V);
      const py = mapY(r.dijkstraMs);
      idx === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.stroke();

    // A* Line (Emerald Green)
    ctx.strokeStyle = '#159B72';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    rows.forEach((r, idx) => {
      const px = mapX(r.V);
      const py = mapY(r.astarMs);
      idx === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.stroke();

    // Draw data points and X-axis labels
    rows.forEach(r => {
      const px = mapX(r.V);
      const pyD = mapY(r.dijkstraMs);
      const pyA = mapY(r.astarMs);

      // Points
      ctx.fillStyle = '#3B82F6';
      ctx.beginPath(); ctx.arc(px, pyD, 4, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#159B72';
      ctx.beginPath(); ctx.arc(px, pyA, 4, 0, Math.PI * 2); ctx.fill();

      // X Label
      ctx.fillStyle = '#64756F';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(r.V, px, paddingTop + chartH + 16);
    });

    // Legend
    const lx = paddingLeft + 15;
    const ly = paddingTop + 10;
    ctx.fillStyle = '#3B82F6'; ctx.fillRect(lx, ly, 12, 10);
    ctx.fillStyle = '#172B2A'; ctx.font = '600 11px system-ui, -apple-system, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('Dijkstra', lx + 18, ly + 9);

    ctx.fillStyle = '#159B72'; ctx.fillRect(lx + 85, ly, 12, 10);
    ctx.fillStyle = '#172B2A';
    ctx.fillText('A* Search', lx + 103, ly + 9);
  }
}

// Backward-compatible functional wrappers
function runCityBenchmark(graph) {
  const runner = new BenchmarkRunner(graph);
  return runner.runComparison(50);
}

function runScaleBenchmark() {
  const runner = new BenchmarkRunner(window.cityGraph);
  return runner.runScalingTest();
}

function drawBenchmarkChart(canvas, cityResult, scaleRows) {
  const runner = new BenchmarkRunner(window.cityGraph);
  runner.cityResults = cityResult;
  runner.scalingResults = scaleRows;
  runner.drawComparisonChart(canvas);
}

function buildCityResultTable(cityResult) {
  const runner = new BenchmarkRunner(window.cityGraph);
  runner.cityResults = cityResult;
  const dummy = document.createElement('div');
  runner.renderResultsTable(dummy);
  return dummy.innerHTML;
}

function buildScaleResultTable(scaleRows) {
  const runner = new BenchmarkRunner(window.cityGraph);
  runner.scalingResults = scaleRows;
  const dummy = document.createElement('div');
  runner.renderScalingTable(dummy);
  return dummy.innerHTML;
}

// Global exports
if (typeof window !== 'undefined') {
  window.BenchmarkRunner = BenchmarkRunner;
  window.runCityBenchmark = runCityBenchmark;
  window.runScaleBenchmark = runScaleBenchmark;
  window.drawBenchmarkChart = drawBenchmarkChart;
  window.buildCityResultTable = buildCityResultTable;
  window.buildScaleResultTable = buildScaleResultTable;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BenchmarkRunner;
}
