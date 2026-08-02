(() => {
  'use strict';

  let emails = JSON.parse(JSON.stringify(EMAILS));
  let currentView = 'inbox';
  let currentCategory = 'Primary';
  let currentLabel = null;
  let searchQuery = '';
  let selectedIds = new Set();
  let currentEmailId = null;
  let idCounter = emails.length + 1;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const viewNames = {
    inbox: 'Inbox',
    starred: 'Starred',
    snoozed: 'Snoozed',
    sent: 'Sent',
    drafts: 'Drafts',
    important: 'Important',
    trash: 'Trash',
    spam: 'Spam',
  };

  /* ---------------- helpers ---------------- */

  const stripHtml = (html) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || '';
  };

  const isVisibleInView = (e) => {
    switch (currentView) {
      case 'inbox':
        return !e.sent && !e.spam && !e.draft && !e.trashed;
      case 'starred':
        return e.starred && !e.sent;
      case 'snoozed':
        return !!e.snoozed;
      case 'sent':
        return !!e.sent;
      case 'drafts':
        return !!e.draft;
      case 'important':
        return !!e.important;
      case 'trash':
        return !!e.trashed;
      case 'spam':
        return !!e.spam;
      default:
        if (currentView.startsWith('label:')) {
          return e.labels && e.labels.includes(currentLabel);
        }
        return false;
    }
  };

  const getVisibleEmails = () => {
    let list = emails.filter((e) => isVisibleInView(e));
    if (currentView === 'inbox') {
      list = list.filter((e) => (e.category || 'Primary') === currentCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((e) =>
        [e.from, e.fromEmail, e.to, e.subject, e.snippet, stripHtml(e.body)]
          .join(' ')
          .toLowerCase()
          .includes(q)
      );
    }
    return list.sort((a, b) => b.id - a.id);
  };

  const unreadCount = () =>
    emails.filter((e) => !e.sent && !e.spam && !e.draft && !e.trashed && !e.read).length;

  const unreadCountInbox = () =>
    emails.filter((e) => !e.sent && !e.spam && !e.draft && !e.trashed && !e.read).length;

  const toast = (msg) => {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.add('hidden'), 3000);
  };

  const avatarFor = (e) => e.avatar || e.from.charAt(0).toUpperCase();

  /* ---------------- rendering ---------------- */

  function renderList() {
    const list = getVisibleEmails();
    const el = $('#emailList');
    el.innerHTML = '';

    if (!list.length) {
      el.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm0-16H4l8 5 8-5z"/></svg>
          <p>${searchQuery ? 'No results found.' : 'No messages in this view.'}</p>
        </div>`;
    }

    list.forEach((e) => {
      const row = document.createElement('div');
      row.className = 'email-row' + (e.read ? '' : ' unread') + (selectedIds.has(e.id) ? ' selected' : '');
      row.dataset.id = e.id;

      const starSvg = `<svg class="${e.starred ? 'filled' : ''}" viewBox="0 0 24 24"><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`;

      const labelChips = (e.labels || [])
        .map((l) => `<span class="email-label-chip" style="color:${(LABELS.find(x => x.name === l) || {}).color || '#5f6368'}">${l}</span>`)
        .join('');

      const attach = e.attachments ? `<span class="email-attach"><svg viewBox="0 0 24 24"><path d="M16.5 6v11.5a4 4 0 0 1-8 0V5a2.5 2.5 0 0 1 5 0v10.5a1 1 0 0 1-2 0V6H10v9.5a2.5 2.5 0 0 0 5 0V5a4 4 0 0 0-8 0v12.5a5.5 5.5 0 0 0 11 0V6h-1.5z"/></svg></span>` : '';

      row.innerHTML = `
        <span class="email-check">
          <input type="checkbox" ${selectedIds.has(e.id) ? 'checked' : ''} />
        </span>
        <span class="email-star" data-star="${e.id}">${starSvg}</span>
        <span class="email-avatar" style="background:${e.avatarColor}">${avatarFor(e)}</span>
        <span class="email-from">${e.from}</span>
        <span class="email-subject-snippet">
          <b>${e.subject}</b>
          <span class="snippet"> — ${e.snippet}</span>
        </span>
        <span class="email-attr">
          ${attach}
          ${labelChips}
          <span class="email-date">${e.date}</span>
        </span>`;

      const checkbox = row.querySelector('input');
      checkbox.addEventListener('click', (ev) => {
        ev.stopPropagation();
        toggleSelect(e.id, checkbox.checked);
      });
      row.querySelector('.email-star').addEventListener('click', (ev) => {
        ev.stopPropagation();
        e.starred = !e.starred;
        renderList();
        updateNav();
      });
      row.addEventListener('click', () => openEmail(e.id));

      el.appendChild(row);
    });

    updateToolbar(list);
    updateSelectAll();
  }

  function updateToolbar(list) {
    const total = list.length;
    const checked = list.filter((e) => selectedIds.has(e.id)).length;
    $('#toolbarCount').textContent = checked ? `${checked} of ${total}` : `${total}`;
  }

  function updateSelectAll() {
    const list = getVisibleEmails();
    const allSelected = list.length > 0 && list.every((e) => selectedIds.has(e.id));
    $('#selectAllBtn').innerHTML = allSelected
      ? '<svg viewBox="0 0 24 24"><path fill="#5f6368" d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-9 14-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>'
      : '<svg viewBox="0 0 24 24"><path fill="#5f6368" d="M19 5v14H5V5h14zm0-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"/></svg>';
  }

  function toggleSelect(id, on) {
    if (on) selectedIds.add(id);
    else selectedIds.delete(id);
    const row = document.querySelector(`.email-row[data-id="${id}"]`);
    if (row) row.classList.toggle('selected', on);
    updateToolbar(getVisibleEmails());
    updateSelectAll();
  }

  function openEmail(id) {
    const e = emails.find((x) => x.id === id);
    if (!e) return;
    currentEmailId = id;
    e.read = true;

    $('#emailContent').innerHTML = `
      <h1>${e.subject}</h1>
      <div class="email-meta">
        <span class="email-avatar" style="background:${e.avatarColor}">${avatarFor(e)}</span>
        <div class="who">
          <div class="from-name">${e.from}</div>
          <div class="from-email">to ${e.to}</div>
        </div>
        <div class="meta-actions">
          <span class="meta-time">${e.date}</span>
        </div>
      </div>
      <div class="email-body">
        ${e.body}
      </div>
      ${e.attachments ? `
        <div class="email-attachments">
          ${e.attachments.map((a) => `
            <span class="attachment-chip" title="${a.name}">
              <svg viewBox="0 0 24 24"><path d="M16.5 6v11.5a4 4 0 0 1-8 0V5a2.5 2.5 0 0 1 5 0v10.5a1 1 0 0 1-2 0V6H10v9.5a2.5 2.5 0 0 0 5 0V5a4 4 0 0 0-8 0v12.5a5.5 5.5 0 0 0 11 0V6h-1.5z"/></svg>
              <span>${a.name}</span>
              <span class="attachment-size">${a.size}</span>
            </span>`).join('')}
        </div>` : ''}
        
      <div class="email-actions">
        <button id="replyBtn"><svg viewBox="0 0 24 24"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>Reply</button>
        <button id="forwardBtn"><svg viewBox="0 0 24 24"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>Forward</button>
      </div>
        `;

    $('#replyBtn').addEventListener('click', () => openCompose(e.fromEmail, `Re: ${e.subject}`, true));
    $('#forwardBtn').addEventListener('click', () => openCompose('', `Fwd: ${e.subject}`, true));

    $('#mailListView').classList.add('hidden');
    $('#emailView').classList.remove('hidden');
    updateNav();
  }

  function closeEmail() {
    currentEmailId = null;
    $('#emailView').classList.add('hidden');
    $('#mailListView').classList.remove('hidden');
    renderList();
  }

  function renderLabelsNav() {
    const el = $('#labelsNav');
    el.innerHTML = LABELS.map(
      (l) => `
        <button class="label-item" data-label="${l.name}">
          <span class="label-dot" style="background:${l.color}"></span>
          <span class="nav-label">${l.name}</span>
        </button>`
    ).join('');
    el.querySelectorAll('.label-item').forEach((btn) => {
      btn.addEventListener('click', () => setView('label:' + btn.dataset.label, null));
    });
  }

  function renderNav() {
    const labels = $$('.label-item');
    labels.forEach((b) => b.classList.toggle('active', currentView === 'label:' + b.dataset.label));
  }

  function updateNav() {
    $$('.nav-item[data-view]').forEach((b) => {
      const v = b.dataset.view;
      const active = v === currentView || (v === 'inbox' && currentView === 'inbox');
      b.classList.toggle('active', active);
    });
    renderNav();
    $('#inboxCount').textContent = unreadCount() > 0 ? unreadCount() : '';
    const drafts = emails.filter((e) => e.draft).length;
    const draftsBtn = document.querySelector('.nav-item[data-view="drafts"]');
    let countEl = draftsBtn.querySelector('.nav-count');
    if (drafts > 0) {
      if (!countEl) {
        countEl = document.createElement('span');
        countEl.className = 'nav-count';
        draftsBtn.appendChild(countEl);
      }
      countEl.textContent = drafts;
    } else if (countEl) countEl.remove();
  }

  function setView(view, label) {
    currentView = view;
    currentLabel = label;
    selectedIds.clear();
    $('#emailView').classList.add('hidden');
    $('#mailListView').classList.remove('hidden');
    document.querySelector('.tabs').classList.toggle('hidden', view !== 'inbox');
    if (view === 'inbox') setTab(currentCategory);
    updateNav();
    renderList();
  }

  function setTab(cat) {
    currentCategory = cat;
    $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.category === cat));
    renderList();
  }

  /* ---------------- compose ---------------- */

  let composeReplyTo = '';

  function openCompose(to = '', subject = '', isReply = false) {
    $('#composeTo').value = to;
    $('#composeSubject').value = subject;
    $('#composeBody').value = '';
    $('#composeTitle').textContent = isReply ? 'New Message' : 'New Message';
    composeReplyTo = to;
    $('#composeOverlay').classList.remove('hidden');
    $('#composeTo').focus();
  }

  function closeCompose() {
    $('#composeOverlay').classList.add('hidden');
    composeReplyTo = '';
  }

  function sendMail() {
    const to = $('#composeTo').value.trim();
    const subject = $('#composeSubject').value.trim();
    const body = $('#composeBody').value.trim();
    if (!to) {
      toast('Please enter a recipient.');
      return;
    }
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    emails.unshift({
      id: idCounter++,
      from: 'Me',
      fromEmail: 'you@gmail.com',
      to,
      subject: subject || '(no subject)',
      date: timeStr,
      read: true,
      starred: false,
      labels: [],
      category: 'Primary',
      sent: true,
      avatar: 'Y',
      avatarColor: '#5f6368',
      snippet: body.slice(0, 120),
      body: `<div style="font-family:Arial,Helvetica,sans-serif;color:#202124;line-height:1.6;"><p>${body.replace(/\n/g, '<br/>')}</p></div>`,
    });
    closeCompose();
    toast('Message sent.');
    if (currentView === 'sent') renderList();
  }

  /* ---------------- actions ---------------- */

  function deleteSelected() {
    if (!selectedIds.size) {
      toast('Select emails first.');
      return;
    }
    selectedIds.forEach((id) => {
      const e = emails.find((x) => x.id === id);
      if (e) e.trashed = true;
    });
    const count = selectedIds.size;
    selectedIds.clear();
    toast(`Conversation moved to Trash.${count > 1 ? ` (${count})` : ''}`);
    renderList();
    updateNav();
  }

  function refreshMail() {
    const btn = $('#refreshBtn');
    btn.style.animation = 'none';
    btn.offsetHeight;
    btn.style.animation = 'spin 0.6s linear';
    setTimeout(() => {
      btn.style.animation = '';
      toast('No new mail.');
    }, 700);
  }

  /* ---------------- wire up ---------------- */

  function init() {
    renderLabelsNav();
    updateNav();
    renderList();
    setView('inbox', null);

    // auto-open the first (termination) email on load
    const first = getVisibleEmails()[0];
    if (first) openEmail(first.id);

    // nav
    document.querySelectorAll('.nav-item[data-view]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const v = btn.dataset.view;
        if (v === 'moreToggle') {
          const hidden = $('#moreItems').classList.toggle('hidden');
          $('#moreToggleIcon').style.transform = hidden ? '' : 'rotate(180deg)';
          $('#moreToggleLabel').textContent = hidden ? 'More' : 'Less';
          return;
        }
        setView(v, null);
      });
    });

    // tabs
    $$('.tab').forEach((t) => t.addEventListener('click', () => setTab(t.dataset.category)));

    // toolbar
    $('#selectAllBtn').addEventListener('click', () => {
      const list = getVisibleEmails();
      const allSelected = list.length > 0 && list.every((e) => selectedIds.has(e.id));
      list.forEach((e) => (allSelected ? selectedIds.delete(e.id) : selectedIds.add(e.id)));
      renderList();
    });

    $('#refreshBtn').addEventListener('click', refreshMail);
    $('#deleteBtn').addEventListener('click', deleteSelected);

    // email view
    $('#backBtn').addEventListener('click', closeEmail);
    $('#archiveBtn').addEventListener('click', () => {
      if (currentEmailId) {
        const e = emails.find((x) => x.id === currentEmailId);
        if (e) e.trashed = true;
        toast('Conversation archived.');
        closeEmail();
        updateNav();
      }
    });
    $('#emailDeleteBtn').addEventListener('click', () => {
      if (currentEmailId) {
        const e = emails.find((x) => x.id === currentEmailId);
        if (e) e.trashed = true;
        toast('Conversation moved to Trash.');
        closeEmail();
        updateNav();
      }
    });

    // compose
    $('#composeBtn').addEventListener('click', () => openCompose());
    $('#composeClose').addEventListener('click', closeCompose);
    $('#sendBtn').addEventListener('click', sendMail);
    $('#composeBody').addEventListener('keydown', (ev) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') sendMail();
    });

    // search
    const search = $('#searchInput');
    search.addEventListener('input', () => {
      searchQuery = search.value.trim();
      $('#searchClear').style.display = searchQuery ? 'flex' : 'none';
      renderList();
    });
    $('#searchClear').addEventListener('click', () => {
      search.value = '';
      searchQuery = '';
      $('#searchClear').style.display = 'none';
      renderList();
    });

    // sidebar collapse
    $('#menuBtn').addEventListener('click', () => {
      $('#sidebar').classList.toggle('collapsed');
    });

    // keyboard escape
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') {
        if (!$('#composeOverlay').classList.contains('hidden')) closeCompose();
        else if (!$('#emailView').classList.contains('hidden')) closeEmail();
      }
    });
  }

  const style = document.createElement('style');
  style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);

  document.addEventListener('DOMContentLoaded', init);
})();