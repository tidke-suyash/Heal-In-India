// ============================================================
// HEAL IN INDIA — Core App JS
// Supabase client, auth state, API helpers, navigation
// ============================================================

// ---- Supabase client (reads from window.APP_CONFIG set inline) ----
const SUPABASE_URL = window.APP_CONFIG?.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = window.APP_CONFIG?.SUPABASE_ANON_KEY || '';

let supabase = null;
if (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ============================================================
// API HELPER
// ============================================================

const API = {
  baseUrl: '/api',

  async request(method, path, body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    const storedToken = token || Auth.getToken();
    if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;

    const config = { method, headers };
    if (body && method !== 'GET') config.body = JSON.stringify(body);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, config);
      const data = await res.json().catch(() => ({ error: 'Invalid response from server' }));
      if (!res.ok) throw { status: res.status, message: data.error || 'Request failed', data };
      return data;
    } catch (err) {
      if (err.status) throw err;
      throw { status: 0, message: 'Network error. Please check your connection.' };
    }
  },

  get: (path, token) => API.request('GET', path, null, token),
  post: (path, body, token) => API.request('POST', path, body, token),
  put: (path, body, token) => API.request('PUT', path, body, token),
  patch: (path, body, token) => API.request('PATCH', path, body, token),
  delete: (path, token) => API.request('DELETE', path, null, token),
};

// ============================================================
// AUTH STATE MANAGER
// ============================================================

const Auth = {
  _user: null,
  _session: null,

  init() {
    const saved = localStorage.getItem('hii_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this._session = parsed.session;
        this._user = parsed.user;
      } catch {}
    }
    this.updateUI();
  },

  save(user, session) {
    this._user = user;
    this._session = session;
    localStorage.setItem('hii_session', JSON.stringify({ user, session }));
    this.updateUI();
  },

  clear() {
    this._user = null;
    this._session = null;
    localStorage.removeItem('hii_session');
    this.updateUI();
  },

  getToken() {
    return this._session?.access_token || null;
  },

  getUser() {
    return this._user;
  },

  isLoggedIn() {
    return !!this._user && !!this._session?.access_token;
  },

  hasRole(role) {
    return this._user?.role === role;
  },

  requireAuth(redirectTo = '/login.html') {
    if (!this.isLoggedIn()) {
      const current = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `${redirectTo}?redirect=${current}`;
      return false;
    }
    return true;
  },

  requireRole(role, redirectTo = '/dashboard.html') {
    if (!this.requireAuth()) return false;
    if (this._user?.role !== role && this._user?.role !== 'admin') {
      UI.showAlert(`Access denied. This page requires the ${role} role.`, 'error');
      setTimeout(() => window.location.href = redirectTo, 2000);
      return false;
    }
    return true;
  },

  updateUI() {
    const user = this._user;
    // Update nav auth buttons
    document.querySelectorAll('[data-auth-show]').forEach(el => {
      const show = el.dataset.authShow; // 'loggedIn', 'loggedOut', 'admin', 'patient', 'clinic'
      let shouldShow = false;
      if (show === 'loggedIn') shouldShow = !!user;
      else if (show === 'loggedOut') shouldShow = !user;
      else if (show === 'admin') shouldShow = user?.role === 'admin';
      else if (show === 'patient') shouldShow = user?.role === 'patient';
      else if (show === 'clinic') shouldShow = user?.role === 'clinic';
      el.classList.toggle('hidden', !shouldShow);
    });

    // Update user name displays
    document.querySelectorAll('[data-user-name]').forEach(el => {
      el.textContent = user?.full_name || '';
    });

    document.querySelectorAll('[data-user-role]').forEach(el => {
      el.textContent = user?.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : '';
    });
  },

  async logout() {
    try {
      await API.post('/auth/logout');
    } catch {}
    this.clear();
    window.location.href = '/';
  }
};

// ============================================================
// UI UTILITIES
// ============================================================

