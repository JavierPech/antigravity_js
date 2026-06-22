/**
 * antigravity JS - Modern, Lightweight, Gooey Toast Notification Library
 * Dependency-free, styled with Bootstrap utility concepts and spring physics.
 */
(function (global, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define(factory);
  } else {
    global.antigravityJS = factory();
  }
})(this, function () {
  'use strict';

  class antigravityJS {
    /**
     * @param {Object} options Configuration options
     * @param {string} options.position Position on screen ('bottom-right', 'bottom-left', 'bottom-center', 'top-right', 'top-left', 'top-center')
     * @param {boolean} options.gooey Whether to enable gooey filter effect on backgrounds
     * @param {number} options.maxToasts Maximum number of toasts displayed concurrently
     * @param {number} options.gap Spacing between stacked toasts (in pixels)
     */
    constructor(options = {}) {
      this.position = options.position || 'bottom-right';
      this.gooey = options.gooey !== false;
      this.maxToasts = options.maxToasts || 5;
      this.gap = options.gap !== undefined ? options.gap : 16;

      this.toasts = [];      // Track active/visible toasts
      this.queue = [];       // Stack queue when maxToasts is reached
      this.toastCounter = 0; // Unique ID counter
      this.isPaused = false; // Hover state indicator

      this.container = null;
      this.bgLayer = null;
      this.contentLayer = null;

      this.init();
    }

    /**
     * Initializes SVG filters and layout container wrappers
     */
    init() {
      this.ensureSvgFilter();

      const containerId = `antigravity-container-${this.position}`;
      this.container = document.getElementById(containerId);

      if (!this.container) {
        this.container = document.createElement('div');
        this.container.id = containerId;
        this.container.className = `antigravity-container position-${this.position}`;
        document.body.appendChild(this.container);

        // Background gooey layer (isolated)
        this.bgLayer = document.createElement('div');
        this.bgLayer.className = `antigravity-bg-layer ${this.gooey ? 'antigravity-gooey-active' : ''}`;
        this.container.appendChild(this.bgLayer);

        // Foreground content layer (no filter)
        this.contentLayer = document.createElement('div');
        this.contentLayer.className = 'antigravity-content-layer';
        this.container.appendChild(this.contentLayer);

        // Setup hover pause listeners
        this.container.addEventListener('mouseenter', () => this.pauseTimers());
        this.container.addEventListener('mouseleave', () => this.resumeTimers());
      } else {
        this.bgLayer = this.container.querySelector('.antigravity-bg-layer');
        this.contentLayer = this.container.querySelector('.antigravity-content-layer');

        // Apply updated gooey state to existing container layers
        if (this.bgLayer) {
          if (this.gooey) {
            this.bgLayer.classList.add('antigravity-gooey-active');
          } else {
            this.bgLayer.classList.remove('antigravity-gooey-active');
          }
        }
      }
    }

    /**
     * Dynamically creates the shared SVG filters in the DOM if absent
     */
    ensureSvgFilter() {
      const filterId = 'antigravity-svg-filters';
      if (!document.getElementById(filterId)) {
        const svgNS = 'http://www.w3.org/2000/svg';
        const svgEl = document.createElementNS(svgNS, 'svg');
        svgEl.id = filterId;
        svgEl.setAttribute('style', 'position: absolute; width: 0; height: 0; pointer-events: none; overflow: hidden;');

        const defs = document.createElementNS(svgNS, 'defs');
        const filter = document.createElementNS(svgNS, 'filter');
        filter.id = 'antigravity-gooey';

        // Blur filter component
        const feGaussianBlur = document.createElementNS(svgNS, 'feGaussianBlur');
        feGaussianBlur.setAttribute('in', 'SourceGraphic');
        feGaussianBlur.setAttribute('stdDeviation', '6');
        feGaussianBlur.setAttribute('result', 'blur');

        // Matrix thresholding for gooey visual fidelity
        const feColorMatrix = document.createElementNS(svgNS, 'feColorMatrix');
        feColorMatrix.setAttribute('in', 'blur');
        feColorMatrix.setAttribute('mode', 'matrix');
        feColorMatrix.setAttribute('values', '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8');
        feColorMatrix.setAttribute('result', 'goo');

        filter.appendChild(feGaussianBlur);
        filter.appendChild(feColorMatrix);
        defs.appendChild(filter);
        svgEl.appendChild(defs);
        document.body.appendChild(svgEl);
      }
    }

    /**
     * Spawns a new toast notification
     * @param {Object} options Configuration parameters
     * @param {string} options.title Toast headline text
     * @param {string} options.message Subtext content details
     * @param {string} options.bootstrapContext Theme match: success, danger, warning, info, primary, dark, light
     * @param {number} options.duration Visible time limit in ms (0 for persistent)
     * @param {Function} options.onOpen Callback when toast enters the DOM
     * @param {Function} options.onClose Callback when toast starts to exit
     * @returns {number} Unique toast identifier
     */
    show(options = {}) {
      const id = ++this.toastCounter;
      const {
        title = '',
        message = '',
        bootstrapContext = 'info',
        duration = 5000,
        onOpen = null,
        onClose = null
      } = options;

      // Enforce a minimum display time of 5 seconds for temporary toasts
      const finalDuration = duration === 0 ? 0 : Math.max(duration, 5000);

      const toastObj = {
        id,
        title,
        message,
        bootstrapContext,
        duration: finalDuration,
        onOpen,
        onClose,
        element: null,
        bgElement: null,
        height: 0,
        timer: null,
        remaining: finalDuration + 600, // extend for dynamic slide intro
        lastStarted: 0,
        state: 'queued'
      };

      const activeCount = this.toasts.filter(t => t.state === 'active' || t.state === 'mounting').length;
      if (activeCount >= this.maxToasts) {
        this.queue.push(toastObj);
      } else {
        this.mountToast(toastObj);
      }

      return id;
    }

    /**
     * Inserts the toast elements into the active containers and starts animations
     * @param {Object} toastObj The prepared toast configuration object
     */
    mountToast(toastObj) {
      toastObj.state = 'mounting';
      this.toasts.push(toastObj);

      const config = this.getContextConfig(toastObj.bootstrapContext);

      // Create content container element
      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'antigravity-toast-content-wrapper';
      contentWrapper.id = `antigravity-content-${toastObj.id}`;

      // Assemble premium layout with responsive inner grid
      const contentHtml = `
        <div class="antigravity-toast-capsule ${config.textClass}">
          <div class="antigravity-icon-wrapper">
            ${this.getIconSvg(config.icon)}
          </div>
          <div class="antigravity-toast-content">
            ${toastObj.title ? `<div class="antigravity-toast-title">${toastObj.title}</div>` : ''}
            ${toastObj.message ? `<div class="antigravity-toast-message">${toastObj.message}</div>` : ''}
          </div>
          <button class="antigravity-close-btn" aria-label="Dismiss toast">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      `;
      contentWrapper.innerHTML = contentHtml;

      // Close button event trigger
      const closeBtn = contentWrapper.querySelector('.antigravity-close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.dismiss(toastObj.id);
        });
      }

      // Temporarily append content layer offscreen to query natural height
      contentWrapper.style.visibility = 'hidden';
      contentWrapper.style.position = 'absolute';
      contentWrapper.style.width = '100%';
      this.contentLayer.appendChild(contentWrapper);
      const measuredHeight = contentWrapper.offsetHeight;

      // Revert temporary positioning
      this.contentLayer.removeChild(contentWrapper);
      contentWrapper.style.visibility = '';
      contentWrapper.style.position = '';

      toastObj.height = measuredHeight;
      toastObj.element = contentWrapper;

      // Create matching background layout layer
      const bgWrapper = document.createElement('div');
      bgWrapper.className = 'antigravity-toast-bg-wrapper';
      bgWrapper.id = `antigravity-bg-${toastObj.id}`;
      bgWrapper.innerHTML = `<div class="antigravity-toast-bg ${config.bgClass}"></div>`;
      toastObj.bgElement = bgWrapper;

      // Coordinate initial properties to prepare for the spring physics entry
      const initX = this.getEntranceX();
      const initY = this.getEntranceY(measuredHeight);

      [contentWrapper, bgWrapper].forEach(w => {
        w.style.setProperty('--h', `${measuredHeight}px`);
        w.style.setProperty('--x', initX);
        w.style.setProperty('--y', initY);
        w.style.setProperty('--s', '0.7');
        w.style.setProperty('--o', '0');
      });

      // Insert both wrappers in parallel layers
      this.bgLayer.appendChild(bgWrapper);
      this.contentLayer.appendChild(contentWrapper);

      // Reflow trigger
      contentWrapper.offsetHeight;

      toastObj.state = 'active';
      this.updatePositions();

      // Trigger user-defined onOpen callback
      if (typeof toastObj.onOpen === 'function') {
        try {
          toastObj.onOpen(toastObj);
        } catch (err) {
          console.error('antigravityJS: Error inside onOpen callback:', err);
        }
      }

      // Configure dismiss schedules (starts countdown after intro settles)
      toastObj.lastStarted = Date.now();

      if (toastObj.duration > 0) {
        if (this.isPaused) {
          toastObj.timer = null;
        } else {
          toastObj.timer = setTimeout(() => {
            this.dismiss(toastObj.id);
          }, toastObj.duration + 600); // Smart Dynamic Extension
        }
      }
    }

    /**
     * Slide exit transitions and queued entries triggering
     * @param {number} id Unique identifier of the target toast
     */
    dismiss(id) {
      const toastIndex = this.toasts.findIndex(t => t.id === id);
      if (toastIndex === -1) return;

      const toast = this.toasts[toastIndex];
      if (toast.state === 'leaving') return;

      toast.state = 'leaving';

      if (toast.timer) {
        clearTimeout(toast.timer);
      }

      // Trigger user-defined onClose callback
      if (typeof toast.onClose === 'function') {
        try {
          toast.onClose(toast);
        } catch (err) {
          console.error('antigravityJS: Error inside onClose callback:', err);
        }
      }

      // Attach exit classes to initialize GPU transitions
      if (toast.element && toast.bgElement) {
        toast.element.classList.add('antigravity-leaving');
        toast.bgElement.classList.add('antigravity-leaving');
      }

      // Recalculate remaining layout shifts immediately
      this.updatePositions();

      // Clear DOM nodes after exit finishes (700ms transition)
      setTimeout(() => {
        this.cleanup(id);
      }, 700);

      // Mount next queue entry
      this.processQueue();
    }

    /**
     * Purges toast DOM nodes and memory associations
     * @param {number} id Unique identifier
     */
    cleanup(id) {
      const toastIndex = this.toasts.findIndex(t => t.id === id);
      if (toastIndex !== -1) {
        const toast = this.toasts[toastIndex];

        if (toast.element && toast.element.parentNode) {
          toast.element.parentNode.removeChild(toast.element);
        }
        if (toast.bgElement && toast.bgElement.parentNode) {
          toast.bgElement.parentNode.removeChild(toast.bgElement);
        }

        this.toasts.splice(toastIndex, 1);
      }
    }

    /**
     * Dismisses all active toasts, clears queues, and cleans containers
     */
    destroy() {
      this.queue = [];
      const activeIds = this.toasts.map(t => t.id);
      activeIds.forEach(id => this.dismiss(id));

      setTimeout(() => {
        if (this.container && this.container.parentNode && this.toasts.length === 0) {
          this.container.parentNode.removeChild(this.container);
          this.container = null;
          this.bgLayer = null;
          this.contentLayer = null;
        }
      }, 500);
    }

    /**
     * Recalculates stack translations and propagates values to CSS variables
     */
    updatePositions() {
      const activeToasts = this.toasts.filter(t => t.state === 'active' || t.state === 'mounting');
      const isBottom = this.position.startsWith('bottom-');

      let currentYOffset = 0;

      // Newest toast is at the end of the array, index activeToasts.length - 1
      for (let i = activeToasts.length - 1; i >= 0; i--) {
        const toast = activeToasts[i];
        const targetY = isBottom ? -currentYOffset : currentYOffset;

        if (toast.element && toast.bgElement) {
          toast.element.style.setProperty('--y', `${targetY}px`);
          toast.element.style.setProperty('--x', '0');
          toast.element.style.setProperty('--s', '1');
          toast.element.style.setProperty('--o', '1');

          toast.bgElement.style.setProperty('--y', `${targetY}px`);
          toast.bgElement.style.setProperty('--x', '0');
          toast.bgElement.style.setProperty('--s', '1');
          toast.bgElement.style.setProperty('--o', '1');
        }

        currentYOffset += toast.height + this.gap;
      }
    }

    /**
     * Mounts another toast if workspace has capacity
     */
    processQueue() {
      if (this.queue.length > 0) {
        const activeCount = this.toasts.filter(t => t.state === 'active' || t.state === 'mounting').length;
        if (activeCount < this.maxToasts) {
          const nextToast = this.queue.shift();
          this.mountToast(nextToast);
        }
      }
    }

    /**
     * Suspends visible timers on container hover
     */
    pauseTimers() {
      this.isPaused = true;
      this.toasts.forEach(toast => {
        if (toast.state === 'active' && toast.duration > 0 && toast.timer) {
          clearTimeout(toast.timer);
          toast.timer = null;
          toast.remaining -= (Date.now() - toast.lastStarted);
          if (toast.remaining < 0) toast.remaining = 0;
        }
      });
    }

    /**
     * Resumes visible timers on container mouseleave
     */
    resumeTimers() {
      this.isPaused = false;
      this.toasts.forEach(toast => {
        if (toast.state === 'active' && toast.duration > 0 && !toast.timer) {
          toast.lastStarted = Date.now();
          toast.timer = setTimeout(() => {
            this.dismiss(toast.id);
          }, toast.remaining);
        }
      });
    }

    /**
     * Computes initial horizontal transition values
     */
    getEntranceX() {
      if (this.position.endsWith('-right')) return '120%';
      if (this.position.endsWith('-left')) return '-120%';
      return '0';
    }

    /**
     * Computes initial vertical transition values
     */
    getEntranceY(height) {
      if (this.position.startsWith('bottom-')) return `${height + 40}px`;
      return `-${height + 40}px`;
    }

    /**
     * Maps user context option to the pre-styled premium classes
     * @param {string} context Success, Danger, Warning, Info, Primary, Dark, Light
     */
    getContextConfig(context) {
      const contexts = {
        success: { bgClass: 'antigravity-bg-success', textClass: 'antigravity-text-success', icon: 'success' },
        danger: { bgClass: 'antigravity-bg-danger', textClass: 'antigravity-text-danger', icon: 'danger' },
        warning: { bgClass: 'antigravity-bg-warning', textClass: 'antigravity-text-warning', icon: 'warning' },
        info: { bgClass: 'antigravity-bg-info', textClass: 'antigravity-text-info', icon: 'info' },
        primary: { bgClass: 'antigravity-bg-primary', textClass: 'antigravity-text-primary', icon: 'primary' },
        dark: { bgClass: 'antigravity-bg-dark', textClass: 'antigravity-text-dark', icon: 'dark' },
        light: { bgClass: 'antigravity-bg-light', textClass: 'antigravity-text-light', icon: 'light' }
      };

      return contexts[context] || { bgClass: `bg-${context}`, textClass: 'text-white', icon: 'info' };
    }

    /**
     * Returns inline Feather-inspired SVG icons
     * @param {string} iconName Target icon details
     */
    getIconSvg(iconName) {
      const icons = {
        success: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="antigravity-svg-success"><circle class="antigravity-svg-circle" cx="12" cy="12" r="10"></circle><polyline class="antigravity-svg-check" points="22 4 12 14.01 9 11.01"></polyline></svg>`,
        danger: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="antigravity-svg-danger"><circle class="antigravity-svg-circle" cx="12" cy="12" r="10"></circle><line class="antigravity-svg-line1" x1="15" y1="9" x2="9" y2="15"></line><line class="antigravity-svg-line2" x1="9" y1="9" x2="15" y2="15"></line></svg>`,
        warning: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="antigravity-svg-warning"><path class="antigravity-svg-triangle" d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line class="antigravity-svg-stem" x1="12" y1="9" x2="12" y2="13"></line><line class="antigravity-svg-dot" x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
        info: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="antigravity-svg-info"><circle class="antigravity-svg-circle" cx="12" cy="12" r="10"></circle><line class="antigravity-svg-stem" x1="12" y1="16" x2="12" y2="12"></line><line class="antigravity-svg-dot" x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
        primary: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="antigravity-svg-bell"><path class="antigravity-svg-bell-body" d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path class="antigravity-svg-bell-clapper" d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`
      };
      return icons[iconName] || icons.info;
    }
  }

  return antigravityJS;
});

