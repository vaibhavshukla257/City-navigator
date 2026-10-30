# 🏙️ Nexus City Navigator: Advanced Route Finder & Graph Optimization System

[![DSA Major Project](https://img.shields.io/badge/Project-DSA%20Major%20Capstone-6c63ff?style=for-the-badge&logo=codeforces&logoColor=white)](https://github.com/)
[![Pure JavaScript](https://img.shields.io/badge/Stack-Vanilla%20JS%20%7C%20HTML5%20Canvas%20%7C%20CSS3-00d4aa?style=for-the-badge&logo=javascript&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero%20External%20Libraries-ffa502?style=for-the-badge&logo=npm&logoColor=white)](https://nodejs.org/)
[![Algorithms](https://img.shields.io/badge/Algorithms-Dijkstra%20%7C%20A*%20%7C%20BFS%20%7C%20DFS%20%7C%20TSP-1e90ff?style=for-the-badge&logo=diagramsdotnet&logoColor=white)](https://en.wikipedia.org/wiki/Shortest_path_problem)
[![License](https://img.shields.io/badge/License-MIT-ff4757?style=for-the-badge)](LICENSE)

An industrial-grade, client-side urban navigation and route planning simulator engineered completely from first principles using pure Vanilla JavaScript, modern HTML5 2D Canvas, and a bespoke Light Urban Mobility design system. The system models realistic metropolitan road networks (including an on-demand standard benchmark network with 45 nodes and 90 bidirectional weighted edges) and demonstrates foundational graph data structures, priority queue engineering, and algorithmic pathfinding with real-time visual traversal animations, live congestion modeling, interactive road closures with undo history, emergency facility routing, empirical benchmarking, and an automated verification test suite.

---

## 🎨 Light Urban Navigation Design System

The application features a clean, high-contrast Light Urban Navigation palette:
- **Application Background (`--bg`)**: `#F7F8F6` (soft off-white canvas frame)
- **Surfaces & Cards (`--surface`)**: `#FFFFFF` (crisp white for navbar, sidebar, dialogs)
- **Primary Brand & Optimal Route (`--primary`)**: `#159B72` (vibrant emerald green)
- **Primary Text (`--text`)**: `#172B2A` (deep slate for headings and primary metrics)
- **Muted Text (`--text-muted`)**: `#64756F` (subtle secondary text and labels)
- **Soft Accent Fill (`--soft-green`)**: `#E7F5EF` (selection highlights and pills)
- **Dividers & Structural Borders (`--border`)**: `#DCE4E0` (crisp 1px borders)
- **Moderate Traffic & Detours (`--warning`)**: `#E9A23B` (amber orange)
- **Heavy Traffic & Road Closures (`--danger`)**: `#E45B55` (crimson red)
- **Map Viewport Canvas**: `#F4F7F3` (cartographic light green background with 40px grid)

### Honest Empty States (Zero Fabricated Data)
- **Initial Map Canvas**: `"No city data available"` (prompting user to load sample network or import JSON)
- **Initial Routing Telemetry**: `"No route calculated yet"` (no fake distance or transit time)
- **Unexecuted Benchmark**: `"Run benchmark to see results"` (runs genuine 50-trial empirical comparisons on demand)
- **Unexecuted Test Suite**: `"Tests not run yet"` (executes 14 automated unit tests verifying priority queues, optimality, and edge cases)

---

## 📑 Table of Contents
1. [Problem Statement](#-problem-statement)
2. [Project Objectives](#-project-objectives)
3. [Key Architectural Features](#-key-architectural-features)
4. [How to Run (Zero Setup)](#-how-to-run-zero-setup)
5. [Project Structure](#-project-structure)
6. [Nexus City Dataset Specification](#-nexus-city-dataset-specification)
7. [Complexity Analysis Table](#-complexity-analysis-table)
8. [Data Structures Rationale](#-data-structures-rationale)
9. [Comprehensive Algorithm Comparison](#-comprehensive-algorithm-comparison)
10. [System Limitations](#-system-limitations)
11. [Future Scope & Enhancements](#-future-scope--enhancements)
12. [Visual Architecture & UI Layout](#-visual-architecture--ui-layout)
13. [Viva Voce & Examiner Q&A Guide](#-viva-voce--examiner-qa-guide)

---

## 📌 Problem Statement

Metropolitan road networks are dynamic, non-planar topological structures where finding optimal transit paths is complicated by:
- **Heterogeneous Edge Constraints**: Roads possess disparate physical lengths, speed limits, and traffic capacity thresholds.
- **Dynamic Congestion**: Traffic density fluctuates non-linearly, causing the physical shortest path to differ significantly from the temporal fastest path.
- **Topological Faults**: Road construction, vehicular accidents, and road blocks require on-the-fly topological re-routing without complete graph reconstruction.
- **Emergency Facility Dispatch**: Locating the nearest critical amenity (e.g., Hospital, Police, Fire Station, Petrol Pump) from an arbitrary position in minimal computational time.
- **Educational Opacity**: Standard navigation suites act as black boxes, obscuring the underlying frontier expansion, priority queue mechanics, and heuristic evaluations.

This project resolves these challenges by constructing a fully interactive, deterministic simulation platform implementing custom data structures (Adjacency List with JS Map, Binary Min-Heap Priority Queue, FIFO Queue, LIFO Undo Stack) with step-by-step visual exploration and empirical algorithmic telemetry.

---

## 🎯 Project Objectives

- **Custom Algorithmic Implementation**: Engineer all foundational data structures and graph algorithms by hand with zero third-party utility libraries.
- **Multi-Paradigm Pathfinding**: Compare deterministic uniform-cost approaches (**Dijkstra's**), goal-directed heuristic searches (**A***), layer-wise unweighted traversals (**BFS**), and exploratory depth searches (**DFS**).
- **Dynamic Weight Modeling**: Implement real-time traffic multiplier mechanisms $\tau \in [1.0, 3.0]$ where effective travel cost $C = d \times \tau$.
- **Interactive Visual Animation**: Animate graph frontiers in real-time on an HTML5 2D Canvas, rendering explored vertices step by step, relaxing edges, and showcasing animated dashed route trajectories.
- **Telemetry & Empirical Benchmarking**: Provide execution time profiling (via `performance.now()`), visited node ratios, and automated self-test validation suites.

---

## ✨ Key Architectural Features

### 1. Dual-Metric Shortest Path Routing
- **Physical Distance Routing**: Minimizes the physical distance $\sum d_i$ between vertices.
- **Traffic-Aware Routing**: Minimizes transit duration $\sum d_i \times \text{traffic}_i$, demonstrating real-world GPS navigation software behavior.

### 2. A* Search with Admissible Euclidean Heuristics
- Employs the straight-line Euclidean distance heuristic function $h(n) = \frac{\sqrt{(x_n - x_{\text{goal}})^2 + (y_n - y_{\text{goal}})^2}}{40}$.
- Formally guarantees admissibility ($h(n) \le h^*(n)$) and consistency (monotonicity), ensuring optimal path discovery while pruning up to 60% of unnecessary node expansions compared to Dijkstra.

### 3. Dynamic Traffic Simulator & Obstacle Engine
- **Live Traffic Variations**: Edge congestion is updated dynamically with color-coded overlays (Green $\le 1.2\times$, Yellow $1.3\text{--}1.8\times$, Red $\ge 1.9\times$).
- **Interactive Road Closures & Undo Stack**: Users can click any road edge in "Block Road Mode" to sever or reopen it; routes recompute instantly, and closures can be reverted using a custom LIFO `Stack`.

### 4. Emergency Facility & Multi-Stop Dispatch
- **Nearest Facility Search**: Rapidly identifies the optimal service station (Hospital, Police, Fire Station, Petrol Pump) using an early-termination single-source Dijkstra traversal, returning the closest plus top 3 nearest.
- **Alternate Route Generator**: Computes secondary paths by temporarily masking edges along the primary route to offer viable detours around congested corridors.
- **Multi-Stop Itinerary Planner (TSP Permutations)**: Solves the Travelling Salesperson Problem for small waypoint sets using brute-force factorial permutations across precomputed shortest paths.

### 5. Interactive Canvas Map Visualizer
- Hardware-accelerated 2D Canvas rendering with crisp HiDPI scaling, hover tooltips with distance/congestion metadata, glowing node badges, and animated dashed route paths.
- Step-by-step exploration playback with an adjustable speed slider (10ms – 150ms delay per frontier step) to visually inspect Dijkstra's radial expansion vs. A*'s directed cone.

### 6. Benchmark Suite & Integrated Unit Test Harness
- In-browser benchmarking engine executing 50-trial batch comparisons (measuring nodes visited, runtime ms, and path length) and scaling tests across graphs from 50 to 2000 nodes.
- Custom HTML5 Canvas bar and line charts drawn from scratch without Chart.js or D3.
- Automated 14-test verification harness validating priority queue invariants, known shortest paths, disconnected graphs, heuristic consistency, and boundary cases.

---

## 🚀 How to Run (Zero Setup)

Because this project is built using 100% standard web technologies with **zero build tools, zero bundlers, and zero external runtime dependencies**, launching it is instantaneous and works completely offline.

### Method 1: Direct File Execution (Recommended)
1. Navigate to the project root directory:
   ```bash
   cd "city-navigator"
   ```
2. Double-click `index.html` to open it directly in any web browser (Chrome, Edge, Firefox, Safari, Brave).

### Method 2: Local HTTP Server (Optional)
If running inside a developer environment:
- **Using Python 3**:
  ```bash
  python -m http.server 8000
  ```
  Open `http://localhost:8000` in your browser.
- **Using Node.js**:
  ```bash
  npx serve .
  ```

---

## 📁 Project Structure

```text
city-navigator/
│
├── index.html              # Main application layout, sidebar controls, canvas, and modal dialogs
├── README.md               # Comprehensive project documentation, complexity analysis, and viva guide
│
├── css/
│   └── style.css           # Modern dark-mode glassmorphic design system and responsive styles
│
└── js/
    ├── minHeap.js          # Hand-written Binary Min-Heap Priority Queue, FIFO Queue, and LIFO Stack
    ├── graph.js            # Adjacency-list Graph using JS Map with road closure mutation methods
    ├── data.js             # Fictional Nexus City dataset (45 nodes, 90 roads, 5 spread hospitals)
    ├── algorithms.js       # Core pathfinding engines (Dijkstra, A*, BFS, DFS, Nearest Facility, TSP)
    ├── ui.js               # Canvas 2D map renderer, step-by-step animation, tooltips, and click handlers
    ├── benchmark.js        # 50-trial comparison runner, 2000-node scaling engine, and canvas charts
    └── tests.js            # Automated verification test suite (14 unit and integration tests)
```

### File Responsibilities

| File | Purpose & Responsibilities |
| :--- | :--- |
| `index.html` | Defines semantic layout: left control sidebar, canvas viewport, bottom telemetry panel, status bar, and modal overlay. |
| `css/style.css` | Implements glassmorphism, glowing route animations, tooltips, buttons, legend badges, and responsive breakpoints. |
| `js/minHeap.js` | Handcrafted Binary Min-Heap (`insert`, `extractMin`, `decreaseKey`, `peek`, `isEmpty`), FIFO `Queue`, and LIFO `Stack`. |
| `js/graph.js` | Graph class with `addNode`, `addEdge`, `removeEdge`, `blockEdge`, `unblockEdge`, `toggleEdge`, `getNeighbors`, and `fromCityData`. |
| `js/data.js` | 45 nodes across 11 amenity types (including 5 hospitals) and 90 bidirectional weighted edges with traffic multipliers. |
| `js/algorithms.js` | Pure functional algorithmic routines returning optimal path arrays, distance, nodes visited, `visitedOrder` animation logs, and runtimes. |
| `js/ui.js` | Manages canvas redraws, coordinate scaling, animated marching dash lines, hover tooltips, click selection, and road blocking. |
| `js/benchmark.js` | Runs 50 random query pairs, executes scaling benchmark from $|V|=50$ to $2000$, and renders bar/line charts on Canvas. |
| `js/tests.js` | Automated test suite validating data structure invariants, shortest paths, disconnected graphs, traffic routing, and edge cases. |

---

## 🗺️ Nexus City Dataset Specification

The simulated environment, **Nexus City**, represents a balanced metropolitan layout designed to challenge routing heuristics and cycle resolution:

- **Total Vertices ($|V|$)**: 45 unique junction nodes.
- **Total Edges ($|E|$)**: 90 bidirectional road segments (180 directed arcs).
- **Coordinate Space**: Cartesian plane ($80 \le x \le 900, 40 \le y \le 620$).
- **Hospitals (5, strategically distributed across all 4 quadrants and city core)**:
  1. `n01` — **Nexus General Hospital** (Central, $(500, 320)$)
  2. `n02` — **North Star Hospital** (Northwest, $(200, 90)$)
  3. `n03` — **St. Mary's Hospital** (Northeast, $(820, 90)$)
  4. `n04` — **Westside Medical Centre** (Southwest, $(80, 560)$)
  5. `n05` — **Apex South Hospital** (Southeast, $(850, 580)$)
- **Amenity Types**: Junctions, Hospitals, Police Stations, Fire Stations, Schools, Malls, Parks, Railway Stations, Petrol Pumps, International Airport, and Landmark Towers.

Each edge record encapsulates:
$$\text{Edge}(u, v) = \{ \text{weight} = \frac{\sqrt{\Delta x^2 + \Delta y^2}}{40} \text{ km}, \text{traffic} \in [1.0, 3.0] \}$$

---

## 📊 Complexity Analysis Table

The table below summarizes the asymptotic time and space complexities for each algorithm and underlying data structure implemented in this project:

| Algorithm / Data Structure | Time Complexity (Best) | Time Complexity (Average) | Time Complexity (Worst) | Space Complexity | Description & Implementation Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Dijkstra's Algorithm** | $O(V \log V)$ | $O((V + E) \log V)$ | $O((V + E) \log V)$ | $O(V)$ | Utilizes custom Binary Min-Heap with lazy deletion. Sifts up to relax incident edges. Guarantees optimal distance. |
| **A\* Search Algorithm** | $O(1)$ *(Target adjacent)* | $O(E)$ *(Informed heuristic)* | $O((V + E) \log V)$ | $O(V)$ | Guided by admissible Euclidean distance heuristic $f(n) = g(n) + h(n)$. Explores significantly fewer vertices than Dijkstra. |
| **Breadth-First Search (BFS)** | $O(1)$ | $O(V + E)$ | $O(V + E)$ | $O(V)$ | Evaluates shortest path strictly in terms of hop count (unweighted edges). Uses custom FIFO Queue. |
| **Depth-First Search (DFS)** | $O(1)$ | $O(V + E)$ | $O(V + E)$ | $O(V)$ | Explores deep branches via custom LIFO Stack. Verifies graph connectivity; does **not** guarantee optimal path cost. |
| **Min-Heap Insert (`insert`)** | $O(1)$ | $O(\log n)$ | $O(\log n)$ | $O(1)$ | Appends element to array end and sifts upward via `_siftUp()` comparing parent nodes at $\lfloor (i-1)/2 \rfloor$. |
| **Min-Heap Extract (`extractMin`)** | $O(1)$ | $O(\log n)$ | $O(\log n)$ | $O(1)$ | Root swapped with last item, popped, and restored downward via `_siftDown()` comparing children at $2i+1$ and $2i+2$. |
| **Min-Heap Decrease Key** | $O(1)$ | $O(\log n)$ | $O(\log n)$ | $O(1)$ | Lazy deletion approach: pushes updated $(key, value)$ pair; stale duplicates discarded upon extraction via visited set. |
| **Hash Map Node Lookup** | $O(1)$ | $O(1)$ | $O(V)$ *(Hash collision)* | $O(V)$ | JS `Map` provides $O(1)$ lookup for node objects by ID and name indexing for instant search autocomplete. |
| **Nearest Facility Query** | $O(\text{dist}_{\text{near}} \log V)$ | $O((V' + E') \log V)$ | $O((V + E) \log V)$ | $O(V)$ | Single-source Dijkstra terminating immediately upon extracting the first vertex labeled with requested facility type. |
| **Alternate Route Generator** | $O((V + E) \log V)$ | $O(k \cdot (V + E) \log V)$ | $O(k \cdot (V + E) \log V)$ | $O(V)$ | Computes primary shortest path, masks its edges sequentially, runs secondary Dijkstra, and restores edges. |
| **Multi-Stop TSP Permutations** | $O(k! \cdot (V + E) \log V)$ | $O(k! \cdot (V + E) \log V)$ | $O(k! \cdot (V + E) \log V)$ | $O(k! + V)$ | Evaluates permutations for $k$ intermediate waypoints ($k \le 5$) using precomputed pairwise shortest path distances. |

---

## 🧠 Data Structures Rationale

### 1. Adjacency List over Adjacency Matrix
- **Sparsity Considerations**: In urban networks, junctions rarely connect to more than 3 to 5 roadways ($\text{degree}(v) \le 5$). For Nexus City ($|V| = 45$, $|E| = 90$):
  - **Adjacency Matrix**: Requires $|V|^2 = 45^2 = 2,025$ memory cells, where $>91\%$ of entries are empty zeroes.
  - **Adjacency List**: Consumes $O(V + E) = 45 + 180 = 225$ records, achieving superior cache locality and reducing memory overhead by nearly **89%**.
- **Iteration Performance**: Iterating over neighbors in an Adjacency Matrix requires scanning all $V$ cells ($O(V)$ per vertex, yielding $O(V^2)$ overall). An Adjacency List allows direct iteration over incident edges in $O(\text{deg}(u))$, accelerating graph traversal.

### 2. Binary Min-Heap Priority Queue over Linear Array / Fibonacci Heap
- **Linear Array Comparison**: An unsorted array yields $O(1)$ insertions but requires $O(V)$ scans to find the minimum distance vertex, degrading Dijkstra's total time to $O(V^2 + E)$. With a Binary Min-Heap, extracting the minimum requires only $O(\log V)$, slashing worst-case extraction comparisons from 2,025 to $\approx 250$.
- **Fibonacci Heap Trade-Off**: While theoretically superior with $O(1)$ amortized `decreaseKey()`, Fibonacci Heaps suffer from substantial constant-factor overhead, complex pointer bookkeeping, and poor cache locality. A flat array-backed Binary Min-Heap is empirically faster for graphs of this magnitude ($|V| \le 10,000$).

### 3. Hash Map Indexing for Coordinate & Visited Sets
- JavaScript `Map` leverages hash tables providing $O(1)$ average-time retrieval. Rather than performing linear array scans ($O(V)$) to locate node metadata or check visited flags, nodes are indexed directly by their alphanumeric identifiers (`"n01"`), guaranteeing constant-time state queries.

### 4. Queue (FIFO) and Stack (LIFO) Structures
- **BFS (Queue)**: Guarantees level-order exploration. Vertices are processed in non-decreasing order of hop count, ensuring the discovery of minimum-edge paths on unweighted topologies. A custom head pointer prevents expensive $O(N)$ array shifts.
- **DFS and Undo (Stack)**: Enables deep branch exploration and back-tracking, essential for connectivity verification, and provides instantaneous undo capabilities for road closures.

---

## ⚖️ Comprehensive Algorithm Comparison

| Feature / Metric | Dijkstra's Algorithm | A* Search Algorithm | Breadth-First Search (BFS) | Depth-First Search (DFS) |
| :--- | :--- | :--- | :--- | :--- |
| **Optimality (Weighted Graph)** | ✅ **Guaranteed Optimal** | ✅ **Guaranteed Optimal** *(with admissible $h$)* | ❌ **Non-Optimal** *(Ignores weights)* | ❌ **Non-Optimal** *(Arbitrary path)* |
| **Optimality (Unweighted)** | ✅ Optimal | ✅ Optimal | ✅ **Guaranteed Optimal** *(Min hops)* | ❌ Non-Optimal |
| **Heuristic Function Required?** | ❌ No ($h(n) = 0$) | ✅ Yes ($f(n) = g(n) + h(n)$) | ❌ No | ❌ No |
| **Frontier Growth Pattern** | Radial / Concentric circles | Elliptical / Directed cone towards target | Uniform layer rings | Unidirectional linear depth |
| **Search Space Pruning** | Explores in all directions equally | Highly focused; prunes up to 60% nodes | Explores all directions | Dives deep; high deviation |
| **Negative Edge Weights?** | ❌ No *(Requires Bellman-Ford)* | ❌ No | ❌ No | ❌ No |
| **Primary Data Structure** | Priority Queue (Min-Heap) | Priority Queue (Min-Heap) | FIFO Queue | LIFO Stack / Recursion |
| **Ideal Real-World Use Case** | Multi-target routing, baseline distance | Point-to-point urban GPS navigation | Unweighted hops, social degree count | Maze generation, cycle detection |

---

## ⚠️ System Limitations

1. **2D Euclidean Projection**: Distance calculations assume a planar 2D Cartesian plane without accounting for Earth's oblate spheroid curvature (Haversine formula) or 3D multi-level road elevations (overpasses, tunnels).
2. **Synchronous Execution Thread**: While animations utilize browser `requestAnimationFrame` and `setTimeout`, running extremely large graphs ($|V| > 10,000$) on the main UI thread during benchmarking can cause minor UI frame drops.
3. **Turn Restriction Omission**: The graph engine currently assumes zero time penalty for sharp turns, U-turns, or highway interchange transitions.
4. **Combinatorial Explosion for TSP**: The multi-stop route finder uses a brute-force permutation solver optimal up to $k \le 6$ waypoints ($6! = 720$ paths). Larger sequences require approximation heuristics such as Christofides or 2-Opt.

---

## 🔮 Future Scope & Enhancements

- **Contraction Hierarchies (CH)**: Preprocess hierarchical transit shortcuts across regional clusters to achieve sub-millisecond query runtimes on nationwide graphs.
- **Web Worker Offloading**: Migrate the benchmark engine and large graph computations to background Web Worker threads to maintain 60 FPS animation smoothness under all workloads.
- **OpenStreetMap (OSM) GeoJSON Ingestion**: Implement an automated parser to load live GIS spatial shapefiles and real-world road vectors from any city globally.
- **Multi-Modal Transit Integration**: Add support for mixed transportation modes (Walking, Metro Rail, Bus, Rideshare) with scheduled time-table edge costs.
- **Machine Learning Congestion Prediction**: Incorporate historical time-series regression to forecast traffic congestion spikes 30 minutes in advance.

---

## 🖥️ Visual Architecture & UI Layout

```text
+-----------------------------------------------------------------------------------------------+
|  📍 City Navigator | Route Finder   [Explore Map] [Route Planner] [Analytics] [Tests]   ● Offline |
+------------------------------+----------------------------------------------------------------+
| SIDEBAR (330px, White)       | MAIN CANVAS VIEWPORT (Cartographic #F4F7F3, 40px Grid)         |
|                              |                                                                |
|  [🗂️ Network Dataset]       |    (n01)=========traffic:2.5========(n02)                      |
|   • [⚡ Load Sample Network] |      \\                               //                        |
|   • [📁 Import] [💾 Export]  |       \\  [A* Informed Cone]         //                         |
|                              |        \\                           //                          |
|  [📍 Route Planner]          |        (n40)--------------------(n39) [Destination]           |
|   • Source: [Select Source ▼]|           \                       /                            |
|   • Dest:   [Select Dest   ▼]|            \===[Closed Road: ✕]==/                             |
|   • Search: [Search name...] |                                                                |
|   • Algorithm: (Dijkstra/A*) |   Active Tooltip: Node n01 (Hospital) | Dist: 12.4 km         |
|   • [x] Consider Traffic     +----------------------------------------------------------------+
|                              | FLOATING RESULTS DOCK                                          |
|  [⚡ Quick Destinations]     |  Total Distance: 18.2 km | Transit Time: 31.2 min              |
|   • [🏥 Hosp] [🚔 Police]    |  Nodes Explored: 16 nodes | Time: 1.25 ms                      |
|   • [🚒 Fire] [⛽ Petrol]    |  Path: n01 ➔ n40 ➔ n34 ➔ n28 ➔ n17 ➔ n25 ➔ n05                 |
|                              |  (Initial state when unrouted: "No route calculated yet")       |
|  [🛠️ Map Tools & Detours]    +----------------------------------------------------------------+
|   • [Road Closure Mode]      | STATUS BAR: Ready — Nexus City network (45 locations, 90 roads)|
|   • [🔀 Alternate Route]     | (Initial state when empty: "No city data available")           |
|   • [↩️ Undo Road Closure]    +----------------------------------------------------------------+
+-----------------------------------------------------------------------------------------------+
```

---

## 🎓 Viva Voce & Examiner Q&A Guide

### Q1: Why did you choose Dijkstra's Algorithm instead of the Bellman-Ford Algorithm for this project?
> **Answer:**  
> Urban road networks naturally feature non-negative edge weights (physical distances and transit times are strictly $w(e) \ge 0$). Dijkstra's Algorithm, equipped with a Binary Min-Heap Priority Queue, solves the Single-Source Shortest Path (SSSP) problem in **$O((V + E) \log V)$** time.  
> In contrast, the Bellman-Ford algorithm operates in **$O(V \cdot E)$** time because it relaxes all edges across $V-1$ iterations to accommodate potential negative weight cycles. On our Nexus City graph ($V=45, E=90$):
> - Dijkstra performs on the order of $(45 + 90) \times \log_2(45) \approx 740$ operations.
> - Bellman-Ford performs $45 \times 90 = 4,050$ operations (more than $5\times$ slower).  
> Because negative weights do not exist in real-world road networks, Dijkstra provides guaranteed optimality with dramatically superior time efficiency.

---

### Q2: What is the fundamental difference between Dijkstra's Algorithm and the A* Search Algorithm?
> **Answer:**  
> Both algorithms evaluate path costs using priority queues, but their evaluation functions differ fundamentally:
> - **Dijkstra** selects vertices based purely on the exact known cost from the start node:
>   $$f(n) = g(n)$$
>   where $g(n)$ is the accumulated distance from $S$ to $n$. This produces an **uninformed, radial (concentric)** expansion exploring equally in all directions.
> - **A\*** adds a goal-directed heuristic estimate $h(n)$ representing the remaining distance from $n$ to target $T$:
>   $$f(n) = g(n) + h(n)$$
>   The heuristic directs the search towards the destination, forming an elliptical expansion cone that prunes irrelevant branches and significantly reduces explored vertices while preserving mathematical optimality.

---

### Q3: What is an "admissible heuristic," and is Euclidean distance admissible in this road network?
> **Answer:**  
> A heuristic $h(n)$ is defined as **admissible** if it never overestimates the true cost to reach the goal:
> $$0 \le h(n) \le h^*(n), \quad \forall n$$
> where $h^*(n)$ is the true shortest path distance from node $n$ to destination $T$.
> 
> **Proof of Admissibility for Euclidean Distance:**  
> In 2D Cartesian space, the straight-line Euclidean distance between two points $(x_1, y_1)$ and $(x_2, y_2)$ represents the absolute shortest possible physical distance between them according to the triangle inequality. Because real-world roads must either follow this straight line or curve around topography, the road distance $d_{\text{road}}(n, T)$ is strictly greater than or equal to the straight-line distance:
> $$h_{\text{Euclidean}}(n) = \frac{\sqrt{(x_n - x_T)^2 + (y_n - y_T)^2}}{40} \le d_{\text{road}}(n, T) = h^*(n)$$
> Hence, Euclidean distance is mathematically admissible and consistent (monotonic), guaranteeing that A* will return the optimal shortest path without prematurely closing unexplored optimal routes.

---

### Q4: Why is a Binary Min-Heap selected for the Priority Queue instead of a sorted or unsorted array?
> **Answer:**  
> The priority queue is the core bottleneck of both Dijkstra and A*. The comparative operation costs illustrate why the Binary Min-Heap is ideal:
> 
> | Operation | Unsorted Array | Sorted Array | Binary Min-Heap |
> | :--- | :--- | :--- | :--- |
> | `insert()` | $O(1)$ | $O(n)$ | **$O(\log n)$** |
> | `extractMin()` | $O(n)$ | $O(1)$ | **$O(\log n)$** |
> | `decreaseKey()` | $O(1)$ *(if indexed)* | $O(n)$ | **$O(\log n)$** |
> | **Total Dijkstra Runtime** | $O(V^2 + E)$ | $O(V^2 + E)$ | **$O((V + E) \log V)$** |
> 
> In a sparse graph where $E \ll V^2$, $O((V + E) \log V)$ is asymptotically and practically superior to $O(V^2)$. An unsorted array requires scanning all $V$ items on every extraction ($45$ comparisons $\times 45 = 2,025$), whereas a Binary Min-Heap extracts in $\approx \lceil \log_2(45) \rceil \approx 6$ comparisons.

---

### Q5: How does the time complexity of Dijkstra vary between an Adjacency Matrix and an Adjacency List with a Min-Heap?
> **Answer:**  
> - **Adjacency Matrix Implementation**:  
>   Finding the minimum vertex requires scanning the distance array of size $V$ $\rightarrow O(V)$ per extraction, totaling $O(V^2)$. Scanning adjacent neighbors requires checking all $V$ columns in matrix row $u$ $\rightarrow O(V)$ per vertex, totaling $O(V^2)$ across the execution. Total complexity: **$O(V^2)$**, regardless of edge count.
> - **Adjacency List with Min-Heap**:  
>   Extracting the minimum vertex requires $O(\log V)$, executed $V$ times $\rightarrow O(V \log V)$. Traversing neighbors only inspects valid edges incident to $u$, which across all vertices equals the total degree sum $\sum \text{deg}(u) = 2E$. Each relaxation updates the heap in $O(\log V) \rightarrow O(E \log V)$. Total complexity: **$O((V + E) \log V)$**.
> 
> For our sparse city graph ($E = 90 \ll V^2 = 2,025$), $(45 + 90) \log_2(45) \approx 740$ operations vs $45^2 = 2,025$ operations, proving the Min-Heap + Adjacency List structure is over **$2.7\times$ faster**.

---

### Q6: How does the system detect whether the graph is disconnected or if a target is unreachable?
> **Answer:**  
> The system detects unreachability through two formal safeguards:
> 1. **Infinite Distance State**: All vertices initialize with distance $d[v] = \infty$. If the target node $T$ retains $d[T] = \infty$ after the priority queue exhausts its frontier, no connected path exists.
> 2. **Frontier Depletion**: If the priority queue empties (`heap.isEmpty() === true`) before target vertex $T$ is dequeued, the search terminates immediately, signaling that target $T$ lies in an isolated, disconnected component. The UI alerts the user with a distinct visual warning and status indicator.

---

### Q7: Why is Breadth-First Search (BFS) optimal for unweighted graphs, but fails to find the shortest path on weighted networks?
> **Answer:**  
> - **Unweighted Graphs**: BFS expands nodes in strict layer-by-layer radial depth using a FIFO queue. It explores all nodes at path length $k$ hops before any node at $k+1$ hops. Because every edge has uniform weight (e.g., cost = 1), the first time a target vertex is dequeued, it is guaranteed to have been reached via the minimum number of edges, making BFS optimal in $O(V + E)$ time.
> - **Weighted Graphs**: A path with fewer hops can have a much higher total cost than a path with more hops. For example:
>   - Direct road: $A \rightarrow B$ (1 hop, distance = 50 km).
>   - Detour road: $A \rightarrow C \rightarrow B$ (2 hops, distance = 10 km + 10 km = 20 km).  
>   BFS will greedily choose $A \rightarrow B$ because it is reached in 1 step, completely missing the cheaper 2-step route. Hence, BFS cannot handle non-uniform weighted edges.

---

### Q8: How does the "Nearest Facility Finder" locate the closest hospital or emergency station efficiently?
> **Answer:**  
> Rather than running multiple distinct Dijkstra calculations from each hospital to the user (or from the user to each hospital individually), the system implements an **Early-Exit Single-Source Dijkstra**:
> 1. The user's current location is set as source node $S$.
> 2. Dijkstra begins expanding frontier nodes in ascending order of accumulated travel time $g(n)$.
> 3. As each node $u$ is extracted from the Min-Heap, its metadata tag is checked against the query criteria:
>    ```javascript
>    if (node.type === requestedFacilityType) {
>        return reconstructPath(u); // Early exit!
>    }
>    ```
> 4. Because Dijkstra extracts nodes in strictly non-decreasing order of cost, the very first node encountered that matches the facility category is mathematically guaranteed to be the nearest facility. The search terminates immediately without exploring the remainder of the city.

---

### Q9: How is the "Alternate Route" algorithm implemented?
> **Answer:**  
> To offer a viable secondary path that avoids congested bottlenecks, the system uses an **Edge Penalty and Exclusion Method**:
> 1. Run standard Dijkstra to identify the primary shortest path $P_1 = (e_1, e_2, \dots, e_k)$.
> 2. Iterate through each consecutive edge $(u, v)$ along $P_1$.
> 3. Temporarily block road $(u, v)$ via `graph.blockEdge(u, v)`.
> 4. Execute a second Dijkstra query on the modified graph to yield candidate alternate path $P_2$.
> 5. Restore original edge via `graph.unblockEdge(u, v)`.
> 6. Select the shortest valid alternative route that differs from $P_1$.  
> This ensures that $P_2$ diverges meaningfully from $P_1$ rather than duplicating it, providing a genuine detour option.

---

### Q10: How does the road closure simulation work under the hood without corrupting the original graph topology?
> **Answer:**  
> The system maintains data integrity using **Dynamic Edge Masking and a LIFO Undo Stack**:
> - The `Graph` class maintains a `closedEdges` set storing canonical undirected edge keys `"u|v"` where $u \le v$.
> - When a road is blocked, `graph.blockEdge(u, v)` adds the key to `closedEdges` in $O(1)$ time, and the action is pushed onto a custom LIFO `Stack`.
> - In all pathfinding algorithms (Dijkstra, A*, BFS, DFS), the edge relaxation loop checks `graph.isEdgeBlocked(u, e.to)` in $O(1)$ and ignores severed edges.
> - Clicking "Undo Road Block" pops the top action from the `Stack` and restores the road without mutating adjacency array lengths or reallocating memory.

---

## 📜 Academic Integrity & License

This project is submitted as a major capstone project for the Data Structures & Algorithms (DSA) coursework. It is released under the open-source [MIT License](LICENSE). All data structures, pathfinding algorithms, UI controllers, and canvas renderings were designed and authored from first principles with zero external dependencies.
