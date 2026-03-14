import { updateInspection } from '../infrastructure/SupabaseClient.js';
import { appState } from '../state/AppState.js';
import { eventBus } from '../state/EventBus.js';

/** Service for saving inspections */
export class InspectionService {
  /** Save an inspection result to Supabase and update local state */
  async save(locationId, { standStatus, standBbox = null, standView = null }) {
    // Update local state immediately (optimistic)
    const location = appState.getLocation(locationId);
    if (location) {
      location.standStatus = standStatus;
      location.standBbox = standBbox;
      location.standView = standView;
      appState.updateLocation(locationId, {
        standStatus,
        standBbox,
        standView,
      });
    }

    // Persist to Supabase
    try {
      await updateInspection(locationId, { standStatus, standBbox, standView });
      eventBus.emit('inspection-saved', { locationId, standStatus });
    } catch (err) {
      console.error('Failed to save to Supabase:', err);
      eventBus.emit('inspection-save-failed', { locationId, error: err.message });
      throw err;
    }
  }

  /** Validate bounding box format: [x1, y1, x2, y2] */
  validateBbox(bbox) {
    if (!Array.isArray(bbox) || bbox.length !== 4) return false;
    return bbox.every(v => typeof v === 'number' && Number.isFinite(v));
  }
}

export const inspectionService = new InspectionService();
