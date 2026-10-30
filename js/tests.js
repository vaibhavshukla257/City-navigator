/**
 * tests.js - Comprehensive Self-Test Suite
 * ==============================================================
 * City Navigation & Route Finder System - DSA Major Project
 *
 * Validates foundational data structures, pathfinding algorithms,
 * road closure mutations, and boundary edge cases.
 *
 * Total Test Cases: 14 automated unit & integration tests.
 */

'use strict';

class TestRunner {
  constructor() {
    this.results = [];
  }

  runAll() {
    this.results = [];

    const test = (name, fn) => {
      const t0 = performance.now();
      try {
        const pass = fn();
        const timeMs = +(performance.now() - t0).toFixed(2);
        this.results.push({ name, pass: !!pass, error: null, timeMs });
      } catch (err) {
        const timeMs = +(performance.now() - t0).toFixed(2);
        this.results.push({ name, pass: false, error: err.message, timeMs });
      }
    };

    const assert = (condition, msg) => {
      if (!condition) throw new Error(msg || 'Assertion failed');
    };

    // Helper: Known reference graph with admissible geometric coordinates
    // Scale: 40 pixels = 1.0 km
    // Topology:
    //      A ----(2 km)---- B ----(3 km)---- C ----(1 km)---- E
    //      \                                                 /
    //      (5 km)                                         (4 km)
    //        \                                             /
    //         +------------------- D ---------------------+
    // Shortest path A -> E: A -> B -> C -> E (cost: 2 + 3 + 1 = 6 km)
    // Alternate path:       A -> D -> E       (cost: 5 + 4 = 9 km, 2 hops)
    const makeReferenceGraph = () => {
      const g = new Graph();
      g.addNode({ id: 'A', name: 'Node A', x: 0,   y: 100, type: 'junction' });
      g.addNode({ id: 'B', name: 'Node B', x: 80,  y: 100, type: 'junction' });
      g.addNode({ id: 'C', name: 'Node C', x: 200, y: 100, type: 'junction' });
      g.addNode({ id: 'E', name: 'Node E', x: 240, y: 100, type: 'junction' });
      g.addNode({ id: 'D', name: 'Node D', x: 120, y: 250, type: 'junction' });

      g.addEdge('A', 'B', 2.0, 1.0);
      g.addEdge('B', 'C', 3.0, 1.0);
      g.addEdge('C', 'E', 1.0, 1.0);
      g.addEdge('A', 'D', 5.0, 1.0);
      g.addEdge('D', 'E', 4.0, 1.0);
      return g;
    };

    // -----------------------------------------------------------------------
    // Test 1: MinHeap ordering
    // -----------------------------------------------------------------------
    test('MinHeap: Insert and ExtractMin priority ordering', () => {
      const h = new MinHeap();
      h.insert(10, 'ten');
      h.insert(3, 'three');
      h.insert(7, 'seven');
      h.insert(1, 'one');
      h.insert(5, 'five');

      const extracted = [];
      while (!h.isEmpty()) {
        extracted.push(h.extractMin().key);
      }
      assert(JSON.stringify(extracted) === JSON.stringify([1, 3, 5, 7, 10]),
        `Expected [1,3,5,7,10], got [${extracted.join(',')}]`);
      return true;
    });

    // -----------------------------------------------------------------------
    // Test 2: MinHeap peek & size invariants
    // -----------------------------------------------------------------------
    test('MinHeap: Peek without removal and Size preservation', () => {
      const h = new MinHeap();
      h.insert(20, 'a');
      h.insert(4, 'b');
      assert(h.peek().key === 4, `Peek expected key 4, got ${h.peek().key}`);
      assert(h.size() === 2, `Expected size 2, got ${h.size()}`);
      h.extractMin();
      assert(h.size() === 1, `Expected size 1, got ${h.size()}`);
      return true;
    });

    // -----------------------------------------------------------------------
    // Test 3: Queue FIFO order
    // -----------------------------------------------------------------------
    test('Queue: First-In-First-Out (FIFO) queueing invariants', () => {
      const q = new Queue();
      [10, 20, 30, 40].forEach(v => q.enqueue(v));
      assert(q.front() === 10, `Expected front 10, got ${q.front()}`);
      const out = [];
      while (!q.isEmpty()) out.push(q.dequeue());
      assert(JSON.stringify(out) === JSON.stringify([10, 20, 30, 40]), 'FIFO order violated');
      return true;
    });

    // -----------------------------------------------------------------------
    // Test 4: Stack LIFO order
    // -----------------------------------------------------------------------
    test('Stack: Last-In-First-Out (LIFO) stack operations', () => {
      const s = new Stack();
      ['alpha', 'beta', 'gamma'].forEach(v => s.push(v));
      assert(s.peek() === 'gamma', `Expected peek gamma, got ${s.peek()}`);
      const popped = [s.pop(), s.pop(), s.pop()];
      assert(JSON.stringify(popped) === JSON.stringify(['gamma', 'beta', 'alpha']), 'LIFO violated');
      assert(s.isEmpty(), 'Stack should be empty');
      return true;
    });

    // -----------------------------------------------------------------------
    // Test 5: Dijkstra on Reference Graph
    // -----------------------------------------------------------------------
    test('Dijkstra: Optimal shortest path on known reference graph', () => {
      const g = makeReferenceGraph();
      const res = dijkstra(g, 'A', 'E', false);
      assert(res.found, 'Path A -> E should be found');
      assert(res.distance === 6, `Expected distance 6, got ${res.distance}`);
      assert(JSON.stringify(res.path) === JSON.stringify(['A', 'B', 'C', 'E']),
        `Expected ['A','B','C','E'], got [${res.path.join('->')}]`);
      return true;
    });

    // -----------------------------------------------------------------------
    // Test 6: A* matches Dijkstra optimality
    // -----------------------------------------------------------------------
    test('A* Search: Yields identical optimal distance to Dijkstra', () => {
      const g = makeReferenceGraph();
      const d = dijkstra(g, 'A', 'E', false);
      const a = astar(g, 'A', 'E', false);
      assert(d.found && a.found, 'Both algorithms must find route');
      assert(Math.abs(d.distance - a.distance) < 0.001,
        `Dijkstra distance (${d.distance}) and A* distance (${a.distance}) must match`);
      return true;
    });

    // -----------------------------------------------------------------------
    // Test 7: BFS Hop Count
    // -----------------------------------------------------------------------
    test('BFS: Minimizes edge hop count rather than distance', () => {
      const g = makeReferenceGraph();
      const r = bfs(g, 'A', 'E');
      assert(r.found, 'BFS path A -> E should be found');
      assert(r.hops === 2, `Expected 2 hops (A->D->E), got ${r.hops}`);
      assert(JSON.stringify(r.path) === JSON.stringify(['A', 'D', 'E']),
        `Expected ['A','D','E'], got [${r.path.join('->')}]`);
      return true;
    });

    // -----------------------------------------------------------------------
    // Test 8: DFS Full Reachability
    // -----------------------------------------------------------------------
    test('DFS: Full component reachability verification', () => {
      const g = makeReferenceGraph();
      const r = dfs(g, 'A');
      assert(r.reachable.length === 5, `Expected 5 reachable nodes, got ${r.reachable.length}`);
      ['A', 'B', 'C', 'D', 'E'].forEach(id => {
        assert(r.reachable.includes(id), `Missing reachable node ${id}`);
      });
      return true;
    });

    // -----------------------------------------------------------------------
    // Test 9: Edge Case: Same Source and Destination
    // -----------------------------------------------------------------------
    test('Edge Case: Source equals Destination returns 0 km distance', () => {
      const g = makeReferenceGraph();
      const r = dijkstra(g, 'A', 'A', false);
      assert(r.found, 'Same node should be found');
      assert(r.distance === 0, `Expected 0 km, got ${r.distance}`);
      assert(r.path.length === 1 && r.path[0] === 'A', 'Path should contain only source');
      return true;
    });

    // -----------------------------------------------------------------------
    // Test 10: Edge Case: Disconnected Graph Handling
    // -----------------------------------------------------------------------
    test('Edge Case: Disconnected graph cleanly reports no path', () => {
      const g = new Graph();
      g.addNode({ id: 'X', name: 'Island X', x: 0, y: 0, type: 'junction' });
      g.addNode({ id: 'Y', name: 'Island Y', x: 200, y: 200, type: 'junction' });
      const r = dijkstra(g, 'X', 'Y', false);
      assert(!r.found, 'Disconnected path must report found: false');
      assert(r.distance === Infinity, 'Distance must be Infinity');
      assert(r.path.length === 0, 'Path array must be empty');
      return true;
    });

    // -----------------------------------------------------------------------
    // Test 11: Road Closure Simulation Detour
    // -----------------------------------------------------------------------
    test('Road Closure: Blocking edge forces automatic detour path', () => {
      const g = makeReferenceGraph();
      // Block road A-B; only remaining route to E is A -> D -> E (cost: 9)
      g.blockEdge('A', 'B');
      const r = dijkstra(g, 'A', 'E', false);
      assert(r.found, 'Detour route must be found');
      assert(r.distance === 9, `Expected distance 9, got ${r.distance}`);
      assert(JSON.stringify(r.path) === JSON.stringify(['A', 'D', 'E']),
        `Expected detour via D, got [${r.path.join('->')}]`);
      g.unblockEdge('A', 'B');
      return true;
    });

    // -----------------------------------------------------------------------
    // Test 12: Nearest Facility Search
    // -----------------------------------------------------------------------
    test('Nearest Facility: Correctly discovers closest hospital in network', () => {
      const g = new Graph();
      g.addNode({ id: 'J1', name: 'Central Junction', x: 0, y: 0, type: 'junction' });
      g.addNode({ id: 'H1', name: 'General Hospital', x: 40, y: 0, type: 'hospital' });
      g.addNode({ id: 'H2', name: 'North Hospital', x: 120, y: 0, type: 'hospital' });
      g.addNode({ id: 'H3', name: 'South Hospital', x: 200, y: 0, type: 'hospital' });
      g.addNode({ id: 'P1', name: 'Police Station', x: 80, y: 50, type: 'police' });

      g.addEdge('J1', 'H1', 1.0, 1.0);
      g.addEdge('H1', 'H2', 2.0, 1.0);
      g.addEdge('H2', 'H3', 2.0, 1.0);
      g.addEdge('J1', 'P1', 3.0, 1.0);

      const res = findNearestFacility(g, 'J1', 'hospital', false);
      assert(res.found, 'Hospital must be reachable from Junction');
      assert(res.nearest && res.nearest.node.id === 'H1', 'Nearest hospital should be H1 (1.0 km)');
      assert(res.nearest.distance === 1.0, `Expected distance 1.0, got ${res.nearest.distance}`);
      assert(res.topThree.length === 3, `Expected 3 hospitals in topThree, got ${res.topThree.length}`);
      return true;
    });

    // -----------------------------------------------------------------------
    // Test 13: Traffic Weighting Sensitivity
    // -----------------------------------------------------------------------
    test('Traffic Awareness: Congestion multiplier shifts optimal routing', () => {
      const g = new Graph();
      ['X1', 'X2', 'X3'].forEach(id => g.addNode({ id, name: id, x: 0, y: 0, type: 'junction' }));
      // Direct path X1 -> X2: dist 4 km, traffic 3.0x -> effective cost 12
      g.addEdge('X1', 'X2', 4, 3.0);
      // Detour path X1 -> X3 -> X2: dist 3+3=6 km, traffic 1.0x -> effective cost 6
      g.addEdge('X1', 'X3', 3, 1.0);
      g.addEdge('X3', 'X2', 3, 1.0);

      const unweighted = dijkstra(g, 'X1', 'X2', false);
      assert(unweighted.distance === 4, `Without traffic, should pick direct 4km road, got ${unweighted.distance}`);

      const trafficAware = dijkstra(g, 'X1', 'X2', true);
      assert(trafficAware.path.length === 3 && trafficAware.path[1] === 'X3',
        'Traffic-aware search should detour via X3 to avoid severe congestion');
      return true;
    });

    // -----------------------------------------------------------------------
    // Test 14: Alternate Route Finder
    // -----------------------------------------------------------------------
    test('Alternate Route: Computes distinct second-best pathway', () => {
      const g = makeReferenceGraph();
      const alt = findAlternateRoute(g, 'A', 'E', false);
      assert(alt.found, 'Alternate route must exist');
      assert(JSON.stringify(alt.path) === JSON.stringify(['A', 'D', 'E']),
        `Expected alternate ['A','D','E'], got [${alt.path.join('->')}]`);
      assert(alt.distance === 9, `Expected alternate distance 9, got ${alt.distance}`);
      return true;
    });

    return this.results;
  }

