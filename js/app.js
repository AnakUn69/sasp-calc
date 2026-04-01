'use strict';

/* ============================================================
   SASP MDT — Professional Terminal v3.0
   Modular architecture, localStorage persistence, admin CRUD
   ============================================================ */

const SASP = (() => {

  // ── State ─────────────────────────────────────────────────
  let _laws = [];           
  let _categories = [];     
  let _protocol = [];       
  let _currentCat = 'all';

  // ── Auth ──────────────────────────────────────────────────
  const Auth = {
    KEY: 'sasp_officer_v1',
    _data: { badge: '', firstName: '', lastName: '' },

    load() {
      try {
        const stored = localStorage.getItem(this.KEY);
        if (stored) this._data = { ...this._data, ...JSON.parse(stored) };
      } catch (e) {}
      const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
      set('loginBadge',     this._data.badge);
      set('loginFirstName', this._data.firstName);
      set('loginLastName',  this._data.lastName);
    },

    save() {
      const g = id => document.getElementById(id)?.value?.trim() || '';
      this._data = { badge: g('loginBadge'), firstName: g('loginFirstName'), lastName: g('loginLastName') };
      localStorage.setItem(this.KEY, JSON.stringify(this._data));
    },

    get() { return { ...this._data }; }
  };

  // ── Welcome ───────────────────────────────────────────────
  const Welcome = {
    show(firstName, lastName, cb) {
      const pwField = document.getElementById('loginPassword');
      if (!pwField) { this._transition(firstName, lastName, cb); return; }
      pwField.value = '';
      let count = 0;
      const id = setInterval(() => {
        pwField.value += '●';
        if (++count >= 8) { clearInterval(id); setTimeout(() => this._transition(firstName, lastName, cb), 400); }
      }, 80);
    },

    _transition(firstName, lastName, cb) {
      const login = document.getElementById('loginOverlay');
      login.style.transition = 'opacity 0.45s ease';
      login.style.opacity = '0';
      setTimeout(() => {
        login.style.display = 'none';
        const ov       = document.getElementById('welcomeOverlay');
        const txt      = document.getElementById('welcomeText');
        const fullText = `Vítejte strážníku ${firstName} ${lastName}`;
        txt.textContent = '';
        txt.classList.add('welcome-cursor');
        ov.style.display = 'flex';
        void ov.offsetWidth;
        ov.classList.add('welcome-in');
        let i = 0;
        const typeId = setInterval(() => {
          txt.textContent += fullText[i];
          i++;
          if (i >= fullText.length) {
            clearInterval(typeId);
            setTimeout(() => {
              txt.classList.remove('welcome-cursor');
              setTimeout(() => {
                ov.classList.add('welcome-out');
                setTimeout(() => {
                  ov.style.display = 'none';
                  ov.classList.remove('welcome-in', 'welcome-out');
                  cb();
                }, 900);
              }, 300);
            }, 1600);
          }
        }, 55);
      }, 450);
    }
  };

  // ── Suspect ───────────────────────────────────────────────
  const Suspect = {
    get() {
      const g = id => document.getElementById(id)?.value?.trim() || '';
      return { firstName: g('suspectFirst'), lastName: g('suspectLast'), birth: g('suspectBirth') };
    }
  };

  // ── ProtocolHistory ───────────────────────────────────────
  const ProtocolHistory = {
    KEY: 'sasp_protocol_history_v1',
    MAX: 50,

    _saveEntry() {
      if (_protocol.length === 0) return false;
      const officer = Auth.get();
      const suspect = Suspect.get();
      let totalJ = 0, hasLife = false;
      _protocol.forEach(p => { if (p.isLife) hasLife = true; else totalJ += p.jail; });
      const totalF = _protocol.reduce((a, b) => a + b.fine, 0);
      const entry = {
        id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        officer: { ...officer },
        suspect: { ...suspect },
        protocol: JSON.parse(JSON.stringify(_protocol)),
        totals: { jail: hasLife ? 'DOŽIVOTÍ' : totalJ + ' let', fine: totalF, hasLife }
      };
      let list = this._list();
      list.unshift(entry);
      if (list.length > this.MAX) list = list.slice(0, this.MAX);
      localStorage.setItem(this.KEY, JSON.stringify(list));
      return true;
    },
    save() {
      if (!this._saveEntry()) { UI.toast('Protokol je prázdný!'); return; }
      UI.toast('✓ Protokol uložen do historie');
    },

    _list() {
      try { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); } catch (e) { return []; }
    },

    open() {
      document.getElementById('historyOverlay').style.display = 'flex';
      this._renderList();
    },

    close() {
      document.getElementById('historyOverlay').style.display = 'none';
      document.getElementById('historyDetail').style.display = 'none';
      document.getElementById('historyListWrap').style.display = 'block';
    },

    _renderList() {
      document.getElementById('historyDetail').style.display = 'none';
      document.getElementById('historyListWrap').style.display = 'block';
      const list = this._list();
      const wrap = document.getElementById('historyListContent');
      if (list.length === 0) {
        wrap.innerHTML = '<div class="history-empty">Žádné uložené protokoly.</div>';
        return;
      }
      wrap.innerHTML = list.map(e => {
        const dt  = new Date(e.timestamp);
        const dts = dt.toLocaleDateString('cs-CZ') + '  ' + dt.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
        const sus = (e.suspect.firstName || e.suspect.lastName)
          ? `${e.suspect.firstName} ${e.suspect.lastName}`.trim() : '— suspect neuveden —';
        const off = e.officer.firstName ? `${e.officer.firstName} ${e.officer.lastName}` : '—';
        return `
          <div class="history-entry">
            <div class="history-entry-info">
              <div class="history-date">${_esc(dts)}</div>
              <div class="history-suspect">${_esc(sus)}</div>
              <div class="history-officer">${_esc(off)} · ${_esc(e.officer.badge || '—')}</div>
              <div class="history-totals">${_esc(e.totals.jail)} · ${e.totals.fine > 0 ? e.totals.fine.toLocaleString('cs-CZ') + ' $' : '0 $'}</div>
            </div>
            <div class="history-entry-actions">
              <button class="admin-btn btn-edit" onclick="SASP.historyView('${e.id}')">ZOBRAZIT</button>
              <button class="admin-btn btn-del"  onclick="SASP.historyDelete('${e.id}')">SMAZAT</button>
            </div>
          </div>`;
      }).join('');
    },

    view(id) {
      const entry = this._list().find(e => e.id === id);
      if (!entry) { UI.toast('Protokol nenalezen'); return; }
      document.getElementById('historyListWrap').style.display = 'none';
      const detail = document.getElementById('historyDetail');
      detail.style.display = 'block';

      const dt  = new Date(entry.timestamp);
      const dts = dt.toLocaleDateString('cs-CZ') + ' | ' + dt.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
      const sus = entry.suspect;
      const off = entry.officer;
      const hasZP  = entry.protocol.some(p => p.removeZP);
      const hasRP  = entry.protocol.some(p => p.removeRP);
      const needSZ = entry.totals.hasLife || entry.protocol.some(p => !p.isLife && p.jail > 20);

      const chargesHtml = entry.protocol.map(p => {
        const badges = [
          p.isLife   ? '<span class="badge badge-life">DOŽIVOTÍ</span>' : '',
          p.removeZP ? '<span class="badge badge-zp">ODEBRAT ZP</span>' : '',
          p.removeRP ? '<span class="badge badge-rp">ODEBRAT ŘP</span>' : ''
        ].filter(Boolean).join('');
        const jStr = p.isLife ? (p.jail > 0 ? p.jail + ' LET – DOŽIVOTÍ' : 'DOŽIVOTÍ') : (p.hasJ && p.jail > 0 ? p.jail + ' LET' : '');
        const fStr = p.hasF && p.fine > 0 ? p.fine.toLocaleString('cs-CZ') + ' $' : '';
        const sentenceHtml = (jStr || fStr) ? `
          <div class="hv-card-sentence">
            ${jStr ? `<div class="hv-chip hv-chip-jail"><span class="chip-lbl">VAZBA</span><span class="hv-chip-val jail-color">${_esc(jStr)}</span></div>` : ''}
            ${fStr ? `<div class="hv-chip hv-chip-fine"><span class="chip-lbl">POKUTA</span><span class="hv-chip-val fine-color">${_esc(fStr)}</span></div>` : ''}
          </div>` : '';
        return `
          <div class="hv-card">
            <div class="hv-card-title">${_esc(p.title)} — ${_esc(p.subLabel)}</div>
            ${badges ? `<div class="card-badges">${badges}</div>` : ''}
            <div class="hv-card-text">${_esc(p.text)}</div>
            ${sentenceHtml}
          </div>`;
      }).join('');

      const alertHtml = needSZ ? `
        <div class="court-alert" style="margin: 0 0 12px;">
          <i class="fa-solid fa-scale-balanced"></i>PŘÍTOMNOST STÁTNÍHO ZÁSTUPCE NUTNÁ
        </div>` : '';

      const flagsHtml = (hasZP || hasRP) ? `
        <div class="hv-flags">
          ${hasZP ? '<span class="hv-flag badge-zp"><i class="fa-solid fa-id-card"></i> BYL ODEBRÁN ZBROJNÍ PRŮKAZ</span>' : ''}
          ${hasRP ? '<span class="hv-flag badge-rp"><i class="fa-solid fa-car"></i> BYL ODEBRÁN ŘIDIČSKÝ PRŮKAZ</span>' : ''}
        </div>` : '';

      document.getElementById('historyDetailContent').innerHTML = `
        <div class="hv-meta">
          <div class="hv-meta-row">
            <span class="hv-meta-lbl"><i class="fa-solid fa-calendar"></i> DATUM</span>
            <span class="hv-meta-val">${_esc(dts)}</span>
          </div>
          <div class="hv-meta-row">
            <span class="hv-meta-lbl"><i class="fa-solid fa-shield-halved"></i> STRÁŽNÍK</span>
            <span class="hv-meta-val">${_esc(off.firstName || '—')} ${_esc(off.lastName || '')} <span class="hv-badge-no">${_esc(off.badge || '')}</span></span>
          </div>
          ${(sus.firstName || sus.lastName || sus.birth) ? `
          <div class="hv-meta-row">
            <span class="hv-meta-lbl"><i class="fa-solid fa-user"></i> SUSPECT</span>
            <span class="hv-meta-val">${_esc((sus.firstName || '') + ' ' + (sus.lastName || '')).trim() || '—'}${sus.birth ? ' <span class="hv-meta-dim">nar. ' + _esc(sus.birth) + '</span>' : ''}</span>
          </div>` : ''}
        </div>
        ${alertHtml}
        <div class="hv-charges">${chargesHtml}</div>
        <div class="hv-totals">
          <div class="hv-total-item">
            <span class="total-label">VAZBA</span>
            <span class="total-value jail-color">${_esc(entry.totals.jail.toString().toUpperCase())}</span>
          </div>
          <span class="total-divider">|</span>
          <div class="hv-total-item">
            <span class="total-label">POKUTY</span>
            <span class="total-value fine-color">${entry.totals.fine > 0 ? entry.totals.fine.toLocaleString('cs-CZ') + ' $' : '0 $'}</span>
          </div>
        </div>
        ${flagsHtml}
        <button class="action-btn save-btn hv-copy-btn" onclick="SASP.historyCopy('${id}')">
          <span class="btn-ic"><i class="fa-solid fa-copy"></i></span>
          <span class="btn-lbl">ZKOPÍROVAT PROTOKOL</span>
        </button>`;
    },

    _buildEntryText(entry) {
      const dt  = new Date(entry.timestamp);
      const dts = dt.toLocaleDateString('cs-CZ') + ' | ' + dt.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
      const off = entry.officer;
      const sus = entry.suspect;
      let totalJ = 0, hasLife = false;
      entry.protocol.forEach(p => { if (p.isLife) hasLife = true; else totalJ += p.jail; });
      const totalF = entry.protocol.reduce((a, b) => a + b.fine, 0);
      const hasZP  = entry.protocol.some(p => p.removeZP);
      const hasRP  = entry.protocol.some(p => p.removeRP);
      const needSZ = entry.totals.hasLife || entry.protocol.some(p => !p.isLife && p.jail > 20);

      let out = '';
      out += '════════════════════════════════════════\n';
      out += '          SASP  PROTOKOL  PŘÍPADU\n';
      out += '   Datum: ' + dts + '\n';
      out += '════════════════════════════════════════\n';
      out += '\n ZASAHUJÍCÍ STRÁŽNÍK\n';
      out += '  Badge: ' + (off.badge || '—') + '\n';
      out += '  Jméno: ' + (off.firstName || '—') + ' ' + (off.lastName || '') + '\n';
      if (sus.firstName || sus.lastName || sus.birth) {
        out += '\n IDENTITA SUSPECTA\n';
        if (sus.firstName || sus.lastName) out += '  Jméno: ' + (sus.firstName || '') + ' ' + (sus.lastName || '') + '\n';
        if (sus.birth) out += '  Datum narození: ' + sus.birth + '\n';
      }
      out += '\n════════════════════════════════════════\n';
      entry.protocol.forEach(p => {
        out += '\n ' + p.title + ' — ' + p.subLabel + '\n';
        out += ' ' + p.text + '\n';
        const jStr = p.isLife ? 'DOŽIVOTÍ' : (p.jail > 0 ? p.jail + ' let' : '');
        const fStr = p.fine > 0 ? p.fine.toLocaleString('cs-CZ') + ' $' : '';
        if (jStr || fStr) out += ' ► ' + [jStr, fStr].filter(Boolean).join('  |  Pokuta: ') + '\n';
      });
      out += '\n════════════════════════════════════════\n';
      out += ' CELKEM: ' + (hasLife ? 'DOŽIVOTÍ' : totalJ + ' let');
      if (totalF > 0) out += '  |  Pokuty: ' + totalF.toLocaleString('cs-CZ') + ' $';
      out += '\n';
      if (needSZ) out += ' [SZ]  PŘÍTOMNOST STÁTNÍHO ZÁSTUPCE NUTNÁ\n';
      if (hasZP)  out += ' [ZP]  BYL ODEBRÁN ZBROJNÍ PRŮKAZ\n';
      if (hasRP)  out += ' [RP]  BYL ODEBRÁN ŘIDIČSKÝ PRŮKAZ\n';
      out += '════════════════════════════════════════\n';
      out += ' AUTORIZOVAL: ' + (off.firstName || '—') + ' ' + (off.lastName || '') + ' (' + (off.badge || '—') + ')';
      out += '\n════════════════════════════════════════';
      return out;
    },

    delete(id) {
      Modal.confirm(
        '<i class="fa-solid fa-trash"></i>',
        'SMAZAT PROTOKOL',
        'Opravdu smazat tento protokol z&nbsp;historie?<br><span class="modal-accent">Akce je nevratná.</span>',
        () => {
          let list = this._list().filter(e => e.id !== id);
          localStorage.setItem(this.KEY, JSON.stringify(list));
          this._renderList();
          UI.toast('Protokol smazán');
        }
      );
    }
  };

  // ── Boot ──────────────────────────────────────────────────
  const Boot = {
    LINES: [
      { text: 'INITIALIZING  SASP  TERMINAL  OS  v3.2.1 ...', cls: 'title', t: 0 },
      { text: '[SYS]   Loading kernel modules ...', cls: '', t: 280 },
      { text: '[OK]    Kernel loaded successfully', cls: 'ok', t: 560 },
      { text: '[SYS]   Mounting /evidence/database ...', cls: '', t: 840 },
      { text: '[OK]    Volume mounted — 47.2 GB available', cls: 'ok', t: 1100 },
      { text: '[SYS]   Connecting to SASP Central at 10.0.1.1:5432 ...', cls: '', t: 1400 },
      { text: '[OK]    Database connection established  [latency: 12ms]', cls: 'ok', t: 1750 },
      { text: '[SYS]   Loading Penal Code v2026.04.01 ...', cls: '', t: 2050 },
      { text: '[OK]    Zákoník načten — 9 kategorií  |  102 paragrafů', cls: 'ok', t: 2380 },
      { text: '[SYS]   Verifying security certificates ...', cls: '', t: 2650 },
      { text: '[OK]    Certificate valid — SHA-256: a4f2c8d1...', cls: 'ok', t: 2920 },
      { text: '[WARN]  Offline mode active — sync pending', cls: 'warn', t: 3200 },
      { text: '[SYS]   Starting MDT Evidence Module ...', cls: '', t: 3450 },
      { text: '[OK]    MDT Module ready — all systems operational', cls: 'ok', t: 3720 },
      { text: '', cls: '', t: 3900 },
      { text: '>>> SASP TERMINAL READY — AUTHENTICATE TO CONTINUE <<<', cls: 'title', t: 4100 },
    ],

    start() {
      // Check skip-intro / skip-login settings
      try {
        const settings = JSON.parse(localStorage.getItem('sasp_settings_v1') || '{}');
        if (settings.skipLogin) {
          const stored = localStorage.getItem('sasp_officer_v1');
          if (stored) {
            const creds = JSON.parse(stored);
            if (creds.badge && creds.firstName && creds.lastName) {
              Boot._autoLogin(creds);
              return;
            }
          }
          // No stored creds — fall through to login screen
          Boot._toLogin();
          return;
        }
        if (settings.skipIntro) { Boot._toLogin(); return; }
      } catch (e) {}

      const wrap = document.getElementById('bootLines');
      this.LINES.forEach(l => {
        setTimeout(() => {
          const el = document.createElement('div');
          el.className = 'boot-line' + (l.cls ? ' ' + l.cls : '');
          el.textContent = l.text;
          wrap.appendChild(el);
          wrap.scrollTop = wrap.scrollHeight;
        }, l.t);
      });
      setTimeout(() => Boot._toLogin(), 5200);
    },

    _toLogin() {
      const el = document.getElementById('bootOverlay');
      el.style.transition = 'opacity 0.7s ease';
      el.style.opacity = '0';
      setTimeout(() => {
        el.style.display = 'none';
        const login = document.getElementById('loginOverlay');
        login.style.display = 'flex';
        Auth.load();
      }, 700);
    },

    _autoLogin(creds) {
      // Hard-set auth data and jump straight to the terminal
      Auth._data = { badge: creds.badge, firstName: creds.firstName, lastName: creds.lastName };
      document.getElementById('bootOverlay').style.display = 'none';
      document.getElementById('loginOverlay').style.display = 'none';
      document.getElementById('mainApp').style.display = 'flex';
      const nu = document.getElementById('loggedUserName');
      if (nu) nu.textContent = creds.firstName + ' ' + creds.lastName;
      Data.load().then(() => {
        Render.categories();
        Render.laws();
        Render.protocol();
        setInterval(() => UI.updateClock(), 1000);
        UI.updateClock();
      });
    }
  };

  // ── DataManager ───────────────────────────────────────────
  const Data = {
    KEY: 'sasp_laws_v3',

    async load() {
      const stored = localStorage.getItem(this.KEY);
      if (stored) {
        try {
          _categories = JSON.parse(stored);
          _buildFlat();
          return;
        } catch (e) {
          console.warn('SASP: localStorage parse failed, falling back to JSON');
        }
      }
      const r = await fetch('data/laws.json?v=' + Date.now());
      const d = await r.json();
      _categories = d.categories;
      _buildFlat();
    },

    save() {
      localStorage.setItem(this.KEY, JSON.stringify(_categories));
    },

    reset() {
      Modal.confirm(
        '<i class="fa-solid fa-rotate-left"></i>',
        'RESET DAT',
        'Resetovat všechna data na výchozí stav ze&nbsp;souboru <span class="modal-highlight">laws.json</span>?<br><span class="modal-accent">Všechny vaše úpravy budou ztraceny!</span>',
        () => {
          localStorage.removeItem(this.KEY);
          location.reload();
        }
      );
    },

    toJSON() {
      return JSON.stringify({ version: '2026.1', categories: _categories }, null, 2);
    },

    fromJSON(str) {
      const d = JSON.parse(str);
      _categories = d.categories || d;
      _buildFlat();
      this.save();
    }
  };

  function _buildFlat() {
    _laws = [];
    _categories.forEach(cat => {
      cat.laws.forEach(law => {
        _laws.push({ ...law, catId: cat.id, catName: cat.name });
      });
    });
  }

  // ── Renderer ──────────────────────────────────────────────
  const Render = {
    categories() {
      const bar = document.getElementById('categoryTabs');
      bar.innerHTML = '';

      const allBtn = _mkTab('VŠE', 'all', true);
      bar.appendChild(allBtn);

      _categories.forEach(cat => {
        bar.appendChild(_mkTab(cat.name, cat.id, false));
      });
    },

    laws() {
      const q = document.getElementById('searchInput').value.toLowerCase().trim();
      const cnt = document.getElementById('lawsContainer');

      let pool = _laws.filter(law => {
        if (_currentCat !== 'all' && law.catId !== _currentCat) return false;
        if (!q) return true;
        return (
          law.title.toLowerCase().includes(q) ||
          (law.description || '').toLowerCase().includes(q) ||
          law.subs.some(s => s.text.toLowerCase().includes(q))
        );
      });

      document.getElementById('searchCount').textContent =
        pool.length + ' / ' + _laws.length;

      cnt.innerHTML = pool.map(law => {
        const gi = _laws.indexOf(law);
        return _lawItem(gi, law);
      }).join('');
    },

    protocol() {
      const wrap = document.getElementById('caseEntries');
      const alert = document.getElementById('courtAlert');
      const jailEl = document.getElementById('sumJail');
      const fineEl = document.getElementById('sumFine');

      if (_protocol.length === 0) {
        wrap.innerHTML = `
          <div class="case-empty">
            <i class="fa-solid fa-folder-open case-empty-icon"></i>
            Žádné záznamy v protokolu.<br>
            Vyberte paragrafy z levého panelu.
          </div>`;
        alert.style.display = 'none';
        jailEl.textContent = '0 LET';
        fineEl.textContent = '0 $';
        return;
      }

      let totalJ = 0, hasLife = false, needSZ = false;
      _protocol.forEach(p => {
        if (p.isLife) { hasLife = true; needSZ = true; }
        else { totalJ += p.jail; if (p.jail > 20) needSZ = true; }
      });

      alert.style.display = needSZ ? 'flex' : 'none';
      jailEl.textContent = hasLife ? 'DOŽIVOTÍ' : totalJ + ' LET';
      fineEl.textContent = _protocol.reduce((a, b) => a + b.fine, 0)
        .toLocaleString('cs-CZ') + ' $';

      wrap.innerHTML = _protocol.map(p => _card(p)).join('');
      _checkSaveBtn();
      _spinify(wrap);
    }
  };

  function _mkTab(label, catId, active) {
    const b = document.createElement('button');
    b.className = 'cat-tab' + (active ? ' active' : '');
    b.dataset.cat = catId;
    b.textContent = label;
    b.addEventListener('click', () => {
      document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
      b.classList.add('active');
      _currentCat = catId;
      Render.laws();
    });
    return b;
  }

  function _lawItem(gi, law) {
    const subsHtml = law.subs.map((s, si) => _subRow(gi, si, s)).join('');
    const desc = law.description
      ? `<div class="law-description">${_esc(law.description)}</div>`
      : '';
    return `
      <div class="law-item" id="li_${gi}">
        <div class="law-header" onclick="SASP.toggleLaw(${gi})">
          <span>${_esc(law.title)}</span>
          <span class="law-toggle">▼</span>
        </div>
        ${desc}
        <div class="law-content">${subsHtml}</div>
      </div>`;
  }

  function _subRow(gi, si, s) {
    const badges = [
      s.isLife   ? '<span class="badge badge-life">DOŽIVOTÍ</span>' : '',
      s.removeZP ? '<span class="badge badge-zp">ZP</span>' : '',
      s.removeRP ? '<span class="badge badge-rp">ŘP</span>' : ''
    ].filter(Boolean).join('');

    const range = (() => {
      if (s.isLife && s.minJ > 0) return `${s.minJ} let – DOŽIVOTÍ`;
      if (s.isLife) return 'DOŽIVOTÍ';
      if (s.hasJ && s.minJ > 0 && s.maxJ > 0) return `${s.minJ}–${s.maxJ} let`;
      return '';
    })();

    return `
      <div class="sub-row sub-row-clickable" onclick="SASP.openChargeModal(${gi},${si})">
        <span class="sub-label">${_esc(s.label)}</span>
        <div class="sub-info">
          <div class="sub-text">${_esc(s.text)}</div>
          ${range ? `<div class="sub-range">${range}</div>` : ''}
        </div>
        ${badges ? `<div class="sub-badges">${badges}</div>` : ''}
        <button class="sub-add-trigger" tabindex="-1" aria-hidden="true">
          <i class="fa-solid fa-plus"></i>
        </button>
      </div>`;
  }

  function _card(p) {
    const badges = [
      p.isLife   ? '<span class="badge badge-life">DOŽIVOTÍ</span>' : '',
      p.removeZP ? '<span class="badge badge-zp">ODEBRAT ZP</span>' : '',
      p.removeRP ? '<span class="badge badge-rp">ODEBRAT ŘP</span>' : ''
    ].filter(Boolean).join('');

    const pid = p.id;

    // Jail chip: fixed doživotní = static label already in badge, otherwise editable input
    const jailChip = (() => {
      if (p.isLifeFixed) return ''; // badge already shows DOŽIVOTÍ
      if (p.isLife && p.jail > 0) {
        return `<div class="card-chip"><span class="card-life">${p.jail} LET – DOŽIVOTÍ</span></div>`;
      }
      if (p.hasJ) {
        const maxAttr = p.maxJ > 0 ? `max="${p.maxJ}"` : '';
        return `<div class="card-chip">
          <span class="chip-lbl">VAZBA</span>
          <input type="number" class="card-input card-input-jail"
            data-pid="${pid}" data-field="jail"
            value="${p.jail}" min="${p.minJ}" ${maxAttr}
            oninput="SASP.updateCharge(this.dataset.pid,'jail',this.value)">
          <span class="chip-unit">LET</span>
        </div>`;
      }
      return '';
    })();

    const fineChip = p.hasF
      ? `<div class="card-chip">
          <span class="chip-lbl">POKUTA</span>
          <input type="number" class="card-input card-input-fine"
            data-pid="${pid}" data-field="fine"
            value="${p.fine}" min="0"
            oninput="SASP.updateCharge(this.dataset.pid,'fine',this.value)">
          <span class="chip-unit">$</span>
        </div>`
      : '';

    return `
      <div class="protocol-card">
        <div class="card-title">${_esc(p.title)} — ${_esc(p.subLabel)}</div>
        ${badges ? `<div class="card-badges">${badges}</div>` : ''}
        <div class="card-text">${_esc(p.text)}</div>
        <div class="card-sentence">${jailChip}${fineChip}</div>
        <button class="card-remove" onclick="SASP.removeCharge(${p.id})" title="Odstranit">✕</button>
      </div>`;
  }

  function _updateTotals() {
    let totalJ = 0, hasLife = false, needSZ = false;
    _protocol.forEach(p => {
      if (p.isLife) { hasLife = true; needSZ = true; }
      else { totalJ += p.jail; if (p.jail > 20) needSZ = true; }
    });
    const totalF = _protocol.reduce((a, b) => a + b.fine, 0);
    document.getElementById('sumJail').textContent  = hasLife ? 'DOŽIVOTÍ' : totalJ + ' LET';
    document.getElementById('sumFine').textContent  = totalF.toLocaleString('cs-CZ') + ' $';
    document.getElementById('courtAlert').style.display = needSZ ? 'flex' : 'none';
    _checkSaveBtn();
  }

  // ── Protocol ──────────────────────────────────────────────
  const Protocol = {
    add(gi, si, jVal, fVal) {
      const law = _laws[gi];
      const s = law.subs[si];

      if (s.removeZP || s.removeRP) {
        const items = [s.removeZP ? 'Zbrojní průkaz' : '', s.removeRP ? 'Řidičský průkaz' : '']
          .filter(Boolean).join(' a ');
        Modal.confirm('<i class="fa-solid fa-triangle-exclamation"></i>', 'ODEBRAT DOKLADY',
          `Je nutné odebrat: <span class="modal-highlight">${items}</span>!\n<span class="modal-accent">Zablokujte příslušné oprávnění v MDT.</span>`,
          () => Protocol._checkSZ(gi, si, jVal, fVal));
      } else {
        Protocol._checkSZ(gi, si, jVal, fVal);
      }
    },

    _checkSZ(gi, si, jVal, fVal) {
      const s = _laws[gi].subs[si];
      if (s.isLife || jVal > 20) {
        Modal.confirm('<i class="fa-solid fa-scale-balanced"></i>', 'STÁTNÍ ZÁSTUPCE',
          `Trest přesahuje 20 let nebo je doživotní.\nJe přítomen Státní Zástupce?`,
          () => Protocol._commit(gi, si, jVal, fVal));
      } else {
        Protocol._commit(gi, si, jVal, fVal);
      }
    },

    _commit(gi, si, jVal, fVal) {
      ChargeModal.close();
      const law = _laws[gi];
      const s = law.subs[si];
      _protocol.push({
        id: Date.now() + Math.random(),
        title: law.title,
        subLabel: s.label,
        text: s.text,
        jail: jVal,
        fine: fVal,
        isLife: s.isLife || jVal >= 99,
        isLifeFixed: !!(s.isLife && s.minJ === 0),
        removeZP: s.removeZP,
        removeRP: s.removeRP,
        hasJ: s.hasJ || false,
        hasF: s.hasF || false,
        minJ: s.minJ || 0,
        maxJ: s.maxJ || 0
      });
      Modal.close();
      Render.protocol();
      UI.toast('Přidáno: ' + law.title + ' ' + s.label);
    }
  };

  // ── Modal ─────────────────────────────────────────────────
  const Modal = {
    _cb: null,

    confirm(icon, title, msg, onYes) {
      this._cb = onYes;
      this._show(icon, title, msg, true);
    },

    info(icon, title, msg) {
      this._cb = null;
      this._show(icon, title, msg, false);
    },

    _show(icon, title, msg, hasYes) {
      document.getElementById('modalIcon').innerHTML = icon;
      document.getElementById('modalTitle').textContent = title;
      document.getElementById('modalMsg').innerHTML = msg;
      const yesBtn = document.getElementById('modalYes');
      const noBtn  = document.getElementById('modalNo');
      yesBtn.style.display = hasYes ? '' : 'none';
      noBtn.textContent = hasYes ? 'NE, ZPĚT' : 'ZAVŘÍT';
      const overlay = document.getElementById('modalOverlay');
      overlay.style.display = 'flex';
      overlay.focus();
    },

    yes() { const cb = this._cb; this.close(); if (cb) cb(); },
    close() {
      document.getElementById('modalOverlay').style.display = 'none';
      this._cb = null;
    }
  };

  // ── Admin ─────────────────────────────────────────────────
  const Admin = {
    _tab: 'laws',
    _editing: null, // { type: 'law'|'sub', cIdx, lIdx, sIdx }

    open() {
      this._editing = null;
      document.getElementById('adminOverlay').style.display = 'flex';
      this._render();
    },

    close() {
      document.getElementById('adminOverlay').style.display = 'none';
      this._editing = null;
    },

    switchTab(tab) {
      this._tab = tab;
      this._editing = null;
      document.querySelectorAll('.admin-tab').forEach(t =>
        t.classList.toggle('active', t.dataset.tab === tab));
      this._render();
    },

    _render() {
      const wrap = document.getElementById('adminContent');
      if (this._tab === 'laws') wrap.innerHTML = this._renderLaws();
      else if (this._tab === 'export') wrap.innerHTML = this._renderExport();
      else wrap.innerHTML = this._renderSettings();
      _spinify(wrap);
    },

    _renderLaws() {
      return _categories.map((cat, ci) => `
        <div class="admin-category">
          <div class="admin-cat-header">
            <span class="admin-cat-toggle" onclick="SASP.adminToggleCat(${ci})">${_esc(cat.icon || '')} ${_esc(cat.name)} <span class="cat-count">${cat.laws.length} zákonů ▾</span></span>
            <button class="admin-btn btn-icon btn-add" onclick="event.stopPropagation();SASP.adminNewLaw(${ci})" title="Přidat zákon"><i class="fa-solid fa-plus"></i></button>
          </div>
          <div class="admin-cat-body" id="acb_${ci}">
            ${cat.laws.map((law, li) => this._renderLawRow(ci, li, law)).join('')}
          </div>
        </div>`).join('');
    },

    _renderLawRow(ci, li, law) {
      const isEditing = this._editing &&
        this._editing.type === 'law' && this._editing.ci === ci && this._editing.li === li;
      return `
        <div>
          <div class="admin-law-row">
            <span class="admin-law-title">${_esc(law.title)}</span>
            <div class="admin-law-actions">
              <button class="admin-btn btn-icon btn-add"  onclick="SASP.adminNewSub(${ci},${li})"   title="Přidat sub-položku"><i class="fa-solid fa-plus"></i></button>
              <button class="admin-btn btn-icon btn-edit" onclick="SASP.adminEditLaw(${ci},${li})"  title="Editovat"><i class="fa-solid fa-pen-to-square"></i></button>
              <button class="admin-btn btn-icon btn-del"  onclick="SASP.adminDelLaw(${ci},${li})"   title="Smazat"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>
          ${isEditing ? this._lawEditForm(ci, li, law) : ''}
          ${law.subs.map((s, si) => this._renderSubRow(ci, li, si, s)).join('')}
          ${this._editing && this._editing.type === 'newsub' && this._editing.ci === ci && this._editing.li === li
            ? this._subNewForm(ci, li) : ''}
        </div>`;
    },

    _renderSubRow(ci, li, si, s) {
      const isEditing = this._editing &&
        this._editing.type === 'sub' && this._editing.ci === ci &&
        this._editing.li === li && this._editing.si === si;
      return `
        <div>
          <div class="admin-law-row" style="padding-left:24px;background:rgba(0,0,0,0.3)">
            <span class="admin-law-title" style="color:#888;">
              ${_esc(s.label)} ${_esc(s.text.substring(0, 70))}${s.text.length > 70 ? '…' : ''}
            </span>
            <div class="admin-law-actions">
              <button class="admin-btn btn-icon btn-edit" onclick="SASP.adminEditSub(${ci},${li},${si})" title="Editovat"><i class="fa-solid fa-pen-to-square"></i></button>
              <button class="admin-btn btn-icon btn-del"  onclick="SASP.adminDelSub(${ci},${li},${si})" title="Smazat"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>
          ${isEditing ? this._subEditForm(ci, li, si, s) : ''}
        </div>`;
    },

    _lawEditForm(ci, li, law) {
      return `
        <div class="edit-form-wrap">
          <div class="edit-form-title">✏ EDITACE ZÁKONA</div>
          <div class="edit-grid">
            <div class="edit-cell full">
              <label>NÁZEV (title)</label>
              <input class="edit-input" id="ef_title" value="${_escAttr(law.title)}">
            </div>
            <div class="edit-cell full">
              <label>POPIS (description)</label>
              <input class="edit-input" id="ef_desc" value="${_escAttr(law.description || '')}">
            </div>
          </div>
          <div class="edit-form-actions">
            <button class="admin-btn btn-save"   onclick="SASP.adminSaveLaw(${ci},${li})">ULOŽIT</button>
            <button class="admin-btn btn-cancel" onclick="SASP.adminCancelEdit()">ZRUŠIT</button>
          </div>
        </div>`;
    },

    _subEditForm(ci, li, si, s) {
      const v = (x) => (x !== null && x !== undefined) ? x : '';
      return `
        <div class="edit-form-wrap" style="margin-left:24px">
          <div class="edit-form-title">✏ EDITACE SUB-POLOŽKY</div>
          <div class="edit-grid">
            <div class="edit-cell">
              <label>OZNAČENÍ (label)</label>
              <input class="edit-input" id="ef_label" value="${_escAttr(s.label)}">
            </div>
            <div class="edit-cell full">
              <label>POPIS (text)</label>
              <textarea class="edit-input" id="ef_text" rows="3" style="resize:vertical">${_esc(s.text)}</textarea>
            </div>
            <div class="edit-cell">
              <label>MIN. LET (minJ)</label>
              <input class="edit-input" id="ef_minJ" type="number" min="0" value="${v(s.minJ)}">
            </div>
            <div class="edit-cell">
              <label>MAX. LET (maxJ)</label>
              <input class="edit-input" id="ef_maxJ" type="number" min="0" value="${v(s.maxJ)}">
            </div>
            <div class="edit-cell">
              <label>FIXNÍ POKUTA (fixedFine)</label>
              <input class="edit-input" id="ef_fixFine" type="number" min="0" value="${v(s.fixedFine)}">
            </div>
            <div class="edit-cell">
              <label>FIXNÍ VAZBA (fixedJail)</label>
              <input class="edit-input" id="ef_fixJail" type="number" min="0" value="${v(s.fixedJail)}">
            </div>
          </div>
          <div class="edit-checkbox-row">
            <label class="edit-check"><input type="checkbox" id="ef_hasJ" ${s.hasJ ? 'checked' : ''}> MÁ VAZBU</label>
            <label class="edit-check"><input type="checkbox" id="ef_hasF" ${s.hasF ? 'checked' : ''}> MÁ POKUTU</label>
            <label class="edit-check"><input type="checkbox" id="ef_isLife" ${s.isLife ? 'checked' : ''}> DOŽIVOTÍ</label>
            <label class="edit-check"><input type="checkbox" id="ef_zp" ${s.removeZP ? 'checked' : ''}> ODEBRAT ZP</label>
            <label class="edit-check"><input type="checkbox" id="ef_rp" ${s.removeRP ? 'checked' : ''}> ODEBRAT ŘP</label>
          </div>
          <div class="edit-form-actions">
            <button class="admin-btn btn-save"   onclick="SASP.adminSaveSub(${ci},${li},${si})">ULOŽIT</button>
            <button class="admin-btn btn-cancel" onclick="SASP.adminCancelEdit()">ZRUŠIT</button>
          </div>
        </div>`;
    },

    _subNewForm(ci, li) {
      return `
        <div class="edit-form-wrap" style="margin-left:24px;border-top-color:var(--accent)">
          <div class="edit-form-title">+ NOVÁ SUB-POLOŽKA</div>
          <div class="edit-grid">
            <div class="edit-cell">
              <label>OZNAČENÍ (label)</label>
              <input class="edit-input" id="ef_label" placeholder="např. a)">
            </div>
            <div class="edit-cell full">
              <label>POPIS (text)</label>
              <textarea class="edit-input" id="ef_text" rows="3" style="resize:vertical" placeholder="Popis skutkové podstaty..."></textarea>
            </div>
            <div class="edit-cell">
              <label>MIN. LET (minJ)</label>
              <input class="edit-input" id="ef_minJ" type="number" min="0" value="0">
            </div>
            <div class="edit-cell">
              <label>MAX. LET (maxJ)</label>
              <input class="edit-input" id="ef_maxJ" type="number" min="0" value="0">
            </div>
            <div class="edit-cell">
              <label>FIXNÍ POKUTA (fixedFine)</label>
              <input class="edit-input" id="ef_fixFine" type="number" min="0" placeholder="prázdné = variabilní">
            </div>
            <div class="edit-cell">
              <label>FIXNÍ VAZBA (fixedJail)</label>
              <input class="edit-input" id="ef_fixJail" type="number" min="0" placeholder="prázdné = variabilní">
            </div>
          </div>
          <div class="edit-checkbox-row">
            <label class="edit-check"><input type="checkbox" id="ef_hasJ"> MÁ VAZBU</label>
            <label class="edit-check"><input type="checkbox" id="ef_hasF"> MÁ POKUTU</label>
            <label class="edit-check"><input type="checkbox" id="ef_isLife"> DOŽIVOTÍ</label>
            <label class="edit-check"><input type="checkbox" id="ef_zp"> ODEBRAT ZP</label>
            <label class="edit-check"><input type="checkbox" id="ef_rp"> ODEBRAT ŘP</label>
          </div>
          <div class="edit-form-actions">
            <button class="admin-btn btn-save"   onclick="SASP.adminSaveNewSub(${ci},${li})">ULOŽIT</button>
            <button class="admin-btn btn-cancel" onclick="SASP.adminCancelEdit()">ZRUŠIT</button>
          </div>
        </div>`;
    },

    _renderExport() {
      return `
        <div class="export-area">
          <p>AKTUÁLNÍ DATA — localStorage nebo laws.json</p>
          <textarea class="export-textarea" id="exportArea">${_esc(Data.toJSON())}</textarea>
          <div class="export-actions">
            <button class="exp-btn exp-download" onclick="SASP.adminDownload()">⬇ STÁHNOUT LAWS.JSON</button>
            <button class="exp-btn exp-import"   onclick="SASP.adminImport()">⬆ IMPORTOVAT JSON</button>
            <button class="exp-btn exp-reset"    onclick="SASP.adminReset()">↺ RESET NA VÝCHOZÍ</button>
          </div>
        </div>`;
    },

    _renderSettings() {
      let settings = {};
      try { settings = JSON.parse(localStorage.getItem('sasp_settings_v1') || '{}'); } catch (e) {}
      const skipIntroChecked = settings.skipIntro ? 'checked' : '';
      const skipLoginChecked = settings.skipLogin ? 'checked' : '';
      const stored = localStorage.getItem('sasp_officer_v1');
      let savedName = '— není uložené přihlašovací udaje —';
      try {
        const c = JSON.parse(stored || '{}');
        if (c.badge && c.firstName) savedName = `${c.firstName} ${c.lastName} (${c.badge})`;
      } catch (e) {}
      return `
        <div class="settings-panel">
          <div class="settings-group">
            <div class="settings-group-title">Spouštění aplikace</div>
            <div class="settings-item">
              <div>
                <div class="settings-item-label">Přeskočit intro (boot screen)</div>
                <div class="settings-item-desc">Přeskočí načítací sekvenci a rovnou zobrazí přihlašovací obrazovku.</div>
              </div>
              <label class="settings-toggle">
                <input type="checkbox" id="settingSkipIntro" ${skipIntroChecked}
                  onchange="SASP.adminSaveSetting('skipIntro', this.checked)">
                <span class="settings-toggle-track"></span>
              </label>
            </div>
            <div class="settings-item">
              <div>
                <div class="settings-item-label">Přeskočit přihlašování (auto-login)</div>
                <div class="settings-item-desc">Při spouštění použije uložené přihlašovací údaje a přeskakuje rovnou do terminálu.<br>
                  <span class="settings-saved-creds">⯈ Uložené údaje: ${_esc(savedName)}</span></div>
              </div>
              <label class="settings-toggle">
                <input type="checkbox" id="settingSkipLogin" ${skipLoginChecked}
                  onchange="SASP.adminSaveSetting('skipLogin', this.checked)">
                <span class="settings-toggle-track"></span>
              </label>
            </div>
          </div>
        </div>`;
    }
  };

  // ── ChargeModal ──────────────────────────────────────────
  const ChargeModal = {
    _gi: null,
    _si: null,

    open(gi, si) {
      this._gi = gi;
      this._si = si;
      const s = _laws[gi].subs[si];
      this._render(_laws[gi], s);
      const orMode = s.hasJ && s.hasF && s.fixedJail === null && s.fixedFine === null
                   && s.text.includes('nebo');
      const needsJail = s.hasJ && !s.isLife && s.fixedJail === null;
      const needsFine = s.hasF && s.fixedFine === null && (s.minF || 0) > 0;
      this._setConfirmEnabled(orMode ? false : (!needsJail && !needsFine));
      document.getElementById('chargeOverlay').style.display = 'flex';
      setTimeout(() => {
        this._attachListeners();
        _spinify(document.getElementById('chargeOverlay'));
        const first = document.querySelector('#chargeOverlay .cm-input');
        if (first) first.focus();
      }, 60);
    },

    close() {
      document.getElementById('chargeOverlay').style.display = 'none';
      this._gi = null;
      this._si = null;
    },

    confirm() {
      if (this._gi === null) return;
      const s = _laws[this._gi].subs[this._si];
      const jEl = document.getElementById('cm_jail');
      const fEl = document.getElementById('cm_fine');
      const jVal = s.fixedJail !== null ? s.fixedJail
                 : (jEl ? parseInt(jEl.value) || 0 : 0);
      const fVal = s.fixedFine !== null ? s.fixedFine
                 : (fEl ? parseInt(fEl.value) || 0 : 0);

      const orMode = s.hasJ && s.hasF && s.fixedJail === null && s.fixedFine === null
                   && s.text.includes('nebo');

      // In OR mode, at least one must be filled
      if (orMode && jVal === 0 && fVal === 0) {
        this._setError('cm_jail', 'Vyplňte alespoň vazbu nebo pokutu.');
        return;
      }

      // Jail validation (skip range check if OR mode and jail is 0 = user chose fine)
      if (s.hasJ && !s.isLife && s.fixedJail === null && jEl && jVal > 0) {
        if (s.minJ > 0 && jVal < s.minJ) {
          this._setError('cm_jail', `Minimum je ${s.minJ} let (max. ${s.maxJ} let).`);
          return;
        }
        if (s.maxJ > 0 && s.maxJ < 99 && jVal > s.maxJ) {
          this._setError('cm_jail', `Maximum je ${s.maxJ} let.`);
          return;
        }
      }
      if (!orMode && s.hasJ && !s.isLife && s.fixedJail === null && jEl && jVal === 0) {
        this._setError('cm_jail', `Zadejte délku trestu${s.minJ > 0 ? ` (${s.minJ}–${s.maxJ} let)` : ''}.`);
        return;
      }
      this._clearError('cm_jail');

      // Fine validation (skip if OR mode and fine is 0 = user chose jail)
      if (s.hasF && s.fixedFine === null && fEl && fVal > 0) {
        const minF = s.minF || 0;
        const maxF = s.maxF || 0;
        if (minF > 0 && fVal < minF) {
          this._setError('cm_fine', `Minimum je ${minF.toLocaleString('cs-CZ')} $ (max. ${maxF.toLocaleString('cs-CZ')} $).`);
          return;
        }
        if (maxF > 0 && fVal > maxF) {
          this._setError('cm_fine', `Maximum je ${maxF.toLocaleString('cs-CZ')} $.`);
          return;
        }
      }
      if (!orMode && s.hasF && s.fixedFine === null && fEl && fVal === 0 && (s.minF || 0) > 0) {
        this._setError('cm_fine', `Zadejte výši pokuty (${(s.minF||0).toLocaleString('cs-CZ')}–${(s.maxF||0).toLocaleString('cs-CZ')} $).`);
        return;
      }
      this._clearError('cm_fine');

      Protocol.add(this._gi, this._si, jVal, fVal);
    },

    _setConfirmEnabled(enabled) {
      const btn = document.getElementById('cm_confirm');
      if (btn) btn.disabled = !enabled;
    },

    _updateConfirmState() {
      if (this._gi === null) return;
      const s = _laws[this._gi].subs[this._si];
      const jEl = document.getElementById('cm_jail');
      const fEl = document.getElementById('cm_fine');

      const orMode = s.hasJ && s.hasF && s.fixedJail === null && s.fixedFine === null
                   && s.text.includes('nebo');

      let jOk = true, jFilled = false;
      if (s.hasJ && !s.isLife && s.fixedJail === null && jEl) {
        const v = parseInt(jEl.value) || 0;
        jFilled = v > 0;
        jOk = v === 0 || (
          (s.minJ <= 0 || v >= s.minJ)
          && (s.maxJ <= 0 || s.maxJ >= 99 || v <= s.maxJ)
        );
      }

      let fOk = true, fFilled = false;
      if (s.hasF && s.fixedFine === null && fEl) {
        const v = parseInt(fEl.value) || 0;
        const minF = s.minF || 0;
        const maxF = s.maxF || 0;
        fFilled = v > 0;
        fOk = v === 0 || (
          v >= minF && (maxF <= 0 || v <= maxF)
        );
      }

      if (orMode) {
        // At least one filled and whatever is filled must be in range
        this._setConfirmEnabled((jFilled || fFilled) && jOk && fOk);
      } else {
        // Both must be filled (if required) and in range
        const jReq = s.hasJ && !s.isLife && s.fixedJail === null;
        const fReq = s.hasF && s.fixedFine === null && (s.minF || 0) > 0;
        this._setConfirmEnabled(
          (!jReq || jFilled) && (!fReq || fFilled) && jOk && fOk
        );
      }
    },

    _setError(inputId, msg) {
      const el = document.getElementById(inputId);
      if (!el) return;
      el.classList.add('cm-input-error');
      let err = el.parentElement.querySelector('.cm-error');
      if (!err) {
        err = document.createElement('div');
        err.className = 'cm-error';
        el.parentElement.appendChild(err);
      }
      err.textContent = msg;
      this._setConfirmEnabled(false);
    },

    _clearError(inputId) {
      const el = document.getElementById(inputId);
      if (!el) return;
      el.classList.remove('cm-input-error');
      const err = el.parentElement?.querySelector('.cm-error');
      if (err) err.remove();
    },

    _attachListeners() {
      if (this._gi === null) return;
      const s = _laws[this._gi].subs[this._si];
      const jEl = document.getElementById('cm_jail');
      const fEl = document.getElementById('cm_fine');

      if (jEl && s.hasJ && !s.isLife && s.fixedJail === null) {
        jEl.addEventListener('input', () => {
          this._clearError('cm_jail');
          const v = parseInt(jEl.value) || 0;
          const jOk = v > 0
            && (s.minJ <= 0 || v >= s.minJ)
            && (s.maxJ <= 0 || s.maxJ >= 99 || v <= s.maxJ);
          if (!jOk && v > 0) {
            if (s.minJ > 0 && v < s.minJ) {
              this._setError('cm_jail', `Minimum je ${s.minJ} let (max. ${s.maxJ} let).`);
            } else if (s.maxJ > 0 && s.maxJ < 99 && v > s.maxJ) {
              this._setError('cm_jail', `Maximum je ${s.maxJ} let.`);
            }
          }
          this._updateConfirmState();
        });
      }

      const minF = s.minF || 0;
      const maxF = s.maxF || 0;
      if (fEl && s.hasF && s.fixedFine === null) {
        fEl.addEventListener('input', () => {
          this._clearError('cm_fine');
          const v = parseInt(fEl.value) || 0;
          if (v > 0 && maxF > 0 && v > maxF) {
            this._setError('cm_fine', `Maximum je ${maxF.toLocaleString('cs-CZ')} $.`);
          } else if (v > 0 && minF > 0 && v < minF) {
            this._setError('cm_fine', `Minimum je ${minF.toLocaleString('cs-CZ')} $ (max. ${maxF.toLocaleString('cs-CZ')} $).`);
          }
          this._updateConfirmState();
        });
      }
    },

    _render(law, s) {
      const range = s.isLife && s.minJ > 0 ? `${s.minJ} let – DOŽIVOTÍ`
                  : s.isLife ? 'DOŽIVOTÍ'
                  : (s.hasJ && s.minJ > 0 && s.maxJ > 0) ? `${s.minJ}–${s.maxJ} let` : '';

      const badges = [
        s.isLife   ? '<span class="badge badge-life">DOŽIVOTÍ</span>' : '',
        s.removeZP ? '<span class="badge badge-zp">ZP — Zbrojní průkaz</span>' : '',
        s.removeRP ? '<span class="badge badge-rp">ŘP — Řidičský průkaz</span>' : ''
      ].filter(Boolean).join('');

      let inputsHtml = '';

      if (s.hasJ) {
        if (s.fixedJail !== null) {
          inputsHtml += `<div class="cm-field">
            <label class="cm-label">VAZBA</label>
            <div class="cm-fixed jail-color">${s.fixedJail}<span class="cm-unit"> let</span></div>
          </div>`;
        } else if (s.isLife && s.minJ === 0) {
          inputsHtml += `<div class="cm-field">
            <label class="cm-label">VAZBA</label>
            <div class="cm-fixed" style="color:var(--danger)">DOŽIVOTÍ</div>
          </div>`;
        } else {
          const ph = range ? range : 'zadejte počet let';
          const maxAttr = s.maxJ > 0 && !s.isLife ? `max="${s.maxJ}"` : '';
          inputsHtml += `<div class="cm-field">
            <label class="cm-label">VAZBA (roky)${range ? ` <span class="cm-range-hint">${range}</span>` : ''}</label>
            <input type="number" id="cm_jail" class="cm-input cm-input-jail"
              placeholder="${ph}" min="${s.minJ}" ${maxAttr} autocomplete="off">
          </div>`;
        }
      }

      if (s.hasF) {
        const minF = s.minF || 0;
        const maxF = s.maxF || 0;
        const fRange = maxF > 0 ? `${minF.toLocaleString('cs-CZ')}–${maxF.toLocaleString('cs-CZ')} $` : '';
        if (s.fixedFine !== null) {
          inputsHtml += `<div class="cm-field">
            <label class="cm-label">POKUTA</label>
            <div class="cm-fixed fine-color">${s.fixedFine.toLocaleString('cs-CZ')}<span class="cm-unit"> $</span></div>
          </div>`;
        } else {
          const fPh = fRange ? fRange : 'zadejte výši pokuty';
          inputsHtml += `<div class="cm-field">
            <label class="cm-label">POKUTA ($)${fRange ? ` <span class="cm-range-hint cm-range-hint--fine">${fRange}</span>` : ''}</label>
            <input type="number" id="cm_fine" class="cm-input cm-input-fine"
              placeholder="${fPh}" min="${minF}" ${maxF > 0 ? `max="${maxF}"` : ''} autocomplete="off">
          </div>`;
        }
      }

      document.getElementById('cm_lawTitle').textContent = law.title;
      document.getElementById('cm_subLabel').textContent = s.label + ' — ' + s.text;
      document.getElementById('cm_badges').innerHTML = badges;
      document.getElementById('cm_inputs').innerHTML = inputsHtml;
    }
  };

  // ── QuickSettings ──────────────────────────────────────────
  const QuickSettings = {
    open() {
      this._render();
      document.getElementById('settingsOverlay').style.display = 'flex';
    },

    close() {
      document.getElementById('settingsOverlay').style.display = 'none';
    },

    save(key, value) {
      let settings = {};
      try { settings = JSON.parse(localStorage.getItem('sasp_settings_v1') || '{}'); } catch (e) {}
      settings[key] = value;
      localStorage.setItem('sasp_settings_v1', JSON.stringify(settings));
      UI.toast(value ? '\u2714 Nastavení uloženo: zapnuto' : '\u2714 Nastavení uloženo: vypnuto');
      // keep admin panel in sync if open
      if (document.getElementById('adminOverlay').style.display !== 'none') {
        Admin._render();
      }
    },

    _render() {
      let settings = {};
      try { settings = JSON.parse(localStorage.getItem('sasp_settings_v1') || '{}'); } catch (e) {}
      const skipIntroChecked = settings.skipIntro ? 'checked' : '';
      const skipLoginChecked = settings.skipLogin ? 'checked' : '';
      const stored = localStorage.getItem('sasp_officer_v1');
      let savedName = '\u2014 nejsou uloženy přihlašovací údaje \u2014';
      try {
        const c = JSON.parse(stored || '{}');
        if (c.badge && c.firstName) savedName = `${c.firstName} ${c.lastName} (${c.badge})`;
      } catch (e) {}
      document.getElementById('settingsModalBody').innerHTML = `
        <div class="settings-panel quick-settings-body">
          <div class="settings-group">
            <div class="settings-group-title">Spouštění aplikace</div>
            <div class="settings-item">
              <div>
                <div class="settings-item-label">Přeskočit intro (boot screen)</div>
                <div class="settings-item-desc">Přeskočí načítací sekvenci a rovnou zobrazí přihlašovací obrazovku.</div>
              </div>
              <label class="settings-toggle">
                <input type="checkbox" ${skipIntroChecked}
                  onchange="SASP.quickSaveSetting('skipIntro', this.checked)">
                <span class="settings-toggle-track"></span>
              </label>
            </div>
            <div class="settings-item">
              <div>
                <div class="settings-item-label">Přeskočit přihlašování (auto-login)</div>
                <div class="settings-item-desc">Při spouštění použije uložené údaje a přeskočí rovnou do terminálu.<br>
                  <span class="settings-saved-creds">⧮ Uložené údaje: ${_esc(savedName)}</span></div>
              </div>
              <label class="settings-toggle">
                <input type="checkbox" ${skipLoginChecked}
                  onchange="SASP.quickSaveSetting('skipLogin', this.checked)">
                <span class="settings-toggle-track"></span>
              </label>
            </div>
          </div>
        </div>`;
    }
  };

  // ── Clipboard ─────────────────────────────────────────────
  const Clip = {
    _buildText() {
      const now = new Date();
      const dt = now.toLocaleDateString('cs-CZ') + ' | ' +
        now.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
      const officer = Auth.get();
      const suspect = Suspect.get();
      let totalJ = 0, hasLife = false;
      _protocol.forEach(p => { if (p.isLife) hasLife = true; else totalJ += p.jail; });
      const totalF = _protocol.reduce((a, b) => a + b.fine, 0);
      const hasZP  = _protocol.some(p => p.removeZP);
      const hasRP  = _protocol.some(p => p.removeRP);
      const needSZ = hasLife || _protocol.some(p => p.jail > 20);

      let out = '';
      out += '════════════════════════════════════════\n';
      out += '          SASP  PROTOKOL  PŘÍPADU\n';
      out += '   Datum: ' + dt + '\n';
      out += '════════════════════════════════════════\n';
      out += '\n ZASAHUJÍCÍ STRÁŽNÍK\n';
      out += '  Badge: ' + (officer.badge || '—') + '\n';
      out += '  Jméno: ' + (officer.firstName || '—') + ' ' + (officer.lastName || '') + '\n';
      if (suspect.firstName || suspect.lastName || suspect.birth) {
        out += '\n IDENTITA SUSPECTA\n';
        if (suspect.firstName || suspect.lastName)
          out += '  Jméno: ' + (suspect.firstName || '') + ' ' + (suspect.lastName || '') + '\n';
        if (suspect.birth)
          out += '  Datum narození: ' + suspect.birth + '\n';
      }
      out += '\n════════════════════════════════════════\n';

      _protocol.forEach(p => {
        out += '\n ' + p.title + ' — ' + p.subLabel + '\n';
        out += ' ' + p.text + '\n';
        const jStr = p.isLife ? 'DOŽIVOTÍ' : (p.jail > 0 ? p.jail + ' let' : '');
        const fStr = p.fine > 0 ? p.fine.toLocaleString('cs-CZ') + ' $' : '';
        if (jStr || fStr) {
          out += ' ► ' + [jStr, fStr].filter(Boolean).join('  |  Pokuta: ') + '\n';
        }
      });

      out += '\n════════════════════════════════════════\n';
      out += ' CELKEM: ' + (hasLife ? 'DOŽIVOTÍ' : totalJ + ' let');
      if (totalF > 0) out += '  |  Pokuty: ' + totalF.toLocaleString('cs-CZ') + ' $';
      out += '\n';
      if (needSZ) out += ' [SZ]  PŘÍTOMNOST STÁTNÍHO ZÁSTUPCE NUTNÁ\n';
      if (hasZP)  out += ' [ZP]  BYL ODEBRÁN ZBROJNÍ PRŮKAZ\n';
      if (hasRP)  out += ' [RP]  BYL ODEBRÁN ŘIDIČSKÝ PRŮKAZ\n';
      out += '════════════════════════════════════════\n';
      out += ' AUTORIZOVAL: ' + (officer.firstName || '—') + ' ' + (officer.lastName || '') +
             ' (' + (officer.badge || '—') + ')';
      out += '\n════════════════════════════════════════';
      return out;
    },

    _send(text, msg) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text)
          .then(() => UI.toast(msg))
          .catch(() => { Clip._fallback(text); UI.toast(msg); });
      } else {
        Clip._fallback(text); UI.toast(msg);
      }
    },

    copy() {
      if (_protocol.length === 0) { UI.toast('Protokol je prázdný!'); return; }
      this._send(this._buildText(), '✓ Protokol zkopírován!');
    },

    _fallback(text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      Object.assign(ta.style, { position: 'fixed', left: '-9999px', opacity: '0' });
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  // ── UI Helpers ────────────────────────────────────────────
  const UI = {
    _toastTimer: null,
    toast(msg) {
      const el = document.getElementById('toast');
      el.textContent = msg;
      el.classList.add('show');
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
    },
    updateClock() {
      const el = document.getElementById('caseTime');
      if (!el) return;
      const now = new Date();
      el.textContent = now.toLocaleDateString('cs-CZ') + ' — ' +
        now.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  };

  // ── InputDialog ───────────────────────────────────────────
  const InputDialog = {
    _cb:     null,
    _fields: [],

    show(step, title, msg, fields, onConfirm) {
      this._cb     = onConfirm;
      this._fields = fields;
      document.getElementById('idStep').textContent  = step;
      document.getElementById('idTitle').textContent = title;
      document.getElementById('idMsg').innerHTML     = msg;
      document.getElementById('idFields').innerHTML  = fields.map(f => `
        <div class="modal-input-field">
          <label>${f.label}</label>
          <input type="${f.type || 'text'}" class="edit-input" id="id_${f.key}"
            placeholder="${f.placeholder || ''}" autocomplete="off">
        </div>`).join('');
      const overlay = document.getElementById('inputDialogOverlay');
      overlay.style.display = 'flex';
      overlay.focus();
      setTimeout(() => {
        _spinify(overlay);
        document.getElementById('id_' + fields[0].key)?.focus();
      }, 60);
    },

    confirm() {
      const vals = {};
      this._fields.forEach(f => {
        vals[f.key] = document.getElementById('id_' + f.key)?.value?.trim() || '';
      });
      const cb = this._cb;
      this.close();
      if (cb) cb(vals);
    },

    close() {
      document.getElementById('inputDialogOverlay').style.display = 'none';
      this._cb     = null;
      this._fields = [];
    }
  };

  // ── Utility ───────────────────────────────────────────────
  function _checkSaveBtn() {
    const btn = document.getElementById('saveAndCopyBtn');
    if (!btn) return;
    const suspectOk =
      (document.getElementById('suspectFirst')?.value?.trim() || '') !== '' &&
      (document.getElementById('suspectLast')?.value?.trim()  || '') !== '' &&
      (document.getElementById('suspectBirth')?.value?.trim() || '') !== '';
    const notEmpty = _protocol.length > 0;
    const noErrors = !document.querySelector('#caseEntries .input-error');
    const ok = suspectOk && notEmpty && noErrors;
    btn.disabled = !ok;
    btn.classList.toggle('btn-disabled', !ok);
  }

  function _spinify(container) {
    const root = container || document;
    root.querySelectorAll('input[type=number]:not(.spinified)').forEach(inp => {
      inp.classList.add('spinified');
      const isLarge = inp.classList.contains('cm-input');
      const wrap = document.createElement('div');
      wrap.className = 'num-spin' + (isLarge ? ' num-spin--lg' : '');
      inp.parentNode.insertBefore(wrap, inp);
      wrap.appendChild(inp);
      const btns = document.createElement('div');
      btns.className = 'num-spin-btns';
      btns.innerHTML =
        '<button type="button" class="num-spin-btn" tabindex="-1" aria-label="Zvýšit"><i class="fa-solid fa-chevron-up"></i></button>' +
        '<button type="button" class="num-spin-btn" tabindex="-1" aria-label="Snížit"><i class="fa-solid fa-chevron-down"></i></button>';
      wrap.appendChild(btns);
      const [up, dn] = btns.querySelectorAll('.num-spin-btn');
      const step = () => parseFloat(inp.step) || 1;
      const minV = () => inp.min !== '' ? parseFloat(inp.min) : -Infinity;
      const maxV = () => inp.max !== '' ? parseFloat(inp.max) :  Infinity;
      const dispatch = () => inp.dispatchEvent(new Event('input', { bubbles: true }));
      up.addEventListener('mousedown', e => {
        e.preventDefault();
        inp.value = Math.min((parseFloat(inp.value) || 0) + step(), maxV());
        dispatch();
      });
      dn.addEventListener('mousedown', e => {
        e.preventDefault();
        const next = (parseFloat(inp.value) || 0) - step();
        inp.value = Math.max(next, minV());
        dispatch();
      });
    });
  }

  function _esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _escAttr(str) {
    return _esc(str).replace(/'/g, '&#39;');
  }

  // ── Public API ────────────────────────────────────────────
  return {
    /* Init */
    init() { Boot.start(); },

    login() {
      const badge     = document.getElementById('loginBadge')?.value?.trim();
      const firstName = document.getElementById('loginFirstName')?.value?.trim();
      const lastName  = document.getElementById('loginLastName')?.value?.trim();
      if (!badge || !firstName || !lastName) {
        UI.toast('Vyplňte Badge, Jméno a Příjmení!');
        return;
      }
      Auth.save();
      Welcome.show(firstName, lastName, async () => {
        document.getElementById('mainApp').style.display = 'flex';
        const nu = document.getElementById('loggedUserName');
        if (nu) nu.textContent = firstName + ' ' + lastName;
        await Data.load();
        Render.categories();
        Render.laws();
        Render.protocol();
        setInterval(() => UI.updateClock(), 1000);
        UI.updateClock();
      });
    },

    /* Law list */
    toggleLaw(gi) {
      document.getElementById('li_' + gi)?.classList.toggle('expanded');
    },
    onSearch() { Render.laws(); },

    /* Protocol */
    addCharge(gi, si)        { ChargeModal.open(gi, si); },
    openChargeModal(gi, si)  { ChargeModal.open(gi, si); },
    confirmCharge()          { ChargeModal.confirm(); },
    closeChargeModal()       { ChargeModal.close(); },
    removeCharge(id) {
      _protocol = _protocol.filter(p => p.id !== id);
      Render.protocol();
    },
    copyProtocol() { Clip.copy(); },
    saveProtocol()  { ProtocolHistory.save(); },
    saveAndCopyProtocol() {
      if (_protocol.length === 0) { UI.toast('Protokol je prázdný!'); return; }
      const suspect = Suspect.get();
      if (!suspect.firstName || !suspect.lastName || !suspect.birth) {
        UI.toast('⚠ Vyplňte Jméno, Příjmení a Datum narození suspecta!');
        document.getElementById('suspectFirst')?.focus();
        return;
      }
      const text = Clip._buildText();
      ProtocolHistory._saveEntry();
      Clip._send(text, '✓ Uloženo do historie a zkopírováno!');
    },
    openHistory()   { ProtocolHistory.open(); },
    closeHistory()  { ProtocolHistory.close(); },
    historyView(id) { ProtocolHistory.view(id); },
    historyDelete(id) { ProtocolHistory.delete(id); },
    historyBack() { ProtocolHistory._renderList(); },
    historyCopy(id) {
      const entry = ProtocolHistory._list().find(e => e.id === id);
      if (!entry) { UI.toast('Protokol nenalezen'); return; }
      const text = ProtocolHistory._buildEntryText(entry);
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text)
          .then(() => UI.toast('✓ Protokol zkopírován!'))
          .catch(() => { Clip._fallback(text); UI.toast('✓ Protokol zkopírován!'); });
      } else {
        Clip._fallback(text); UI.toast('✓ Protokol zkopírován!');
      }
    },
    clearProtocol() {
      if (_protocol.length === 0) return;
      Modal.confirm(
        '<i class="fa-solid fa-folder-open"></i>',
        'NOVÝ PŘÍPAD',
        'Opravdu vymazat celý protokol?<br><span class="modal-accent">Aktuální případ bude ztracen.</span>',
        () => {
          _protocol = [];
          Render.protocol();
        }
      );
    },

    /* About */
    openAbout()  { document.getElementById('aboutOverlay').style.display = 'flex'; },
    closeAbout() { document.getElementById('aboutOverlay').style.display = 'none'; },

    /* Help */
    openHelp()   { document.getElementById('helpOverlay').style.display = 'flex'; },
    closeHelp()  { document.getElementById('helpOverlay').style.display = 'none'; },

    /* Quick Settings */
    openSettings()             { QuickSettings.open(); },
    closeSettings()            { QuickSettings.close(); },
    quickSaveSetting(key, val) { QuickSettings.save(key, val); },

    /* Save button state */
    checkSaveBtn() { _checkSaveBtn(); },

    /* Modal */
    modalYes()   { Modal.yes(); },
    modalClose() { Modal.close(); },

    /* Input Dialog */
    inputDialogConfirm() { InputDialog.confirm(); },
    inputDialogClose()   { InputDialog.close(); },

    /* Admin – open/close/tabs */
    openAdmin()       { Admin.open(); },
    closeAdmin()      { Admin.close(); },
    adminSwitchTab(t) { Admin.switchTab(t); },

    adminToggleCat(ci) {
      const el = document.getElementById('acb_' + ci);
      if (el) el.style.display = el.style.display === 'none' ? '' : 'none';
    },

    /* Admin – law CRUD */
    adminEditLaw(ci, li) {
      Admin._editing = { type: 'law', ci, li };
      Admin._render();
    },
    adminSaveLaw(ci, li) {
      const title = document.getElementById('ef_title')?.value?.trim();
      const desc  = document.getElementById('ef_desc')?.value?.trim();
      if (!title) { UI.toast('Název nesmí být prázdný!'); return; }
      _categories[ci].laws[li].title = title;
      _categories[ci].laws[li].description = desc;
      _buildFlat();
      Data.save();
      Admin._editing = null;
      Admin._render();
      Render.laws();
      UI.toast('✓ Zákon uložen');
    },
    adminDelLaw(ci, li) {
      const law = _categories[ci].laws[li];
      Modal.confirm(
        '<i class="fa-solid fa-trash"></i>',
        'SMAZAT ZÁKON',
        `Opravdu smazat zákon: <span class="modal-highlight">${_esc(law.title)}</span>?`,
        () => {
          _categories[ci].laws.splice(li, 1);
          _buildFlat();
          Data.save();
          Admin._editing = null;
          Admin._render();
          Render.laws();
          UI.toast('Zákon smazán');
        }
      );
    },
    adminNewLaw(ci) {
      InputDialog.show(
        'ADMIN PANEL',
        'NOVÝ ZÁKON',
        'Vyplňte informace o novém zákoně:',
        [
          { key: 'num',   label: 'ČÍSLO PARAGRAFU', type: 'number', placeholder: 'např. 123' },
          { key: 'title', label: 'NÁZEV ZÁKONA',    type: 'text',   placeholder: 'např. §123 Název' }
        ],
        (vals) => {
          if (!vals.num || !vals.title) return;
          _categories[ci].laws.push({
            id: 'par' + vals.num + '_' + Date.now(),
            number: parseInt(vals.num) || 0,
            title: vals.title,
            description: '',
            subs: []
          });
          _buildFlat();
          Data.save();
          Admin._render();
          Render.laws();
          UI.toast('✓ Zákon přidán');
        }
      );
    },

    /* Admin – sub CRUD */
    adminNewSub(ci, li) {
      Admin._editing = { type: 'newsub', ci, li };
      Admin._render();
      // scroll to the form
      setTimeout(() => {
        document.getElementById('ef_label')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        document.getElementById('ef_label')?.focus();
      }, 60);
    },
    adminSaveNewSub(ci, li) {
      const g = (id) => document.getElementById(id);
      const text = g('ef_text')?.value?.trim();
      if (!text) { UI.toast('Text nesmí být prázdný!'); return; }
      const ff = g('ef_fixFine')?.value;
      const fj = g('ef_fixJail')?.value;
      _categories[ci].laws[li].subs.push({
        label:     g('ef_label')?.value?.trim() || '',
        text,
        minJ:      parseInt(g('ef_minJ')?.value) || 0,
        maxJ:      parseInt(g('ef_maxJ')?.value) || 0,
        fixedFine: (ff !== '' && ff !== null) ? parseInt(ff) : null,
        fixedJail: (fj !== '' && fj !== null) ? parseInt(fj) : null,
        hasJ:      g('ef_hasJ')?.checked || false,
        hasF:      g('ef_hasF')?.checked || false,
        isLife:    g('ef_isLife')?.checked || false,
        removeZP:  g('ef_zp')?.checked || false,
        removeRP:  g('ef_rp')?.checked || false,
        minF:      0,
        maxF:      0
      });
      _buildFlat();
      Data.save();
      Admin._editing = null;
      Admin._render();
      Render.laws();
      UI.toast('✓ Sub-položka přidána');
    },
    adminEditSub(ci, li, si) {
      Admin._editing = { type: 'sub', ci, li, si };
      Admin._render();
    },
    adminSaveSub(ci, li, si) {
      const g = (id) => document.getElementById(id);
      const text = g('ef_text')?.value?.trim();
      if (!text) { UI.toast('Text nesmí být prázdný!'); return; }
      const sub = _categories[ci].laws[li].subs[si];
      sub.label    = g('ef_label')?.value?.trim() || sub.label;
      sub.text     = text;
      sub.minJ     = parseInt(g('ef_minJ')?.value) || 0;
      sub.maxJ     = parseInt(g('ef_maxJ')?.value) || 0;
      const ff     = g('ef_fixFine')?.value;
      const fj     = g('ef_fixJail')?.value;
      sub.fixedFine = (ff !== '' && ff !== null && ff !== undefined) ? parseInt(ff) : null;
      sub.fixedJail = (fj !== '' && fj !== null && fj !== undefined) ? parseInt(fj) : null;
      sub.hasJ     = g('ef_hasJ')?.checked || false;
      sub.hasF     = g('ef_hasF')?.checked || false;
      sub.isLife   = g('ef_isLife')?.checked || false;
      sub.removeZP = g('ef_zp')?.checked || false;
      sub.removeRP = g('ef_rp')?.checked || false;
      _buildFlat();
      Data.save();
      Admin._editing = null;
      Admin._render();
      Render.laws();
      UI.toast('✓ Sub-položka uložena');
    },
    adminDelSub(ci, li, si) {
      Modal.confirm(
        '<i class="fa-solid fa-trash"></i>',
        'SMAZAT SUB-POLOŽKU',
        'Opravdu smazat tuto sub-položku?<br><span class="modal-accent">Akce je nevratná.</span>',
        () => {
          _categories[ci].laws[li].subs.splice(si, 1);
          _buildFlat();
          Data.save();
          Admin._editing = null;
          Admin._render();
          Render.laws();
          UI.toast('Sub-položka smazána');
        }
      );
    },
    adminCancelEdit() {
      Admin._editing = null;
      Admin._render();
    },

    /* Admin – export/import */
    adminDownload() {
      const blob = new Blob([Data.toJSON()], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'laws.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    adminImport() {
      const ta = document.getElementById('exportArea');
      try {
        Data.fromJSON(ta.value);
        Render.categories();
        Render.laws();
        Admin._render();
        UI.toast('✓ JSON importován!');
      } catch (e) {
        UI.toast('✗ Neplatný JSON: ' + e.message);
      }
    },
    adminReset() { Data.reset(); },
    adminSaveSetting(key, value) {
      let settings = {};
      try { settings = JSON.parse(localStorage.getItem('sasp_settings_v1') || '{}'); } catch (e) {}
      settings[key] = value;
      localStorage.setItem('sasp_settings_v1', JSON.stringify(settings));
      UI.toast(value ? '✔ Nastavení uloženo: zapnuto' : '✔ Nastavení uloženo: vypnuto');
    },

    /* updateCharge — real-time inline editing of protocol card values */
    updateCharge(pid, field, value) {
      const p = _protocol.find(x => String(x.id) === String(pid));
      if (!p) return;
      const val = parseInt(value) || 0;
      const input = document.querySelector(`[data-pid="${pid}"][data-field="${field}"]`);
      if (field === 'jail') {
        let valid = true;
        if (p.minJ > 0 && val < p.minJ) valid = false;
        if (p.maxJ > 0 && p.maxJ < 99 && val > p.maxJ) valid = false;
        if (input) input.classList.toggle('input-error', !valid);
        if (valid) { p.jail = val; p.isLife = p.isLifeFixed || val >= 99; }
      } else if (field === 'fine') {
        p.fine = val;
      }
      _updateTotals();
      _checkSaveBtn();
    }
  };
})();

