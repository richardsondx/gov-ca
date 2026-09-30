/* gov.ca chat: the agentic thread experience, built onto the gov.ca Concept
 * design. The Concept's own markup and styles are untouched; this script
 * adds a #/chat thread view (right-aligned bubbles, morphing status line,
 * trace chips, streamed cited answers, sources pill, follow-ups, docked
 * composer, stop, modals) using the Concept's design tokens. */
(function () {
  'use strict';

  /* The single model this prototype uses. No model picker UI is shown;
   * Richardson can override it for his own testing with ?model=name in the URL. */
  const GOVCA_MODEL = 'gpt-6-luna';
  const GOVCA_EFFORT = 'low';

  var RESPONSES_URL = 'https://api.openai.com/v1/responses';
  var MODELS_URL = 'https://api.openai.com/v1/models';
  var LS_KEY = 'govca_key';
  var LS_FB = 'govca_fb_';
  var MAX_ROUNDS = 4;
  var ATTACH_MAX = 50 * 1024;

  /* ---------------- i18n ---------------- */
  var I18N = {
    en: {
      thread_title: 'Ask gov.ca',
      back: 'Back to concept',
      new_chat: 'New chat',
      clear_data: 'Clear saved key and history',
      clear_data_confirm: 'Clear your saved API key, questions, and feedback from this browser?',
      empty_greet: "I'm here. How can I help with a Canadian government service or official information?",
      examples: ['How do I renew my passport?', 'How do I apply for EI?', 'What is the Canada Child Benefit?'],
      history: 'Recent questions',
      ph: 'Ask about passports, taxes, EI...',
      send: 'Send',
      stop: 'Stop',
      attach_title: 'Attach a text file (.txt or .md)',
      mic_title: 'Voice input',
      mic_unsupported: 'Voice input is not supported in this browser.',
      mic_listening: 'Listening... speak now.',
      attach_too_big: 'That file is too large to attach (50 KB max).',
      status_working: 'Working through your request...',
      status_searching: 'Searching Canada.ca...',
      status_reading: 'Reading official sources...',
      status_writing: 'Writing your answer...',
      stopped_note: 'Stopped. Kept what was written so far.',
      trace_search: "Searched Canada.ca for {qs}",
      trace_search_fb: "Searched the curated index for {qs}",
      trace_read: "Read {n} official page(s)",
      trace_queries: 'Queries',
      trace_pages: 'Pages read',
      sources_n: '{n} sources',
      sources_label: 'Official pages read for this answer',
      thumb_up: 'Helpful',
      thumb_down: 'Not helpful',
      copy: 'Copy answer',
      copied: 'Copied.',
      privacy_link: 'Your privacy',
      how_link: 'How AI works',
      pi_blocked: 'Blocked: that looks like {type}. This prototype never sends personal information to OpenAI. Remove it to continue.',
      pi_sin: 'a SIN-like number',
      pi_phone: 'a phone number',
      pi_email: 'an email address',
      pi_health: 'a health-card-like number',
      err_key: 'OpenAI rejected your API key. Open the key settings to check or replace it.',
      err_rate: 'OpenAI is rate-limiting requests right now. Wait a minute and try again.',
      err_generic: 'Something went wrong talking to OpenAI. Your text was kept, try again.',
      modal_title: 'This prototype has no server',
      modal_intro: 'It runs on your OpenAI key. Three steps and you are chatting:',
      modal_s1: 'Get a key at',
      modal_s2: 'Paste it below. We validate it, then store it only in this browser.',
      modal_s3: 'Done. Ask your question.',
      modal_save: 'Save key',
      modal_warn_t: 'Security note:',
      modal_warn_d: 'Keys in localStorage are readable by page scripts. Use a key created just for this prototype, with a spending limit set in your OpenAI dashboard.',
      modal_key: 'API key:',
      modal_cost: 'Cost transparency: gpt-4o-mini costs roughly $0.001 per answer. You pay OpenAI directly; this site charges nothing.',
      modal_close: 'Close',
      modal_remove: 'Remove key',
      key_ok: 'Key validated and saved in this browser.',
      key_bad: 'That key was rejected by OpenAI. Check it and try again.',
      key_removed: 'Key removed from this browser.',
      privacy_title: 'Your privacy',
      privacy_body_html: '<p>There is no server. Everything happens in this browser.</p><p>Your OpenAI API key is stored only in this browser\u2019s localStorage. Page scripts can read it, so use a key created just for this prototype with a spending limit.</p><p>Your questions and the pages read to answer them go to OpenAI\u2019s API. They are subject to OpenAI\u2019s data policies, not the Government of Canada\u2019s.</p><p>A pattern-based guard blocks SIN-like numbers, phone numbers, emails, and health-card-like numbers before anything is sent. It is pattern-based, not perfect.</p><p>Your feedback and history stay in this browser. The site operator sees nothing: there is nothing to see.</p>',
      howai_title: 'How AI works',
      howai_body_html: '<ol><li>A personal-information guard screens your question before anything is sent.</li><li>The assistant searches Canada.ca. Live search is attempted first with short timeouts; when it is blocked (for example by a bot challenge), it falls back to a hand-curated index of 76 official pages.</li><li>It reads the most relevant pages, live when possible, from the curated index otherwise.</li><li>It streams an answer citing only the pages it actually read. If the pages do not support a claim, it says so plainly instead of guessing.</li><li>Links go to the real government pages, because AI answers can be wrong.</li></ol>'
    },
    fr: {
      thread_title: 'Poser une question',
      back: 'Retour au concept',
      new_chat: 'Nouvelle discussion',
      clear_data: 'Effacer la cl\u00e9 et l\u2019historique enregistr\u00e9s',
      clear_data_confirm: 'Effacer votre cl\u00e9 API, vos questions et vos commentaires de ce navigateur ?',
      empty_greet: 'Je suis l\u00e0. Comment puis-je vous aider avec un service du gouvernement canadien ou de l\u2019information officielle ?',
      examples: ['Comment renouveler mon passeport ?', 'Comment demander l\u2019assurance-emploi ?', 'Qu\u2019est-ce que l\u2019Allocation canadienne pour enfants ?'],
      history: 'Questions r\u00e9centes',
      ph: 'Posez une question sur les passeports, les imp\u00f4ts, l\u2019AE...',
      send: 'Envoyer',
      stop: 'Arr\u00eater',
      attach_title: 'Joindre un fichier texte (.txt ou .md)',
      mic_title: 'Entr\u00e9e vocale',
      mic_unsupported: 'L\u2019entr\u00e9e vocale n\u2019est pas prise en charge par ce navigateur.',
      mic_listening: '\u00c9coute en cours... parlez maintenant.',
      attach_too_big: 'Ce fichier est trop volumineux (50 Ko max).',
      status_working: 'Analyse de votre demande en cours...',
      status_searching: 'Recherche sur Canada.ca...',
      status_reading: 'Lecture des sources officielles...',
      status_writing: 'R\u00e9daction de votre r\u00e9ponse...',
      stopped_note: 'Arr\u00eat\u00e9. Conserv\u00e9 ce qui \u00e9tait d\u00e9j\u00e0 \u00e9crit.',
      trace_search: 'Recherche sur Canada.ca pour {qs}',
      trace_search_fb: 'Recherche dans l\u2019index s\u00e9lectionn\u00e9 pour {qs}',
      trace_read: '{n} page(s) officielle(s) lue(s)',
      trace_queries: 'Requ\u00eates',
      trace_pages: 'Pages lues',
      sources_n: '{n} sources',
      sources_label: 'Pages officielles lues pour cette r\u00e9ponse',
      thumb_up: 'Utile',
      thumb_down: 'Pas utile',
      copy: 'Copier la r\u00e9ponse',
      copied: 'Copi\u00e9.',
      privacy_link: 'Votre vie priv\u00e9e',
      how_link: 'Comment fonctionne l\u2019IA',
      pi_blocked: 'Bloqu\u00e9 : cela ressemble \u00e0 {type}. Ce prototype n\u2019envoie jamais de renseignements personnels \u00e0 OpenAI. Retirez-le pour continuer.',
      pi_sin: 'un num\u00e9ro ressemblant \u00e0 un NAS',
      pi_phone: 'un num\u00e9ro de t\u00e9l\u00e9phone',
      pi_email: 'une adresse courriel',
      pi_health: 'un num\u00e9ro ressemblant \u00e0 une carte sant\u00e9',
      err_key: 'OpenAI a rejet\u00e9 votre cl\u00e9 API. Ouvrez les param\u00e8tres de cl\u00e9 pour la v\u00e9rifier ou la remplacer.',
      err_rate: 'OpenAI limite les requ\u00eates pour le moment. Attendez une minute et r\u00e9essayez.',
      err_generic: 'Un probl\u00e8me est survenu avec OpenAI. Votre texte a \u00e9t\u00e9 conserv\u00e9, r\u00e9essayez.',
      modal_title: 'Ce prototype n\u2019a aucun serveur',
      modal_intro: 'Il fonctionne avec votre cl\u00e9 OpenAI. Trois \u00e9tapes et vous discutez :',
      modal_s1: 'Obtenez une cl\u00e9 sur',
      modal_s2: 'Collez-la ci-dessous. Nous la validons, puis la stockons uniquement dans ce navigateur.',
      modal_s3: 'C\u2019est tout. Posez votre question.',
      modal_save: 'Enregistrer la cl\u00e9',
      modal_warn_t: 'Note de s\u00e9curit\u00e9 :',
      modal_warn_d: 'Les cl\u00e9s dans le localStorage peuvent \u00eatre lues par les scripts de la page. Utilisez une cl\u00e9 cr\u00e9\u00e9e uniquement pour ce prototype, avec une limite de d\u00e9penses dans votre tableau de bord OpenAI.',
      modal_key: 'Cl\u00e9 API :',
      modal_cost: 'Transparence des co\u00fbts : gpt-4o-mini co\u00fbte environ 0,001 $ par r\u00e9ponse. Vous payez OpenAI directement; ce site ne facture rien.',
      modal_close: 'Fermer',
      modal_remove: 'Supprimer la cl\u00e9',
      key_ok: 'Cl\u00e9 valid\u00e9e et enregistr\u00e9e dans ce navigateur.',
      key_bad: 'Cette cl\u00e9 a \u00e9t\u00e9 rejet\u00e9e par OpenAI. V\u00e9rifiez-la et r\u00e9essayez.',
      key_removed: 'Cl\u00e9 supprim\u00e9e de ce navigateur.',
      privacy_title: 'Votre vie priv\u00e9e',
      privacy_body_html: '<p>Il n\u2019y a aucun serveur. Tout se passe dans ce navigateur.</p><p>Votre cl\u00e9 API OpenAI est stock\u00e9e uniquement dans le localStorage de ce navigateur. Les scripts de la page peuvent la lire : utilisez une cl\u00e9 cr\u00e9\u00e9e uniquement pour ce prototype, avec une limite de d\u00e9penses.</p><p>Vos questions et les pages lues pour y r\u00e9pondre sont envoy\u00e9es \u00e0 l\u2019API d\u2019OpenAI. Elles sont soumises aux politiques de donn\u00e9es d\u2019OpenAI, pas \u00e0 celles du gouvernement du Canada.</p><p>Un garde-fou bloque les num\u00e9ros ressemblant \u00e0 un NAS, les num\u00e9ros de t\u00e9l\u00e9phone, les courriels et les num\u00e9ros de carte sant\u00e9 avant tout envoi. Il est bas\u00e9 sur des motifs, donc imparfait.</p><p>Vos commentaires et votre historique restent dans ce navigateur. L\u2019exploitant de ce site ne voit rien : il n\u2019y a rien \u00e0 voir.</p>',
      howai_title: 'Comment fonctionne l\u2019IA',
      howai_body_html: '<ol><li>Un garde-fou filtre votre question avant tout envoi.</li><li>L\u2019assistant cherche sur Canada.ca. La recherche en direct est tent\u00e9e d\u2019abord avec de courts d\u00e9lais; quand elle est bloqu\u00e9e (par exemple par un d\u00e9fi anti-robot), il utilise un index manuel de 76 pages officielles.</li><li>Il lit les pages les plus pertinentes, en direct si possible, sinon depuis l\u2019index.</li><li>Il affiche une r\u00e9ponse en continu en ne citant que les pages qu\u2019il a lues. Si les pages n\u2019appuient pas une affirmation, il le dit plut\u00f4t que de deviner.</li><li>Les liens m\u00e8nent aux vraies pages gouvernementales, parce que les r\u00e9ponses de l\u2019IA peuvent \u00eatre fausses.</li></ol>'
    }
  };

  /* ---------------- state ---------------- */
  var state = {
    lang: 'en',
    history: [],
    pastQuestions: [],
    attached: null, // {name, text}
    sources: [],
    busy: false,
    stopRequested: false,
    abortCtrl: null,
    keyModalShown: false
  };

  function t(key, vars) {
    var s = (I18N[state.lang] && I18N[state.lang][key]) || I18N.en[key] || key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        s = s.split('{' + k + '}').join(String(vars[k]));
      });
    }
    return s;
  }
  function getKey() { return localStorage.getItem(LS_KEY) || ''; }
  function queryModelOverride() {
    try {
      // the override lives in the hash route, e.g. index.html#/chat?model=gpt-6-luna
      var h = location.hash || '';
      var m = /[?&]model=([^&#]+)/.exec(h);
      return m ? decodeURIComponent(m[1]).trim() : '';
    } catch (e) { return ''; }
  }
  function effectiveModel() { return queryModelOverride() || GOVCA_MODEL; }
  function queryQParam() {
    try {
      // deep-link intake: #/chat?q=<urlencoded> auto-sends as the first message.
      // Coexists with ?model=: e.g. #/chat?model=gpt-4o&q=hello
      var h = location.hash || '';
      var m = /[?&]q=([^&#]*)/.exec(h);
      return m ? decodeURIComponent(m[1]).trim() : '';
    } catch (e) { return ''; }
  }
  /* Luna-family models run at Low reasoning effort; anything else omits the
   * reasoning param entirely (e.g. a ?model=gpt-4o override). */
  function effectiveModelConfig() {
    var m = effectiveModel();
    return { model: m, effort: m.toLowerCase().indexOf('luna') !== -1 ? GOVCA_EFFORT : null };
  }
  /* ---------------- tiny dom helpers ---------------- */
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---------------- markdown renderer ---------------- */
  var PHONE_RE = /(\b(?:\+?1[\s-]?)?(?:\(\d{3}\)|\d{3})[\s-.]?\d{3}[\s-.]?\d{4}\b)(?![^<]*>)/g;
  function renderMarkdown(text) {
    var html = escapeHtml(text);
    var links = [];
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, function (m, label, url) {
      links.push({ label: label, url: url });
      return '\u0000LINK' + (links.length - 1) + '\u0000';
    });
    html = html.replace(/(https?:\/\/[^\s<]+)/g, function (m, url) {
      links.push({ label: url, url: url });
      return '\u0000LINK' + (links.length - 1) + '\u0000';
    });
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    var blocks = html.split(/\n{2,}/);
    html = blocks.map(function (block) {
      var lines = block.split('\n');
      var out = [];
      var list = null;
      function closeList() { if (list) { out.push('</' + list + '>'); list = null; } }
      lines.forEach(function (line) {
        var h3 = /^###\s+(.*)/.exec(line);
        var h2 = /^##\s+(.*)/.exec(line);
        var ul = /^[-*]\s+(.*)/.exec(line);
        var ol = /^\d+[.)]\s+(.*)/.exec(line);
        if (h3) { closeList(); out.push('<h4>' + h3[1] + '</h4>'); }
        else if (h2) { closeList(); out.push('<h3>' + h2[1] + '</h3>'); }
        else if (ul) { if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; } out.push('<li>' + ul[1] + '</li>'); }
        else if (ol) { if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; } out.push('<li>' + ol[1] + '</li>'); }
        else { closeList(); out.push(line === '' ? '' : '<p>' + line + '</p>'); }
      });
      closeList();
      return out.join('\n');
    }).join('\n');
    html = html.replace(/\u0000LINK(\d+)\u0000/g, function (m, i) {
      var l = links[+i];
      var safe = /^https:\/\//.test(l.url) ? l.url : '#';
      return '<a class="ext" href="' + safe + '" target="_blank" rel="noopener">' + l.label + '</a>';
    });
    html = html.replace(PHONE_RE, function (m) {
      var tel = 'tel:+1' + m.replace(/\D/g, '').slice(-10);
      return '<a href="' + tel + '">' + m + '</a>';
    });
    return html;
  }

  /* ---------------- curated index ---------------- */
  function loadSources() {
    fetch('data/sources.json').then(function (r) {
      return r.ok ? r.json() : [];
    }).then(function (d) {
      state.sources = Array.isArray(d) ? d : [];
    }).catch(function () { state.sources = []; });
  }
  function keywordSearch(query, lang) {
    var words = String(query).toLowerCase().split(/[^a-zàâäéèêëîïôöùûüç0-9]+/).filter(function (w) { return w.length > 2; });
    if (!words.length) return [];
    var scored = state.sources.map(function (s) {
      var hay = (s.title_en + ' ' + s.title_fr + ' ' + s.summary_en + ' ' + s.summary_fr + ' ' + (s.keywords || '')).toLowerCase();
      var score = 0;
      words.forEach(function (w) { if (hay.indexOf(w) !== -1) score++; });
      return { s: s, score: score };
    }).filter(function (x) { return x.score > 0; });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, 5).map(function (x) { return x.s; });
  }
  function recordForUrl(url) {
    for (var i = 0; i < state.sources.length; i++) {
      var s = state.sources[i];
      if (s.url_en === url || s.url_fr === url) {
        var fr = state.lang === 'fr';
        return { title: fr ? s.title_fr : s.title_en, summary: fr ? s.summary_fr : s.summary_en };
      }
    }
    return null;
  }

  /* ---------------- chat root dom ---------------- */
  var ui = {};
  function buildChat() {
    var root = el('div', 'gc-root');
    root.id = 'govca-chat';
    root.setAttribute('aria-label', 'gov.ca chat thread');

    var head = el('div', 'gc-thread-head');
    var back = el('a', 'gc-back', '\u2190 ' + t('back'));
    back.href = '#';
    back.setAttribute('data-gci18n', 'back');
    var title = el('h1', 'gc-thread-title', t('thread_title'));
    title.setAttribute('data-gci18n', 'thread_title');
    var actions = el('div', 'gc-head-actions');
    var newChat = el('button', 'gc-btn', t('new_chat'));
    newChat.type = 'button';
    newChat.setAttribute('data-gci18n', 'new_chat');
    newChat.addEventListener('click', newChatFn);
    var wipe = el('button', 'gc-wipe', '');
    wipe.type = 'button';
    wipe.title = t('clear_data');
    wipe.setAttribute('data-gci18n-title', 'clear_data');
    wipe.setAttribute('aria-label', t('clear_data'));
    wipe.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="8" cy="12" r="4.2" stroke="currentColor" stroke-width="1.8"/><path d="M12.2 12H21M17.5 12v4M21 12v2.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    wipe.addEventListener('click', clearAllData);
    var langBtn = el('button', 'gc-lang-btn', state.lang === 'en' ? 'FR' : 'EN');
    langBtn.type = 'button';
    langBtn.setAttribute('aria-label', state.lang === 'en' ? 'Passer au fran\u00e7ais' : 'Switch to English');
    langBtn.addEventListener('click', function () {
      var target = state.lang === 'en' ? 'fr' : 'en';
      var b = document.querySelector('.lang-toggle[data-lang="' + target + '"]');
      if (b) b.click(); /* concept setLanguage flips aria-pressed; boot listener syncs the chat */
      else { state.lang = target; applyChatI18n(); }
    });
    actions.appendChild(newChat);
    actions.appendChild(wipe);
    actions.appendChild(langBtn);
    head.appendChild(back);
    head.appendChild(title);
    head.appendChild(actions);

    var hist = el('details', 'gc-history');
    var histSum = el('summary', '', t('history'));
    histSum.setAttribute('data-gci18n', 'history');
    var histList = el('ul');
    hist.appendChild(histSum);
    hist.appendChild(histList);
    hist.hidden = true;

    var thread = el('div', 'gc-thread');
    thread.id = 'gc-thread';

    var bottom = el('div', 'gc-bottom');
    var dock = el('div', 'gc-dock');
    var composer = el('div', 'gc-composer');
    var attachBtn = el('button', 'gc-tool', '');
    attachBtn.type = 'button';
    attachBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 11.5l-8.2 8.2a5 5 0 01-7.1-7.1l8-8a3.2 3.2 0 014.6 4.6l-8 8a1.4 1.4 0 01-2-2l7-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    attachBtn.title = t('attach_title');
    attachBtn.setAttribute('data-gci18n-title', 'attach_title');
    var fileInput = el('input');
    fileInput.type = 'file';
    fileInput.accept = '.txt,.md';
    fileInput.hidden = true;
    var micBtn = el('button', 'gc-tool', '');
    micBtn.type = 'button';
    micBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" stroke-width="1.8"/><path d="M5 11a7 7 0 0014 0M12 18v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    micBtn.title = t('mic_title');
    micBtn.setAttribute('data-gci18n-title', 'mic_title');
    var input = el('input');
    input.type = 'text';
    input.id = 'gc-input';
    input.placeholder = t('ph');
    input.setAttribute('data-gci18n-ph', 'ph');
    input.setAttribute('aria-label', t('thread_title'));
    var send = el('button', 'gc-send', '');
    send.type = 'button';
    send.id = 'gc-send';
    send.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    send.setAttribute('aria-label', t('send'));
    send.setAttribute('data-gci18n-aria', 'send');
    composer.appendChild(attachBtn);
    composer.appendChild(fileInput);
    composer.appendChild(micBtn);
    composer.appendChild(input);
    composer.appendChild(send);
    var chipRow = el('div', 'gc-chip-row');
    var chip = el('span', 'gc-attach-chip');
    var chipName = el('span', '');
    var chipX = el('button', '', '\u00d7');
    chipX.type = 'button';
    chipX.setAttribute('aria-label', 'Remove attachment');
    chip.appendChild(chipName);
    chip.appendChild(chipX);
    chipRow.appendChild(chip);
    dock.appendChild(composer);
    dock.appendChild(chipRow);
    bottom.appendChild(hist);
    var dockFoot = el('div', 'gc-dock-foot');
    var privLink = el('button', '', t('privacy_link'));
    privLink.type = 'button';
    privLink.setAttribute('data-gci18n', 'privacy_link');
    privLink.addEventListener('click', function () { openInfoModal('privacy'); });
    var howLink = el('button', '', t('how_link'));
    howLink.type = 'button';
    howLink.setAttribute('data-gci18n', 'how_link');
    howLink.addEventListener('click', function () { openInfoModal('how'); });
    dockFoot.appendChild(privLink);
    dockFoot.appendChild(howLink);
    bottom.appendChild(dockFoot);
    bottom.appendChild(dock);

    root.appendChild(head);
    root.appendChild(thread);
    root.appendChild(bottom);
    document.body.appendChild(root);

    ui = {
      root: root, thread: thread, head: head, hist: hist, histList: histList,
      input: input, send: send, attachBtn: attachBtn, fileInput: fileInput,
      micBtn: micBtn, chip: chip, chipName: chipName, langBtn: langBtn, empty: null
    };

    attachBtn.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', onAttachFile);
    chipX.addEventListener('click', clearAttachment);
    micBtn.addEventListener('click', toggleDictation);
    send.addEventListener('click', onSendClick);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); onSendClick(); }
    });

    buildModals();
    buildToast();
    renderEmpty();
  }

  function renderEmpty() {
    if (ui.empty) return;
    var box = el('div', 'gc-empty');
    var greet = el('p', 'gc-greet', t('empty_greet'));
    greet.setAttribute('data-gci18n', 'empty_greet');
    var ex = el('div', 'gc-examples');
    I18N[state.lang].examples.forEach(function (q) {
      var b = el('button', 'gc-example', q);
      b.type = 'button';
      b.addEventListener('click', function () { submitQuestion(q); });
      ex.appendChild(b);
    });
    box.appendChild(greet);
    box.appendChild(ex);
    ui.thread.appendChild(box);
    ui.empty = box;
  }
  function hideEmpty() {
    if (ui.empty) { ui.empty.remove(); ui.empty = null; }
  }

  /* ---------------- routing ---------------- */
  function isChatRoute() {
    return location.hash === '#/chat' || location.hash.indexOf('#/chat?') === 0;
  }
  function renderRoute() {
    var chat = isChatRoute();
    document.body.classList.toggle('gc-chat-mode', chat);
    if (chat) {
      if (!ui.root) buildChat();
      syncLang();
      if (!getKey() && !state.keyModalShown) {
        state.keyModalShown = true;
        openKeyModal();
      }
      window.scrollTo(0, 0);
      // deep-linked question (?q=): auto-send once per unique hash
      var dq = queryQParam();
      if (dq && state._consumedQ !== location.hash) {
        state._consumedQ = location.hash;
        setTimeout(function () { submitQuestion(dq); }, 60);
      }
    }
  }
  window.addEventListener('hashchange', renderRoute);

  /* ---------------- language sync with the Concept toggle ---------------- */
  function conceptLang() {
    var b = document.querySelector('.lang-toggle[aria-pressed="true"]');
    return (b && b.getAttribute('data-lang')) || 'en';
  }
  function syncLang() {
    var l = conceptLang();
    if (l !== state.lang) {
      state.lang = l;
      applyChatI18n();
    }
  }
  function applyChatI18n() {
    if (!ui.root) return;
    document.querySelectorAll('#govca-chat [data-gci18n]').forEach(function (n) {
      n.textContent = t(n.getAttribute('data-gci18n'));
    });
    document.querySelectorAll('#govca-chat [data-gci18n-ph]').forEach(function (n) {
      n.placeholder = t(n.getAttribute('data-gci18n-ph'));
    });
    document.querySelectorAll('#govca-chat [data-gci18n-title]').forEach(function (n) {
      n.title = t(n.getAttribute('data-gci18n-title'));
    });
    document.querySelectorAll('#govca-chat [data-gci18n-aria]').forEach(function (n) {
      n.setAttribute('aria-label', t(n.getAttribute('data-gci18n-aria')));
    });
    ui.input.placeholder = t('ph');
    ui.input.setAttribute('aria-label', t('thread_title'));
    ui.send.setAttribute('aria-label', state.busy ? t('stop') : t('send'));
    ui.attachBtn.title = t('attach_title');
    ui.micBtn.title = t('mic_title');
    if (ui.langBtn) {
      ui.langBtn.textContent = state.lang === 'en' ? 'FR' : 'EN';
      ui.langBtn.setAttribute('aria-label', state.lang === 'en' ? 'Passer au fran\u00e7ais' : 'Switch to English');
    }
    if (ui.empty) { ui.empty.remove(); ui.empty = null; renderEmpty(); }
    if (ui.keyModal && ui.keyModal.classList.contains('show')) renderKeyModal();
    if (ui.infoModal && ui.infoModal.classList.contains('show') && ui.infoKind) renderInfoModal(ui.infoKind);
  }

  /* ---------------- toast ---------------- */
  function buildToast() {
    var n = el('div', 'gc-toast');
    n.id = 'gc-toast';
    n.setAttribute('role', 'status');
    document.body.appendChild(n);
    ui.toast = n;
  }
  function toast(msg) {
    ui.toast.textContent = msg;
    ui.toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { ui.toast.classList.remove('show'); }, 5000);
  }

  /* ---------------- key modal (BYOK) ---------------- */
  function buildModals() {
    var m = el('div', 'gc-modal');
    m.id = 'gc-key-modal';
    m.setAttribute('role', 'dialog');
    m.setAttribute('aria-modal', 'true');
    var card = el('div', 'gc-modal-card');
    m.appendChild(card);
    m.addEventListener('click', function (e) { if (e.target === m) closeKeyModal(); });
    document.body.appendChild(m);
    ui.keyModal = m;
    ui.keyCard = card;
    renderKeyModal();

    var im = el('div', 'gc-modal');
    im.id = 'gc-info-modal';
    im.setAttribute('role', 'dialog');
    im.setAttribute('aria-modal', 'true');
    var icard = el('div', 'gc-modal-card');
    im.appendChild(icard);
    im.addEventListener('click', function (e) { if (e.target === im) closeInfoModal(); });
    document.body.appendChild(im);
    ui.infoModal = im;
    ui.infoCard = icard;
  }
  function renderKeyModal() {
    var card = ui.keyCard;
    card.innerHTML = '';
    var h = el('h2', '', t('modal_title'));
    var intro = el('p', 'gc-lede', t('modal_intro'));
    var ol = el('ol');
    var li1 = el('li', '');
    li1.appendChild(document.createTextNode(t('modal_s1') + ' '));
    var a = el('a', '', 'platform.openai.com');
    a.href = 'https://platform.openai.com/api-keys';
    a.target = '_blank';
    a.rel = 'noopener';
    li1.appendChild(a);
    li1.appendChild(document.createTextNode('.'));
    var li2 = el('li', '', t('modal_s2'));
    var li3 = el('li', '', t('modal_s3'));
    ol.appendChild(li1); ol.appendChild(li2); ol.appendChild(li3);
    var f1 = el('div', 'gc-field');
    var lab1 = el('label', '', t('modal_key'));
    lab1.htmlFor = 'gc-key-input';
    var keyInput = el('input');
    keyInput.type = 'password';
    keyInput.id = 'gc-key-input';
    keyInput.autocomplete = 'off';
    keyInput.placeholder = 'sk-...';
    keyInput.value = getKey();
    f1.appendChild(lab1); f1.appendChild(keyInput);
    var result = el('div', 'gc-key-result');
    var row = el('div', 'gc-modal-row');
    var save = el('button', 'gc-btn gc-primary', t('modal_save'));
    save.type = 'button';
    var remove = el('button', 'gc-btn gc-danger', t('modal_remove'));
    remove.type = 'button';
    var close = el('button', 'gc-btn', t('modal_close'));
    close.type = 'button';
    row.appendChild(save); row.appendChild(remove); row.appendChild(close);
    var warn = el('div', 'gc-warn', '');
    warn.innerHTML = '<strong>' + escapeHtml(t('modal_warn_t')) + '</strong> ' + escapeHtml(t('modal_warn_d'));
    var cost = el('p', 'gc-cost', t('modal_cost'));
    card.appendChild(h); card.appendChild(intro); card.appendChild(ol);
    card.appendChild(f1); card.appendChild(result);
    card.appendChild(row); card.appendChild(warn); card.appendChild(cost);

    function say(msg, ok) {
      result.textContent = msg;
      result.className = 'gc-key-result ' + (ok ? 'ok' : 'err');
    }
    save.addEventListener('click', function () {
      var k = keyInput.value.trim();
      if (!k) { say(t('key_bad'), false); return; }
      save.disabled = true;
      validateKey(k, function (ok) {
        save.disabled = false;
        if (!ok) { say(t('key_bad'), false); return; }
        localStorage.setItem(LS_KEY, k);
        say(t('key_ok'), true);
      });
    });
    remove.addEventListener('click', function () {
      localStorage.removeItem(LS_KEY);
      keyInput.value = '';
      say(t('key_removed'), true);
    });
    close.addEventListener('click', closeKeyModal);
    ui.keyInput = keyInput;
  }
  function openKeyModal() {
    if (!ui.keyModal) buildChat();
    renderKeyModal();
    ui.keyModal.classList.add('show');
    setTimeout(function () { if (ui.keyInput) ui.keyInput.focus(); }, 60);
  }
  function closeKeyModal() { if (ui.keyModal) ui.keyModal.classList.remove('show'); }

  function validateKey(key, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', MODELS_URL, true);
    xhr.setRequestHeader('Authorization', 'Bearer ' + key);
    xhr.timeout = 15000;
    xhr.onload = function () {
      if (xhr.status !== 200) { cb(false, []); return; }
      try {
        var d = JSON.parse(xhr.responseText);
        cb(true, (d.data || []).map(function (m) { return m.id; }));
      } catch (e) { cb(true, []); }
    };
    xhr.onerror = function () { cb(false, []); };
    xhr.ontimeout = function () { cb(false, []); };
    xhr.send();
  }

  /* ---------------- info modals ---------------- */
  function openInfoModal(kind) {
    ui.infoKind = kind;
    renderInfoModal(kind);
    ui.infoModal.classList.add('show');
  }
  function closeInfoModal() { if (ui.infoModal) ui.infoModal.classList.remove('show'); }
  function renderInfoModal(kind) {
    var card = ui.infoCard;
    card.innerHTML = '';
    var h = el('h2', '', t(kind === 'privacy' ? 'privacy_title' : 'howai_title'));
    var body = el('div', '');
    body.innerHTML = t(kind === 'privacy' ? 'privacy_body_html' : 'howai_body_html');
    var row = el('div', 'gc-modal-row');
    var close = el('button', 'gc-btn', t('modal_close'));
    close.type = 'button';
    close.addEventListener('click', closeInfoModal);
    row.appendChild(close);
    card.appendChild(h); card.appendChild(body); card.appendChild(row);
  }

  /* ---------------- attachments + dictation ---------------- */
  function onAttachFile() {
    var f = ui.fileInput.files && ui.fileInput.files[0];
    ui.fileInput.value = '';
    if (!f) return;
    if (f.size > ATTACH_MAX) { toast(t('attach_too_big')); return; }
    var rd = new FileReader();
    rd.onload = function () {
      state.attached = { name: f.name, text: String(rd.result || '').slice(0, 60000) };
      ui.chipName.textContent = f.name;
      ui.chip.classList.add('visible');
      ui.input.focus();
    };
    rd.readAsText(f);
  }
  function clearAttachment() {
    state.attached = null;
    ui.chip.classList.remove('visible');
  }
  var recog = null, listening = false;
  function toggleDictation() {
    var Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) { toast(t('mic_unsupported')); return; }
    if (listening) { try { recog.stop(); } catch (e) {} return; }
    recog = new Ctor();
    recog.lang = state.lang === 'fr' ? 'fr-CA' : 'en-CA';
    recog.interimResults = false;
    recog.onresult = function (e) {
      var txt = '';
      for (var i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
      ui.input.value = (ui.input.value ? ui.input.value + ' ' : '') + txt.trim();
      ui.input.focus();
    };
    recog.onend = function () { listening = false; ui.micBtn.classList.remove('gc-live'); };
    recog.onerror = function () { listening = false; ui.micBtn.classList.remove('gc-live'); };
    try {
      recog.start();
      listening = true;
      ui.micBtn.classList.add('gc-live');
      toast(t('mic_listening'));
    } catch (e) { listening = false; }
  }

  /* ---------------- composer state ---------------- */
  function setBusy(busy) {
    state.busy = busy;
    ui.input.disabled = busy;
    ui.attachBtn.disabled = busy;
    ui.micBtn.disabled = busy;
    if (busy) {
      ui.send.classList.add('gc-stop');
      ui.send.innerHTML = '&#9632;';
      ui.send.setAttribute('aria-label', t('stop'));
    } else {
      ui.send.classList.remove('gc-stop');
      ui.send.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      ui.send.setAttribute('aria-label', t('send'));
      ui.input.focus();
    }
  }
  function onSendClick() {
    if (state.busy) { requestStop(); return; }
    var v = ui.input.value.trim();
    if (!v) return;
    ui.input.value = '';
    submitQuestion(v);
  }

  /* Wipe everything this prototype stores, then return to onboarding. */
  function clearAllData() {
    if (!window.confirm(t('clear_data_confirm'))) return;
    try {
      var toRemove = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('govca_') === 0) toRemove.push(k);
      }
      toRemove.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) { /* storage unavailable */ }
    location.reload();
  }

  /* ---------------- history ---------------- */
  function newChatFn() {
    state.history = [];
    state.pastQuestions = [];
    state.stopRequested = false;
    if (ui.thread) ui.thread.innerHTML = '';
    renderEmpty();
    renderHistory();
    clearAttachment();
  }
  function renderHistory() {
    if (!ui.hist) return;
    ui.hist.hidden = state.pastQuestions.length === 0;
    ui.histList.innerHTML = '';
    state.pastQuestions.slice().reverse().forEach(function (q) {
      var li = el('li');
      var b = el('button', '', q);
      b.type = 'button';
      b.addEventListener('click', function () { submitQuestion(q); });
      li.appendChild(b);
      ui.histList.appendChild(li);
    });
  }

  /* ---------------- QA block ---------------- */
  function addQABlock(question) {
    hideEmpty();
    var qa = el('div', 'gc-qa');
    var user = el('div', 'gc-user');
    user.appendChild(el('span', '', question));
    var traces = el('div', 'gc-traces');
    var status = el('div', 'gc-status');
    var dot = el('span', 'gc-dot');
    var stext = el('span', '');
    var elapsed = el('span', 'gc-elapsed', '');
    status.appendChild(dot);
    status.appendChild(stext);
    status.appendChild(elapsed);
    var card = el('div', 'gc-card');
    card.hidden = true;
    var body = el('div', 'gc-answer-body');
    card.appendChild(body);
    qa.appendChild(user);
    qa.appendChild(traces);
    qa.appendChild(status);
    qa.appendChild(card);
    ui.thread.appendChild(qa);
    user.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return { qa: qa, user: user, traces: traces, status: status, stext: stext, elapsed: elapsed, card: card, body: body, readPages: [], answerText: '' };
  }

  /* morphing status line with ticking elapsed seconds */
  function setStatus(block, phase) {
    block._phase = phase;
    block._t0 = Date.now();
    block.stext.textContent = t('status_' + phase);
    block.status.classList.remove('gc-fading');
    block.status.style.display = '';
    clearInterval(block._timer);
    block.elapsed.textContent = '';
    block._timer = setInterval(function () {
      var s = Math.floor((Date.now() - block._t0) / 1000);
      block.elapsed.textContent = ' (' + s + 's)';
    }, 500);
  }
  function fadeStatus(block) {
    clearInterval(block._timer);
    block.elapsed.textContent = '';
    block.status.classList.add('gc-fading');
    setTimeout(function () { block.status.style.display = 'none'; }, 480);
  }
  function stopStatus(block) {
    clearInterval(block._timer);
    block.elapsed.textContent = '';
  }

  /* trace chips: one condensed line per finished tool round, expandable */
  function addTraceChip(block, roundInfo) {
    var calls = roundInfo.calls || [];
    var searches = calls.filter(function (c) { return c.name === 'search'; });
    var reads = calls.filter(function (c) { return c.name === 'read' && c.ok; });
    var parts = [];
    var liveQ = searches.filter(function (s) { return s.live; });
    var fbQ = searches.filter(function (s) { return !s.live; });
    if (liveQ.length) parts.push(t('trace_search', { qs: liveQ.map(function (s) { return "'" + s.query + "'"; }).join(', ') }));
    if (fbQ.length) parts.push(t('trace_search_fb', { qs: fbQ.map(function (s) { return "'" + s.query + "'"; }).join(', ') }));
    if (reads.length) parts.push(t('trace_read', { n: reads.length }));
    if (!parts.length) return;

    var chip = el('div', 'gc-trace');
    var btn = el('button', '');
    btn.type = 'button';
    var label = el('span', '', parts.join(' \u00b7 '));
    var caret = el('span', 'gc-trace-caret', '\u25be');
    btn.appendChild(label);
    btn.appendChild(caret);
    var detail = el('div', 'gc-trace-detail');
    var hasDetail = false;
    var queries = searches.map(function (s) { return s.query; });
    var titles = reads.map(function (r) { return r.title || r.url; });
    if (queries.length) {
      hasDetail = true;
      detail.appendChild(el('div', 'gc-dt', t('trace_queries')));
      var uq = el('ul');
      queries.forEach(function (q) { uq.appendChild(el('li', '', q)); });
      detail.appendChild(uq);
    }
    if (titles.length) {
      hasDetail = true;
      detail.appendChild(el('div', 'gc-dt', t('trace_pages')));
      var up = el('ul');
      titles.forEach(function (ti) { up.appendChild(el('li', '', ti)); });
      detail.appendChild(up);
    }
    chip.appendChild(btn);
    if (hasDetail) {
      chip.appendChild(detail);
      btn.addEventListener('click', function () { chip.classList.toggle('open'); });
    } else {
      caret.style.display = 'none';
    }
    block.traces.appendChild(chip);
  }

  /* ---------------- submit ---------------- */
  function piTypeName(key) { return t(key); }

  function submitQuestion(question) {
    var text = String(question || '').trim();
    if (!text || state.busy) return;
    var attachText = state.attached ? state.attached.text : '';
    // Personal-information guard: runs before ANY tool or LLM call.
    var pi = GovCaTools.detectPI(text + '\n' + attachText);
    if (pi) {
      hideEmpty();
      var warn = el('div', 'gc-pi-block', t('pi_blocked', { type: piTypeName(pi) }));
      ui.thread.appendChild(warn);
      warn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(function () { warn.remove(); }, 9000);
      return;
    }
    if (!getKey()) {
      ui.input.value = text;
      openKeyModal();
      return;
    }
    var full = text;
    if (state.attached) {
      full += '\n\n[Attached file: ' + state.attached.name + ']\n' + state.attached.text;
    }
    clearAttachment();
    var block = addQABlock(text);
    if (state.pastQuestions.indexOf(text) === -1) {
      state.pastQuestions.push(text);
      renderHistory();
    }
    runAgent(block, full);
  }

  function requestStop() {
    state.stopRequested = true;
    if (state.abortCtrl) {
      try { state.abortCtrl.abort(); } catch (e) {}
    }
  }

  /* ---------------- OpenAI plumbing (Responses API) ---------------- */
  function mapApiError(err) {
    if (err && err.http === 401) return t('err_key');
    if (err && err.http === 429) return t('err_rate');
    return t('err_generic');
  }

  /* ---------------- the agentic run ---------------- */
  function runAgent(block, fullQuestion) {
    setBusy(true);
    state.stopRequested = false;
    setStatus(block, 'working');
    var ctrl = new AbortController();
    state.abortCtrl = ctrl;
    var cfg = effectiveModelConfig();

    var deps = {
      fetchImpl: window.fetch.bind(window),
      apiKey: getKey(),
      modelConfig: cfg,
      signal: ctrl.signal,
      shouldStop: function () { return state.stopRequested; },
      search: function (q, lang) {
        return GovCaTools.searchCanadaCa(q, {
          fetchImpl: window.fetch.bind(window),
          lang: lang,
          curatedSearch: function (qq, ll) { return keywordSearch(qq, ll); }
        });
      },
      read: function (url) {
        return GovCaTools.readCanadaCaPage(url, {
          fetchImpl: window.fetch.bind(window),
          curatedRecord: function (u) { return recordForUrl(u); }
        });
      },
      onStatus: function (kind) {
        if (kind === 'searching') setStatus(block, 'searching');
        else if (kind === 'reading') setStatus(block, 'reading');
      },
      onRound: function (roundInfo) { addTraceChip(block, roundInfo); },
      history: state.history,
      maxRounds: MAX_ROUNDS
    };

    GovCaTools.runToolLoop(fullQuestion, state.lang, deps).then(function (out) {
      block.readPages = out.readPages || [];
      if (state.stopRequested) { finishStopped(block, true); return; }
      return streamAnswer(block, out.input, cfg, ctrl);
    }).catch(function (err) {
      if (state.stopRequested || (err && err.name === 'AbortError')) { finishStopped(block, true); return; }
      stopStatus(block);
      block.stext.textContent = mapApiError(err);
      block.status.classList.add('gc-done');
      block.status.querySelector('.gc-dot').style.display = 'none';
      setBusy(false);
    });
  }

  function streamAnswer(block, input, cfg, ctrl) {
    setStatus(block, 'writing');
    var acc = '';
    var firstToken = false;
    function render(text) {
      acc = text;
      if (!firstToken && text) {
        firstToken = true;
        fadeStatus(block);
        block.card.hidden = false;
        block.body.classList.add('gc-stream-cursor');
      }
      if (text) {
        block.body.innerHTML = renderMarkdown(text);
        block.qa.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
    return GovCaTools.streamFinalAnswer(input, {
      fetchImpl: window.fetch.bind(window),
      apiKey: getKey(),
      modelConfig: cfg,
      instructions: GovCaTools.buildAgentSystemPrompt(state.lang),
      signal: ctrl.signal,
      shouldStop: function () { return state.stopRequested; },
      onDelta: render
    }).then(function (finalText) {
      block.answerText = finalText;
      finishBlock(block, state.stopRequested);
    }).catch(function (err) {
      if (state.stopRequested || (err && err.name === 'AbortError')) {
        block.answerText = acc;
        finishBlock(block, true);
        return;
      }
      throw err;
    });
  }

  function finishStopped(block, early) {
    stopStatus(block);
    block.status.style.display = '';
    block.status.classList.add('gc-done');
    var dot = block.status.querySelector('.gc-dot');
    if (dot) dot.style.display = 'none';
    block.stext.textContent = t('stopped_note');
    setBusy(false);
  }

  function finishBlock(block, stopped) {
    stopStatus(block);
    block.status.style.display = 'none';
    block.body.classList.remove('gc-stream-cursor');
    var split = GovCaTools.splitFollowups(block.answerText || '');
    block.answerText = split.answer;
    block.body.innerHTML = renderMarkdown(split.answer);

    if (block.readPages.length) buildSources(block);
    if (split.followups.length) buildFollowups(block, split.followups);
    buildControls(block);
    if (stopped) {
      var note = el('div', 'gc-stopped-note', t('stopped_note'));
      block.qa.appendChild(note);
    }

    state.history.push({ role: 'user', content: block.user.textContent });
    state.history.push({ role: 'assistant', content: split.answer });
    setBusy(false);
    block.card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
  }

  function buildSources(block) {
    var wrap = el('div', 'gc-sources');
    var toggle = el('button', 'gc-sources-toggle', '');
    toggle.type = 'button';
    var dots = el('span', 'gc-src-dots');
    block.readPages.slice(0, 3).forEach(function () { dots.appendChild(el('i')); });
    toggle.appendChild(dots);
    toggle.appendChild(el('span', '', t('sources_n', { n: block.readPages.length })));
    var list = el('ol', 'gc-sources-list');
    list.setAttribute('aria-label', t('sources_label'));
    block.readPages.forEach(function (p) {
      var li = el('li');
      var a = el('a', '', p.title);
      a.href = p.url;
      a.target = '_blank';
      a.rel = 'noopener';
      li.appendChild(a);
      li.appendChild(el('span', 'gc-src-host', hostOf(p.url)));
      list.appendChild(li);
    });
    toggle.addEventListener('click', function () { wrap.classList.toggle('open'); });
    wrap.appendChild(toggle);
    wrap.appendChild(list);
    block.card.appendChild(wrap);
  }

  function buildFollowups(block, followups) {
    var row = el('div', 'gc-followups');
    followups.forEach(function (q) {
      var b = el('button', 'gc-followup', q);
      b.type = 'button';
      b.addEventListener('click', function () { submitQuestion(q); });
      row.appendChild(b);
    });
    block.card.appendChild(row);
  }

  function buildControls(block) {
    var row = el('div', 'gc-controls');
    var up = el('button', 'gc-icon-btn', '\uD83D\uDC4D ' + t('thumb_up'));
    up.type = 'button';
    up.title = t('thumb_up');
    var down = el('button', 'gc-icon-btn', '\uD83D\uDC4E ' + t('thumb_down'));
    down.type = 'button';
    down.title = t('thumb_down');
    var copy = el('button', 'gc-icon-btn', '\u2398 ' + t('copy'));
    copy.type = 'button';
    copy.title = t('copy');
    var key = LS_FB + hashStr(block.answerText);
    var cur = localStorage.getItem(key);
    if (cur === 'up') up.setAttribute('aria-pressed', 'true');
    if (cur === 'down') down.setAttribute('aria-pressed', 'true');
    function vote(v) {
      var prev = localStorage.getItem(key);
      if (prev === v) { localStorage.removeItem(key); up.setAttribute('aria-pressed', 'false'); down.setAttribute('aria-pressed', 'false'); }
      else {
        localStorage.setItem(key, v);
        up.setAttribute('aria-pressed', v === 'up' ? 'true' : 'false');
        down.setAttribute('aria-pressed', v === 'down' ? 'true' : 'false');
      }
    }
    up.addEventListener('click', function () { vote('up'); });
    down.addEventListener('click', function () { vote('down'); });
    copy.addEventListener('click', function () {
      function done() { toast(t('copied')); }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(block.answerText).then(done, done);
      } else { done(); }
    });
    row.appendChild(up);
    row.appendChild(down);
    row.appendChild(copy);
    block.card.appendChild(row);
  }

  function hashStr(s) {
    var h = 0;
    s = String(s);
    for (var i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
    return 'h' + Math.abs(h);
  }

  /* ---------------- landing ask bar: pinned chat input on the concept page --- */
  function buildAskBar() {
    if ($('govca-askbar')) return;
    var bar = el('div');
    bar.id = 'govca-askbar';
    var inner = el('div', 'govca-askbar-inner');
    var form = el('form', 'govca-askbar-form');
    form.setAttribute('action', '#');
    var input = el('input');
    input.type = 'text';
    input.id = 'govca-askbar-input';
    input.setAttribute('autocomplete', 'off');
    input.placeholder = t('ph');
    input.setAttribute('aria-label', t('ph'));
    var send = el('button', 'govca-askbar-send', '');
    send.type = 'submit';
    send.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    send.setAttribute('aria-label', t('send'));
    send.title = t('send');
    form.appendChild(input);
    form.appendChild(send);
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var q = input.value.trim();
      if (!q) return;
      input.value = '';
      // chat route picks up ?q= and auto-sends it as the first message
      location.hash = '#/chat?q=' + encodeURIComponent(q);
    });
    inner.appendChild(form);
    bar.appendChild(inner);
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    state._askbarInput = input;
    bindAskBarVisibility(bar);
  }
  function setAskBarVisible(bar, v) {
    if (bar.classList.contains('govca-askbar-visible') === v) return;
    bar.classList.toggle('govca-askbar-visible', v);
    bar.setAttribute('aria-hidden', v ? 'false' : 'true');
    document.body.classList.toggle('govca-askbar-on', v);
  }
  function bindAskBarVisibility(bar) {
    var hero = $('ask-form');
    // Fallback: hero pill missing or no IntersectionObserver -> keep the always-visible behavior.
    if (!hero || !('IntersectionObserver' in window)) {
      setAskBarVisible(bar, true);
      return;
    }
    // The bar appears only once the hero search has scrolled out of view. Two
    // observers give hysteresis: reveal when the pill sits ~80px past the top
    // edge, hide again only when it comes back within ~10px, so the bar never
    // flickers at the boundary. Adapts to any hero height (no pixel thresholds).
    var ioShow = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) setAskBarVisible(bar, true);
    }, { rootMargin: '80px 0px 0px 0px', threshold: 0 });
    var ioHide = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) setAskBarVisible(bar, false);
    }, { rootMargin: '10px 0px 0px 0px', threshold: 0 });
    ioShow.observe(hero);
    ioHide.observe(hero);
  }
  function syncAskBarLang() {
    if (state._askbarInput) {
      state._askbarInput.placeholder = t('ph');
      state._askbarInput.setAttribute('aria-label', t('ph'));
    }
    var send = document.querySelector('#govca-askbar .govca-askbar-send');
    if (send) { send.setAttribute('aria-label', t('send')); send.title = t('send'); }
  }

  /* ---------------- hero integration ---------------- */
  function heroFileText() {
    var fi = $('ask-file');
    var f = fi && fi.files && fi.files[0];
    if (!f) return Promise.resolve(null);
    var name = (f.name || '').toLowerCase();
    if (!/\.txt$/.test(name) && !/\.md$/.test(name)) return Promise.resolve(null);
    return new Promise(function (resolve) {
      var rd = new FileReader();
      rd.onload = function () { resolve({ name: f.name, text: String(rd.result || '').slice(0, 60000) }); };
      rd.onerror = function () { resolve(null); };
      rd.readAsText(f);
    });
  }

  function bindHero() {
    var form = $('ask-form');
    var input = $('ask-input');
    var demoNote = $('demo-note');
    if (!form || !input) return;
    form.addEventListener('submit', function () {
      var q = input.value.trim();
      if (demoNote) demoNote.classList.remove('visible');
      if (!q) return;
      input.value = '';
      heroFileText().then(function (att) {
        if (att) state.attached = att;
        if (!isChatRoute()) {
          state._pendingQ = q;
          location.hash = '#/chat';
        } else {
          submitQuestion(q);
        }
      });
    });
    // pending question after hash routing
    window.addEventListener('hashchange', function () {
      if (isChatRoute() && state._pendingQ) {
        var q = state._pendingQ;
        state._pendingQ = null;
        setTimeout(function () { submitQuestion(q); }, 60);
      }
    });
  }

  /* ---------------- boot ---------------- */
  function boot() {
    state.lang = conceptLang();
    loadSources();
    bindHero();
    buildAskBar();
    document.querySelectorAll('.lang-toggle').forEach(function (b) {
      b.addEventListener('click', function () {
        requestAnimationFrame(function () { syncLang(); syncAskBarLang(); });
      });
    });
    // keyboard: escape closes modals
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeKeyModal(); closeInfoModal(); }
    });
    renderRoute();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
