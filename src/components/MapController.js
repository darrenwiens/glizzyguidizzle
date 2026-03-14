import { googleMapsAPI } from '../infrastructure/GoogleMapsAPI.js';
import { appState } from '../state/AppState.js';
import { eventBus } from '../state/EventBus.js';
import { $, $$ } from '../utils/domUtils.js';

/** Controls the map view: markers, clustering, sidebar list, filters */
export class MapController {
  constructor() {
    this._listEl = null;
    this._filterBtns = [];
  }

  /** Initialize the map and bind sidebar */
  init() {
    const mapEl = $('#map-container');
    googleMapsAPI.initMap(mapEl);

    this._listEl = $('#location-list');
    this._filterBtns = $$('[data-filter]');
    this._bindFilters();
    this._bindEvents();
  }

  /** Render markers and sidebar list from current state */
  renderLocations() {
    const locations = appState.getFilteredLocations();

    googleMapsAPI.addMarkers(locations, (location) => {
      appState.setState({ selectedLocationId: location.id });
    });

    this._renderList(locations);
  }

  /** Update a single marker after inspection */
  refreshMarker(locationId) {
    const location = appState.getLocation(locationId);
    if (location) {
      googleMapsAPI.updateMarker(location);
    }
  }

  /** Pan the map to a location */
  panTo(locationId) {
    const location = appState.getLocation(locationId);
    if (location) {
      googleMapsAPI.panTo(location.latitude, location.longitude, 14);
    }
  }

  // --- Private ---

  _bindFilters() {
    this._filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const status = btn.dataset.filter;
        this._filterBtns.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        appState.setState({ filters: { ...appState.state.filters, status } });
        this.renderLocations();
      });
    });
  }

  _bindEvents() {
    // Re-render on search changes
    eventBus.on('search-changed', () => this.renderLocations());

    // Refresh marker after inspection save
    eventBus.on('inspection-saved', ({ locationId }) => {
      this.refreshMarker(locationId);
      this._renderList(appState.getFilteredLocations());
    });

    // Re-render when location updated
    eventBus.on('location-updated', () => {
      this._renderList(appState.getFilteredLocations());
    });
  }

  _renderList(locations) {
    if (!this._listEl) return;

    if (locations.length === 0) {
      this._listEl.innerHTML = '<div class="sidebar__empty">No locations match your filters.</div>';
      return;
    }

    this._listEl.innerHTML = '';
    const fragment = document.createDocumentFragment();

    locations.forEach(loc => {
      const card = document.createElement('div');
      card.className = 'location-card';
      card.setAttribute('role', 'listitem');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `${loc.name}, ${loc.address}. Status: ${loc.getStatusLabel()}`);

      if (loc.id === appState.state.selectedLocationId) {
        card.classList.add('is-selected');
      }

      card.innerHTML = `
        <div class="location-card__name">${this._escapeHtml(loc.name)}</div>
        <div class="location-card__address">${this._escapeHtml(loc.address)}</div>
        <span class="badge badge--${loc.getStatus()}">${loc.getStatusLabel()}</span>
      `;

      card.addEventListener('click', () => {
        appState.setState({ selectedLocationId: loc.id });
        this.panTo(loc.id);
        this._highlightCard(card);
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          eventBus.emit('inspect-location', { locationId: loc.id });
        }
      });

      fragment.appendChild(card);
    });

    this._listEl.appendChild(fragment);
  }

  _highlightCard(cardEl) {
    $$('.location-card.is-selected', this._listEl).forEach(c => c.classList.remove('is-selected'));
    cardEl.classList.add('is-selected');
    cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

export const mapController = new MapController();
