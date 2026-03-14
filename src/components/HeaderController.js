import { appState } from '../state/AppState.js';
import { eventBus } from '../state/EventBus.js';
import { $, show, hide, announce } from '../utils/domUtils.js';
import { formatPct, formatCount } from '../utils/formatters.js';

/** Controls the header: search, stats, help */
export class HeaderController {
  constructor() {
    this._searchInput = null;
    this._debounceTimer = null;
  }

  init() {
    this._searchInput = $('#search-input');
    this._bindSearch();

    // Update stats on state changes
    eventBus.on('state-changed', () => this.updateStats());
    eventBus.on('inspection-saved', () => this.updateStats());
  }

  /** Update the progress bar and stats text */
  updateStats() {
    const stats = appState.getStats();
    const progressBar = $('.header__progress-bar');
    const foundBar = $('#progress-found');
    const notFoundBar = $('#progress-not-found');
    const statsText = $('#stats-text');

    if (stats.total === 0) return;

    const foundPct = (stats.standFound / stats.total) * 100;
    const otherInspectedPct = ((stats.noStand + stats.noCantire + stats.insufficientView) / stats.total) * 100;

    if (foundBar) foundBar.style.width = `${foundPct}%`;
    if (notFoundBar) notFoundBar.style.width = `${otherInspectedPct}%`;
    if (statsText) statsText.textContent = `\u{1F32D} ${stats.standFound} found \u00B7 ${stats.inspected} / ${stats.total} inspected`;
    if (progressBar) {
      progressBar.setAttribute('aria-valuenow', stats.pct);
      progressBar.setAttribute('aria-valuetext', `${stats.pct}% inspected`);
    }
  }

  _bindSearch() {
    if (!this._searchInput) return;

    this._searchInput.addEventListener('input', () => {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => {
        const term = this._searchInput.value.trim();
        appState.setState({ filters: { ...appState.state.filters, searchTerm: term } });
        eventBus.emit('search-changed', { term });
      }, 250);
    });
  }
}

export const headerController = new HeaderController();
