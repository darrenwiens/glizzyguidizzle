import { appState } from './state/AppState.js';
import { eventBus } from './state/EventBus.js';
import { locationService } from './services/LocationService.js';
import { mapController } from './components/MapController.js';
import { headerController } from './components/HeaderController.js';
import { uiController } from './components/UIController.js';
import { annotationController } from './components/AnnotationController.js';
import { $, hide, showToast, announce } from './utils/domUtils.js';

/** Application bootstrap */
async function init() {
  // Expose eventBus globally for Google Maps info window buttons
  window.__hotdogApp = { eventBus };

  // Wait for Google Maps API to be available
  await waitForGoogleMaps();

  // Initialize components
  mapController.init();
  headerController.init();
  annotationController.init();
  uiController.init();

  // Load locations from Supabase
  try {
    const locations = await locationService.loadAll();
    appState.setState({ locations, ui: { ...appState.state.ui, isLoading: false } });

    hide($('#loading-overlay'));
    mapController.renderLocations();
    headerController.updateStats();

    announce(`Map loaded. ${locations.length} Canadian Tire locations found.`);
    eventBus.emit('locations-loaded', { count: locations.length });

    // Show onboarding if first visit
    if (!localStorage.getItem('hotdog-visited')) {
      localStorage.setItem('hotdog-visited', '1');
      showToast('Welcome to GlizzyGuidizzle! Click a marker to inspect a location.', 'info', 6000);
    }
  } catch (err) {
    console.error('Failed to load locations:', err);
    appState.setState({ ui: { ...appState.state.ui, isLoading: false, errorMessage: err.message } });

    hide($('#loading-overlay'));
    const errorBanner = $('#error-banner');
    const errorMessage = $('#error-message');
    if (errorBanner) errorBanner.classList.remove('is-hidden');
    if (errorMessage) errorMessage.textContent = `Failed to load locations: ${err.message}`;

    // Retry button
    const retryBtn = $('#retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        errorBanner.classList.add('is-hidden');
        init();
      });
    }
  }
}

/** Wait for Google Maps JS API to load */
function waitForGoogleMaps() {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve();
      return;
    }

    // Dynamically load the script with the API key from env
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('Google Maps API key not configured. Set VITE_GOOGLE_MAPS_API_KEY in .env');
    }

    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey || '')}&libraries=marker,streetView&callback=__gmapsReady`;
      script.async = true;
      script.defer = true;

      window.__gmapsReady = () => {
        delete window.__gmapsReady;
        resolve();
      };

      script.onerror = () => reject(new Error('Failed to load Google Maps API'));
      document.head.appendChild(script);
    } else {
      // Script tag already exists, just wait for it
      const check = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(check);
          resolve();
        }
      }, 100);
    }
  });
}

// Boot when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
