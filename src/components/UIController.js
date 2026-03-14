import { appState } from '../state/AppState.js';
import { eventBus } from '../state/EventBus.js';
import { inspectionService } from '../services/InspectionService.js';
import { locationService } from '../services/LocationService.js';
import { streetViewController } from './StreetViewController.js';
import { annotationController } from './AnnotationController.js';
import { mapController } from './MapController.js';
import { $, $$, show, hide, showToast, announce } from '../utils/domUtils.js';

/** Controls view switching, inspection flow, and interactions */
export class UIController {
  constructor() {
    this._currentLocationId = null;
    this._pendingStatus = null; // 'found' | 'not-found' | null
  }

  init() {
    this._bindInspectionButtons();
    this._bindViewSwitching();
    this._bindKeyboard();
    this._bindHashRouting();
  }

  /** Switch to inspection view for a location */
  async openInspection(locationId) {
    const location = appState.getLocation(locationId);
    if (!location) return;

    this._currentLocationId = locationId;
    this._pendingStatus = null;
    appState.setState({ selectedLocationId: locationId, ui: { ...appState.state.ui, currentView: 'inspection' } });

    // Disable annotation buttons until stand-found is selected
    this._updateAnnotationButtons();

    // Update header info
    const titleEl = $('#inspect-title');
    const addrEl = $('#inspect-address');
    if (titleEl) titleEl.textContent = location.name;
    if (addrEl) addrEl.textContent = ` — ${location.address}`;

    // Show inspection view, hide map
    hide($('#map-view'));
    show($('#inspection-view'));

    // Reset annotation
    annotationController.reset();

    // Load saved bbox if any
    if (location.standBbox) {
      annotationController.setBbox(location.standBbox);
    }

    // Load Street View
    await streetViewController.load(location);

    // Update hash
    window.location.hash = `inspect/${locationId}`;

    // Focus management
    const backBtn = $('#back-btn');
    if (backBtn) backBtn.focus();

    announce(`Inspecting ${location.name}. ${location.address}.`);
  }

  /** Return to map view */
  closeInspection() {
    streetViewController.destroy();
    annotationController.reset();
    this._pendingStatus = null;

    appState.setState({ ui: { ...appState.state.ui, currentView: 'map' } });

    hide($('#inspection-view'));
    show($('#map-view'));
    window.location.hash = 'map';

    announce('Returned to map view.');
  }

  // --- Private ---

  _bindInspectionButtons() {
    // Status buttons
    const statusBtns = $$('[data-status]');
    const saveNextBtn = $('#save-next-btn');

    statusBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this._pendingStatus = btn.dataset.status;
        statusBtns.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        this._updateAnnotationButtons();
        announce(`Marked as ${btn.textContent.trim()}. Click Save to confirm.`);
      });
    });

    if (saveNextBtn) {
      saveNextBtn.addEventListener('click', () => this._saveAndNext());
    }

    // Save (stay) button
    const saveBtn = $('#save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this._saveOnly());
    }

    // Skip button (without saving)
    const skipBtn = $('#skip-btn');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        if (this._pendingStatus) {
          if (!confirm('You have unsaved changes. Discard?')) return;
        }
        this._goToNext();
      });
    }

    // Back button
    const backBtn = $('#back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (this._pendingStatus) {
          if (!confirm('You have unsaved changes. Discard?')) return;
        }
        this.closeInspection();
      });
    }
  }

  async _save() {
    if (!this._pendingStatus) {
      showToast('Please select a status first.', 'error');
      return false;
    }

    const locationId = this._currentLocationId;
    const bbox = annotationController.getBbox();
    const standView = streetViewController.getPanoramaUrl();
    console.log('Saving — standView URL:', standView);

    try {
      await inspectionService.save(locationId, {
        standStatus: this._pendingStatus,
        standBbox: bbox,
        standView: standView,
      });
      const statusLabels = { 'stand-found': 'Stand found!', 'no-stand': 'No stand.', 'no-cantire': 'No Canadian Tire.', 'insufficient-view': 'Insufficient view.' };
      showToast(statusLabels[this._pendingStatus] || 'Saved.', 'success');
      this._pendingStatus = null;
      $$('[data-status]').forEach(b => b.classList.remove('is-active'));
      return true;
    } catch (err) {
      console.error('Save failed:', err);
      showToast(`Failed to save: ${err.message}`, 'error');
      return false;
    }
  }

  async _saveOnly() {
    await this._save();
  }

  async _saveAndNext() {
    const saved = await this._save();
    if (saved) this._goToNext();
  }

  _goToNext() {
    const locations = appState.state.locations;
    const next = locationService.getNextUnvisited(locations, this._currentLocationId);

    if (next) {
      this.openInspection(next.id);
    } else {
      showToast('All locations have been inspected! 🎉', 'success');
      this.closeInspection();
    }
  }
  _updateAnnotationButtons() {
    const drawBtn = $('#draw-btn');
    const clearBtn = $('#clear-bbox-btn');
    const enabled = this._pendingStatus === 'stand-found';
    if (drawBtn) drawBtn.disabled = !enabled;
    if (clearBtn) clearBtn.disabled = !enabled;
    if (!enabled && appState.state.ui.isDrawingMode) {
      annotationController.toggleDrawingMode();
    }
  }
  _bindViewSwitching() {
    eventBus.on('inspect-location', ({ locationId }) => {
      this.openInspection(locationId);
    });
  }

  _bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Don't handle when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const inInspection = appState.state.ui.currentView === 'inspection';

      switch (e.key) {
        case 'Escape':
        case 'm':
        case 'M':
          if (inInspection) {
            e.preventDefault();
            this.closeInspection();
          }
          break;

        case '1':
          if (inInspection) { e.preventDefault(); $('[data-status="stand-found"]')?.click(); }
          break;
        case '2':
          if (inInspection) { e.preventDefault(); $('[data-status="no-stand"]')?.click(); }
          break;
        case '3':
          if (inInspection) { e.preventDefault(); $('[data-status="no-cantire"]')?.click(); }
          break;
        case '4':
          if (inInspection) { e.preventDefault(); $('[data-status="insufficient-view"]')?.click(); }
          break;

        case 'd':
        case 'D':
          if (inInspection) {
            e.preventDefault();
            annotationController.toggleDrawingMode();
          }
          break;

        case 'Delete':
        case 'Backspace':
          if (inInspection && appState.state.ui.isDrawingMode) {
            e.preventDefault();
            annotationController.clearBbox();
          }
          break;

        case 'f':
        case 'F':
          if (!inInspection) {
            e.preventDefault();
            $('#search-input')?.focus();
          }
          break;

        case 's':
        case 'S':
          if (inInspection && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            this._saveOnly();
          }
          break;

        case 'Enter':
          if (inInspection) {
            e.preventDefault();
            this._saveAndNext();
          }
          break;
      }
    });
  }

  _bindHashRouting() {
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.slice(1);

      if (hash.startsWith('inspect/')) {
        const id = hash.replace('inspect/', '');
        if (id !== String(this._currentLocationId)) {
          this.openInspection(id);
        }
      } else {
        if (appState.state.ui.currentView === 'inspection') {
          this.closeInspection();
        }
      }
    });

    // Handle initial hash on load
    const hash = window.location.hash.slice(1);
    if (hash.startsWith('inspect/')) {
      const id = hash.replace('inspect/', '');
      // Defer until locations are loaded
      eventBus.on('locations-loaded', () => {
        this.openInspection(id);
      });
    }
  }
}

export const uiController = new UIController();
