import { Location } from '../models/Location.js';
import { fetchAllLocations } from '../infrastructure/SupabaseClient.js';

/** Service for loading and filtering locations */
export class LocationService {
  /** Load all locations from Supabase, return as Location objects */
  async loadAll() {
    const rows = await fetchAllLocations();
    return rows.map(row => Location.fromRow(row));
  }

  /** Filter locations by status */
  filterByStatus(locations, status) {
    if (status === 'all') return locations;
    return locations.filter(l => l.getStatus() === status);
  }

  /** Search locations by term */
  search(locations, term) {
    if (!term) return locations;
    const lower = term.toLowerCase();
    return locations.filter(l =>
      l.name.toLowerCase().includes(lower) ||
      l.address.toLowerCase().includes(lower)
    );
  }

  /** Get the next unvisited location (nearest to given coords, or just first) */
  getNextUnvisited(locations, currentId = null) {
    const unvisited = locations.filter(l => !l.standStatus && l.id !== currentId);
    return unvisited.length > 0 ? unvisited[0] : null;
  }
}

export const locationService = new LocationService();
