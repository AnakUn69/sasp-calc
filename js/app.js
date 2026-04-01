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
      let lines = [];
      lines.push('════════════════════════════════════════');
      lines.push('          SASP  PROTOKOL  PŘÍPADU');
      lines.push('   Datum: ' + dts);
      lines.push('════════════════════════════════════════');
      lines.push('');
      lines.push(' ZASAHUJÍCÍ STRÁŽNÍK');
      lines.push('  Badge: ' + (entry.officer.badge || '—'));
      lines.push('  Jméno: ' + (entry.officer.firstName || '—') + ' ' + (entry.officer.lastName || ''));
      const sus = entry.suspect;
      if (sus.firstName || sus.lastName || sus.birth) {
        lines.push('');
        lines.push(' IDENTITA SUSPECTA');
        if (sus.firstName || sus.lastName) lines.push('  Jméno: ' + sus.firstName + ' ' + sus.lastName);
        if (sus.birth) lines.push('  Datum narození: ' + sus.birth);
      }
      lines.push('');
      lines.push('════════════════════════════════════════');
      entry.protocol.forEach(p => {
        lines.push('');
        lines.push(' ' + p.title + ' — ' + p.subLabel);
        lines.push(' ' + p.text);
        const jStr = p.isLife ? 'DOŽIVOTÍ' : (p.jail > 0 ? p.jail + ' let' : '');
        const fStr = p.fine > 0 ? p.fine.toLocaleString('cs-CZ') + ' $' : '';
        if (jStr || fStr) lines.push(' ► ' + [jStr, fStr].filter(Boolean).join('  |  Pokuta: '));
      });
      lines.push('');
      lines.push('════════════════════════════════════════');
      lines.push(' CELKEM: ' + entry.totals.jail);
      if (entry.totals.fine > 0) lines.push(' Pokuty: ' + entry.totals.fine.toLocaleString('cs-CZ') + ' $');
      lines.push(' AUTORIZOVAL: ' + (entry.officer.firstName || '—') + ' ' + (entry.officer.lastName || '') + ' (' + (entry.officer.badge || '—') + ')');
      lines.push('════════════════════════════════════════');
      document.getElementById('historyDetailContent').textContent = lines.join('\n');
    },

    delete(id) {
      if (!confirm('Smazat tento protokol z historie?')) return;
      let list = this._list().filter(e => e.id !== id);
      localStorage.setItem(this.KEY, JSON.stringify(list));
      this._renderList();
      UI.toast('Protokol smazán');
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
      if (confirm('Resetovat všechna data na výchozí stav ze souboru laws.json?\nVšechny vaše úpravy budou ztraceny!')) {
        localStorage.removeItem(this.KEY);
        location.reload();
      }
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

    const jDisabled = (s.hasJ && !(s.isLife && s.minJ === 0)) ? '' : 'disabled';
    const fDisabled = s.hasF ? '' : 'disabled';
    const jRO = s.fixedJail !== null ? 'readonly' : '';
    const fRO = s.fixedFine !== null ? 'readonly' : '';
    const jVal = s.fixedJail !== null ? `value="${s.fixedJail}"` : '';
    const fVal = s.fixedFine !== null ? `value="${s.fixedFine}"` : '';

    return `
      <div class="sub-row">
        <span class="sub-label">${_esc(s.label)}</span>
        <div class="sub-info">
          <div class="sub-text">${_esc(s.text)}</div>
          ${range ? `<div class="sub-range">${range}</div>` : ''}
        </div>
        ${badges ? `<div class="sub-badges">${badges}</div>` : ''}
        <div class="sub-inputs">
          <input type="number" class="sub-input jail" id="j_${gi}_${si}"
            placeholder="LET" min="${s.minJ}" max="${s.isLife ? '' : s.maxJ || ''}"
            ${jVal} ${jDisabled} ${jRO}>
          <input type="number" class="sub-input fine" id="f_${gi}_${si}"
            placeholder="$" min="0"
            ${fVal} ${fDisabled} ${fRO}>
          <button class="add-btn" onclick="SASP.addCharge(${gi},${si})">+</button>
        </div>
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
  }

  // ── Protocol ──────────────────────────────────────────────
  const Protocol = {
    add(gi, si) {
      const law = _laws[gi];
      const s = law.subs[si];
      const jEl = document.getElementById(`j_${gi}_${si}`);
      const fEl = document.getElementById(`f_${gi}_${si}`);
      const jVal = parseInt(jEl.value) || 0;
      const fVal = parseInt(fEl.value) || 0;

      // Validate min jail (applies to all crimes incl. isLife where minJ > 0)
      if (s.hasJ && s.minJ > 0 && jVal > 0 && jVal < s.minJ) {
        const maxLabel = s.isLife ? 'doživotí' : `${s.maxJ} let`;
        Modal.info('<i class="fa-solid fa-ban"></i>', 'PODMINIMÁLNÍ TREST',
          `Zákon neumožňuje udělit méně než ${s.minJ} let. Zadejte hodnotu od ${s.minJ} do ${maxLabel}.`);
        return;
      }

      // Validate max jail
      if (s.hasJ && s.maxJ > 0 && s.maxJ < 99 && jVal > s.maxJ) {
        Modal.info('<i class="fa-solid fa-ban"></i>', 'NADMAXIMOÁLNÍ TREST',
          `Maximální sazba je ${s.maxJ} let. Vyšší trest není zákonem povolen.`);
        return;
      }

      // Validate that a value was entered
      if (s.hasJ && !s.isLife && jVal === 0 && !s.fixedJail) {
        Modal.info('<i class="fa-solid fa-triangle-exclamation"></i>', 'CHYBÍ POČET LET',
          `Zadejte délku trestu odnětí svobody (${s.minJ}–${s.maxJ} let).`);
        return;
      }

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
      document.getElementById('modalOverlay').style.display = 'flex';
    },

    yes() { if (this._cb) this._cb(); else this.close(); },
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
    },

    _renderLaws() {
      return _categories.map((cat, ci) => `
        <div class="admin-category">
          <div class="admin-cat-header" onclick="SASP.adminToggleCat(${ci})">
            <span>${_esc(cat.icon || '')} ${_esc(cat.name)}</span>
            <span>${cat.laws.length} zákonů ▾</span>
          </div>
          <div class="admin-cat-body" id="acb_${ci}">
            ${cat.laws.map((law, li) => this._renderLawRow(ci, li, law)).join('')}
            <div class="admin-law-row">
              <button class="admin-btn btn-add" style="width:100%"
                onclick="SASP.adminNewLaw(${ci})">+ PŘIDAT NOVÝ ZÁKON</button>
            </div>
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
              <button class="admin-btn btn-edit" onclick="SASP.adminEditLaw(${ci},${li})">EDITOVAT</button>
              <button class="admin-btn btn-del"  onclick="SASP.adminDelLaw(${ci},${li})">SMAZAT</button>
            </div>
          </div>
          ${isEditing ? this._lawEditForm(ci, li, law) : ''}
          ${law.subs.map((s, si) => this._renderSubRow(ci, li, si, s)).join('')}
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
              <button class="admin-btn btn-edit" onclick="SASP.adminEditSub(${ci},${li},${si})">EDIT</button>
              <button class="admin-btn btn-del"  onclick="SASP.adminDelSub(${ci},${li},${si})">✕</button>
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
      if (hasZP)  out += ' [ZP]  ODEBRAT ZBROJNÍ PRŮKAZ\n';
      if (hasRP)  out += ' [RP]  ODEBRAT ŘIDIČSKÝ PRŮKAZ\n';
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

  // ── Utility ───────────────────────────────────────────────
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
    addCharge(gi, si) { Protocol.add(gi, si); },
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
    clearProtocol() {
      if (_protocol.length === 0) return;
      if (confirm('Vymazat celý protokol? Aktuální případ bude ztracen.')) {
        _protocol = [];
        Render.protocol();
      }
    },

    /* Modal */
    modalYes()   { Modal.yes(); },
    modalClose() { Modal.close(); },

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
      if (!confirm('Smazat zákon: ' + law.title + '?')) return;
      _categories[ci].laws.splice(li, 1);
      _buildFlat();
      Data.save();
      Admin._editing = null;
      Admin._render();
      Render.laws();
      UI.toast('Zákon smazán');
    },
    adminNewLaw(ci) {
      const num = prompt('Číslo paragrafu (číslo):');
      if (!num) return;
      const title = prompt('Název zákona (např. §' + num + ' Název):');
      if (!title) return;
      _categories[ci].laws.push({
        id: 'par' + num + '_' + Date.now(),
        number: parseInt(num) || 0,
        title: title.trim(),
        description: '',
        subs: []
      });
      _buildFlat();
      Data.save();
      Admin._render();
      Render.laws();
      UI.toast('✓ Zákon přidán');
    },

    /* Admin – sub CRUD */
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
      if (!confirm('Smazat tuto sub-položku?')) return;
      _categories[ci].laws[li].subs.splice(si, 1);
      _buildFlat();
      Data.save();
      Admin._editing = null;
      Admin._render();
      Render.laws();
      UI.toast('Sub-položka smazána');
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
  document.getElementById('historyBtn')
    ?.addEventListener('click', () => SASP.openHistory());
  document.getElementById('historyClose')
    ?.addEventListener('click', () => SASP.closeHistory());
  document.getElementById('clearBtn')
    .addEventListener('click', () => SASP.clearProtocol());

  // Admin
  document.getElementById('adminBtn')
    ?.addEventListener('click', () => SASP.openAdmin());
  document.getElementById('adminClose')
    ?.addEventListener('click', () => SASP.closeAdmin());

  document.querySelectorAll('.admin-tab').forEach(t =>
    t.addEventListener('click', () => SASP.adminSwitchTab(t.dataset.tab)));

  // Modal
  document.getElementById('modalYes')
    .addEventListener('click', () => SASP.modalYes());
  document.getElementById('modalNo')
    .addEventListener('click', () => SASP.modalClose());

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    // Ctrl+Shift+A → Admin
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      SASP.openAdmin();
    }
    // Escape → close modals
    if (e.key === 'Escape') {
      SASP.closeAdmin();
      SASP.modalClose();
      SASP.closeHistory();
    }
    }
  );
});
