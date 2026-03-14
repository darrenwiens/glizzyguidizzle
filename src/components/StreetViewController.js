import { googleMapsAPI } from '../infrastructure/GoogleMapsAPI.js';
import { appState } from '../state/AppState.js';
import { eventBus } from '../state/EventBus.js';
import { $, show, hide, announce } from '../utils/domUtils.js';

/** Controls the Street View panorama in inspection view */
export class StreetViewController {
  constructor() {
    this._panorama = null;
    this._hasStreetView = false;
  }

  /** Load Street View for the given location */
  async load(location) {
    // Destroy previous panorama before creating a new one
    this.destroy();

    const container = $('#streetview-container');
    const fallback = $('#streetview-fallback');
    hide(fallback);

    // Check Street View coverage
    this._hasStreetView = await googleMapsAPI.checkStreetViewCoverage(
      location.latitude,
      location.longitude
    );

    if (!this._hasStreetView) {
      show(fallback);
      announce(`Street View is not available for ${location.name}.`);
      eventBus.emit('streetview-loaded', { available: false, locationId: location.id });
      return;
    }

    this._panorama = googleMapsAPI.initStreetView(
      container,
      location.latitude,
      location.longitude
    );

    announce(`Street View loaded for ${location.name}.`);
    eventBus.emit('streetview-loaded', { available: true, locationId: location.id });
  }

  /** Get the current panorama URL for saving */
  getPanoramaUrl() {
    return googleMapsAPI.getStreetViewUrl();
  }

  /** Whether street view is showing */
  get isAvailable() {
    return this._hasStreetView;
  }

  /** Clean up when leaving inspection view */
  destroy() {
    googleMapsAPI.destroyStreetView();
    this._panorama = null;
    this._hasStreetView = false;
  }
}

export const streetViewController = new StreetViewController();
