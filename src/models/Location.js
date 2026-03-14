/** Location model — mirrors Supabase cantire_loc table */
export class Location {
  constructor(row) {
    this.id = row.id;
    this.latitude = row.latitude;
    this.longitude = row.longitude;
    this.name = row.name || 'Canadian Tire';
    this.address = row.address || '';
    this.category = row.category || '';
    this.standStatus = row.stand_status ?? null;
    this.standBbox = row.stand_bbox ?? null;
    this.standView = row.stand_view ?? null;
  }

  getStatus() {
    if (!this.standStatus) return 'unvisited';
    return this.standStatus;
  }

  getMarkerColor() {
    const colors = { 'stand-found': '#10b981', 'no-stand': '#ef4444', 'no-cantire': '#f59e0b', 'insufficient-view': '#8b5cf6', unvisited: '#9ca3af' };
    return colors[this.getStatus()] || '#9ca3af';
  }

  getStatusLabel() {
    const labels = { 'stand-found': 'Stand Found', 'no-stand': 'No Stand', 'no-cantire': 'No Canadian Tire', 'insufficient-view': 'Insufficient View', unvisited: 'Not Yet Inspected' };
    return labels[this.getStatus()] || 'Unknown';
  }

  getMarkerIcon() {
    const icons = { 'stand-found': '✓', 'no-stand': '✕', 'no-cantire': '⊘', 'insufficient-view': '?', unvisited: '•' };
    return icons[this.getStatus()] || '•';
  }

  /** Convert back to Supabase row format */
  toSupabaseUpdate() {
    return {
      stand_status: this.standStatus,
      stand_bbox: this.standBbox,
      stand_view: this.standView,
    };
  }

  static fromRow(row) {
    return new Location(row);
  }
}
