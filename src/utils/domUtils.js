/** DOM utility helpers */

export function $(selector, parent = document) {
  return parent.querySelector(selector);
}

export function $$(selector, parent = document) {
  return [...parent.querySelectorAll(selector)];
}

export function show(el) {
  if (el) el.classList.remove('is-hidden');
}

export function hide(el) {
  if (el) el.classList.add('is-hidden');
}

export function toggle(el, visible) {
  if (el) el.classList.toggle('is-hidden', !visible);
}

/** Create an element with attributes and children */
export function createElement(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs)) {
    if (key === 'className') {
      el.className = val;
    } else if (key === 'textContent') {
      el.textContent = val;
    } else if (key.startsWith('on')) {
      el.addEventListener(key.slice(2).toLowerCase(), val);
    } else {
      el.setAttribute(key, val);
    }
  }
  children.forEach(child => {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else if (child) {
      el.appendChild(child);
    }
  });
  return el;
}

/** Show a toast notification */
export function showToast(message, type = 'info', duration = 3000) {
  const toast = createElement('div', {
    className: `toast toast--${type}`,
    role: 'status',
    'aria-live': 'polite',
    textContent: message,
  });
  const container = $('#toast-container') || document.body;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('is-visible'));

  setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/** Announce to screen readers via live region */
export function announce(message) {
  const region = $('#sr-announcements');
  if (region) {
    region.textContent = message;
    setTimeout(() => { region.textContent = ''; }, 1000);
  }
}
