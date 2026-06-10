// State and Data Control Logic for English Etymology Learning App

// Main Application State
let appState = {
  words: [],
  userWords: [],
  activeView: 'learn', // 'learn', 'dictionary', 'sync', 'quiz'
  searchQuery: '',
  selectedWord: null,
  selectedLevel: 'all',
  selectedCategory: 'all',
  
  // Quiz State
  quizMode: null, // 'flashcard', 'puzzle'
  quizWords: [],
  currentQuizIndex: 0,
  flashcardFlipped: false,
  
  // Drag and Drop Puzzle State
  puzzleWord: null,
  puzzleSegments: [],
  puzzlePlaced: [], // Array of placed morphemes in slots

  // Quest Challenge State
  questStageIdx: null,
  questWords: [],
  questAnswers: [], // player answers: { word, part_of_speech, options, correctIndex, selectedIndex }
  currentQuestIndex: 0
};

// Column headers mapping dictionary
const HEADER_MAP = {
  // Traditional Chinese Headers
  "單字": "word",
  "詞性": "part_of_speech",
  "中文翻譯": "translation",
  "字根字首拆解": "breakdown",
  "拆解字義": "breakdown_meanings",
  "記憶口訣": "formula",
  "神隊友單字": "teammate_word",
  "神隊友中文": "teammate_translation",
  "共同字根": "teammate_root",
  "共同字根意思": "teammate_root_meaning",

  // English Headers
  "word": "word",
  "part_of_speech": "part_of_speech",
  "pos": "part_of_speech",
  "translation": "translation",
  "chinese": "translation",
  "breakdown": "breakdown",
  "breakdown_meanings": "breakdown_meanings",
  "formula": "formula",
  "teammate_word": "teammate_word",
  "teammate_translation": "teammate_translation",
  "teammate_root": "teammate_root",
  "teammate_root_meaning": "teammate_root_meaning"
};

// Initialize App
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadWords();
  setupRouting();
  setupEventListeners();
  renderLibrarySelector();
  renderDashboard();
  renderStats();
  
  // Create icons
  lucide.createIcons();
});

// Theme Management
function initTheme() {
  const savedTheme = localStorage.getItem('etymology_theme') || 'light';
  document.body.setAttribute('data-theme', savedTheme);
  updateThemeToggleIcon(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.body.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.body.setAttribute('data-theme', newTheme);
  localStorage.setItem('etymology_theme', newTheme);
  updateThemeToggleIcon(newTheme);
}

function updateThemeToggleIcon(theme) {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (!toggleBtn) return;
  toggleBtn.innerHTML = theme === 'light' 
    ? '<i data-lucide="moon"></i>' 
    : '<i data-lucide="sun"></i>';
  lucide.createIcons();
}

// Data Handling & Storage
function loadWords() {
  let userStored = localStorage.getItem('etymology_user_words');
  if (!userStored) {
    const oldStored = localStorage.getItem('etymology_words');
    if (oldStored) {
      try {
        appState.userWords = JSON.parse(oldStored);
      } catch (e) {
        appState.userWords = [...DEFAULT_WORDS];
      }
    } else {
      appState.userWords = [...DEFAULT_WORDS];
    }
    localStorage.setItem('etymology_user_words', JSON.stringify(appState.userWords));
  } else {
    try {
      appState.userWords = JSON.parse(userStored);
    } catch (e) {
      appState.userWords = [...DEFAULT_WORDS];
    }
  }

  assembleActiveVocabulary();
}

function saveWords() {
  appState.userWords = appState.words.filter(w => !w.is_library);
  localStorage.setItem('etymology_user_words', JSON.stringify(appState.userWords));
  assembleActiveVocabulary();
}

// Router Setup (SPA)
function setupRouting() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const view = e.currentTarget.getAttribute('data-view');
      navigateTo(view);
    });
  });

  // Check URL Hash on load
  const hash = window.location.hash.substring(1);
  if (['learn', 'dictionary', 'sync', 'quiz'].includes(hash)) {
    navigateTo(hash);
  } else {
    navigateTo('learn');
  }
}

function navigateTo(view) {
  appState.activeView = view;
  window.location.hash = view;
  incrementUsageCount();

  // Update navbar active states
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    if (item.getAttribute('data-view') === view) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Switch visible container panels
  const views = document.querySelectorAll('.view-container');
  views.forEach(panel => {
    if (panel.id === `view-${view}`) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });

  // Render updates for specific view panels
  if (view === 'learn') {
    renderLibrarySelector();
    renderDashboard();
  } else if (view === 'dictionary') {
    renderDictionary();
  } else if (view === 'sync') {
    renderSyncDashboard();
  } else if (view === 'quiz') {
    renderQuizHome();
  }
  
  window.scrollTo(0, 0);
}

// Render Dashboard (Learn view)
function renderDashboard() {
  const container = document.getElementById('words-grid-container');
  if (!container) return;

  const query = appState.searchQuery.toLowerCase().trim();
  const level = appState.selectedLevel;
  const category = appState.selectedCategory;
  
  // Filtering algorithm
  const filtered = appState.words.filter(item => {
    // 1. Search Query Filter
    let matchesSearch = true;
    if (query) {
      const w = item.word.toLowerCase();
      const t = item.translation.toLowerCase();
      const f = (item.formula || '').toLowerCase();
      const b = (item.breakdown || '').toLowerCase();
      const tm = (item.teammate_word || '').toLowerCase();
      const tr = (item.teammate_root || '').toLowerCase();
      matchesSearch = w.includes(query) || t.includes(query) || f.includes(query) || b.includes(query) || tm.includes(query) || tr.includes(query);
    }

    // 2. Level Filter
    let matchesLevel = true;
    if (level === 'starred') {
      matchesLevel = !!item.starred;
    } else if (level !== 'all') {
      matchesLevel = item.level === level;
    }

    // 3. Category Filter
    let matchesCategory = true;
    if (category !== 'all') {
      matchesCategory = item.category === category;
    }

    return matchesSearch && matchesLevel && matchesCategory;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--text-muted);">
        <i data-lucide="search-code" style="width: 48px; height: 48px; margin-bottom: 1rem; opacity: 0.5;"></i>
        <p style="font-size:1.15rem; font-weight:600;">找不到符合的單字</p>
        <p style="font-size:0.95rem; margin-top:0.25rem;">試著換個搜尋篩選條件，或是前往「雲端同步」上傳新單字！</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  const masteredSet = new Set(getMasteredWords().map(w => w.toLowerCase()));

  container.innerHTML = filtered.map(item => {
    const segments = item.breakdown ? item.breakdown.split('-') : [];
    const tagsHTML = segments.map(seg => {
      const type = getMorphemeType(seg);
      let label = "詞素";
      if (type === 'prefix') label = '首';
      if (type === 'root') label = '根';
      if (type === 'suffix') label = '尾';
      return `<span class="morpheme-tag ${type}">${seg} [${label}]</span>`;
    }).join('');

    const isMastered = masteredSet.has(item.word.toLowerCase());

    return `
      <div class="word-thumb-card" onclick="openWordDetails('${item.word.replace(/'/g, "\\'")}')">
        <!-- Bookmark Star Toggle -->
        <button class="word-card-star ${item.starred ? 'active' : ''}" onclick="toggleStar('${item.word.replace(/'/g, "\\'")}', event)" title="${item.starred ? '取消標記' : '標記為不熟單字'}">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="${item.starred ? '#f59e0b' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
        </button>
        <!-- Mastered Checkbox Toggle -->
        <button class="word-card-check ${isMastered ? 'active' : ''}" onclick="toggleMastered('${item.word.replace(/'/g, "\\'")}', event)" title="${isMastered ? '已熟練' : '標記為已熟練'}">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="${isMastered ? '#10b981' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </button>
        <div class="word-thumb-header" style="padding-right: 4.2rem;">
          <span class="word-thumb-name">${item.word}</span>
          <span class="word-thumb-pos">${item.part_of_speech}</span>
        </div>
        <div class="word-thumb-trans">${item.translation}</div>
        <div class="word-thumb-tags" style="margin-bottom: 2rem;">
          ${tagsHTML}
        </div>
        <span class="card-level-badge">${item.level ? item.level.replace('Level ', 'L') : 'L3-4'}</span>
      </div>
    `;
  }).join('');
}

// Render Stats Header Panel
function renderStats() {
  const totalWordsEl = document.getElementById('stat-total-words');
  const totalRootsEl = document.getElementById('stat-total-roots');
  const usageCountEl = document.getElementById('stat-usage-count');
  const activeSheetEl = document.getElementById('stat-active-sheet');

  if (totalWordsEl) totalWordsEl.innerText = appState.words.length;

  if (totalRootsEl) {
    // Calculate unique roots/prefixes/suffixes from mastered words
    const mastered = new Set(getMasteredWords().map(w => w.toLowerCase()));
    const masteredRootsSet = new Set();
    
    appState.words.forEach(item => {
      if (mastered.has(item.word.toLowerCase()) && item.breakdown) {
        item.breakdown.split('-').forEach(part => {
          masteredRootsSet.add(part.toLowerCase().trim());
        });
      }
    });
    totalRootsEl.innerText = masteredRootsSet.size;
  }

  if (usageCountEl) {
    const usageCount = localStorage.getItem('etymology_usage_count') || '0';
    usageCountEl.innerText = `${usageCount} 次`;
  }

  if (activeSheetEl) {
    const isSynced = localStorage.getItem('etymology_sheet_id') ? "已串接" : "本機儲存";
    activeSheetEl.innerText = isSynced;
  }
}

// Open Word Details Modal
function openWordDetails(wordName) {
  const wordObj = appState.words.find(w => w.word.toLowerCase() === wordName.toLowerCase());
  if (!wordObj) return;

  appState.selectedWord = wordObj;
  
  const modal = document.getElementById('word-detail-modal');
  renderWordDetails(wordObj); // Render SVG diagram inside renderer.js
  
  modal.classList.add('active');
  incrementUsageCount();
}

function closeWordDetails() {
  const modal = document.getElementById('word-detail-modal');
  modal.classList.remove('active');
  appState.selectedWord = null;
}

// DICTIONARY VIEW
function renderDictionary() {
  const tableBody = document.getElementById('dict-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = appState.words.map((item, index) => {
    return `
      <tr>
        <td class="dict-word-cell">${item.word}</td>
        <td><span style="font-weight:600; color:var(--color-primary);">${item.part_of_speech}</span></td>
        <td>${item.translation}</td>
        <td>${item.breakdown || '-'}</td>
        <td>${item.formula || '-'}</td>
        <td class="dict-actions">
          <button class="action-btn" onclick="openWordDetails('${item.word.replace(/'/g, "\\'")}')" title="查看"><i data-lucide="eye" style="width:16px; height:16px;"></i></button>
          <button class="action-btn" onclick="toggleStar('${item.word.replace(/'/g, "\\'")}')" title="${item.starred ? '取消標記不熟' : '標記不熟'}" style="${item.starred ? 'color:#f59e0b; border-color:#f59e0b;' : ''}"><i data-lucide="star" style="width:16px; height:16px;"></i></button>
          <button class="action-btn" onclick="editWordForm(${index})" title="編輯"><i data-lucide="edit" style="width:16px; height:16px;"></i></button>
          <button class="action-btn delete" onclick="deleteWord(${index})" title="刪除"><i data-lucide="trash-2" style="width:16px; height:16px;"></i></button>
        </td>
      </tr>
    `;
  }).join('');

  lucide.createIcons();
}

