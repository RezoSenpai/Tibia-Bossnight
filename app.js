(function () {
  'use strict';

  const BOSS_NAMES = {
    P: 'Pale',
    D: 'The First Dragon',
    Z: 'Zelos',
    F: 'Ferumbras',
    H: 'Heart of Destruction',
    L: 'Last Lore Keeper',
    C: 'Cults'
  };

  const BOSS_TEAM_SIZES = { P: 10, D: 15, Z: 10, F: 15, H: 15, L: 15, C: 10 };
  const VALID_TEAM_CODES = 'PZFHLCD';
  const VALID_SET = new Set(VALID_TEAM_CODES);

  const VOCATIONS = {
    ek: 'Elite Knight', eliteknight: 'Elite Knight',
    ed: 'Elder Druid', elderdruid: 'Elder Druid',
    ms: 'Master Sorcerer', mastersorcerer: 'Master Sorcerer',
    rp: 'Royal Paladin', royalpaladin: 'Royal Paladin',
    em: 'Exalted Monk', exaltedmonk: 'Exalted Monk', monk: 'Exalted Monk'
  };

  const VOC_SHORT = { 'Elite Knight': 'EK', 'Elder Druid': 'ED', 'Master Sorcerer': 'MS', 'Royal Paladin': 'RP', 'Exalted Monk': 'EM' };

  function getBossRequirements(code) {
    code = code.toUpperCase();
    if (code === 'P') {
      return { 'Elite Knight': [1, 10], 'Elder Druid': [1, 10], 'Master Sorcerer': [0, 10], 'Royal Paladin': [0, 10], 'Exalted Monk': [0, 10] };
    }
    if (code === 'Z') {
      return { 'Elite Knight': [2, 3], 'Elder Druid': [2, 10], 'Master Sorcerer': [2, 10], 'Royal Paladin': [2, 10], 'Exalted Monk': [0, 10] };
    }
    if (code === 'F') {
      return { 'Elite Knight': [2, 15], 'Elder Druid': [2, 15], 'Master Sorcerer': [0, 15], 'Royal Paladin': [0, 15], 'Exalted Monk': [0, 15] };
    }
    if (code === 'H') {
      return { 'Elite Knight': [3, 6], 'Elder Druid': [3, 15], 'Master Sorcerer': [0, 15], 'Royal Paladin': [0, 15], 'Exalted Monk': [0, 15] };
    }
    if (code === 'L') {
      return { 'Elite Knight': [4, 15], 'Elder Druid': [4, 15], 'Master Sorcerer': [0, 15], 'Royal Paladin': [0, 15], 'Exalted Monk': [0, 15] };
    }
    if (code === 'C') {
      return { 'Elite Knight': [1, 10], 'Elder Druid': [1, 10], 'Master Sorcerer': [0, 10], 'Royal Paladin': [1, 10], 'Exalted Monk': [0, 10] };
    }
    if (code === 'D') {
      return { 'Elite Knight': [2, 15], 'Elder Druid': [2, 15], 'Master Sorcerer': [0, 15], 'Royal Paladin': [0, 15], 'Exalted Monk': [0, 15] };
    }
    return { 'Elite Knight': [1, 10], 'Elder Druid': [1, 10], 'Master Sorcerer': [1, 10], 'Royal Paladin': [1, 10], 'Exalted Monk': [0, 10] };
  }

  function normalizeVocation(text) {
    const key = (text || '').replace(/\s/g, '').toLowerCase();
    return VOCATIONS[key] || null;
  }

  function parseImport(text) {
    const members = [];
    const lines = (text || '').trim().split('\n');
    const nameRe = /@?([^(]+)/;
    const signupRe = /\(([^)]+)\)\s*([PZFHLCD]+)/gi;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const nameMatch = trimmed.match(nameRe);
      if (!nameMatch) continue;

      let characterName = nameMatch[1].trim().replace(/^@/, '').trim();
      if (!characterName) continue;

      const matches = [...trimmed.matchAll(signupRe)];
      if (!matches.length) continue;

      const userId = -(Math.abs(hashCode(characterName)) % 1000000 + 1000);

      let member = members.find(m => m.id === userId);
      if (!member) {
        member = {
          id: userId,
          name: characterName,
          priority: members.length,
          vocationToTeams: {},
          bossRoles: {},
          vocationPriority: {}
        };
        members.push(member);
      }
      member.name = characterName;

      for (const m of matches) {
        const vocStr = m[1].trim();
        const bossCodes = (m[2] || '').toUpperCase().split('').filter(c => VALID_SET.has(c));
        const voc = normalizeVocation(vocStr);
        if (!voc) continue;
        if (!member.vocationToTeams[voc]) member.vocationToTeams[voc] = [];
        bossCodes.forEach(c => { if (!member.vocationToTeams[voc].includes(c)) member.vocationToTeams[voc].push(c); });
      }
    }

    return members;
  }

  function hashCode(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0;
    return h;
  }

  function buildPlayersForBoss(members, code) {
    const players = [];
    for (const m of members) {
      for (const [voc, bosses] of Object.entries(m.vocationToTeams || {})) {
        if (!bosses.includes(code)) continue;
        const roles = (m.bossRoles && m.bossRoles[code]) ? m.bossRoles[code].slice() : [];
        let vocationPriorityRank = 999;
        if (m.vocationPriority && m.vocationPriority[code] && m.vocationPriority[code].indexOf(voc) !== -1) {
          vocationPriorityRank = m.vocationPriority[code].indexOf(voc);
        }
        players.push({
          userId: m.id,
          name: m.name,
          vocation: voc,
          priority: m.priority,
          level: m.level || null,
          roles: roles,
          vocationPriorityRank: vocationPriorityRank
        });
      }
    }
    return players;
  }

  function generateTeam(players, minMax, teamSize, bossCode) {
    const pool = players.slice();
    if (!pool.length) return null;

    pool.sort((a, b) => (a.priority - b.priority) || (a.vocationPriorityRank - b.vocationPriorityRank) || (a.name.toLowerCase().localeCompare(b.name.toLowerCase())));

    const byVocation = {};
    pool.forEach(p => {
      if (!byVocation[p.vocation]) byVocation[p.vocation] = [];
      byVocation[p.vocation].push(p);
    });

    const team = [];
    const selectedIds = new Set();
    const counts = {};
    Object.keys(minMax).forEach(v => { counts[v] = 0; });

    for (const [vocation, [vMin]] of Object.entries(minMax)) {
      const candidates = (byVocation[vocation] || []).filter(p => !selectedIds.has(p.userId));
      if (candidates.length < vMin) return null;
      const chosen = candidates.slice(0, vMin);
      team.push(...chosen);
      counts[vocation] += chosen.length;
      chosen.forEach(p => selectedIds.add(p.userId));
    }

    while (team.length < teamSize) {
      let best = null, bestVoc = null;
      for (const [vocation, [vMin, vMax]] of Object.entries(minMax)) {
        if (counts[vocation] >= vMax) continue;
        const candidates = byVocation[vocation] || [];
        const remaining = candidates.filter(p => !selectedIds.has(p.userId));
        if (!remaining.length) continue;
        const c = remaining[0];
        if (!best || c.priority < best.priority) { best = c; bestVoc = vocation; }
      }
      if (!best) break;
      team.push(best);
      counts[bestVoc]++;
      selectedIds.add(best.userId);
    }

    let ekCount = counts['Elite Knight'] || 0, edCount = counts['Elder Druid'] || 0;
    const msCount = counts['Master Sorcerer'] || 0, rpCount = counts['Royal Paladin'] || 0;
    const shooterCount = msCount + rpCount;

    if (bossCode === 'Z' && ekCount === 3) {
      if (edCount < 3) {
        const eds = (byVocation['Elder Druid'] || []).filter(p => !selectedIds.has(p.userId));
        if (eds.length < 3 - edCount) return null;
      }
      if (rpCount < 1) {
        const rps = (byVocation['Royal Paladin'] || []).filter(p => !selectedIds.has(p.userId));
        if (!rps.length) return null;
      }
    }

    if (bossCode === 'P' && shooterCount < 2) return null;
    if (bossCode === 'F' && (msCount < 1 || shooterCount < 3)) return null;
    if (bossCode === 'H' && (msCount < 1 || shooterCount < 5)) return null;
    if (bossCode === 'L' && (msCount < 1 || shooterCount < 5)) return null;
    if (bossCode === 'C' && shooterCount < 2) return null;

    for (const [v, [vMin, vMax]] of Object.entries(minMax)) {
      const c = counts[v] || 0;
      if (c < vMin || c > vMax) return null;
    }

    return team;
  }

  function splitIntoSubParties(team, code) {
    if (code === 'H') {
      const subPartySize = 5;
      const labels = ['Left', 'Mid', 'Right'];
      const eks = team.filter(p => p.vocation === 'Elite Knight').sort((a, b) => (a.priority - b.priority) || (a.name.toLowerCase().localeCompare(b.name.toLowerCase())));
      const eds = team.filter(p => p.vocation === 'Elder Druid').sort((a, b) => (a.priority - b.priority) || (a.name.toLowerCase().localeCompare(b.name.toLowerCase())));
      const msList = team.filter(p => p.vocation === 'Master Sorcerer').sort((a, b) => (a.priority - b.priority) || (a.name.toLowerCase().localeCompare(b.name.toLowerCase())));
      const rps = team.filter(p => p.vocation === 'Royal Paladin').sort((a, b) => (a.priority - b.priority) || (a.name.toLowerCase().localeCompare(b.name.toLowerCase())));
      const others = team.filter(p => !['Elite Knight', 'Elder Druid', 'Master Sorcerer', 'Royal Paladin'].includes(p.vocation));

      const subParties = [[], [], []];
      const assigned = new Set();

      const pairEkEd = (ek, ed) => {
        for (let i = 0; i < 3; i++) {
          if (subParties[i].length < subPartySize && !assigned.has(ek.userId) && !assigned.has(ed.userId)) {
            subParties[i].push(ek, ed);
            assigned.add(ek.userId); assigned.add(ed.userId);
            return true;
          }
        }
        return false;
      };

      let ei = 0, di = 0;
      while (ei < eks.length && di < eds.length) {
        if (pairEkEd(eks[ei], eds[di])) { ei++; di++; } else if (ei < eks.length && subParties.some(s => s.length < subPartySize)) {
          const idx = subParties.findIndex(s => s.length < subPartySize);
          subParties[idx].push(eks[ei]); assigned.add(eks[ei].userId); ei++;
        } else if (di < eds.length && subParties.some(s => s.length < subPartySize)) {
          const idx = subParties.findIndex(s => s.length < subPartySize);
          subParties[idx].push(eds[di]); assigned.add(eds[di].userId); di++;
        } else break;
      }

      const remaining = [...msList, ...rps, ...others, ...eks.slice(ei), ...eds.slice(di)].filter(p => !assigned.has(p.userId));
      let ri = 0;
      while (ri < remaining.length) {
        const idx = subParties.reduce((best, s, i) => (s.length < subParties[best].length ? i : best), 0);
        if (subParties[idx].length >= subPartySize) break;
        subParties[idx].push(remaining[ri]); assigned.add(remaining[ri].userId); ri++;
      }

      return subParties.every(s => s.length <= subPartySize) ? subParties : null;
    }

    if (code === 'L') {
      const targetSizes = [4, 4, 4, 3];
      const labels = ['Top Left', 'Top Right', 'Bottom Left', 'Bottom Right'];
      const sorted = team.slice().sort((a, b) => (a.priority - b.priority) || (a.name.toLowerCase().localeCompare(b.name.toLowerCase())));
      const subParties = [[], [], [], []];
      let idx = 0;
      for (let i = 0; i < targetSizes.length; i++) {
        for (let j = 0; j < targetSizes[i] && idx < sorted.length; j++) {
          subParties[i].push(sorted[idx++]);
        }
      }
      return subParties;
    }

    return null;
  }

  function formatPlayerLine(p, indent) {
    const levelStr = p.level ? ' Lvl ' + p.level : '';
    const rolesStr = p.roles && p.roles.length ? ' [' + p.roles.join(', ') + ']' : '';
    return (indent || '') + p.name + ' (' + p.vocation + ')' + levelStr + rolesStr;
  }

  function formatTeamsForDiscord(generated, bossNames) {
    const lines = [];
    generated.forEach((item) => {
      const { code, teamNumber, team: teamPlayers, teamSize } = item;
      const bossName = (bossNames && bossNames[code]) || code;
      const needsSplit = code === 'H' || code === 'L';
      const subParties = needsSplit ? splitIntoSubParties(teamPlayers, code) : null;

      if (subParties && subParties.length) {
        const subLabels = code === 'H' ? ['Left', 'Mid', 'Right'] : ['Top Left', 'Top Right', 'Bottom Left', 'Bottom Right'];
        lines.push('**' + bossName + ' — Team ' + teamNumber + ' (' + teamPlayers.length + '/' + teamSize + ')**', '');
        subParties.forEach((sub, i) => {
          const vocCounts = sub.reduce((acc, p) => { acc[p.vocation] = (acc[p.vocation] || 0) + 1; return acc; }, {});
          const comp = Object.entries(vocCounts).map(([v, c]) => v + ': ' + c).sort().join(', ');
          lines.push('**' + subLabels[i] + '** (' + sub.length + ' players) — ' + comp);
          sub.sort((a, b) => (a.vocation.localeCompare(b.vocation)) || (a.name.toLowerCase().localeCompare(b.name.toLowerCase()))).forEach(p => lines.push('  ' + formatPlayerLine(p)));
          lines.push('');
        });
      } else {
        const vocCounts = teamPlayers.reduce((acc, p) => { acc[p.vocation] = (acc[p.vocation] || 0) + 1; return acc; }, {});
        const comp = Object.entries(vocCounts).map(([v, c]) => v + ': ' + c).sort().join(', ');
        lines.push('**' + bossName + ' — Team ' + teamNumber + ' (' + teamPlayers.length + '/' + teamSize + ')** — ' + comp, '');
        teamPlayers.sort((a, b) => (a.vocation.localeCompare(b.vocation)) || (a.name.toLowerCase().localeCompare(b.name.toLowerCase()))).forEach(p => lines.push(formatPlayerLine(p)));
        lines.push('');
      }
      if (item.backups && item.backups.length) {
        lines.push('**Back-up / Reserves:**', '');
        item.backups.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())).forEach(p => lines.push(formatPlayerLine(p)));
        lines.push('');
      }
    });
    return lines.join('\n');
  }

  function parseTeamCodesInput(str) {
    const result = [];
    const parts = (str || '').toUpperCase().split(/\s+/);
    for (const part of parts) {
      const match = part.match(/^([PZFHLCD])(\d*)$/);
      if (match) {
        const code = match[1];
        const count = Math.max(1, parseInt(match[2] || '1', 10));
        if (VALID_SET.has(code)) result.push({ code, count });
      }
    }
    return result;
  }

  function runGeneration(members, spec) {
    const generated = [];
    for (const { code, count } of spec) {
      const players = buildPlayersForBoss(members, code);
      const teamSize = BOSS_TEAM_SIZES[code] || 10;
      const minMax = getBossRequirements(code);
      let remaining = players.slice();

      for (let n = 0; n < count; n++) {
        const team = generateTeam(remaining, minMax, teamSize, code);
        if (!team) break;
        generated.push({ code, teamNumber: n + 1, team, teamSize, backups: [] });
        const used = new Set(team.map(p => p.userId));
        remaining = remaining.filter(p => !used.has(p.userId));
      }
      if (remaining.length && generated.length && generated[generated.length - 1].code === code) {
        generated[generated.length - 1].backups = remaining;
      }
    }
    return generated;
  }

  let state = { members: [], generated: null };

  function renderPlayersList() {
    const container = document.getElementById('players-container');
    if (!container) return;
    container.innerHTML = '';
    state.members.forEach((m, idx) => {
      m.priority = idx;
      const signups = [];
      for (const [voc, bosses] of Object.entries(m.vocationToTeams || {})) {
        signups.push('(' + (VOC_SHORT[voc] || voc) + ') ' + [...bosses].sort((a, b) => VALID_TEAM_CODES.indexOf(a) - VALID_TEAM_CODES.indexOf(b)).join(''));
      }
      const rolesByBoss = m.bossRoles || {};
      const prioByBoss = m.vocationPriority || {};
      const block = document.createElement('div');
      block.className = 'player-block';
      block.innerHTML = '<div class="name">' + escapeHtml(m.name) + '</div><div class="signups">' + signups.map(s => '<span>' + escapeHtml(s) + '</span>').join('') + '</div>';
      const actions = document.createElement('div');
      actions.className = 'player-actions';

      const codesForMember = [];
      VALID_TEAM_CODES.split('').forEach(code => {
        const hasCode = Object.values(m.vocationToTeams || {}).some(arr => arr.includes(code));
        if (hasCode) codesForMember.push(code);
      });
      codesForMember.forEach(code => {
        const roles = rolesByBoss[code] || [];
        const vocs = [];
        for (const [voc, list] of Object.entries(m.vocationToTeams || {})) {
          if (list && list.includes(code)) vocs.push(voc);
        }
        const line = document.createElement('div');
        line.className = 'player-actions';
        line.appendChild(document.createTextNode('Boss ' + code + ' (' + (BOSS_NAMES[code] || code) + '): '));
        ['Red Knight', 'Mentor', 'Virgin', 'Tank'].forEach(role => {
          if (roles.includes(role)) {
            const tag = document.createElement('span');
            tag.className = 'role-tag';
            tag.textContent = role;
            const rm = document.createElement('span');
            rm.className = 'remove-role';
            rm.textContent = ' ×';
            rm.onclick = () => {
              if (!m.bossRoles[code]) m.bossRoles[code] = [];
              m.bossRoles[code] = m.bossRoles[code].filter(r => r !== role);
              renderPlayersList();
            };
            tag.appendChild(rm);
            line.appendChild(tag);
          }
        });
        const addRoleSel = document.createElement('select');
        addRoleSel.innerHTML = '<option value="">+ Role</option><option value="Red Knight">Red Knight</option><option value="Mentor">Mentor</option><option value="Virgin">Virgin</option><option value="Tank">Tank</option>';
        addRoleSel.onchange = function () {
          const v = this.value;
          if (!v) return;
          if (!m.bossRoles[code]) m.bossRoles[code] = [];
          if (!m.bossRoles[code].includes(v)) m.bossRoles[code].push(v);
          this.value = '';
          renderPlayersList();
        };
        line.appendChild(addRoleSel);
        const prioSel = document.createElement('select');
        prioSel.title = 'Vocation priority for this boss';
        prioSel.innerHTML = '<option value="">Vocation priority</option>' + vocs.map(v => '<option value="' + escapeHtml(v) + '">' + (VOC_SHORT[v] || v) + ' 1st</option>').join('');
        if (prioByBoss[code] && prioByBoss[code].length) prioSel.value = prioByBoss[code][0];
        prioSel.onchange = function () {
          const v = this.value;
          if (!m.vocationPriority) m.vocationPriority = {};
          m.vocationPriority[code] = v ? [v] : [];
          renderPlayersList();
        };
        line.appendChild(prioSel);
        actions.appendChild(line);
      });
      block.appendChild(actions);
      container.appendChild(block);
    });
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function renderPreview() {
    const preview = document.getElementById('teams-preview');
    const output = document.getElementById('output-text');
    if (!preview || !state.generated || !state.generated.length) return;

    preview.innerHTML = '';
    const bossNames = BOSS_NAMES;
    state.generated.forEach(({ code, teamNumber, team: teamPlayers, teamSize }) => {
      const bossName = bossNames[code] || code;
      const bossDiv = document.createElement('div');
      bossDiv.className = 'boss-block';
      bossDiv.innerHTML = '<h4>' + escapeHtml(bossName) + ' — Team ' + teamNumber + '</h4>';
      const teamDiv = document.createElement('div');
      teamDiv.className = 'team-block';
      teamDiv.dataset.code = code;
      teamDiv.dataset.teamIndex = String(teamNumber - 1);
      const ul = document.createElement('ul');
      ul.className = 'team-slot';
      teamPlayers.forEach((p, i) => {
        const li = document.createElement('li');
        li.draggable = true;
        li.dataset.userId = String(p.userId);
        li.dataset.vocation = p.vocation;
        li.dataset.name = p.name;
        li.dataset.roles = (p.roles || []).join(',');
        li.dataset.priority = String(p.priority);
        li.dataset.vocationPriorityRank = String(p.vocationPriorityRank);
        li.innerHTML = '<span>' + escapeHtml(p.name) + ' <span class="voc">(' + (VOC_SHORT[p.vocation] || p.vocation) + ')</span></span>' + (p.roles && p.roles.length ? '<span class="roles">' + escapeHtml(p.roles.join(', ')) + '</span>' : '');
        ul.appendChild(li);
      });
      teamDiv.appendChild(ul);
      bossDiv.appendChild(teamDiv);
      preview.appendChild(bossDiv);
    });

    output.value = formatTeamsForDiscord(state.generated, BOSS_NAMES);

    setupDragDrop(preview);
  }

  function setupDragDrop(previewEl) {
    let dragged = null;
    previewEl.querySelectorAll('.team-slot li').forEach(li => {
      li.addEventListener('dragstart', function (e) {
        dragged = { el: this, userId: this.dataset.userId, vocation: this.dataset.vocation, name: this.dataset.name, roles: (this.dataset.roles || '').split(',').filter(Boolean), priority: parseInt(this.dataset.priority, 10), vocationPriorityRank: parseInt(this.dataset.vocationPriorityRank, 10) };
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.dataset.userId);
      });
      li.addEventListener('dragend', function () {
        this.classList.remove('dragging');
        previewEl.querySelectorAll('.drag-over').forEach(x => x.classList.remove('drag-over'));
        dragged = null;
      });
      li.addEventListener('dragover', function (e) {
        e.preventDefault();
        if (dragged && this !== dragged.el) this.classList.add('drag-over');
      });
      li.addEventListener('dragleave', function () {
        this.classList.remove('drag-over');
      });
      li.addEventListener('drop', function (e) {
        e.preventDefault();
        this.classList.remove('drag-over');
        if (!dragged || this === dragged.el) return;
        const targetParent = this.closest('ul');
        const sourceParent = dragged.el.closest('ul');
        if (!targetParent || !sourceParent) return;
        const targetCode = this.closest('.team-block').dataset.code;
        const sourceCode = this.closest('.team-block').dataset.code;
        if (targetCode !== sourceCode) return;
        const allItems = [...targetParent.querySelectorAll('li')];
        const targetIdx = allItems.indexOf(this);
        const sourceIdx = allItems.indexOf(dragged.el);
        if (targetIdx === -1 || sourceIdx === -1) return;
        if (sourceIdx < targetIdx) {
          targetParent.insertBefore(dragged.el, allItems[targetIdx].nextSibling);
        } else {
          targetParent.insertBefore(dragged.el, this);
        }
        syncGeneratedFromPreview();
      });
    });
  }

  function syncGeneratedFromPreview() {
    const preview = document.getElementById('teams-preview');
    if (!preview || !state.generated) return;
    const teamBlocks = preview.querySelectorAll('.team-block');
    let blockIdx = 0;
    state.generated.forEach((gen, i) => {
      const ul = teamBlocks[blockIdx] && teamBlocks[blockIdx].querySelector('.team-slot');
      blockIdx++;
      if (!ul) return;
      const newTeam = [];
      ul.querySelectorAll('li').forEach(li => {
        newTeam.push({
          userId: parseInt(li.dataset.userId, 10),
          name: li.dataset.name,
          vocation: li.dataset.vocation,
          priority: parseInt(li.dataset.priority, 10),
          level: null,
          roles: (li.dataset.roles || '').split(',').filter(Boolean),
          vocationPriorityRank: parseInt(li.dataset.vocationPriorityRank, 10)
        });
      });
      gen.team = newTeam;
    });
    const output = document.getElementById('output-text');
    if (output) output.value = formatTeamsForDiscord(state.generated, BOSS_NAMES);
  }

  document.getElementById('btn-import').addEventListener('click', function () {
    const text = document.getElementById('import-text').value;
    const status = document.getElementById('import-status');
    const listEl = document.getElementById('players-list');
    state.members = parseImport(text);
    if (!state.members.length) {
      status.textContent = 'No valid sign-ups found. Check the format.';
      status.className = 'status error';
      listEl.classList.add('hidden');
      return;
    }
    status.textContent = 'Imported ' + state.members.length + ' player(s).';
    status.className = 'status success';
    listEl.classList.remove('hidden');
    renderPlayersList();
  });

  document.getElementById('btn-generate').addEventListener('click', function () {
    const input = document.getElementById('team-codes').value;
    const status = document.getElementById('generate-status');
    const stepPreview = document.getElementById('step-preview');
    const spec = parseTeamCodesInput(input);
    if (!spec.length) {
      status.textContent = 'Enter boss codes like P2 Z1 F1.';
      status.className = 'status error';
      return;
    }
    if (!state.members.length) {
      status.textContent = 'Import sign-ups first.';
      status.className = 'status error';
      return;
    }
    state.generated = runGeneration(state.members, spec);
    if (!state.generated.length) {
      status.textContent = 'Could not form any teams. Check sign-ups and boss codes.';
      status.className = 'status error';
      stepPreview.classList.add('hidden');
      return;
    }
    status.textContent = 'Generated ' + state.generated.length + ' team(s). Adjust below and copy.';
    status.className = 'status success';
    stepPreview.classList.remove('hidden');
    renderPreview();
  });

  document.getElementById('btn-regen').addEventListener('click', function () {
    const input = document.getElementById('team-codes').value;
    const spec = parseTeamCodesInput(input);
    if (spec.length && state.members.length) {
      state.generated = runGeneration(state.members, spec);
      renderPreview();
    }
  });

  document.getElementById('btn-copy').addEventListener('click', function () {
    const output = document.getElementById('output-text');
    const copyStatus = document.getElementById('copy-status');
    if (!output || !output.value) return;
    output.select();
    try {
      document.execCommand('copy');
      copyStatus.textContent = 'Copied to clipboard!';
      copyStatus.className = 'status success';
      setTimeout(() => { copyStatus.textContent = ''; }, 2000);
    } else {
      copyStatus.textContent = 'Select and copy manually.';
      copyStatus.className = 'status';
    }
  });
})();
