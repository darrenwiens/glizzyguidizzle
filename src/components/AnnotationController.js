import { appState } from '../state/AppState.js';
import { eventBus } from '../state/EventBus.js';
import { $, announce } from '../utils/domUtils.js';

/** Controls the HTML5 Canvas overlay for bounding box annotation */
export class AnnotationController {
  constructor() {
    this._canvas = null;
    this._ctx = null;
    this._isDrawing = false;
    this._startX = 0;
    this._startY = 0;
    this._currentBbox = null; // [x1, y1, x2, y2] normalized 0-1

    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
  }

  /** Initialize with the canvas element */
  init() {
    this._canvas = $('#annotation-canvas');
    this._ctx = this._canvas.getContext('2d');
    this._resizeCanvas();

    window.addEventListener('resize', () => this._resizeCanvas());

    // Bind toolbar buttons
    const drawBtn = $('#draw-btn');
    const clearBtn = $('#clear-bbox-btn');

    if (drawBtn) {
      drawBtn.addEventListener('click', () => this.toggleDrawingMode());
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearBbox());
    }
  }

  /** Toggle drawing mode on/off */
  toggleDrawingMode() {
    const isDrawing = !appState.state.ui.isDrawingMode;
    appState.setState({ ui: { ...appState.state.ui, isDrawingMode: isDrawing } });

    if (isDrawing) {
      this._enableDrawing();
      announce('Drawing mode enabled. Click and drag to draw a bounding box.');
    } else {
      this._disableDrawing();
      announce('Drawing mode disabled.');
    }

    const drawBtn = $('#draw-btn');
    if (drawBtn) drawBtn.classList.toggle('is-active', isDrawing);
  }

  /** Clear bounding box */
  clearBbox() {
    this._currentBbox = null;
    this._clearCanvas();
    eventBus.emit('bbox-changed', { bbox: null });
    announce('Bounding box cleared.');
  }

  /** Get the current bounding box (normalized 0-1) */
  getBbox() {
    return this._currentBbox;
  }

  /** Set a bbox (e.g., loading from saved data) */
  setBbox(bbox) {
    this._currentBbox = bbox;
    if (bbox) {
      this._drawBbox(bbox);
    } else {
      this._clearCanvas();
    }
  }

  /** Reset state when leaving inspection view */
  reset() {
    this._disableDrawing();
    this._currentBbox = null;
    this._clearCanvas();
    appState.setState({ ui: { ...appState.state.ui, isDrawingMode: false } });
    const drawBtn = $('#draw-btn');
    if (drawBtn) drawBtn.classList.remove('is-active');
  }

  // --- Private ---

  _resizeCanvas() {
    if (!this._canvas) return;
    const wrapper = this._canvas.parentElement;
    this._canvas.width = wrapper.clientWidth;
    this._canvas.height = wrapper.clientHeight;
    // Redraw if we have a bbox
    if (this._currentBbox) {
      this._drawBbox(this._currentBbox);
    }
  }

  _enableDrawing() {
    this._resizeCanvas();
    this._canvas.classList.add('is-drawing');
    this._canvas.addEventListener('mousedown', this._onMouseDown);
    this._canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
  }

  _disableDrawing() {
    this._canvas.classList.remove('is-drawing');
    this._canvas.removeEventListener('mousedown', this._onMouseDown);
    this._canvas.removeEventListener('touchstart', this._onTouchStart);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup', this._onMouseUp);
    document.removeEventListener('touchmove', this._onTouchMove);
    document.removeEventListener('touchend', this._onTouchEnd);
    this._isDrawing = false;
  }

  _onMouseDown(e) {
    e.preventDefault();
    const rect = this._canvas.getBoundingClientRect();
    this._startX = e.clientX - rect.left;
    this._startY = e.clientY - rect.top;
    this._isDrawing = true;
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mouseup', this._onMouseUp);
  }

  _onMouseMove(e) {
    if (!this._isDrawing) return;
    const rect = this._canvas.getBoundingClientRect();
    const curX = e.clientX - rect.left;
    const curY = e.clientY - rect.top;
    this._drawPreview(this._startX, this._startY, curX, curY);
  }

  _onMouseUp(e) {
    if (!this._isDrawing) return;
    const rect = this._canvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;
    this._finishDrawing(this._startX, this._startY, endX, endY);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup', this._onMouseUp);
  }

  _onTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = this._canvas.getBoundingClientRect();
    this._startX = touch.clientX - rect.left;
    this._startY = touch.clientY - rect.top;
    this._isDrawing = true;
    document.addEventListener('touchmove', this._onTouchMove, { passive: false });
    document.addEventListener('touchend', this._onTouchEnd);
  }

  _onTouchMove(e) {
    if (!this._isDrawing) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = this._canvas.getBoundingClientRect();
    const curX = touch.clientX - rect.left;
    const curY = touch.clientY - rect.top;
    this._drawPreview(this._startX, this._startY, curX, curY);
  }

  _onTouchEnd(e) {
    if (!this._isDrawing) return;
    const touch = e.changedTouches[0];
    const rect = this._canvas.getBoundingClientRect();
    const endX = touch.clientX - rect.left;
    const endY = touch.clientY - rect.top;
    this._finishDrawing(this._startX, this._startY, endX, endY);
    document.removeEventListener('touchmove', this._onTouchMove);
    document.removeEventListener('touchend', this._onTouchEnd);
  }

  _finishDrawing(x1, y1, x2, y2) {
    this._isDrawing = false;

    // Normalize to 0-1 range
    const w = this._canvas.width;
    const h = this._canvas.height;
    const bbox = [
      Math.min(x1, x2) / w,
      Math.min(y1, y2) / h,
      Math.max(x1, x2) / w,
      Math.max(y1, y2) / h,
    ];

    // Reject tiny bboxes (accidental clicks)
    if (Math.abs(bbox[2] - bbox[0]) < 0.01 || Math.abs(bbox[3] - bbox[1]) < 0.01) {
      this._clearCanvas();
      return;
    }

    this._currentBbox = bbox;
    this._drawBbox(bbox);
    eventBus.emit('bbox-changed', { bbox });
    announce('Bounding box drawn.');
  }

  _drawPreview(x1, y1, x2, y2) {
    this._clearCanvas();
    this._ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
    this._ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
    this._ctx.lineWidth = 2;
    this._ctx.setLineDash([6, 3]);
    const rx = Math.min(x1, x2);
    const ry = Math.min(y1, y2);
    const rw = Math.abs(x2 - x1);
    const rh = Math.abs(y2 - y1);
    this._ctx.fillRect(rx, ry, rw, rh);
    this._ctx.strokeRect(rx, ry, rw, rh);
    this._ctx.setLineDash([]);
  }

  _drawBbox(bbox) {
    this._clearCanvas();
    const w = this._canvas.width;
    const h = this._canvas.height;
    const x = bbox[0] * w;
    const y = bbox[1] * h;
    const bw = (bbox[2] - bbox[0]) * w;
    const bh = (bbox[3] - bbox[1]) * h;

    this._ctx.strokeStyle = 'rgba(59, 130, 246, 0.9)';
    this._ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
    this._ctx.lineWidth = 2;
    this._ctx.fillRect(x, y, bw, bh);
    this._ctx.strokeRect(x, y, bw, bh);

    // Corner handles
    const handleSize = 6;
    this._ctx.fillStyle = '#3b82f6';
    [[x, y], [x + bw, y], [x, y + bh], [x + bw, y + bh]].forEach(([cx, cy]) => {
      this._ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
    });
  }

  _clearCanvas() {
    if (!this._ctx) return;
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
  }
}

export const annotationController = new AnnotationController();