// Add/Edit Word Form controller
function editWordForm(index) {
  const formModal = document.getElementById('word-form-modal');
  if (!formModal) return;

  const addContainer = document.getElementById('add-word-mode-container');
  const editContainer = document.getElementById('edit-word-mode-container');

  if (index !== undefined) {
    // Edit mode
    const wordObj = appState.words[index];
    if (addContainer) addContainer.style.display = 'none';
    if (editContainer) editContainer.style.display = 'block';

    document.getElementById('form-index').value = index;
    document.getElementById('form-word').value = wordObj ? wordObj.word : '';
    document.getElementById('form-pos').value = wordObj ? wordObj.part_of_speech : 'adj.';
    document.getElementById('form-translation').value = wordObj ? wordObj.translation : '';
    document.getElementById('form-breakdown').value = wordObj ? wordObj.breakdown : '';
    document.getElementById('form-breakdown-meanings').value = wordObj ? wordObj.breakdown_meanings : '';
    document.getElementById('form-formula').value = wordObj ? wordObj.formula : '';
    document.getElementById('form-teammate-word').value = wordObj ? (wordObj.teammate_word || '') : '';
    document.getElementById('form-teammate-translation').value = wordObj ? (wordObj.teammate_translation || '') : '';
    document.getElementById('form-teammate-root').value = wordObj ? (wordObj.teammate_root || '') : '';
    document.getElementById('form-teammate-root-meaning').value = wordObj ? (wordObj.teammate_root_meaning || '') : '';

    document.getElementById('word-form-title').innerText = '編輯單字資料';
  } else {
    // Add mode
    if (addContainer) addContainer.style.display = 'block';
    if (editContainer) editContainer.style.display = 'none';

    const addWordInput = document.getElementById('add-form-word');
    if (addWordInput) addWordInput.value = '';
    
    const statusEl = document.getElementById('form-loading-status');
    if (statusEl) statusEl.style.display = 'none';
    
    const submitBtn = document.getElementById('add-word-submit-btn');
    if (submitBtn) submitBtn.disabled = false;

    document.getElementById('word-form-title').innerText = '新增單字詞彙';
  }

  formModal.classList.add('active');
  lucide.createIcons();
}

function closeWordForm() {
  document.getElementById('word-form-modal').classList.remove('active');
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const indexStr = document.getElementById('form-index').value;
  const word = document.getElementById('form-word').value.trim();
  const part_of_speech = document.getElementById('form-pos').value;
  const translation = document.getElementById('form-translation').value.trim();
  const breakdown = document.getElementById('form-breakdown').value.trim();
  const breakdown_meanings = document.getElementById('form-breakdown-meanings').value.trim();
  const formula = document.getElementById('form-formula').value.trim();
  const teammate_word = document.getElementById('form-teammate-word').value.trim();
  const teammate_translation = document.getElementById('form-teammate-translation').value.trim();
  const teammate_root = document.getElementById('form-teammate-root').value.trim();
  const teammate_root_meaning = document.getElementById('form-teammate-root-meaning').value.trim();

  if (!word || !translation) {
    alert('單字名稱與中文翻譯為必填欄位！');
    return;
  }

  const wordObj = {
    word,
    part_of_speech,
    translation,
    breakdown: breakdown || undefined,
    breakdown_meanings: breakdown_meanings || undefined,
    formula: formula || undefined,
    teammate_word: teammate_word || undefined,
    teammate_translation: teammate_translation || undefined,
    teammate_root: teammate_root || undefined,
    teammate_root_meaning: teammate_root_meaning || undefined
  };

  // Ensure breakdown and teammate fields are fully generated if missing/blank
  await ensureEtymologyFields(wordObj);

  if (indexStr === '') {
    // Add new word
    appState.words.unshift(wordObj);
    incrementUsageCount();
  } else {
    // Edit existing word
    const index = parseInt(indexStr);
    appState.words[index] = wordObj;
  }

  saveWords();
  closeWordForm();
  
  if (appState.activeView === 'dictionary') {
    renderDictionary();
  } else {
    renderDashboard();
  }
}

// Clean Chinese translation prepends
function cleanChineseTranslation(trans, pos) {
  let t = trans.trim().replace(/[.?!。？！]/g, '');
  const prefixesToRemove = ['一個', '一種', '去', '被', '要', '是'];
  for (const prefix of prefixesToRemove) {
    if (t.startsWith(prefix) && t.length > prefix.length) {
      t = t.substring(prefix.length);
    }
  }
  return t;
}

// Helper: Algorithmic morpheme splitter and etymology generator
function generateEtymologyBreakdown(word, translation) {
  const cleanWord = word.trim().toLowerCase();
  let prefix = "";
  let root = cleanWord;
  let suffix = "";

  // Scan for prefixes
  for (const pre in KNOWN_PREFIXES) {
    if (cleanWord.startsWith(pre) && cleanWord.length > pre.length + 2) {
      prefix = pre;
      root = cleanWord.substring(pre.length);
      break;
    }
  }

  // Scan for suffixes from the end of the root
  for (const suf in KNOWN_SUFFIXES) {
    if (root.endsWith(suf) && root.length > suf.length + 2) {
      suffix = suf;
      root = root.substring(0, root.length - suf.length);
      break;
    }
  }

  // Re-check middle root against KNOWN_ROOTS
  let rootMeaning = "核心詞素";
  let category = "一般詞彙";
  let teammateWord = "";
  let teammateTranslation = "";
  let teammateRoot = "";
  let teammateRootMeaning = "";

  const matchedRootKey = Object.keys(KNOWN_ROOTS).find(r => root.includes(r) || r.includes(root));
  if (matchedRootKey) {
    const rData = KNOWN_ROOTS[matchedRootKey];
    root = matchedRootKey; // snap to standard root spelling
    rootMeaning = rData.meaning;
    category = rData.category;
    
    // Attempt teammate
    const teammateWordToFind = rData.teammate;
    teammateWord = teammateWordToFind;
    teammateRoot = matchedRootKey;
    teammateRootMeaning = rData.meaning;
    
    // Look up translation in active list, defaults, or dynamically in libraries
    const teammateObj = appState.words.find(w => w.word.toLowerCase() === teammateWordToFind.toLowerCase()) || 
                        DEFAULT_WORDS.find(w => w.word.toLowerCase() === teammateWordToFind.toLowerCase());
    if (teammateObj) {
      teammateTranslation = teammateObj.translation;
    } else {
      teammateTranslation = findTeammateTranslationInLibrary(teammateWordToFind);
    }
  }

  // Assemble breakdown
  const segments = [];
  const meanings = [];
  const formulas = [];

  if (prefix) {
    segments.push(prefix);
    meanings.push(`${prefix}:${KNOWN_PREFIXES[prefix].split(';')[0]}`);
    formulas.push(`「${KNOWN_PREFIXES[prefix].split(';')[0]}」(${prefix})`);
  }
  
  segments.push(root);
  meanings.push(`${root}:${rootMeaning}`);
  formulas.push(`「${rootMeaning}」(${root})`);
  
  if (suffix) {
    segments.push(suffix);
    meanings.push(`${suffix}:${KNOWN_SUFFIXES[suffix].split(' ')[0]}`);
    formulas.push(`「${KNOWN_SUFFIXES[suffix].split(';')[0].split(' ')[0]}」(${suffix})`);
  }

  const breakdown = segments.join('-');
  const breakdown_meanings = meanings.join('|');
  const formula = formulas.join(' + ') + ` -> ${translation}`;

  return {
    category,
    breakdown,
    breakdown_meanings,
    formula,
    teammate_word: teammateWord || undefined,
    teammate_translation: teammateTranslation || undefined,
    teammate_root: teammateRoot || undefined,
    teammate_root_meaning: teammateRootMeaning || undefined
  };
}

