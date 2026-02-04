(function () {
  'use strict';

  const BOSS_NAMES = { P: 'Pale', D: 'The First Dragon', Z: 'Zelos', F: 'Ferumbras', H: 'Heart of Destruction', L: 'Last Lore Keeper', C: 'Cults' };
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
  const VOC_ORDER = { 'Elite Knight': 0, 'Elder Druid': 1, 'Master Sorcerer': 2, 'Royal Paladin': 3, 'Exalted Monk': 4 };
  function sortByVocation(players) {
    return players.slice().sort((a, b) => (VOC_ORDER[a.vocation] !== undefined ? VOC_ORDER[a.vocation] : 99) - (VOC_ORDER[b.vocation] !== undefined ? VOC_ORDER[b.vocation] : 99) || (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));
  }

  function getBossRequirements(code) {
    code = code.toUpperCase();
    const reqs = {
      P: { 'Elite Knight': [1, 10], 'Elder Druid': [1, 10], 'Master Sorcerer': [0, 10], 'Royal Paladin': [0, 10], 'Exalted Monk': [0, 10] },
      Z: { 'Elite Knight': [2, 3], 'Elder Druid': [2, 10], 'Master Sorcerer': [2, 10], 'Royal Paladin': [2, 10], 'Exalted Monk': [0, 10] },
      F: { 'Elite Knight': [2, 15], 'Elder Druid': [2, 15], 'Master Sorcerer': [0, 15], 'Royal Paladin': [0, 15], 'Exalted Monk': [0, 15] },
      H: { 'Elite Knight': [3, 6], 'Elder Druid': [3, 15], 'Master Sorcerer': [0, 15], 'Royal Paladin': [0, 15], 'Exalted Monk': [0, 15] },
      L: { 'Elite Knight': [4, 15], 'Elder Druid': [4, 15], 'Master Sorcerer': [0, 15], 'Royal Paladin': [0, 15], 'Exalted Monk': [0, 15] },
      C: { 'Elite Knight': [1, 10], 'Elder Druid': [1, 10], 'Master Sorcerer': [0, 10], 'Royal Paladin': [1, 10], 'Exalted Monk': [0, 10] },
      D: { 'Elite Knight': [2, 15], 'Elder Druid': [2, 15], 'Master Sorcerer': [0, 15], 'Royal Paladin': [0, 15], 'Exalted Monk': [0, 15] }
    };
    return reqs[code] || reqs.P;
  }

  function normalizeVocation(text) {
    const key = (text || '').replace(/\s/g, '').toLowerCase();
    return VOCATIONS[key] || null;
  }

  function getSignupMatches(line) {
    const matches = [];
    const upper = line.toUpperCase();
    const re = /\(([^)]+)\)\s*([PZFHLCD]+)/g;
    let m;
    while ((m = re.exec(upper)) !== null) {
      matches.push([m[1].trim(), (m[2] || '').split('').filter(c => VALID_SET.has(c))]);
    }
    return matches;
  }

  function parseImport(text) {
    const members = [];
    const lines = (text || '').trim().split(/\r?\n/);
    const nameRe = /@?\s*([^(]+?)\s*\(/;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const nameMatch = trimmed.match(nameRe);
      const characterName = nameMatch ? nameMatch[1].trim().replace(/^@\s*/, '').trim() : '';
      if (!characterName) continue;

      const matches = getSignupMatches(trimmed);
      if (!matches.length) continue;

      const userId = -(Math.abs(hashCode(characterName)) % 1000000 + 1000);
      let member = members.find(m => m.id === userId);
      if (!member) {
        member = { id: userId, name: characterName, priority: members.length, vocationToTeams: {}, bossRoles: {}, vocationPriority: {} };
        members.push(member);
      }
      member.name = characterName;

      for (const [vocStr, bossCodes] of matches) {
        const voc = normalizeVocation(vocStr);
        if (!voc || !bossCodes.length) continue;
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
        if (m.vocationPriority && m.vocationPriority[code] && m.vocationPriority[code].indexOf(voc) !== -1)
          vocationPriorityRank = m.vocationPriority[code].indexOf(voc);
        players.push({ userId: m.id, name: m.name, vocation: voc, priority: m.priority, level: m.level || null, roles: roles, vocationPriorityRank: vocationPriorityRank });
      }
    }
    return players;
  }

  function generateTeam(players, minMax, teamSize, bossCode) {
    const pool = players.slice();
    if (!pool.length) return null;
    pool.sort((a, b) => (a.priority - b.priority) || (a.vocationPriorityRank - b.vocationPriorityRank) || (a.name.toLowerCase().localeCompare(b.name.toLowerCase())));

    const byVocation = {};
    pool.forEach(p => { if (!byVocation[p.vocation]) byVocation[p.vocation] = []; byVocation[p.vocation].push(p); });

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
        const remaining = (byVocation[vocation] || []).filter(p => !selectedIds.has(p.userId));
        if (!remaining.length) continue;
        const c = remaining[0];
        if (!best || c.priority < best.priority) { best = c; bestVoc = vocation; }
      }
      if (!best) break;
      team.push(best);
      counts[bestVoc]++;
      selectedIds.add(best.userId);
    }

    const ekCount = counts['Elite Knight'] || 0, edCount = counts['Elder Druid'] || 0;
    const msCount = counts['Master Sorcerer'] || 0, rpCount = counts['Royal Paladin'] || 0;
    const shooterCount = msCount + rpCount;
    if (bossCode === 'Z' && ekCount === 3) {
      if (edCount < 3) return null;
      if (rpCount < 1) return null;
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

  /** Build a best-effort team from pool when full requirements can't be met. Uses priority order. */
  function generateTeamPartial(players, teamSize, bossCode) {
    const pool = players.slice();
    if (!pool.length) return [];
    pool.sort((a, b) => (a.priority - b.priority) || (a.vocationPriorityRank - b.vocationPriorityRank) || (a.name.toLowerCase().localeCompare(b.name.toLowerCase())));
    const team = [];
    const seen = new Set();
    for (const p of pool) {
      if (seen.has(p.userId)) continue;
      seen.add(p.userId);
      team.push(p);
      if (team.length >= teamSize) break;
    }
    return team;
  }

  function splitIntoSubParties(team, code) {
    if (code === 'H') {
      const subPartySize = 5;
      const eks = team.filter(p => p.vocation === 'Elite Knight').sort((a, b) => a.priority - b.priority || a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
      const eds = team.filter(p => p.vocation === 'Elder Druid').sort((a, b) => a.priority - b.priority || a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
      const msList = team.filter(p => p.vocation === 'Master Sorcerer').sort((a, b) => a.priority - b.priority || a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
      const rps = team.filter(p => p.vocation === 'Royal Paladin').sort((a, b) => a.priority - b.priority || a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
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
        if (pairEkEd(eks[ei], eds[di])) { ei++; di++; }
        else if (ei < eks.length && subParties.some(s => s.length < subPartySize)) {
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
      const sorted = team.slice().sort((a, b) => (a.priority - b.priority) || (a.name.toLowerCase().localeCompare(b.name.toLowerCase())));
      const subParties = [[], [], [], []];
      let idx = 0;
      for (let i = 0; i < targetSizes.length; i++)
        for (let j = 0; j < targetSizes[i] && idx < sorted.length; j++)
          subParties[i].push(sorted[idx++]);
      return subParties;
    }
    return null;
  }

  function formatPlayerLine(p, indent) {
    const levelStr = p.level ? ' Lvl ' + p.level : '';
    const rolesStr = p.roles && p.roles.length ? ' [' + p.roles.join(', ') + ']' : '';
    return (indent || '') + p.name + ' (' + p.vocation + ')' + levelStr + rolesStr;
  }

  function formatOneTeamForDiscord(item, bossNames) {
    const lines = [];
    const { code, teamNumber, team: teamPlayers, teamSize } = item;
    const bossName = (bossNames && bossNames[code]) || code;
    const sorted = sortByVocation(teamPlayers);
    const needsSplit = code === 'H' || code === 'L';
    const subParties = needsSplit ? splitIntoSubParties(teamPlayers, code) : null;

    if (subParties && subParties.length) {
      const subLabels = code === 'H' ? ['Left', 'Mid', 'Right'] : ['Top Left', 'Top Right', 'Bottom Left', 'Bottom Right'];
      lines.push('**' + bossName + ' — Team ' + teamNumber + ' (' + teamPlayers.length + '/' + teamSize + ')**', '');
      if (item.meetsRequirements === false) lines.push('⚠ Does not meet minimum requirements.', '');
      subParties.forEach((sub, i) => {
        const vocCounts = sub.reduce((acc, p) => { acc[p.vocation] = (acc[p.vocation] || 0) + 1; return acc; }, {});
        const comp = Object.entries(vocCounts).map(([v, c]) => v + ': ' + c).sort().join(', ');
        lines.push('**' + subLabels[i] + '** (' + sub.length + ' players) — ' + comp);
        sortByVocation(sub).forEach(p => lines.push('  ' + formatPlayerLine(p)));
        lines.push('');
      });
    } else {
      const vocCounts = sorted.reduce((acc, p) => { acc[p.vocation] = (acc[p.vocation] || 0) + 1; return acc; }, {});
      const comp = Object.entries(vocCounts).map(([v, c]) => v + ': ' + c).sort().join(', ');
      lines.push('**' + bossName + ' — Team ' + teamNumber + ' (' + teamPlayers.length + '/' + teamSize + ')** — ' + comp, '');
      if (item.meetsRequirements === false) lines.push('⚠ Does not meet minimum requirements.', '');
      sorted.forEach(p => lines.push(formatPlayerLine(p)));
      lines.push('');
    }
    if (item.backups && item.backups.length) {
      lines.push('**Back-up / Reserves:**', '');
      item.backups.sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase())).forEach(p => lines.push(formatPlayerLine(p)));
      lines.push('');
    }
    return lines.join('\n');
  }

  function formatTeamsForDiscord(generated, bossNames, skipEmpty) {
    const items = skipEmpty ? generated.filter(item => item.team && item.team.length > 0) : generated;
    return items.map(item => formatOneTeamForDiscord(item, bossNames)).join('\n');
  }

  function getPerTeamCopyChunks(generated, bossNames) {
    return generated.filter(item => item.team && item.team.length > 0).map(item => {
      const bossName = (bossNames && bossNames[item.code]) || item.code;
      return { label: bossName + ' Team ' + item.teamNumber, text: formatOneTeamForDiscord(item, bossNames) };
    });
  }

  function parseTeamCodesInput(str) {
    const result = [];
    const parts = (str || '').toUpperCase().split(/\s+/);
    for (const part of parts) {
      const match = part.match(/^([PZFHLCD])(\d*)$/);
      if (match && VALID_SET.has(match[1]))
        result.push({ code: match[1], count: Math.max(1, parseInt(match[2] || '1', 10)) });
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
        let team = generateTeam(remaining, minMax, teamSize, code);
        let meetsRequirements = true;
        if (!team) {
          team = generateTeamPartial(remaining, teamSize, code);
          meetsRequirements = false;
        }
        if (!team.length) break;
        generated.push({ code, teamNumber: n + 1, team, teamSize, backups: [], meetsRequirements });
        const used = new Set(team.map(p => p.userId));
        remaining = remaining.filter(p => !used.has(p.userId));
      }
      if (remaining.length && generated.length && generated[generated.length - 1].code === code)
        generated[generated.length - 1].backups = remaining;
      const numTeamsForCode = generated.filter(g => g.code === code).length;
      generated.push({ code, teamNumber: numTeamsForCode + 1, team: [], teamSize, backups: [], meetsRequirements: true });
    }
    return generated;
  }

  let state = { members: [], generated: null };

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function renderSidebar() {
    const wrap = document.getElementById('sidebar-characters');
    const list = document.getElementById('sidebar-list');
    if (!wrap || !list) return;
    if (!state.members.length) {
      wrap.classList.add('hidden');
      return;
    }
    wrap.classList.remove('hidden');
    list.innerHTML = '';
    const sorted = state.members.slice().sort((a, b) => (a.priority - b.priority) || (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));
    sorted.forEach((m) => {
      const signups = [];
      for (const [voc, bosses] of Object.entries(m.vocationToTeams || {}))
        signups.push((VOC_SHORT[voc] || voc) + ': ' + [...bosses].sort((a, b) => VALID_TEAM_CODES.indexOf(a) - VALID_TEAM_CODES.indexOf(b)).join(''));
      const row = document.createElement('div');
      row.className = 'character-row';
      const priorityInput = document.createElement('input');
      priorityInput.type = 'number';
      priorityInput.min = 0;
      priorityInput.max = 999;
      priorityInput.className = 'char-priority';
      priorityInput.value = m.priority;
      priorityInput.title = 'Priority: 0 = best, 1 = next, etc. Same as BossNight cog. Script picks by this order; lower = in team first, higher = backup if full.';
      priorityInput.addEventListener('change', function () {
        const v = parseInt(this.value, 10);
        if (!isNaN(v) && v >= 0) {
          m.priority = v;
          renderSidebar();
        }
      });
      const nameSpan = document.createElement('div');
      nameSpan.className = 'char-name';
      nameSpan.title = m.name;
      nameSpan.textContent = m.name;
      const signupsSpan = document.createElement('div');
      signupsSpan.className = 'char-signups';
      signupsSpan.textContent = signups.join(' · ');
      row.appendChild(priorityInput);
      const nameBlock = document.createElement('div');
      nameBlock.style.flex = '1';
      nameBlock.style.minWidth = '0';
      nameBlock.appendChild(nameSpan);
      nameBlock.appendChild(signupsSpan);
      row.appendChild(nameBlock);
      list.appendChild(row);
    });
  }

  function playerFromLi(li) {
    return {
      userId: parseInt(li.dataset.userId, 10),
      name: li.dataset.name,
      vocation: li.dataset.vocation,
      priority: parseInt(li.dataset.priority, 10),
      level: null,
      roles: (li.dataset.roles || '').split(',').filter(Boolean),
      vocationPriorityRank: parseInt(li.dataset.vocationPriorityRank, 10)
    };
  }

  function renderPreview() {
    const preview = document.getElementById('teams-preview');
    const output = document.getElementById('output-text');
    if (!preview || !state.generated || !state.generated.length) return;

    preview.innerHTML = '';
    const byCode = {};
    state.generated.forEach(item => {
      if (!byCode[item.code]) byCode[item.code] = [];
      byCode[item.code].push(item);
    });

    Object.keys(byCode).forEach(code => {
      const bossName = BOSS_NAMES[code] || code;
      const bossDiv = document.createElement('div');
      bossDiv.className = 'boss-block';
      bossDiv.dataset.code = code;
      bossDiv.innerHTML = '<h4>' + escapeHtml(bossName) + '</h4>';
      byCode[code].forEach((item, teamIdx) => {
        const teamDiv = document.createElement('div');
        const isIncomplete = item.team.length > 0 && item.meetsRequirements === false;
        teamDiv.className = 'team-block' + (item.team.length === 0 ? ' empty-team' : '') + (isIncomplete ? ' team-incomplete' : '');
        teamDiv.dataset.code = code;
        teamDiv.dataset.teamIndex = String(teamIdx);
        const teamTitle = document.createElement('h5');
        teamTitle.style.display = 'flex';
        teamTitle.style.alignItems = 'center';
        teamTitle.style.gap = '8px';
        teamTitle.textContent = bossName + ' Team ' + item.teamNumber;
        if (isIncomplete) {
          const warn = document.createElement('span');
          warn.className = 'team-warning-icon';
          warn.title = 'This team does not meet the minimum vocation/size requirements. You can still use it if you want.';
          warn.setAttribute('aria-label', 'Does not meet minimum requirements');
          warn.textContent = '\u26A0\uFE0F';
          teamTitle.insertBefore(warn, teamTitle.firstChild);
        }
        teamDiv.appendChild(teamTitle);
        const ul = document.createElement('ul');
        ul.className = 'team-slot' + (item.team.length === 0 ? ' placeholder-empty' : '');
        sortByVocation(item.team).forEach((p) => {
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
      });
      preview.appendChild(bossDiv);
    });

    renderOutputBoxes();
    setupDragDrop(preview);
  }

  function renderOutputBoxes() {
    const container = document.getElementById('output-boxes');
    const fullOutput = document.getElementById('output-text');
    if (!container) return;
    container.innerHTML = '';
    if (!state.generated || !state.generated.length) return;
    const chunks = getPerTeamCopyChunks(state.generated, BOSS_NAMES);
    if (fullOutput) fullOutput.value = chunks.map(c => c.text).join('\n');
    chunks.forEach((chunk, idx) => {
      const box = document.createElement('div');
      box.className = 'output-team-box';
      const label = document.createElement('label');
      label.textContent = chunk.label;
      const ta = document.createElement('textarea');
      ta.className = 'output-team-textarea';
      ta.readOnly = true;
      ta.value = chunk.text;
      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'btn btn-sm copy-team-btn';
      copyBtn.textContent = 'Copy';
      copyBtn.addEventListener('click', function () {
        ta.select();
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value);
          else document.execCommand('copy');
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
        } catch (e) { }
      });
      box.appendChild(label);
      box.appendChild(ta);
      box.appendChild(copyBtn);
      container.appendChild(box);
    });
  }

  function setupDragDrop(previewEl) {
    let dragged = null;
    const allLis = previewEl.querySelectorAll('.team-slot li');
    const allUls = previewEl.querySelectorAll('.team-slot');

    function addListeners(li) {
      li.addEventListener('dragstart', function (e) {
        dragged = { el: this, parentUl: this.closest('ul'), code: this.closest('.boss-block').dataset.code, data: playerFromLi(this) };
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
        e.stopPropagation();
        if (dragged && this !== dragged.el) this.classList.add('drag-over');
      });
      li.addEventListener('dragleave', function () { this.classList.remove('drag-over'); });
      li.addEventListener('drop', function (e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('drag-over');
        if (!dragged) return;
        const targetUl = this.closest('ul');
        const targetCode = this.closest('.boss-block').dataset.code;
        if (targetCode !== dragged.code) return;
        if (targetUl === dragged.parentUl) {
          const allItems = [...targetUl.querySelectorAll('li')];
          const targetIdx = allItems.indexOf(this);
          const sourceIdx = allItems.indexOf(dragged.el);
          if (sourceIdx !== -1 && targetIdx !== -1) {
            if (sourceIdx < targetIdx) targetUl.insertBefore(dragged.el, allItems[targetIdx].nextSibling);
            else targetUl.insertBefore(dragged.el, this);
          }
          syncGeneratedFromPreview();
        } else {
          dragged.el.remove();
          targetUl.classList.remove('placeholder-empty');
          const li = document.createElement('li');
          li.draggable = true;
          li.dataset.userId = String(dragged.data.userId);
          li.dataset.vocation = dragged.data.vocation;
          li.dataset.name = dragged.data.name;
          li.dataset.roles = (dragged.data.roles || []).join(',');
          li.dataset.priority = String(dragged.data.priority);
          li.dataset.vocationPriorityRank = String(dragged.data.vocationPriorityRank);
          li.innerHTML = '<span>' + escapeHtml(dragged.data.name) + ' <span class="voc">(' + (VOC_SHORT[dragged.data.vocation] || dragged.data.vocation) + ')</span></span>' + (dragged.data.roles && dragged.data.roles.length ? '<span class="roles">' + escapeHtml(dragged.data.roles.join(', ')) + '</span>' : '');
          targetUl.appendChild(li);
          addListeners(li);
          if (dragged.parentUl.querySelectorAll('li').length === 0) dragged.parentUl.classList.add('placeholder-empty');
        }
        syncGeneratedFromPreview();
      });
    }
    allLis.forEach(addListeners);

    allUls.forEach(ul => {
      ul.addEventListener('dragover', function (e) {
        if (!dragged || this === dragged.parentUl) return;
        if (this.closest('.boss-block').dataset.code !== dragged.code) return;
        e.preventDefault();
        e.stopPropagation();
        this.classList.add('drag-over');
      });
      ul.addEventListener('dragleave', function (e) {
        if (!this.contains(e.relatedTarget)) this.classList.remove('drag-over');
      });
      ul.addEventListener('drop', function (e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('drag-over');
        if (!dragged) return;
        if (this.closest('.boss-block').dataset.code !== dragged.code) return;
        if (this === dragged.parentUl) return;
        dragged.el.remove();
        this.classList.remove('placeholder-empty');
        const li = document.createElement('li');
        li.draggable = true;
        li.dataset.userId = String(dragged.data.userId);
        li.dataset.vocation = dragged.data.vocation;
        li.dataset.name = dragged.data.name;
        li.dataset.roles = (dragged.data.roles || []).join(',');
        li.dataset.priority = String(dragged.data.priority);
        li.dataset.vocationPriorityRank = String(dragged.data.vocationPriorityRank);
        li.innerHTML = '<span>' + escapeHtml(dragged.data.name) + ' <span class="voc">(' + (VOC_SHORT[dragged.data.vocation] || dragged.data.vocation) + ')</span></span>' + (dragged.data.roles && dragged.data.roles.length ? '<span class="roles">' + escapeHtml(dragged.data.roles.join(', ')) + '</span>' : '');
        this.appendChild(li);
        addListeners(li);
        if (dragged.parentUl.querySelectorAll('li').length === 0) dragged.parentUl.classList.add('placeholder-empty');
        syncGeneratedFromPreview();
      });
    });
  }

  function reorderUlByVocation(ul, sortedPlayers) {
    if (!sortedPlayers.length) return;
    const lis = ul.querySelectorAll('li');
    const byKey = {};
    lis.forEach(li => {
      const k = li.dataset.userId + '|' + (li.dataset.vocation || '');
      if (!byKey[k]) byKey[k] = [];
      byKey[k].push(li);
    });
    const fragment = document.createDocumentFragment();
    sortedPlayers.forEach(p => {
      const k = String(p.userId) + '|' + (p.vocation || '');
      const list = byKey[k];
      if (list && list.length) {
        fragment.appendChild(list[0]);
        list.shift();
      }
    });
    ul.innerHTML = '';
    ul.appendChild(fragment);
  }

  function syncGeneratedFromPreview() {
    const preview = document.getElementById('teams-preview');
    if (!preview || !state.generated) return;
    const byCode = {};
    state.generated.forEach(item => {
      if (!byCode[item.code]) byCode[item.code] = [];
      byCode[item.code].push(item);
    });
    preview.querySelectorAll('.boss-block').forEach(bossBlock => {
      const code = bossBlock.dataset.code;
      const items = byCode[code];
      if (!items) return;
      bossBlock.querySelectorAll('.team-block').forEach((teamDiv, teamIdx) => {
        const item = items[teamIdx];
        if (!item) return;
        const ul = teamDiv.querySelector('.team-slot');
        if (!ul) return;
        const newTeam = [];
        ul.querySelectorAll('li').forEach(li => newTeam.push(playerFromLi(li)));
        const sorted = sortByVocation(newTeam);
        item.team = sorted;
        reorderUlByVocation(ul, sorted);
      });
    });
    const output = document.getElementById('output-text');
    if (output) output.value = formatTeamsForDiscord(state.generated, BOSS_NAMES, true);
    renderOutputBoxes();
  }

  document.getElementById('btn-import').addEventListener('click', function () {
    const text = document.getElementById('import-text').value;
    const status = document.getElementById('import-status');
    state.members = parseImport(text);
    if (!state.members.length) {
      status.textContent = 'No valid lines. Use: Name (Vocation) BossCodes e.g. Alice (EK) PZF';
      status.className = 'status error';
      renderSidebar();
      return;
    }
    state.members.forEach((m, i) => { m.priority = i; });
    status.textContent = 'Imported ' + state.members.length + ' character(s). Set priority on the left.';
    status.className = 'status success';
    renderSidebar();
  });

  document.getElementById('btn-generate').addEventListener('click', function () {
    const input = document.getElementById('team-codes').value;
    const status = document.getElementById('generate-status');
    const stepPreview = document.getElementById('step-preview');
    const spec = parseTeamCodesInput(input);
    if (!spec.length) {
      status.textContent = 'Enter codes like P2 Z1 F1.';
      status.className = 'status error';
      return;
    }
    if (!state.members.length) {
      status.textContent = 'Import sign-ups first (left).';
      status.className = 'status error';
      return;
    }
    state.generated = runGeneration(state.members, spec);
    const nonEmpty = state.generated.filter(g => g.team && g.team.length > 0);
    if (!nonEmpty.length) {
      status.textContent = 'Could not form teams. Check sign-ups and boss codes.';
      status.className = 'status error';
      stepPreview.classList.add('hidden');
      return;
    }
    status.textContent = 'Generated. Drag players between teams; copy skips empty teams.';
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
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(output.value).then(() => {
          copyStatus.textContent = 'Copied!';
          copyStatus.className = 'status success';
          setTimeout(() => { copyStatus.textContent = ''; }, 2000);
        });
      } else {
        document.execCommand('copy');
        copyStatus.textContent = 'Copied!';
        copyStatus.className = 'status success';
        setTimeout(() => { copyStatus.textContent = ''; }, 2000);
      }
    } catch (e) {
      copyStatus.textContent = 'Select and copy manually.';
      copyStatus.className = 'status';
    }
  });
})();