const UI = {
  showAlert(message, type = 'info', container = null, duration = 5000) {
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const alertEl = document.createElement('div');
    alertEl.className = `alert alert-${type}`;
    alertEl.setAttribute('role', 'alert');
    alertEl.innerHTML = `<span class="alert-icon">${icons[type] || 'ℹ'}</span><span>${message}</span>`;

    const target = container || document.getElementById('alert-container') || document.body;
    target.prepend(alertEl);

    if (duration > 0) {
      setTimeout(() => alertEl.remove(), duration);
    }
    return alertEl;
  },

  showLoading(text = 'Loading...') {
    let overlay = document.getElementById('loading-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'loading-overlay';
      overlay.className = 'loading-overlay';
      overlay.innerHTML = `<div class="spinner"></div><p style="color: var(--text-secondary); font-size: 0.9rem;">${text}</p>`;
      document.body.appendChild(overlay);
    }
  },

  hideLoading() {
    document.getElementById('loading-overlay')?.remove();
  },

  setButtonLoading(btn, loading, text = null) {
    if (loading) {
      btn.disabled = true;
      btn._originalText = btn.textContent;
      btn.classList.add('loading');
      if (text) btn.textContent = text;
    } else {
      btn.disabled = false;
      btn.classList.remove('loading');
      if (btn._originalText) btn.textContent = btn._originalText;
    }
  },

  formatCurrency(amount, currency = 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    }).format(amount);
  },

  formatDate(dateStr, options = {}) {
    if (!dateStr) return '—';
    const opts = { year: 'numeric', month: 'short', day: 'numeric', ...options };
    return new Date(dateStr).toLocaleDateString('en-IN', opts);
  },

  formatRelative(dateStr) {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    if (days < 7) return `${days}d ago`;
    return this.formatDate(dateStr);
  },

  renderStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    let html = '<span class="stars">';
    for (let i = 1; i <= 5; i++) {
      if (i <= full) html += '<span class="star">★</span>';
      else if (i === full + 1 && half) html += '<span class="star">⯨</span>';
      else html += '<span class="star empty">★</span>';
    }
    html += '</span>';
    return html;
  },

  getClinicTypeLabel(type) {
    const labels = {
      ayurveda: 'Ayurveda',
      panchakarma: 'Panchakarma',
      modern_medicine: 'Modern Medicine',
      wellness_retreat: 'Wellness Retreat',
      diagnostics: 'Diagnostics',
      integrated: 'Integrated Care'
    };
    return labels[type] || type;
  },

  getClinicTypeEmoji(type) {
    const emojis = {
      ayurveda: '🌿',
      panchakarma: '💫',
      modern_medicine: '🏥',
      wellness_retreat: '🧘',
      diagnostics: '🔬',
      integrated: '⚕️'
    };
    return emojis[type] || '🌿';
  },

  getStatusBadge(status) {
    const config = {
      pending: { class: 'badge-warning', label: 'Pending', icon: '⏳' },
      confirmed: { class: 'badge-green', label: 'Confirmed', icon: '✓' },
      completed: { class: 'badge-teal', label: 'Completed', icon: '✔️' },
      cancelled: { class: 'badge-error', label: 'Cancelled', icon: '✕' },
      refund_requested: { class: 'badge-saffron', label: 'Refund Requested', icon: '↩' },
      approved: { class: 'badge-green', label: 'Approved', icon: '✓' },
      rejected: { class: 'badge-error', label: 'Rejected', icon: '✕' },
      more_docs_required: { class: 'badge-warning', label: 'Docs Needed', icon: '📋' },
      suspended: { class: 'badge-error', label: 'Suspended', icon: '⛔' }
    };
    const c = config[status] || { class: 'badge-gray', label: status, icon: '•' };
    return `<span class="badge ${c.class}">${c.icon} ${c.label}</span>`;
  },

  copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      this.showAlert('Copied to clipboard!', 'success', null, 2000);
    });
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      // Focus trap
      const focusable = modal.querySelectorAll('button, input, select, textarea, a[href]');
      if (focusable.length) focusable[0].focus();
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  },

  // Initialize close-on-backdrop for all modals
  initModals() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) this.closeModal(overlay.id);
      });
    });
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.closeModal || btn.closest('.modal-overlay')?.id;
        if (modalId) this.closeModal(modalId);
      });
    });
    document.querySelectorAll('[data-open-modal]').forEach(btn => {
      btn.addEventListener('click', () => this.openModal(btn.dataset.openModal));
    });
  }
};

// ============================================================
// NAVIGATION
// ============================================================

const Nav = {
  init() {
    // Hamburger menu
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navbar-nav');
    if (hamburger && navMenu) {
      hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('open');
        hamburger.setAttribute('aria-expanded', navMenu.classList.contains('open'));
      });
      // Close on nav link click (mobile)
      navMenu.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => navMenu.classList.remove('open'));
      });
    }

    // Active link highlighting
    const currentPath = window.location.pathname;
    document.querySelectorAll('.nav-link').forEach(link => {
      const href = link.getAttribute('href');
      if (href && (currentPath === href || (href !== '/' && currentPath.startsWith(href.replace('.html', ''))))) {
        link.classList.add('active');
      }
    });

    // Scroll-based navbar shadow
    const navbar = document.querySelector('.navbar');
    if (navbar) {
      const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 10);
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    // Logout button
    document.querySelectorAll('[data-logout]').forEach(btn => {
      btn.addEventListener('click', e => { e.preventDefault(); Auth.logout(); });
    });
  }
};