// Auto generate multiple POS card mappings using Dictionary API + MyMemory
async function autoGenerateMultiplePOSEtymologies(word) {
  const cleanWord = word.trim().toLowerCase();
  const results = [];
  
  // 1. Check in HETERONYMS_MAP
  if (typeof HETERONYMS_MAP !== 'undefined' && HETERONYMS_MAP[cleanWord]) {
    const entries = HETERONYMS_MAP[cleanWord];
    for (const entry of entries) {
      const card = {
        word: cleanWord,
        part_of_speech: entry.part_of_speech,
        translation: entry.translation,
        breakdown: entry.breakdown,
        breakdown_meanings: entry.breakdown_meanings,
        formula: entry.formula,
        teammate_word: entry.teammate_word,
        teammate_translation: entry.teammate_translation,
        teammate_root: entry.teammate_root,
        teammate_root_meaning: entry.teammate_root_meaning,
        starred: false
      };
      results.push(await ensureEtymologyFields(card));
    }
    return results;
  }

  // 2. Check if the word is in DEFAULT_WORDS
  const defaults = DEFAULT_WORDS.filter(w => w.word.toLowerCase() === cleanWord);
  if (defaults.length > 0) {
    for (const def of defaults) {
      if (def.part_of_speech.includes('/')) {
        const parts = def.part_of_speech.split('/');
        for (const p of parts) {
          const card = {
            ...def,
            part_of_speech: p.trim(),
            starred: false
          };
          results.push(await ensureEtymologyFields(card));
        }
      } else {
        const card = { ...def, starred: false };
        results.push(await ensureEtymologyFields(card));
      }
    }
    return results;
  }

  // 3. Fallback: Query Free Dictionary API to discover parts of speech
  let posList = [];
  try {
    const dictRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`);
    if (dictRes.ok) {
      const data = await dictRes.json();
      if (Array.isArray(data) && data.length > 0) {
        const entry = data[0];
        if (entry.meanings) {
          entry.meanings.forEach(m => {
            const rawPOS = m.partOfSpeech.toLowerCase();
            let mappedPOS = 'n.';
            if (rawPOS === 'noun') mappedPOS = 'n.';
            else if (rawPOS === 'verb') mappedPOS = 'v.';
            else if (rawPOS === 'adjective') mappedPOS = 'adj.';
            else if (rawPOS === 'adverb') mappedPOS = 'adv.';
            else if (rawPOS === 'preposition') mappedPOS = 'prep.';
            else if (rawPOS === 'conjunction') mappedPOS = 'conj.';
            else return;

            if (!posList.includes(mappedPOS)) {
              posList.push(mappedPOS);
            }
          });
        }
      }
    }
  } catch (err) {
    console.error("Free Dictionary API error:", err);
  }

  if (posList.length === 0) {
    posList = ['n.'];
  }

  // Fetch translation for each part of speech and parse etymology
  for (const pos of posList) {
    let queryText = cleanWord;
    if (pos === 'v.') {
      queryText = 'to ' + cleanWord;
    } else if (pos === 'n.') {
      queryText = 'a ' + cleanWord;
    } else if (pos === 'adj.') {
      queryText = 'be ' + cleanWord;
    }

    let translation = '';
    try {
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(queryText)}&langpair=en|zh-TW`);
      if (res.ok) {
        const data = await res.json();
        if (data.responseData && data.responseData.translatedText) {
          translation = cleanChineseTranslation(data.responseData.translatedText, pos);
        }
      }
    } catch (e) {
      console.error("Translation fetch error:", e);
    }

    if (!translation) {
      try {
        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanWord)}&langpair=en|zh-TW`);
        if (res.ok) {
          const data = await res.json();
          translation = cleanChineseTranslation(data.responseData.translatedText || cleanWord, pos);
        }
      } catch (e) {
        translation = cleanWord;
      }
    }

    const card = {
      word: cleanWord,
      part_of_speech: pos,
      translation: translation,
      starred: false
    };

    results.push(await ensureEtymologyFields(card));
  }

  return results;
}

// Form submission handler for new word additions
async function handleWordAddSubmit(e) {
  e.preventDefault();
  const wordInput = document.getElementById('add-form-word');
  const word = wordInput.value.trim();
  if (!word) return;

  const statusEl = document.getElementById('form-loading-status');
  const submitBtn = document.getElementById('add-word-submit-btn');

  statusEl.style.display = 'flex';
  submitBtn.disabled = true;

  try {
    const generatedCards = await autoGenerateMultiplePOSEtymologies(word);
    if (generatedCards && generatedCards.length > 0) {
      generatedCards.forEach(newCard => {
        // Remove existing card of same word + POS if exists
        const existingIdx = appState.words.findIndex(w => w.word.toLowerCase() === newCard.word.toLowerCase() && w.part_of_speech === newCard.part_of_speech);
        if (existingIdx !== -1) {
          appState.words.splice(existingIdx, 1);
        }
        appState.words.unshift(newCard);
      });
      saveWords();
      incrementUsageCount();
      closeWordForm();
      if (appState.activeView === 'learn') {
        renderDashboard();
      } else if (appState.activeView === 'dictionary') {
        renderDictionary();
      }
      alert(`新增成功！已自動配置 ${generatedCards.length} 個不同詞性的單字卡片。`);
    } else {
      alert('無法解析此單字，請檢查拼字或網路連線。');
    }
  } catch (err) {
    console.error("Auto generation error:", err);
    alert('自動配置過程中發生錯誤: ' + err.message);
  } finally {
    statusEl.style.display = 'none';
    submitBtn.disabled = false;
  }
}

function deleteWord(index) {
  const wordObj = appState.words[index];
  if (confirm(`確定要刪除單字「${wordObj.word}」嗎？`)) {
    if (wordObj.is_library) {
      const deleted = getDeletedWords();
      if (!deleted.map(w => w.toLowerCase()).includes(wordObj.word.toLowerCase())) {
        deleted.push(wordObj.word);
        localStorage.setItem('etymology_deleted_words', JSON.stringify(deleted));
      }
    } else {
      const userIdx = appState.userWords.findIndex(w => w.word.toLowerCase() === wordObj.word.toLowerCase() && w.part_of_speech === wordObj.part_of_speech);
      if (userIdx !== -1) {
        appState.userWords.splice(userIdx, 1);
        localStorage.setItem('etymology_user_words', JSON.stringify(appState.userWords));
      }
    }
    
    assembleActiveVocabulary();
    renderDictionary();
  }
}

// CLOUD SYNC & IMPORT/EXPORT (Google Sheets Sync)
function renderSyncDashboard() {
  const syncInput = document.getElementById('sheet-url-input');
  const savedUrl = localStorage.getItem('etymology_sheet_url');
  if (savedUrl && syncInput) {
    syncInput.value = savedUrl;
  }
}

// Algorithmic morpheme splitter and etymology generator
// Unified function to ensure prefix/suffix breakdowns and teammates are populated for all words
async function ensureEtymologyFields(item) {
  const word = item.word.trim();
  const cleanWord = word.toLowerCase();

  // 1. Check if part of speech is missing
  if (!item.part_of_speech) {
    item.part_of_speech = 'n.'; // default guess
  }

  // 2. Resolve Translation if missing
  if (!item.translation) {
    // try to look up in DEFAULT_WORDS
    const existingDefault = DEFAULT_WORDS.find(w => w.word.toLowerCase() === cleanWord);
    if (existingDefault) {
      item.translation = existingDefault.translation;
    } else {
      const existingLib = findWordInLibrary(cleanWord);
      if (existingLib) {
        item.translation = existingLib.translation;
      } else {
        // fetch via API
        try {
          let queryText = cleanWord;
          if (item.part_of_speech === 'v.') queryText = 'to ' + cleanWord;
          else if (item.part_of_speech === 'n.') queryText = 'a ' + cleanWord;
          else if (item.part_of_speech === 'adj.') queryText = 'be ' + cleanWord;

          const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(queryText)}&langpair=en|zh-TW`);
          if (res.ok) {
            const data = await res.json();
            if (data.responseData && data.responseData.translatedText) {
              item.translation = cleanChineseTranslation(data.responseData.translatedText, item.part_of_speech);
            }
          }
        } catch (e) {
          console.error("Translation fetch error in ensureEtymologyFields:", e);
        }
        if (!item.translation) {
          item.translation = word; // fallback
        }
      }
    }
  }

  // 3. Resolve Breakdown & Teammate fields
  // If breakdown, meanings, or teammate fields are missing, generate them!
  let refEtymology = null;
  const existingDefault = DEFAULT_WORDS.find(w => w.word.toLowerCase() === cleanWord);
  if (existingDefault) {
    refEtymology = existingDefault;
  } else {
    refEtymology = findWordInLibrary(cleanWord);
  }

  // If found in default or expansion library, backfill missing/empty fields
  if (refEtymology) {
    if (!item.breakdown) item.breakdown = refEtymology.breakdown;
    if (!item.breakdown_meanings) item.breakdown_meanings = refEtymology.breakdown_meanings;
    if (!item.formula) item.formula = refEtymology.formula;
    if (!item.category) item.category = refEtymology.category;
    if (!item.teammate_word) item.teammate_word = refEtymology.teammate_word;
    if (!item.teammate_translation) item.teammate_translation = refEtymology.teammate_translation;
    if (!item.teammate_root) item.teammate_root = refEtymology.teammate_root;
    if (!item.teammate_root_meaning) item.teammate_root_meaning = refEtymology.teammate_root_meaning;
  }

  // If still missing breakdown, generate it algorithmically
  if (!item.breakdown || !item.teammate_word) {
    const generated = generateEtymologyBreakdown(cleanWord, item.translation);
    if (!item.breakdown) item.breakdown = generated.breakdown;
    if (!item.breakdown_meanings) item.breakdown_meanings = generated.breakdown_meanings;
    if (!item.formula) item.formula = generated.formula;
    if (!item.category) item.category = generated.category || "一般詞彙";
    
    if (!item.teammate_word && generated.teammate_word) {
      item.teammate_word = generated.teammate_word;
      item.teammate_translation = generated.teammate_translation;
      item.teammate_root = generated.teammate_root;
      item.teammate_root_meaning = generated.teammate_root_meaning;
    }
  }

  // Double check teammate translation if teammate word is present but translation is missing
  if (item.teammate_word && !item.teammate_translation) {
    // search in active lists/defaults/libraries
    const teammateObj = (appState && appState.words && appState.words.find(w => w.word.toLowerCase() === item.teammate_word.toLowerCase())) ||
                        DEFAULT_WORDS.find(w => w.word.toLowerCase() === item.teammate_word.toLowerCase());
    if (teammateObj) {
      item.teammate_translation = teammateObj.translation;
    } else {
      item.teammate_translation = findTeammateTranslationInLibrary(item.teammate_word);
    }

    // if still empty, fetch from API
    if (!item.teammate_translation) {
      try {
        const tRes = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(item.teammate_word)}&langpair=en|zh-TW`);
        if (tRes.ok) {
          const tData = await tRes.json();
          if (tData.responseData && tData.responseData.translatedText) {
            item.teammate_translation = cleanChineseTranslation(tData.responseData.translatedText, '');
          }
        }
      } catch (err) {
        console.error("Failed to translate teammate word:", err);
      }
    }
  }

  // Final sanitization: ensure Level is correct
  item.level = determineWordLevel(cleanWord);
  if (!item.category) item.category = "一般詞彙";

  // Re-sync formula translation suffix if we updated translation
  if (item.formula && !item.formula.includes(item.translation)) {
    if (item.formula.includes(' -> ')) {
      item.formula = item.formula.split(' -> ')[0] + ` -> ${item.translation}`;
    } else {
      item.formula = item.formula + ` -> ${item.translation}`;
    }
  }

  return item;
}

// Wrapper for compatibility
async function autoGenerateWordEtymology(word, customTranslation) {
  const wordObj = {
    word: word,
    translation: customTranslation || undefined
  };
  return await ensureEtymologyFields(wordObj);
}

// Fetch Google Sheet data as CSV
async function fetchGoogleSheetData() {
  const urlInput = document.getElementById('sheet-url-input');
  if (!urlInput) return;

  const url = urlInput.value.trim();
  if (!url) {
    alert('請輸入 Google Sheets 連結！');
    return;
  }

  // Regex to extract Spreadsheet ID
  const matches = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!matches) {
    alert('無效的 Google Sheets 網址，請確認網址格式正確！');
    return;
  }

  const sheetId = matches[1];
  
  // Construct the CSV export link
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;

  const statusEl = document.getElementById('sync-status-msg');
  statusEl.innerText = "同步中，請稍候...";
  statusEl.style.color = "var(--color-primary)";

  try {
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error("連線失敗，請檢查試算表是否已發布到網路。");
    }
    const csvText = await response.text();
    
    // Parse the fetched CSV
    const rows = parseCSV(csvText);
    if (rows.length < 2) {
      throw new Error("試算表格式不正確或內容為空。");
    }

    const headers = rows[0].map(h => h.trim().toLowerCase().replace(/^\uFEFF/, ''));
    
    // Convert to word list schema using async auto-generation
    const importPromises = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (row.length === 0 || !row[0]) continue;

      const item = {};
      headers.forEach((h, index) => {
        const mappedKey = HEADER_MAP[h] || h;
        item[mappedKey] = row[index] ? row[index].trim() : '';
      });

      const wordName = item.word || item["單字"];
      if (wordName) {
        const wordObj = {
          word: wordName,
          part_of_speech: item.part_of_speech || undefined,
          translation: item.translation || undefined,
          category: item.category || undefined,
          breakdown: item.breakdown || undefined,
          breakdown_meanings: item.breakdown_meanings || undefined,
          formula: item.formula || undefined,
          teammate_word: item.teammate_word || undefined,
          teammate_translation: item.teammate_translation || undefined,
          teammate_root: item.teammate_root || undefined,
          teammate_root_meaning: item.teammate_root_meaning || undefined,
          starred: false
        };
        importPromises.push(ensureEtymologyFields(wordObj));
      }
    }

    const newWords = await Promise.all(importPromises);

    if (newWords.length > 0) {
      appState.words = newWords;
      saveWords();
      
      localStorage.setItem('etymology_sheet_id', sheetId);
      localStorage.setItem('etymology_sheet_url', url);

      statusEl.innerText = `同步成功！共載入 ${newWords.length} 個單字。`;
      statusEl.style.color = "var(--color-generic)";
      alert(`同步成功！共載入 ${newWords.length} 個單字。`);
      // Re-render dashboard or dictionary
      if (appState.activeView === 'learn') renderDashboard();
      else if (appState.activeView === 'dictionary') renderDictionary();
    } else {
      throw new Error("找不到有效的單字資料。");
    }
  } catch (error) {
    console.error(error);
    statusEl.innerText = `同步失敗: ${error.message}`;
    statusEl.style.color = "var(--color-prefix)";
    alert(`同步失敗: ${error.message}`);
  }
}

// Local File Upload Handlers (CSV or JSON)
function handleFileUpload(file) {
  const reader = new FileReader();
  const statusEl = document.getElementById('sync-status-msg');

  if (file.name.endsWith('.json')) {
    reader.onload = async function(e) {
      try {
        const data = JSON.parse(e.target.result);
        if (Array.isArray(data)) {
          // Process all JSON items through ensureEtymologyFields asynchronously
          const processedData = await Promise.all(data.map(item => ensureEtymologyFields(item)));
          appState.words = processedData;
          saveWords();
          statusEl.innerText = `載入成功！共匯入 ${processedData.length} 個單字。`;
          statusEl.style.color = "var(--color-generic)";
          alert(`匯入成功！共載入 ${processedData.length} 個單字。`);
          if (appState.activeView === 'learn') renderDashboard();
          else if (appState.activeView === 'dictionary') renderDictionary();
        } else {
          throw new Error("JSON 格式並非單字陣列。");
        }
      } catch (err) {
        statusEl.innerText = `匯入失敗: ${err.message}`;
        statusEl.style.color = "var(--color-prefix)";
        alert(`匯入失敗: ${err.message}`);
      }
    };
    reader.readAsText(file);
  } else if (file.name.endsWith('.csv')) {
    reader.onload = async function(e) {
      try {
        const csvText = e.target.result;
        const rows = parseCSV(csvText);
        if (rows.length < 2) throw new Error("CSV 資料不足");

        const headers = rows[0].map(h => h.trim().toLowerCase().replace(/^\uFEFF/, ''));
        const importPromises = [];

        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          if (row.length === 0 || !row[0]) continue;

          const item = {};
          headers.forEach((h, index) => {
            const mappedKey = HEADER_MAP[h] || h;
            item[mappedKey] = row[index] ? row[index].trim() : '';
          });

          const wordName = item.word || item["單字"];
          if (wordName) {
            const wordObj = {
              word: wordName,
              part_of_speech: item.part_of_speech || undefined,
              translation: item.translation || undefined,
              category: item.category || undefined,
              breakdown: item.breakdown || undefined,
              breakdown_meanings: item.breakdown_meanings || undefined,
              formula: item.formula || undefined,
              teammate_word: item.teammate_word || undefined,
              teammate_translation: item.teammate_translation || undefined,
              teammate_root: item.teammate_root || undefined,
              teammate_root_meaning: item.teammate_root_meaning || undefined,
              starred: false
            };
            importPromises.push(ensureEtymologyFields(wordObj));
          }
        }

        const newWords = await Promise.all(importPromises);

        if (newWords.length > 0) {
          appState.words = newWords;
          saveWords();
          statusEl.innerText = `匯入成功！共載入 ${newWords.length} 個單字。`;
          statusEl.style.color = "var(--color-generic)";
          alert(`匯入成功！共載入 ${newWords.length} 個單字。`);
          if (appState.activeView === 'learn') renderDashboard();
          else if (appState.activeView === 'dictionary') renderDictionary();
        } else {
          throw new Error("找不到有效的單字資料。");
        }
      } catch (err) {
        statusEl.innerText = `匯入失敗: ${err.message}`;
        statusEl.style.color = "var(--color-prefix)";
        alert(`匯入失敗: ${err.message}`);
      }
    };
    reader.readAsText(file);
  } else {
    alert('僅支援 CSV 或 JSON 格式檔案。');
  }
}

// Custom CSV Parser supporting quotes and line breaks
function parseCSV(text) {
  const lines = [];
  let row = [""];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i+1];
    
    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++; // skip next double quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') {
        i++;
      }
      lines.push(row);
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
  }
  
  if (row.length > 1 || row[0] !== '') {
    lines.push(row);
  }
  
  return lines;
}

// Download Backup file
function downloadBackupJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState.words, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "etymology_vocabulary_backup.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// Setup listeners for file drag-and-drop
function setupDragDrop() {
  const dropZone = document.getElementById('drag-drop-area');
  const fileInput = document.getElementById('file-upload-input');
  
  if (!dropZone || !fileInput) return;

  dropZone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  });
}

// LEARNING / GAME CENTER (Quiz Logic)
function renderQuizHome() {
  const homeArea = document.getElementById('quiz-home-view');
  const playArea = document.getElementById('quiz-play-view');
  
  if (homeArea && playArea) {
    homeArea.style.display = 'grid';
    playArea.style.display = 'none';
  }
}

function startFlashcardQuiz(source = 'all') {
  let pool = [];
  if (source === 'starred') {
    pool = appState.words.filter(w => w.starred);
    if (pool.length === 0) {
      alert('您目前沒有標記任何「不熟單字」！請先在卡片右上角點選星星標記。');
      return;
    }
  } else {
    pool = appState.words;
  }

  if (pool.length === 0) {
    alert('單字庫目前是空的，請先新增單字或從試算表同步！');
    return;
  }

  // Take up custom random words
  const selectEl = document.getElementById('flashcard-count-select');
  let limit = 10;
  if (selectEl) {
    const val = selectEl.value;
    limit = val === 'all' ? pool.length : parseInt(val);
  }
  appState.quizWords = [...pool].sort(() => 0.5 - Math.random()).slice(0, limit);
  appState.quizMode = 'flashcard';
  appState.currentQuizIndex = 0;
  
  incrementUsageCount();
  document.getElementById('quiz-home-view').style.display = 'none';
  const playArea = document.getElementById('quiz-play-view');
  playArea.style.display = 'block';

  renderFlashcardCurrent();
}

function renderFlashcardCurrent() {
  const quizContent = document.getElementById('quiz-dynamic-content');
  if (!quizContent) return;

  const wordObj = appState.quizWords[appState.currentQuizIndex];
  appState.flashcardFlipped = false;

  const total = appState.quizWords.length;
  const progressPercent = ((appState.currentQuizIndex + 1) / total) * 100;

  // Render Flashcard Front and Back Shell
  quizContent.innerHTML = `
    <div class="quiz-play-container">
      <div class="quiz-play-header">
        <span style="font-weight:600; color:var(--text-muted);">閃卡複習 (${appState.currentQuizIndex + 1}/${total})</span>
        <div style="width: 120px; height: 6px; background-color: var(--border-color); border-radius: var(--radius-round); overflow: hidden;">
          <div style="width: ${progressPercent}%; height: 100%; background-color: var(--color-primary); transition: width 0.3s;"></div>
        </div>
      </div>
      
      <div class="flashcard-wrapper" id="flashcard-card" onclick="flipFlashcard()">
        <div class="flashcard-inner">
          <!-- FRONT -->
          <div class="flashcard-front">
            <div class="card-big-word" onclick="playTTS('${wordObj.word.replace(/'/g, "\\'")}', '${wordObj.part_of_speech}'); event.stopPropagation();" style="cursor: pointer; display: flex; align-items: center; gap: 0.5rem; justify-content: center;">
              ${wordObj.word}
              <i data-lucide="volume-2" style="width: 28px; height: 28px; color: var(--color-primary);"></i>
            </div>
            <div class="card-hint-text">點擊卡片翻面看字解</div>
          </div>
          <!-- BACK -->
          <div class="flashcard-back">
            <div class="card-back-translation" onclick="playTTS('${wordObj.word.replace(/'/g, "\\'")}', '${wordObj.part_of_speech}'); event.stopPropagation();" style="cursor: pointer; display: flex; align-items: center; gap: 0.5rem; justify-content: center;">
              ${wordObj.translation}
              <i data-lucide="volume-2" style="width: 22px; height: 22px; color: var(--color-primary);"></i>
            </div>
            <div class="card-back-details">
              <span class="card-back-pos">${wordObj.part_of_speech}</span>
              <span class="card-back-formula">💡 口訣：${wordObj.formula || '無'}</span>
              <span style="color:var(--text-muted); font-size:0.95rem; margin-top:0.5rem;">拆解：${wordObj.breakdown || wordObj.word}</span>
            </div>
            <div class="card-hint-text">點擊卡片再次翻轉</div>
          </div>
        </div>
      </div>

      <div class="quiz-controls">
        <button class="btn btn-secondary" onclick="prevQuizItem()" ${appState.currentQuizIndex === 0 ? 'disabled' : ''}>
          <i data-lucide="arrow-left"></i> 上一個
        </button>
        <button class="btn btn-primary" onclick="playTTS('${wordObj.word.replace(/'/g, "\\'")}', '${wordObj.part_of_speech}')">
          <i data-lucide="volume-2"></i> 發音
        </button>
        <button class="btn btn-primary" onclick="nextQuizItem()">
          ${appState.currentQuizIndex === total - 1 ? '結束' : '下一個 <i data-lucide="arrow-right"></i>'}
        </button>
      </div>
    </div>
  `;
  
  lucide.createIcons();

  // Auto-play pronunciation when card is loaded
  playTTS(wordObj.word, wordObj.part_of_speech);
}

function flipFlashcard() {
  const card = document.getElementById('flashcard-card');
  if (!card) return;
  card.classList.toggle('flipped');
  appState.flashcardFlipped = !appState.flashcardFlipped;
}

// Morpheme Puzzle Game
function startPuzzleQuiz(source = 'all') {
  let pool = [];
  if (source === 'starred') {
    pool = appState.words.filter(w => w.starred && w.breakdown && w.breakdown.includes('-'));
    if (pool.length === 0) {
      alert('您目前沒有標記任何包含字首字根拆解的「不熟單字」！請先進行標記。');
      return;
    }
  } else {
    pool = appState.words.filter(w => w.breakdown && w.breakdown.includes('-'));
  }

  if (pool.length === 0) {
    alert('單字庫中沒有包含字根字首拆解的單字！請先建立有拆解 (含 - 符號) 的單字資料。');
    return;
  }

  // Take up custom random words
  const selectEl = document.getElementById('puzzle-count-select');
  let limit = 5;
  if (selectEl) {
    const val = selectEl.value;
    limit = val === 'all' ? pool.length : parseInt(val);
  }
  appState.quizWords = [...pool].sort(() => 0.5 - Math.random()).slice(0, limit);
  appState.quizMode = 'puzzle';
  appState.currentQuizIndex = 0;

  incrementUsageCount();
  document.getElementById('quiz-home-view').style.display = 'none';
  document.getElementById('quiz-play-view').style.display = 'block';

  renderPuzzleCurrent();
}

function renderPuzzleCurrent() {
  const quizContent = document.getElementById('quiz-dynamic-content');
  if (!quizContent) return;

  const wordObj = appState.quizWords[appState.currentQuizIndex];
  const originalSegments = wordObj.breakdown.split('-');
  
  // Save segment state
  appState.puzzleWord = wordObj;
  appState.puzzleSegments = [...originalSegments];
  appState.puzzlePlaced = Array(originalSegments.length).fill(null);

  // Shuffle options
  const shuffledOptions = [...originalSegments].sort(() => 0.5 - Math.random());

  const slotsHTML = originalSegments.map((_, index) => {
    return `<div class="puzzle-slot" data-index="${index}" ondragover="allowDrop(event)" ondrop="dropMorpheme(event)"></div>`;
  }).join('');

  const optionsHTML = shuffledOptions.map((morpheme, index) => {
    const type = getMorphemeType(morpheme);
    return `
      <div class="morpheme-brick ${type}" 
           id="brick-${index}" 
           draggable="true" 
           ondragstart="dragMorpheme(event)" 
           data-value="${morpheme}">
        ${morpheme}
      </div>
    `;
  }).join('');

  const total = appState.quizWords.length;
  const progressPercent = ((appState.currentQuizIndex + 1) / total) * 100;

  quizContent.innerHTML = `
    <div class="puzzle-game-container">
      <div class="quiz-play-header">
        <span style="font-weight:600; color:var(--text-muted);">字素拆解拼圖 (${appState.currentQuizIndex + 1}/${total})</span>
        <div style="width: 120px; height: 6px; background-color: var(--border-color); border-radius: var(--radius-round); overflow: hidden;">
          <div style="width: ${progressPercent}%; height: 100%; background-color: var(--color-primary); transition: width 0.3s;"></div>
        </div>
      </div>

      <div class="puzzle-question-card">
        <div style="font-size:0.875rem; color:var(--text-muted); text-transform:uppercase; font-weight:600; margin-bottom:0.5rem;">根據含意組裝單字</div>
        <div class="puzzle-meaning-prompt">「${wordObj.translation}」</div>
        <div style="font-style:italic; color:var(--text-muted); font-size:0.95rem;">詞性：${wordObj.part_of_speech} | 記憶提示：${wordObj.formula || '無'}</div>
      </div>

      <!-- Puzzle drop zones -->
      <div class="puzzle-slots-row">
        ${slotsHTML}
      </div>

      <!-- Shuffled options brick drawer -->
      <div class="puzzle-options-row" id="puzzle-options-drawer" ondragover="allowDrop(event)" ondrop="dropMorphemeToDrawer(event)">
        ${optionsHTML}
      </div>

      <div class="puzzle-feedback" id="puzzle-feedback-msg"></div>

      <div class="quiz-controls">
        <button class="btn btn-secondary" onclick="renderQuizHome()"><i data-lucide="x"></i> 結束遊戲</button>
        <button class="btn btn-outline" onclick="resetPuzzle()"><i data-lucide="rotate-ccw"></i> 重來</button>
        <button class="btn btn-primary" onclick="checkPuzzleAnswer()">驗證答案</button>
      </div>
    </div>
  `;
  
  lucide.createIcons();
}

// HTML5 Drag and Drop Handlers
function dragMorpheme(e) {
  e.dataTransfer.setData("text/plain", e.target.id);
  e.target.classList.add('dragging');
}

document.addEventListener("dragend", (e) => {
  if (e.target.classList.contains('morpheme-brick')) {
    e.target.classList.remove('dragging');
  }
});

function allowDrop(e) {
  e.preventDefault();
}

function dropMorpheme(e) {
  e.preventDefault();
  const brickId = e.dataTransfer.getData("text/plain");
  const brickEl = document.getElementById(brickId);
  if (!brickEl) return;

  const slotEl = e.currentTarget;
  const slotIndex = parseInt(slotEl.dataset.index);

  // If slot already contains a brick, return it to the drawer first
  if (slotEl.children.length > 0) {
    const existingBrick = slotEl.children[0];
    document.getElementById('puzzle-options-drawer').appendChild(existingBrick);
  }

  slotEl.appendChild(brickEl);
  appState.puzzlePlaced[slotIndex] = brickEl.dataset.value;
}

function dropMorphemeToDrawer(e) {
  e.preventDefault();
  const brickId = e.dataTransfer.getData("text/plain");
  const brickEl = document.getElementById(brickId);
  if (!brickEl) return;

  const drawer = document.getElementById('puzzle-options-drawer');
  drawer.appendChild(brickEl);

  // Clear slot mapping
  const previousSlot = brickEl.parentElement;
  if (previousSlot && previousSlot.classList.contains('puzzle-slot')) {
    const slotIdx = parseInt(previousSlot.dataset.index);
    appState.puzzlePlaced[slotIdx] = null;
  }
}

function resetPuzzle() {
  renderPuzzleCurrent();
}

function checkPuzzleAnswer() {
  const wordObj = appState.puzzleWord;
  const feedback = document.getElementById('puzzle-feedback-msg');
  
  // Combine placed blocks
  const playerSpelling = appState.puzzlePlaced.join('');
  const correctSpelling = wordObj.word.replace(/[^a-zA-Z]/g, '').toLowerCase(); // strip hyphens or spaces if any
  const puzzleSpellingJoined = appState.puzzlePlaced.filter(x => x !== null).join('');

  if (appState.puzzlePlaced.includes(null)) {
    feedback.innerText = "⚠️ 請把所有字素積木放入插槽中！";
    feedback.className = "puzzle-feedback error";
    return;
  }

  if (puzzleSpellingJoined.toLowerCase() === correctSpelling) {
    feedback.innerHTML = "🎉 太棒了！組合正確！";
    feedback.className = "puzzle-feedback success";
    
    // Play TTS
    playTTS(wordObj.word, wordObj.part_of_speech);

    // Dynamic celebration (if canvas-confetti was available, but standard text is clean)
    // Delay slightly and go to next
    setTimeout(() => {
      nextQuizItem();
    }, 1500);
  } else {
    feedback.innerText = "❌ 組合不正確，再試試看！";
    feedback.className = "puzzle-feedback error";
    
    // Shake slots row
    const slots = document.querySelector('.puzzle-slots-row');
    slots.style.animation = 'shake 0.5s';
    setTimeout(() => {
      slots.style.animation = '';
    }, 500);
  }
}

// Shake animation definition injection
const styleElem = document.createElement('style');
styleElem.innerHTML = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
    20%, 40%, 60%, 80% { transform: translateX(6px); }
  }
`;
document.head.appendChild(styleElem);

