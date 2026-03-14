/** Google Maps API wrapper */
class GoogleMapsAPI {
  constructor() {
    this.map = null;
    this.markers = new Map();
    this.clusterer = null;
    this.infoWindow = null;
    this.streetView = null;
    this._streetViewContainer = null;
  }

  /** Initialize the map centered on Canada */
  initMap(containerEl) {
    const CA_CENTER = { lat: 56.13, lng: -106.35 };

    this.map = new google.maps.Map(containerEl, {
      zoom: 4,
      center: CA_CENTER,
      mapId: 'hotdog-stands-map',
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
    });

    // Single shared info window
    this.infoWindow = new google.maps.InfoWindow();

    return this.map;
  }

  /** Add markers for all locations, with clustering */
  addMarkers(locations, onMarkerClick) {
    // Clear existing
    this.markers.forEach(m => m.map = null);
    this.markers.clear();

    const markerElements = [];

    locations.forEach(location => {
      if (!location.latitude || !location.longitude) return;

      const markerEl = this._createMarkerElement(location);
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: location.latitude, lng: location.longitude },
        map: this.map,
        title: `${location.name} — ${location.address}`,
        content: markerEl,
      });

      marker.addListener('click', () => {
        this._showInfoWindow(marker, location);
        if (onMarkerClick) onMarkerClick(location);
      });

      this.markers.set(location.id, marker);
      markerElements.push(marker);
    });

    // Set up clustering
    if (this.clusterer) {
      this.clusterer.clearMarkers();
    }
    if (window.markerClusterer) {
      this.clusterer = new markerClusterer.MarkerClusterer({
        map: this.map,
        markers: markerElements,
        algorithm: new markerClusterer.SuperClusterAlgorithm({
          radius: 80,
          maxZoom: 15,
        }),
      });
    }
  }

  /** Update a single marker's appearance */
  updateMarker(location) {
    const marker = this.markers.get(location.id);
    if (marker) {
      marker.content = this._createMarkerElement(location);
    }
  }

  /** Pan to a location */
  panTo(lat, lng, zoom = 14) {
    this.map.panTo({ lat, lng });
    this.map.setZoom(zoom);
  }

  /** Initialize Street View into a container */
  initStreetView(containerEl, lat, lng) {
    this._streetViewContainer = containerEl;

    this.streetView = new google.maps.StreetViewPanorama(containerEl, {
      position: { lat, lng },
      pov: { heading: 0, pitch: 0 },
      zoom: 1,
      motionTracking: false,
      addressControl: false,
      linksControl: true,
      panControl: true,
      zoomControl: true,
      fullscreenControl: false,
    });

    return this.streetView;
  }

  /** Get the Street View panorama link reflecting the current view */
  getStreetViewUrl() {
    if (!this.streetView) return null;
    const pano = this.streetView.getPano();
    const pov = this.streetView.getPov();
    const zoom = this.streetView.getZoom();
    if (!pano) return null;
    // FOV: zoom 0 = 180°, zoom 1 = 90°, zoom 2 = 45°, etc.
    const fov = 180 / Math.pow(2, zoom);
    return `https://www.google.com/maps/@?api=1&map_action=pano&pano=${encodeURIComponent(pano)}&heading=${pov.heading.toFixed(2)}&pitch=${pov.pitch.toFixed(2)}&fov=${fov.toFixed(1)}`;
  }

  /** Close Street View */
  destroyStreetView() {
    if (this.streetView) {
      this.streetView.setVisible(false);
      this.streetView = null;
    }
    // Clear the container DOM to prevent stale panorama tiles
    if (this._streetViewContainer) {
      this._streetViewContainer.innerHTML = '';
    }
  }

  /** Check if Street View is available at a position */
  checkStreetViewCoverage(lat, lng) {
    return new Promise((resolve) => {
      const sv = new google.maps.StreetViewService();
      sv.getPanorama({ location: { lat, lng }, radius: 100 }, (data, status) => {
        resolve(status === google.maps.StreetViewStatus.OK);
      });
    });
  }

  /** Close the info window */
  closeInfoWindow() {
    if (this.infoWindow) this.infoWindow.close();
  }

  // --- Private helpers ---

  _createMarkerElement(location) {
    const div = document.createElement('div');
    div.className = `marker marker--${location.getStatus()}`;
    div.setAttribute('role', 'button');
    div.setAttribute('aria-label', `${location.name}, ${location.address}. Status: ${location.getStatusLabel()}`);
    div.setAttribute('tabindex', '0');
    div.innerHTML = `<span class="marker__icon">${location.getMarkerIcon()}</span>`;
    return div;
  }

  _showInfoWindow(marker, location) {
    const status = location.getStatus();
    const statusBadge = {
      unvisited: '<span class="badge badge--unvisited">Not Inspected</span>',
      'stand-found': '<span class="badge badge--stand-found">✓ Stand Found</span>',
      'no-stand': '<span class="badge badge--no-stand">✕ No Stand</span>',
      'no-cantire': '<span class="badge badge--no-cantire">⊘ No Canadian Tire</span>',
      'insufficient-view': '<span class="badge badge--insufficient-view">? Insufficient View</span>',
    }[status];

    this.infoWindow.setContent(`
      <div class="info-window">
        <h3 class="info-window__title">${location.name}</h3>
        <p class="info-window__address">${location.address}</p>
        <div class="info-window__status">${statusBadge}</div>
        <button class="btn btn--primary info-window__inspect-btn" data-location-id="${location.id}">
          Inspect Location
        </button>
      </div>
    `);
    this.infoWindow.open({ anchor: marker, map: this.map });

    // Attach click handler after DOM renders
    google.maps.event.addListenerOnce(this.infoWindow, 'domready', () => {
      const btn = document.querySelector(`[data-location-id="${location.id}"]`);
      if (btn) {
        btn.addEventListener('click', () => {
          this.closeInfoWindow();
          const { eventBus } = window.__hotdogApp;
          eventBus.emit('inspect-location', { locationId: location.id });
        });
      }
    });
  }
}

export const googleMapsAPI = new GoogleMapsAPI();
