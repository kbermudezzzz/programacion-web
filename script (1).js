(function () {
  var STORAGE_KEY = 'hojaDeVida:v1';
  var state = {
    profile: { name: '', headline: '', bio: '', email: '', phone: '', photo: '' },
    education: [],
    jobs: [],
    skills: []
  };
  var editing = { education: null, job: null, skill: null };

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        state.profile = Object.assign(state.profile, parsed.profile || {});
        state.education = parsed.education || [];
        state.jobs = parsed.jobs || [];
        state.skills = parsed.skills || [];
      }
    } catch (e) { console.warn('No se pudo cargar el almacenamiento local:', e); }
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { console.warn('No se pudo guardar en almacenamiento local:', e); }
  }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function esc(s) {
    return (s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- Pestañas ---------- */
  document.querySelectorAll('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
      document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
    });
  });

  /* ---------- Campos del perfil ---------- */
  var fieldMap = { fieldName: 'name', fieldHeadline: 'headline', fieldBio: 'bio', fieldEmail: 'email', fieldPhone: 'phone' };
  Object.keys(fieldMap).forEach(function (id) {
    var el = document.getElementById(id);
    el.addEventListener('blur', function () {
      state.profile[fieldMap[id]] = el.textContent.trim();
      save();
    });
  });

  var photoWrap = document.getElementById('photoWrap');
  var photoInput = document.getElementById('photoInput');
  var photoPlaceholder = document.getElementById('photoPlaceholder');
  function renderPhoto() {
    if (state.profile.photo) {
      photoWrap.style.backgroundImage = 'url(' + state.profile.photo + ')';
      photoPlaceholder.style.display = 'none';
    } else {
      photoWrap.style.backgroundImage = 'none';
      photoPlaceholder.style.display = 'block';
    }
  }
  photoInput.addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      state.profile.photo = reader.result;
      renderPhoto();
      save();
    };
    reader.readAsDataURL(file);
  });

  /* ---------- Estudios / experiencia (genérico) ---------- */
  var sectionConfig = {
    education: {
      listId: 'list-education',
      formId: 'form-education',
      titleId: 'form-education-title',
      fields: [
        { key: 'inst', el: 'edu-inst' },
        { key: 'prog', el: 'edu-prog' },
        { key: 'year', el: 'edu-year' },
        { key: 'desc', el: 'edu-desc' }
      ],
      addLabel: 'Agregar estudio',
      editLabel: 'Editar estudio',
      emptyText: 'Todavía no has agregado estudios. Usa "+ Agregar estudio" para empezar.',
      render: function (item) {
        return { period: esc(item.year), title: esc(item.inst) || 'Institución', sub: esc(item.prog), desc: esc(item.desc) };
      }
    },
    job: {
      listId: 'list-job',
      formId: 'form-job',
      titleId: 'form-job-title',
      fields: [
        { key: 'company', el: 'job-company' },
        { key: 'role', el: 'job-role' },
        { key: 'period', el: 'job-period' },
        { key: 'desc', el: 'job-desc' }
      ],
      addLabel: 'Agregar experiencia laboral',
      editLabel: 'Editar experiencia',
      emptyText: 'Todavía no has agregado experiencia laboral. Usa "+ Agregar experiencia" para empezar.',
      render: function (item) {
        return { period: esc(item.period), title: esc(item.role) || 'Cargo', sub: esc(item.company), desc: esc(item.desc) };
      }
    },
    skill: {
      listId: 'list-skill',
      formId: 'form-skill',
      titleId: 'form-skill-title',
      fields: [
        { key: 'type', el: 'skill-type' },
        { key: 'name', el: 'skill-name' },
        { key: 'level', el: 'skill-level' }
      ],
      addLabel: 'Agregar habilidad',
      editLabel: 'Editar habilidad',
      emptyText: 'Todavía no has agregado habilidades. Usa "+ Agregar habilidad" para empezar.',
      render: function (item) {
        return { period: esc(item.level), title: esc(item.name) || 'Habilidad', sub: '<span class="skill-badge">' + esc(item.type) + '</span>', desc: '' };
      }
    }
  };

  function stateKey(kind) { if (kind === 'job') return 'jobs'; if (kind === 'skill') return 'skills'; return 'education'; }

  function openForm(kind, itemId) {
    var cfg = sectionConfig[kind];
    var form = document.getElementById(cfg.formId);
    var list = state[stateKey(kind)];
    editing[kind] = itemId || null;

    if (itemId) {
      var item = list.find(function (i) { return i.id === itemId; });
      cfg.fields.forEach(function (f) { document.getElementById(f.el).value = item ? (item[f.key] || '') : ''; });
      document.getElementById(cfg.titleId).textContent = cfg.editLabel;
    } else {
      cfg.fields.forEach(function (f) {
        var el = document.getElementById(f.el);
        if (el.tagName !== 'SELECT') el.value = '';
      });
      document.getElementById(cfg.titleId).textContent = cfg.addLabel;
    }
    form.classList.add('open');
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function closeForm(kind) {
    document.getElementById(sectionConfig[kind].formId).classList.remove('open');
    editing[kind] = null;
  }

  function saveEntry(kind) {
    var cfg = sectionConfig[kind];
    var key = stateKey(kind);
    var data = {};
    cfg.fields.forEach(function (f) { data[f.key] = document.getElementById(f.el).value.trim(); });

    if (editing[kind]) {
      var idx = state[key].findIndex(function (i) { return i.id === editing[kind]; });
      if (idx > -1) state[key][idx] = Object.assign(state[key][idx], data);
    } else {
      data.id = uid();
      state[key].push(data);
    }
    save();
    renderList(kind);
    closeForm(kind);
  }

  function deleteEntry(kind, itemId) {
    var key = stateKey(kind);
    state[key] = state[key].filter(function (i) { return i.id !== itemId; });
    save();
    renderList(kind);
  }

  function renderList(kind) {
    var cfg = sectionConfig[kind];
    var list = state[stateKey(kind)];
    var container = document.getElementById(cfg.listId);
    container.innerHTML = '';

    if (!list.length) {
      var empty = document.createElement('div');
      empty.className = 'empty-note';
      empty.textContent = cfg.emptyText;
      container.appendChild(empty);
      return;
    }

    list.forEach(function (item) {
      var v = cfg.render(item);
      var row = document.createElement('div');
      row.className = 'entry';
      row.innerHTML =
        '<div class="period">' + (v.period || '&nbsp;') + '</div>' +
        '<div class="body">' +
          '<h3>' + (v.title || '') + '</h3>' +
          (v.sub ? '<p class="sub">' + v.sub + '</p>' : '') +
          (v.desc ? '<p>' + v.desc + '</p>' : '') +
        '</div>' +
        '<div class="row-actions">' +
          '<button type="button" class="text-btn" data-edit="' + item.id + '">Editar</button>' +
          '<button type="button" class="text-btn danger" data-del="' + item.id + '">Eliminar</button>' +
        '</div>';
      row.querySelector('[data-edit]').addEventListener('click', function () { openForm(kind, item.id); });
      row.querySelector('[data-del]').addEventListener('click', function () { deleteEntry(kind, item.id); });
      container.appendChild(row);
    });
  }

  document.querySelectorAll('[data-add]').forEach(function (btn) {
    btn.addEventListener('click', function () { openForm(btn.dataset.add); });
  });
  document.querySelectorAll('[data-cancel]').forEach(function (btn) {
    btn.addEventListener('click', function () { closeForm(btn.dataset.cancel); });
  });
  document.querySelectorAll('[data-save]').forEach(function (btn) {
    btn.addEventListener('click', function () { saveEntry(btn.dataset.save); });
  });

  /* ---------- Inicio ---------- */
  load();
  Object.keys(fieldMap).forEach(function (id) {
    document.getElementById(id).textContent = state.profile[fieldMap[id]] || '';
  });
  renderPhoto();
  renderList('education');
  renderList('job');
  renderList('skill');
})();
