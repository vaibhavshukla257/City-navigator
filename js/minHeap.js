/**
 * minHeap.js - Hand-written Binary Min-Heap, Queue, and Stack
 * ============================================================
 * City Navigation & Route Finder System - DSA Major Project
 *
 * BINARY MIN-HEAP (Priority Queue):
 *   insert(key, value)  -> O(log n)  [sift-up]
 *   extractMin()        -> O(log n)  [sift-down]
 *   peek()              -> O(1)
 *   isEmpty()           -> O(1)
 *   size()              -> O(1)
 *   decreaseKey()       -> O(log n)  [lazy re-insert]
 *   Space complexity    -> O(n)
 *
 * Lazy-deletion strategy: when a distance is improved, a new lower-key entry
 * is inserted. Stale duplicates are discarded during extractMin via visited-set check.
 */

'use strict';

// =============================================================================
// MinHeap - Binary Min-Heap / Priority Queue
// =============================================================================
class MinHeap {
  constructor() {
    /** @type {Array<{key: number, value: *}>} */
    this._heap = [];
  }

  // --- Internal helpers -----------------------------------------------------

  _parent(i) { return Math.floor((i - 1) / 2); }
  _left(i)   { return 2 * i + 1; }
  _right(i)  { return 2 * i + 2; }

  _swap(i, j) {
    const t = this._heap[i];
    this._heap[i] = this._heap[j];
    this._heap[j] = t;
  }

  /** Sift element upward until heap property restored. Time: O(log n) */
  _siftUp(i) {
    while (i > 0) {
      const p = this._parent(i);
      if (this._heap[p].key <= this._heap[i].key) break;
      this._swap(p, i);
      i = p;
    }
  }

  /** Sift element downward until heap property restored. Time: O(log n) */
  _siftDown(i) {
    const n = this._heap.length;
    while (true) {
      let s = i;
      const l = this._left(i), r = this._right(i);
      if (l < n && this._heap[l].key < this._heap[s].key) s = l;
      if (r < n && this._heap[r].key < this._heap[s].key) s = r;
      if (s === i) break;
      this._swap(i, s);
      i = s;
    }
  }

  // --- Public API -----------------------------------------------------------

  /** Insert element with priority key. Time: O(log n) */
  insert(key, value) {
    this._heap.push({ key, value });
    this._siftUp(this._heap.length - 1);
  }

  /** Remove and return element with smallest key. Time: O(log n) */
  extractMin() {
    if (this._heap.length === 0) return null;
    const min  = this._heap[0];
    const last = this._heap.pop();
    if (this._heap.length > 0) {
      this._heap[0] = last;
      this._siftDown(0);
    }
    return min;
  }

  /** Peek minimum without removing. Time: O(1) */
  peek()    { return this._heap.length > 0 ? this._heap[0] : null; }
  isEmpty() { return this._heap.length === 0; }
  size()    { return this._heap.length; }

  /**
   * Decrease key using lazy approach: insert new entry with lower key.
   * Algorithm skips stale duplicates via visited-set check. Time: O(log n)
   */
  decreaseKey(newKey, value) { this.insert(newKey, value); }
}

// =============================================================================
// Queue - FIFO (used for BFS)
// enqueue O(1) | dequeue O(1) amortized | Space O(n)
// Uses head pointer to avoid O(n) shift on dequeue.
// =============================================================================
class Queue {
  constructor() { this._data = []; this._head = 0; }

  enqueue(item) { this._data.push(item); }

  dequeue() {
    if (this._head >= this._data.length) return undefined;
    const item = this._data[this._head++];
    if (this._head > 512 && this._head > (this._data.length >> 1)) {
      this._data = this._data.slice(this._head);
      this._head = 0;
    }
    return item;
  }

  front()   { return this._data[this._head]; }
  isEmpty() { return this._head >= this._data.length; }
  size()    { return this._data.length - this._head; }
}

// =============================================================================
// Stack - LIFO (used for DFS and undo history)
// push O(1) | pop O(1) | peek O(1) | Space O(n)
// =============================================================================
class Stack {
  constructor() { this._data = []; }
  push(item)  { this._data.push(item); }
  pop()       { return this._data.pop(); }
  peek()      { return this._data[this._data.length - 1]; }
  isEmpty()   { return this._data.length === 0; }
  size()      { return this._data.length; }
}

// Expose to global scope (no ES6 modules needed - works by double-clicking index.html)
if (typeof window !== 'undefined') {
  window.MinHeap = MinHeap;
  window.Queue   = Queue;
  window.Stack   = Stack;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MinHeap, Queue, Stack };
}