function nextQuizItem() {
  const total = appState.quizWords.length;
  if (appState.currentQuizIndex < total - 1) {
    appState.currentQuizIndex++;
    if (appState.quizMode === 'flashcard') {
      renderFlashcardCurrent();
    } else {
      renderPuzzleCurrent();
    }
  } else {
    // End Quiz
    alert('恭喜你完成了這輪複習！🎉');
    renderQuizHome();
  }
}

function prevQuizItem() {
  if (appState.currentQuizIndex > 0) {
    appState.currentQuizIndex--;
    if (appState.quizMode === 'flashcard') {
      renderFlashcardCurrent();
    } else {
      renderPuzzleCurrent();
    }
  }
}

// Event Listeners setup
function setupEventListeners() {
  // Search bar input
  const searchBar = document.getElementById('dashboard-search');
  if (searchBar) {
    searchBar.addEventListener('input', (e) => {
      appState.searchQuery = e.target.value;
      renderDashboard();
    });
  }

  // Theme toggle
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme);
  }

  // Word Editor Form submit
  const wordForm = document.getElementById('word-editor-form');
  if (wordForm) {
    wordForm.addEventListener('submit', handleFormSubmit);
  }

  // Word Add Form submit
  const addForm = document.getElementById('word-add-form');
  if (addForm) {
    addForm.addEventListener('submit', handleWordAddSubmit);
  }

  // Google Sheets sync btn
  const syncBtn = document.getElementById('sync-sheets-btn');
  if (syncBtn) {
    syncBtn.addEventListener('click', fetchGoogleSheetData);
  }

  // Drag and Drop files
  setupDragDrop();
}