/* ============================================================
   INIT — DOMContentLoaded
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  SASP.init();

  // Login
  document.getElementById('loginBtn')
    .addEventListener('click', () => SASP.login());

  // Search
  document.getElementById('searchInput')
    .addEventListener('input', () => SASP.onSearch());

  // Protocol buttons
  document.getElementById('saveAndCopyBtn')
    ?.addEventListener('click', () => SASP.saveAndCopyProtocol());

  // Suspect inputs — recheck save button on every keystroke
  ['suspectFirst', 'suspectLast', 'suspectBirth'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => SASP.checkSaveBtn());
  });
  document.getElementById('historyBtn')
    ?.addEventListener('click', () => SASP.openHistory());
  document.getElementById('historyClose')
    ?.addEventListener('click', () => SASP.closeHistory());
  document.getElementById('clearBtn')
    .addEventListener('click', () => SASP.clearProtocol());

  // About / Help / Quick Settings — main app
  document.getElementById('aboutBtn')
    ?.addEventListener('click', () => SASP.openAbout());
  document.getElementById('aboutClose')
    ?.addEventListener('click', () => SASP.closeAbout());
  document.getElementById('helpBtn')
    ?.addEventListener('click', () => SASP.openHelp());
  document.getElementById('helpClose')
    ?.addEventListener('click', () => SASP.closeHelp());
  document.getElementById('settingsBtn')
    ?.addEventListener('click', () => SASP.openSettings());
  document.getElementById('settingsClose')
    ?.addEventListener('click', () => SASP.closeSettings());

  // About / Help — login screen
  document.getElementById('loginAboutBtn')
    ?.addEventListener('click', () => SASP.openAbout());
  document.getElementById('loginHelpBtn')
    ?.addEventListener('click', () => SASP.openHelp());

  // Admin
  document.getElementById('adminBtn')
    ?.addEventListener('click', () => SASP.openAdmin());
  document.getElementById('adminClose')
    ?.addEventListener('click', () => SASP.closeAdmin());

  document.querySelectorAll('.admin-tab').forEach(t =>
    t.addEventListener('click', () => SASP.adminSwitchTab(t.dataset.tab)));

  // Charge input modal
  document.getElementById('cm_confirm')
    ?.addEventListener('click', () => SASP.confirmCharge());
  document.getElementById('cm_cancel')
    ?.addEventListener('click', () => SASP.closeChargeModal());
  document.getElementById('cm_close')
    ?.addEventListener('click', () => SASP.closeChargeModal());
  document.getElementById('chargeOverlay')
    ?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); SASP.confirmCharge(); }
    });

  // Modal
  document.getElementById('modalYes')
    .addEventListener('click', () => SASP.modalYes());
  document.getElementById('modalNo')
    .addEventListener('click', () => SASP.modalClose());
  document.getElementById('modalOverlay')
    ?.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const yesBtn = document.getElementById('modalYes');
        if (yesBtn && yesBtn.style.display !== 'none') SASP.modalYes();
        else SASP.modalClose();
      }
    });

  // Input Dialog
  document.getElementById('idConfirm')
    ?.addEventListener('click', () => SASP.inputDialogConfirm());
  document.getElementById('idCancel')
    ?.addEventListener('click', () => SASP.inputDialogClose());
  document.getElementById('inputDialogOverlay')
    ?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); SASP.inputDialogConfirm(); }
    });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    // Ctrl+Shift+A → Admin
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      SASP.openAdmin();
    }
    // Escape → close modals
    if (e.key === 'Escape') {
      SASP.closeChargeModal();
      SASP.closeAbout();
      SASP.closeHelp();
      SASP.closeSettings();
      SASP.closeAdmin();
      SASP.modalClose();
      SASP.inputDialogClose();
      SASP.closeHistory();
    }
    }
  );
});
