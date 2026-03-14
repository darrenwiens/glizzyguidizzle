import { eventBus } from './EventBus.js';

/** Central application state with subscriber notifications */
class AppState {
  constructor() {
    this.state = {
      locations: [],
      selectedLocationId: null,
      ui: {
        currentView: 'map', // 'map' | 'inspection'
        isLoading: true,
        errorMessage: null,
        isDrawingMode: false,
      },
      filters: {
        status: 'all', // 'all' | 'unvisited' | 'found' | 'not-found'
        searchTerm: '',
      },
    };
    this._subscribers = new Map();
  }

  get(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.state);
  }

  setState(updates) {
    const prev = { ...this.state };
    this.state = this._deepMerge(this.state, updates);
    const changedKeys = Object.keys(updates);
    changedKeys.forEach(key => {
      const subs = this._subscribers.get(key);
      if (subs) subs.forEach(cb => cb(this.state[key], prev[key]));
    });
    eventBus.emit('state-changed', { keys: changedKeys, state: this.state });
  }

  subscribe(path, callback) {
    if (!this._subscribers.has(path)) {
      this._subscribers.set(path, []);
    }
    this._subscribers.get(path).push(callback);
    return () => {
      const subs = this._subscribers.get(path);
      const idx = subs.indexOf(callback);
      if (idx > -1) subs.splice(idx, 1);
    };
  }

  /** Get a location by id */
  getLocation(id) {
    return this.state.locations.find(l => l.id === id);
  }

  /** Update a single location in the array */
  updateLocation(id, updates) {
    const locations = this.state.locations.map(loc => {
      if (loc.id === id) {
        Object.assign(loc, updates);
      }
      return loc;
    });
    this.setState({ locations });
    eventBus.emit('location-updated', { id, updates });
  }

  /** Get filtered locations based on current filters */
  getFilteredLocations() {
    let locs = this.state.locations;

    const { status, searchTerm } = this.state.filters;
    if (status !== 'all') {
      locs = locs.filter(l => {
        const locStatus = l.getStatus();
        return locStatus === status;
      });
      console.log(`Filter: "${status}" → ${locs.length} matches (of ${this.state.locations.length} total). Sample statuses:`, this.state.locations.slice(0, 5).map(l => l.getStatus()));
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      locs = locs.filter(l =>
        l.name.toLowerCase().includes(term) ||
        l.address.toLowerCase().includes(term)
      );
    }
    return locs;
  }

  /** Compute progress stats */
  getStats() {
    const all = this.state.locations;
    const total = all.length;
    const standFound = all.filter(l => l.standStatus === 'stand-found').length;
    const noStand = all.filter(l => l.standStatus === 'no-stand').length;
    const noCantire = all.filter(l => l.standStatus === 'no-cantire').length;
    const insufficientView = all.filter(l => l.standStatus === 'insufficient-view').length;
    const unvisited = all.filter(l => !l.standStatus).length;
    const inspected = total - unvisited;
    const pct = total > 0 ? Math.round((inspected / total) * 100) : 0;
    return { total, standFound, noStand, noCantire, insufficientView, unvisited, inspected, pct };
  }

  _deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        target[key] &&
        typeof target[key] === 'object' &&
        !Array.isArray(target[key])
      ) {
        result[key] = this._deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }
}

export const appState = new AppState();