// Toggle bookmark star state
function toggleStar(wordName, event) {
  if (event) event.stopPropagation(); // prevent card click details
  const starred = getStarredWords();
  const idx = starred.findIndex(w => w.toLowerCase() === wordName.toLowerCase());
  if (idx === -1) {
    starred.push(wordName);
  } else {
    starred.splice(idx, 1);
  }
  localStorage.setItem('etymology_starred_words', JSON.stringify(starred));
  
  assembleActiveVocabulary();
  
  if (appState.activeView === 'learn') {
    renderDashboard();
  } else if (appState.activeView === 'dictionary') {
    renderDictionary();
  }
}

// Filter lists by Level category
function filterByLevel(level) {
  appState.selectedLevel = level;
  const tabs = document.querySelectorAll('.filter-tab');
  tabs.forEach(tab => {
    if (tab.getAttribute('data-level') === level) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  renderDashboard();
}

// Filter lists by Thematic category
function filterByCategory(category) {
  appState.selectedCategory = category;
  renderDashboard();
}

// Download Google Sheets layout CSV Template
function downloadSheetTemplateCSV() {
  const headers = ["單字"];
  const exampleRows = [
    ["unprecedented"],
    ["populous"],
    ["precede"],
    ["inspect"],
    ["respect"],
    ["audience"],
    ["sympathy"],
    ["apathy"],
    ["intervene"],
    ["contradict"],
    ["predict"],
    ["transport"]
  ];
  
  const csvRows = [headers.join(',')];
  exampleRows.forEach(row => {
    const escapedRow = row.map(val => {
      const cell = val === undefined ? '' : String(val);
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n') || cell.includes('\r')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    });
    csvRows.push(escapedRow.join(','));
  });
  
  const csvContent = "\uFEFF" + csvRows.join('\r\n'); // UTF-8 BOM
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'google_sheets_etymology_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Download Unfamiliar Vocabulary (starred) list as CSV
function downloadUnfamiliarCSV() {
  const starredWords = appState.words.filter(w => w.starred);
  if (starredWords.length === 0) {
    alert('您目前沒有標記任何「不熟單字」喔！請點擊卡片右上角的星星進行標記。');
    return;
  }

  const headers = ["單字", "詞性", "中文翻譯", "字根字首拆解", "拆解字義", "記憶口訣", "神隊友單字", "神隊友中文", "共同字根", "共同字根意思"];
  const csvRows = [headers.join(',')];
  
  starredWords.forEach(w => {
    const row = [
      w.word,
      w.part_of_speech || '',
      w.translation || '',
      w.breakdown || '',
      w.breakdown_meanings || '',
      w.formula || '',
      w.teammate_word || '',
      w.teammate_translation || '',
      w.teammate_root || '',
      w.teammate_root_meaning || ''
    ];
    
    const escapedRow = row.map(val => {
      const cell = val === undefined ? '' : String(val);
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n') || cell.includes('\r')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    });
    csvRows.push(escapedRow.join(','));
  });

  const csvContent = "\uFEFF" + csvRows.join('\r\n'); // UTF-8 BOM
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `不熟單字表_${today}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function resetToDefaultVocabulary() {
  if (confirm('確定要將單字庫重設為預設的 200 個高中必學單字嗎？這將覆蓋您目前本機所做出的修改。')) {
    appState.userWords = [...DEFAULT_WORDS];
    localStorage.setItem('etymology_user_words', JSON.stringify(appState.userWords));
    localStorage.setItem('etymology_enabled_libraries', JSON.stringify([]));
    localStorage.setItem('etymology_deleted_words', JSON.stringify([]));
    
    assembleActiveVocabulary();
    
    alert('已成功重設為預設的 200 個高中必背單字！');
    if (appState.activeView === 'learn') {
      renderLibrarySelector();
      renderDashboard();
    } else if (appState.activeView === 'dictionary') {
      renderDictionary();
    }
  }
}

// --------------------------------------------------------------------
// NEW 1000 WORDS LIBRARY EXTENSION HELPERS
// --------------------------------------------------------------------

// --------------------------------------------------------------------
// NEW 1000 WORDS LIBRARY EXTENSION HELPERS & STAGE QUESTS SYSTEM
// --------------------------------------------------------------------

function getEnabledLibraries() {
  const libs = localStorage.getItem('etymology_enabled_libraries');
  if (libs === null) {
    // Core (0) is enabled by default
    const defaults = [0];
    localStorage.setItem('etymology_enabled_libraries', JSON.stringify(defaults));
    return defaults;
  }
  try {
    return JSON.parse(libs);
  } catch (e) {
    return [0];
  }
}

function getStarredWords() {
  const starred = localStorage.getItem('etymology_starred_words');
  return starred ? JSON.parse(starred) : [];
}

function getDeletedWords() {
  const deleted = localStorage.getItem('etymology_deleted_words');
  return deleted ? JSON.parse(deleted) : [];
}

function getMasteredWords() {
  const mastered = localStorage.getItem('etymology_mastered_words');
  return mastered ? JSON.parse(mastered) : [];
}

function getStageStatuses() {
  const stored = localStorage.getItem('etymology_stage_statuses');
  if (!stored) {
    // Stage 0 (Core) is unlocked by default; others are locked.
    const initial = [true, false, false, false, false, false, false, false, false];
    localStorage.setItem('etymology_stage_statuses', JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return [true, false, false, false, false, false, false, false, false];
  }
}

function incrementUsageCount() {
  let count = parseInt(localStorage.getItem('etymology_usage_count') || '0');
  count++;
  localStorage.setItem('etymology_usage_count', count.toString());
  renderStats();
}

function toggleMastered(wordName, event) {
  if (event) event.stopPropagation(); // prevent card click details
  const mastered = getMasteredWords();
  const idx = mastered.findIndex(w => w.toLowerCase() === wordName.toLowerCase());
  if (idx === -1) {
    mastered.push(wordName);
  } else {
    mastered.splice(idx, 1);
  }
  localStorage.setItem('etymology_mastered_words', JSON.stringify(mastered));
  
  incrementUsageCount(); // Count as interaction!
  renderDashboard();
  renderStats();
}

function isDefaultWord(word, pos) {
  return DEFAULT_WORDS.some(w => w.word.toLowerCase() === word.toLowerCase() && w.part_of_speech.toLowerCase() === pos.toLowerCase());
}

function findTeammateTranslationInLibrary(teammateWord) {
  const lowerTeammate = teammateWord.toLowerCase().trim();
  for (let idx = 0; idx < EXTRA_GROUPS.length; idx++) {
    const groupStr = EXTRA_GROUPS[idx];
    if (groupStr.toLowerCase().includes(lowerTeammate)) {
      const items = groupStr.split(',');
      for (const item of items) {
        const [w, pos, trans] = item.split('|');
        if (w.toLowerCase().trim() === lowerTeammate) {
          return trans;
        }
      }
    }
  }
  return "";
}

function getLibraryWords(idx) {
  const groupStr = EXTRA_GROUPS[idx];
  if (!groupStr) return [];
  const items = groupStr.split(',');
  return items.map(item => {
    const parts = item.split('|');
    const word = parts[0];
    const pos = parts[1];
    const trans = parts[2];
    
    const breakdownInfo = generateEtymologyBreakdown(word, trans);
    return {
      word: word,
      part_of_speech: pos,
      translation: trans,
      level: determineWordLevel(word),
      category: breakdownInfo.category,
      breakdown: breakdownInfo.breakdown,
      breakdown_meanings: breakdownInfo.breakdown_meanings,
      formula: breakdownInfo.formula,
      teammate_word: breakdownInfo.teammate_word,
      teammate_translation: breakdownInfo.teammate_translation,
      teammate_root: breakdownInfo.teammate_root,
      teammate_root_meaning: breakdownInfo.teammate_root_meaning,
      starred: false,
      is_library: true,
      library_group: idx
    };
  });
}

function assembleActiveVocabulary() {
  const enabledLibs = getEnabledLibraries();
  const deletedWordsSet = new Set(getDeletedWords().map(w => w.toLowerCase()));
  const starredSet = new Set(getStarredWords().map(w => w.toLowerCase()));

  // Separate manually added words and default words
  const manualWords = appState.userWords.filter(w => !isDefaultWord(w.word, w.part_of_speech));
  const coreWords = appState.userWords.filter(w => isDefaultWord(w.word, w.part_of_speech));

  let activeWords = [];
  
  // 1. Manual words always stay at the very top!
  activeWords = activeWords.concat(manualWords);
  
  // 2. Core Library words go next if enabled (library index 0)
  if (enabledLibs.includes(0)) {
    activeWords = activeWords.concat(coreWords);
  }
  
  // 3. Enabled expansion library words
  let libraryWords = [];
  enabledLibs.forEach(libIdx => {
    if (libIdx > 0) {
      const wordsInLib = getLibraryWords(libIdx - 1);
      libraryWords = libraryWords.concat(wordsInLib);
    }
  });

  const baseKeys = new Set(activeWords.map(w => `${w.word.toLowerCase()}|${w.part_of_speech.toLowerCase()}`));
  
  libraryWords.forEach(libW => {
    const key = `${libW.word.toLowerCase()}|${libW.part_of_speech.toLowerCase()}`;
    const wordLower = libW.word.toLowerCase();
    
    if (!deletedWordsSet.has(wordLower) && !baseKeys.has(key)) {
      activeWords.push(libW);
    }
  });

  // Re-apply starred state and dynamically set correct level by length
  activeWords.forEach(w => {
    w.level = determineWordLevel(w.word);
    if (starredSet.has(w.word.toLowerCase())) {
      w.starred = true;
    } else {
      w.starred = false;
    }
  });

  appState.words = activeWords;
  localStorage.setItem('etymology_words', JSON.stringify(appState.words));
  renderStats();
}

function renderLibrarySelector() {
  const container = document.getElementById('library-selector-container');
  if (!container) return;

  const enabledLibs = getEnabledLibraries();
  const stageStatuses = getStageStatuses();
  
  let unlockedCount = 200;
  for (let i = 1; i <= 8; i++) {
    if (stageStatuses[i]) {
      unlockedCount += 100;
    }
  }
  const progressPercent = (unlockedCount / 1000) * 100;

  const groupRanges = [
    "1-200", "201-300", "301-400", "401-500", "501-600",
    "601-700", "701-800", "801-900", "901-1000"
  ];

  let gridHTML = "";
  
  for (let i = 0; i <= 8; i++) {
    const isUnlocked = stageStatuses[i];
    const isActive = enabledLibs.includes(i);
    const range = groupRanges[i];
    const isCore = (i === 0);
    const label = isCore ? "核心單字庫" : `單字庫 ${String.fromCharCode(65 + i - 1)}`;
    const statusText = isCore ? "預設啟用 🌟" : (isActive ? "學習中 🌟" : "未選取");
    
    if (isUnlocked) {
      gridHTML += `
        <div class="library-card ${isActive ? 'active' : ''}" onclick="toggleLibrary(${i})">
          <div class="library-card-checkbox">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div class="library-card-icon">
            <i data-lucide="${isActive ? 'book-open-check' : 'book'}"></i>
          </div>
          <div class="library-card-name">${label}</div>
          <div class="library-card-range">${range} 字</div>
          <div class="library-card-status">${statusText}</div>
        </div>
      `;
    } else {
      gridHTML += `
        <div class="library-card locked">
          <div class="library-card-lock-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <div class="library-card-icon" style="opacity: 0.4;">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <div class="library-card-name" style="opacity: 0.6;">${label}</div>
          <div class="library-card-range" style="opacity: 0.5;">${range} 字</div>
          <button class="btn btn-unlock-quest" onclick="startQuestChallenge(${i}, event)">
            ⚔️ 挑戰解鎖
          </button>
        </div>
      `;
    }
  }

  container.innerHTML = `
    <div class="library-selector-panel">
      <div class="library-panel-header">
        <div class="library-panel-title">
          <i data-lucide="library"></i>
          <span>高中必學單字庫 (1000 字)</span>
        </div>
        <div class="library-progress-bar-container">
          <span>解鎖進度: ${unlockedCount}/1000 字</span>
          <div class="library-progress-track">
            <div class="library-progress-fill" style="width: ${progressPercent}%;"></div>
          </div>
        </div>
      </div>
      <div class="library-grid">
        ${gridHTML}
      </div>
    </div>
  `;

  lucide.createIcons();
}

function toggleLibrary(idx) {
  const enabledLibs = getEnabledLibraries();
  const index = enabledLibs.indexOf(idx);
  if (index === -1) {
    enabledLibs.push(idx);
  } else {
    enabledLibs.splice(index, 1);
  }
  localStorage.setItem('etymology_enabled_libraries', JSON.stringify(enabledLibs));
  
  incrementUsageCount();
  assembleActiveVocabulary();
  renderLibrarySelector();
  renderDashboard();
}

function determineWordLevel(word) {
  const clean = word.toLowerCase().trim();
  if (clean.length <= 5) {
    return "Level 1-2 (基礎)";
  } else if (clean.length <= 8) {
    return "Level 3-4 (學測)";
  } else {
    return "Level 5-6 (分科)";
  }
}

function findWordInLibrary(word) {
  const lowerWord = word.toLowerCase().trim();
  for (let idx = 0; idx < EXTRA_GROUPS.length; idx++) {
    const groupStr = EXTRA_GROUPS[idx];
    if (groupStr.toLowerCase().includes(lowerWord)) {
      const items = groupStr.split(',');
      for (const item of items) {
        const [w, pos, trans] = item.split('|');
        if (w.toLowerCase().trim() === lowerWord) {
          const breakdownInfo = generateEtymologyBreakdown(w, trans);
          return {
            word: w,
            part_of_speech: pos,
            translation: trans,
            level: determineWordLevel(w),
            category: breakdownInfo.category,
            breakdown: breakdownInfo.breakdown,
            breakdown_meanings: breakdownInfo.breakdown_meanings,
            formula: breakdownInfo.formula,
            teammate_word: breakdownInfo.teammate_word,
            teammate_translation: breakdownInfo.teammate_translation,
            teammate_root: breakdownInfo.teammate_root,
            teammate_root_meaning: breakdownInfo.teammate_root_meaning,
            starred: false,
            is_library: true,
            library_group: idx
          };
        }
      }
    }
  }
  return null;
}

function getStageWords(stageIdx) {
  if (stageIdx === 0) {
    return [...DEFAULT_WORDS];
  } else if (stageIdx >= 1 && stageIdx <= 8) {
    return getLibraryWords(stageIdx - 1);
  }
  return [];
}

function startQuestChallenge(stageIdx, event) {
  if (event) event.stopPropagation();

  const pool = getStageWords(stageIdx - 1);
  if (pool.length === 0) {
    alert('無法載入前一關卡的單字池！');
    return;
  }

  // Pick 10 random words
  const selected = [...pool].sort(() => 0.5 - Math.random()).slice(0, 10);
  
  appState.questStageIdx = stageIdx;
  appState.questWords = selected;
  appState.questAnswers = [];
  appState.currentQuestIndex = 0;

  // Generate options for each word
  appState.questWords.forEach(wordObj => {
    const correctTrans = wordObj.translation;
    const otherTrans = pool
      .map(w => w.translation)
      .filter(t => t !== correctTrans);
    
    const uniqueDistractors = [...new Set(otherTrans)];
    const shuffledDistractors = uniqueDistractors.sort(() => 0.5 - Math.random()).slice(0, 3);
    
    while (shuffledDistractors.length < 3) {
      shuffledDistractors.push("其他含意");
    }
    
    const options = [correctTrans, ...shuffledDistractors].sort(() => 0.5 - Math.random());
    const correctIdx = options.indexOf(correctTrans);
    
    appState.questAnswers.push({
      word: wordObj.word,
      part_of_speech: wordObj.part_of_speech,
      options: options,
      correctIndex: correctIdx,
      selectedIndex: null
    });
  });

  const modal = document.getElementById('quest-challenge-modal');
  if (modal) {
    modal.classList.add('active');
    renderQuestQuestion();
  }
}

function renderQuestQuestion() {
  const body = document.getElementById('quest-modal-body');
  if (!body) return;

  const currentIdx = appState.currentQuestIndex;
  const q = appState.questAnswers[currentIdx];
  const stageIdx = appState.questStageIdx;
  
  const stageName = stageIdx === 0 ? "核心單字庫" : `單字庫 ${String.fromCharCode(65 + stageIdx - 1)}`;
  const prevStageName = (stageIdx - 1) === 0 ? "核心單字庫 (1-200 字)" : `單字庫 ${String.fromCharCode(65 + stageIdx - 2)}`;

  const optionsHTML = q.options.map((opt, idx) => {
    return `<button class="btn btn-quest-option" onclick="selectQuestOption(${idx})">${opt}</button>`;
  }).join('');

  body.innerHTML = `
    <div class="quest-challenge-container">
      <div class="quest-header">
        <div class="quest-title">⚔️ 晉級挑戰 (${stageName})</div>
        <div class="quest-progress">問題 ${currentIdx + 1} / 10</div>
      </div>
      <div class="quest-question-desc">
        請選出前一關卡「${prevStageName}」中此單字的正確中文意思：
      </div>
      <div class="quest-word-box">
        <div class="quest-word">${q.word}</div>
        <div class="quest-pos">${q.part_of_speech}</div>
      </div>
      <div class="quest-options-grid">
        ${optionsHTML}
      </div>
    </div>
  `;
}

function selectQuestOption(idx) {
  const currentIdx = appState.currentQuestIndex;
  appState.questAnswers[currentIdx].selectedIndex = idx;

  if (appState.currentQuestIndex < 9) {
    appState.currentQuestIndex++;
    renderQuestQuestion();
  } else {
    renderQuestResults();
  }
}

function renderQuestResults() {
  const body = document.getElementById('quest-modal-body');
  if (!body) return;

  const stageIdx = appState.questStageIdx;
  const stageName = stageIdx === 0 ? "核心單字庫" : `單字庫 ${String.fromCharCode(65 + stageIdx - 1)}`;
  const prevStageName = (stageIdx - 1) === 0 ? "核心單字庫 (1-200 字)" : `單字庫 ${String.fromCharCode(65 + stageIdx - 2)}`;

  let correctCount = 0;
  appState.questAnswers.forEach(ans => {
    if (ans.selectedIndex === ans.correctIndex) {
      correctCount++;
    }
  });

  const passed = correctCount >= 8;

  if (passed) {
    body.innerHTML = `
      <div class="quest-result-container success">
        <div class="quest-result-icon">🏆</div>
        <h2 class="quest-result-title">恭喜通過挑戰！</h2>
        <p class="quest-result-desc">您在「${prevStageName}」的晉級挑戰中答對了 ${correctCount} / 10 題！</p>
        <div class="quest-result-unlock-msg">已成功解鎖「${stageName}」🎉</div>
        <button class="btn btn-primary" onclick="confirmQuestUnlock()" style="width: 100%; margin-top: 1.5rem;">開啟新關卡</button>
      </div>
    `;
  } else {
    body.innerHTML = `
      <div class="quest-result-container failure">
        <div class="quest-result-icon">😢</div>
        <h2 class="quest-result-title">挑戰未通過</h2>
        <p class="quest-result-desc">您的得分為 ${correctCount} / 10 題。晉級解鎖需要答對 8 題以上。</p>
        <div style="display: flex; gap: 1rem; margin-top: 1.5rem; width: 100%;">
          <button class="btn btn-secondary" onclick="closeQuestChallenge()" style="flex: 1;">關閉</button>
          <button class="btn btn-primary" onclick="retryQuestChallenge()" style="flex: 1;">再試一次</button>
        </div>
      </div>
    `;
  }
}

function confirmQuestUnlock() {
  const stageIdx = appState.questStageIdx;
  const stageStatuses = getStageStatuses();
  stageStatuses[stageIdx] = true;
  localStorage.setItem('etymology_stage_statuses', JSON.stringify(stageStatuses));

  const enabledLibs = getEnabledLibraries();
  if (!enabledLibs.includes(stageIdx)) {
    enabledLibs.push(stageIdx);
    localStorage.setItem('etymology_enabled_libraries', JSON.stringify(enabledLibs));
  }

  incrementUsageCount();
  closeQuestChallenge();
  assembleActiveVocabulary();
  renderLibrarySelector();
  renderDashboard();
}

function retryQuestChallenge() {
  const stageIdx = appState.questStageIdx;
  startQuestChallenge(stageIdx);
}

function closeQuestChallenge() {
  const modal = document.getElementById('quest-challenge-modal');
  if (modal) {
    modal.classList.remove('active');
  }
  appState.questStageIdx = null;
  appState.questWords = [];
  appState.questAnswers = [];
  appState.currentQuestIndex = 0;
}

// Modal controls for References
function openReferencesModal(event) {
  if (event) event.preventDefault();
  const modal = document.getElementById('references-modal');
  if (modal) {
    modal.classList.add('active');
  }
}

function closeReferencesModal() {
  const modal = document.getElementById('references-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}
