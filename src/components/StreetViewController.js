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
      location.longitude,
      location.standView ? this._parseViewUrl(location.standView) : {},
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

  /** Parse a saved stand_view URL into pano/heading/pitch/zoom */
  _parseViewUrl(url) {
    try {
      const u = new URL(url);
      const params = u.searchParams;
      const opts = {};
      if (params.has('pano')) opts.pano = params.get('pano');
      if (params.has('heading')) opts.heading = parseFloat(params.get('heading'));
      if (params.has('pitch')) opts.pitch = parseFloat(params.get('pitch'));
      if (params.has('fov')) {
        const fov = parseFloat(params.get('fov'));
        // FOV to zoom: zoom = log2(180 / fov)
        if (fov > 0) opts.zoom = Math.log2(180 / fov);
      }
      return opts;
    } catch {
      return {};
    }
  }
}

export const streetViewController = new StreetViewController();