// ============================================================
// AI CHAT WIDGET
// ============================================================

const AIChat = {
  history: [],
  isOpen: false,

  init() {
    const trigger = document.getElementById('ai-chat-trigger');
    const panel = document.getElementById('ai-chat-panel');
    const closeBtn = document.getElementById('ai-chat-close');
    const input = document.getElementById('ai-chat-input');
    const sendBtn = document.getElementById('ai-chat-send');

    if (!trigger || !panel) return;

    trigger.addEventListener('click', () => this.toggle());
    closeBtn?.addEventListener('click', () => this.close());

    sendBtn?.addEventListener('click', () => this.send());
    input?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
    });

    // Show welcome message
    this.addMessage('ai', `🌿 **Welcome to Heal in India!** I'm your AI wellness navigator. I can help you:
- Discover Ayurveda, Panchakarma & wellness treatments
- Find the right clinics for your needs
- Learn about medical tourism & Ayush Visa

*⚠️ I provide general wellness guidance only, not medical diagnosis.*

How can I help you today?`);
  },

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  },

  open() {
    this.isOpen = true;
    document.getElementById('ai-chat-panel')?.classList.remove('hidden');
    document.getElementById('ai-chat-input')?.focus();
  },

  close() {
    this.isOpen = false;
    document.getElementById('ai-chat-panel')?.classList.add('hidden');
  },

  addMessage(role, content) {
    const messages = document.getElementById('ai-chat-messages');
    if (!messages) return;

    const div = document.createElement('div');
    div.className = `chat-message ${role}`;
    // Simple markdown-like rendering
    div.innerHTML = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>')
      .replace(/^- (.+)/gm, '<li>$1</li>');
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;

    if (role !== 'system') {
      this.history.push({ role: role === 'ai' ? 'model' : 'user', content });
    }
  },

  showTyping() {
    const messages = document.getElementById('ai-chat-messages');
    const div = document.createElement('div');
    div.id = 'ai-typing';
    div.className = 'chat-message ai';
    div.innerHTML = '<span class="spinner spinner-sm" style="display:inline-block"></span>';
    messages?.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  },

  hideTyping() {
    document.getElementById('ai-typing')?.remove();
  },

  async send() {
    const input = document.getElementById('ai-chat-input');
    const sendBtn = document.getElementById('ai-chat-send');
    if (!input) return;

    const message = input.value.trim();
    if (!message) return;

    input.value = '';
    input.disabled = true;
    if (sendBtn) sendBtn.disabled = true;

    this.addMessage('user', message);
    this.showTyping();

    try {
      const data = await API.post('/ai/chat', {
        message,
        history: this.history.slice(-10)
      });

      this.hideTyping();

      if (data.isEmergency) {
        const div = document.createElement('div');
        div.className = 'chat-message emergency';
        div.innerHTML = data.response.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        document.getElementById('ai-chat-messages')?.appendChild(div);
      } else {
        this.addMessage('ai', data.response);
      }
    } catch (err) {
      this.hideTyping();
      this.addMessage('ai', '⚠️ Sorry, I\'m having trouble connecting. Please try again in a moment.');
    } finally {
      input.disabled = false;
      if (sendBtn) sendBtn.disabled = false;
      input.focus();
    }
  }
};

// ============================================================
// NOTIFICATIONS
// ============================================================

const Notifications = {
  async loadCount() {
    if (!Auth.isLoggedIn()) return;
    try {
      const data = await API.get('/notifications');
      const unread = data.filter(n => !n.is_read).length;
      const badge = document.getElementById('notif-badge');
      if (badge) {
        badge.textContent = unread > 9 ? '9+' : unread;
        badge.classList.toggle('hidden', unread === 0);
      }
    } catch {}
  }
};

// ============================================================
// COOKIE CONSENT
// ============================================================

const CookieConsent = {
  init() {
    if (localStorage.getItem('hii_cookie_consent')) return;
    const banner = document.getElementById('cookie-banner');
    if (banner) {
      banner.classList.remove('hidden');
      banner.querySelector('#cookie-accept')?.addEventListener('click', () => {
        localStorage.setItem('hii_cookie_consent', '1');
        banner.remove();
      });
    }
  }
};

// ============================================================
// INITIALIZE ON DOM READY
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
  Nav.init();
  UI.initModals();
  AIChat.init();
  CookieConsent.init();
  Notifications.loadCount();
});

// Make available globally
window.App = { API, Auth, UI, Nav, AIChat, Notifications };