  renderResults(container) {
    if (!container) return;
    const passedCount = this.results.filter(r => r.pass).length;
    const totalCount = this.results.length;
    const allPassed = passedCount === totalCount;

    let itemsHtml = '';
    for (const r of this.results) {
      itemsHtml += `
        <li class="test-item ${r.pass ? 'pass' : 'fail'}">
          <span class="test-icon">${r.pass ? '✓' : '✗'}</span>
          <div class="test-details">
            <span class="test-name">${r.name}</span>
            <span class="test-time">${r.timeMs} ms</span>
            ${r.error ? `<div class="test-error">${r.error}</div>` : ''}
          </div>
        </li>
      `;
    }

    container.innerHTML = `
      <div class="test-summary ${allPassed ? 'all-pass' : 'some-fail'}">
        <div class="summary-badge">${passedCount} / ${totalCount} Tests Passed</div>
        <div class="summary-sub">${allPassed ? '🎉 All algorithmic and structural invariants verified.' : '⚠️ Some tests encountered regressions.'}</div>
      </div>
      <ul class="test-list">
        ${itemsHtml}
      </ul>
    `;
  }
}

// Backward-compatible global runner function
function runAllTests() {
  const runner = new TestRunner();
  const results = runner.runAll();
  const container = document.getElementById('test-results-container') || document.getElementById('test-results');
  if (container) {
    runner.renderResults(container);
  }
  return results;
}

// Global exports
if (typeof window !== 'undefined') {
  window.TestRunner = TestRunner;
  window.runAllTests = runAllTests;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TestRunner;
}
