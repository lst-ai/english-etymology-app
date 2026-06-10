// Rendering Engine for English Etymology Learning App

// Helper to draw SVG connectors for word breakdowns
function drawBreakdownConnections(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const svg = container.querySelector('.diagram-svg-overlay');
  if (!svg) return;

  // Clear previous paths
  svg.innerHTML = '';

  // Add marker definitions for arrowheads
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  
  // Arrowhead template helper
  const createMarker = (id, color) => {
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', id);
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '5');
    marker.setAttribute('refY', '5');
    marker.setAttribute('markerWidth', '6');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('orient', 'auto-start-reverse');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M 0 1 L 10 5 L 0 9 z');
    path.setAttribute('fill', color);
    marker.appendChild(path);
    return marker;
  };

  defs.appendChild(createMarker('arrow-prefix', 'var(--color-prefix)'));
  defs.appendChild(createMarker('arrow-root', 'var(--color-root)'));
  defs.appendChild(createMarker('arrow-suffix', 'var(--color-suffix)'));
  defs.appendChild(createMarker('arrow-default', 'var(--text-muted)'));
  svg.appendChild(defs);

  const wrapperRect = container.getBoundingClientRect();
  const segments = container.querySelectorAll('.word-segment');
  const bubbles = container.querySelectorAll('.definition-bubble');

  if (segments.length !== bubbles.length) return;

  segments.forEach((segEl, index) => {
    const bubbleEl = container.querySelector(`.definition-bubble[data-index="${index}"]`);
    if (!bubbleEl) return;

    const segRect = segEl.getBoundingClientRect();
    const bubbleRect = bubbleEl.getBoundingClientRect();

    const isTopBubble = (index % 2 === 0);

    // Coordinate calculation relative to SVG container
    const segX = segRect.left - wrapperRect.left + segRect.width / 2;
    const segY = isTopBubble 
      ? (segRect.top - wrapperRect.top) 
      : (segRect.bottom - wrapperRect.top);

    const bubbleX = bubbleRect.left - wrapperRect.left + bubbleRect.width / 2;
    const bubbleY = isTopBubble 
      ? (bubbleRect.bottom - wrapperRect.top) 
      : (bubbleRect.top - wrapperRect.top);

    // Create Bezier Path
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    
    // Determine morpheme type for colors
    const type = segEl.dataset.type;
    path.setAttribute('class', `connection-path ${type}-path`);
    path.setAttribute('data-index', index);
    
    // Control points for smooth S-curves
    let controlY1, controlY2;
    if (isTopBubble) {
      controlY1 = segY - 40;
      controlY2 = bubbleY + 40;
      path.setAttribute('marker-end', `url(#arrow-${type})`); // Arrow pointing up to bubble
    } else {
      controlY1 = segY + 40;
      controlY2 = bubbleY - 40;
      path.setAttribute('marker-end', `url(#arrow-${type})`); // Arrow pointing down to bubble
    }

    const d = `M ${segX} ${segY} C ${segX} ${controlY1}, ${bubbleX} ${controlY2}, ${bubbleX} ${bubbleY}`;
    path.setAttribute('d', d);
    svg.appendChild(path);

    // Setup interactive sync hover
    const activate = () => {
      segEl.classList.add('active');
      bubbleEl.classList.add('active');
      path.classList.add('active');
    };

    const deactivate = () => {
      segEl.classList.remove('active');
      bubbleEl.classList.remove('active');
      path.classList.remove('active');
    };

    segEl.onmouseenter = activate;
    segEl.onmouseleave = deactivate;
    bubbleEl.onmouseenter = activate;
    bubbleEl.onmouseleave = deactivate;
  });
}

// Draw Teammate connection line (Restored Horizontal Layout)
function drawTeammateConnections(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const svg = container.querySelector('.teammate-svg-connector');
  if (!svg) return;

  svg.innerHTML = '';
  const wrapperRect = container.getBoundingClientRect();
  
  const cardKnown = container.querySelector('.teammate-card.known-friend');
  const cardNew = container.querySelector('.teammate-card.new-friend');
  const bridge = container.querySelector('.root-bridge-card');

  if (!cardKnown || !cardNew || !bridge) return;

  // Add marker definitions for arrowheads
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
  marker.setAttribute('id', 'teammate-arrow');
  marker.setAttribute('viewBox', '0 0 10 10');
  marker.setAttribute('refX', '5');
  marker.setAttribute('refY', '5');
  marker.setAttribute('markerWidth', '6');
  marker.setAttribute('markerHeight', '6');
  marker.setAttribute('orient', 'auto-start-reverse');
  const pathMarker = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pathMarker.setAttribute('d', 'M 0 1 L 10 5 L 0 9 z');
  pathMarker.setAttribute('fill', 'var(--color-root)');
  marker.appendChild(pathMarker);
  defs.appendChild(marker);
  svg.appendChild(defs);

  const rectKnown = cardKnown.getBoundingClientRect();
  const rectNew = cardNew.getBoundingClientRect();
  const rectBridge = bridge.getBoundingClientRect();

  // Check if stacked (mobile) or inline (desktop)
  const isMobile = rectKnown.top !== rectNew.top;

  if (isMobile) {
    // Top-to-bottom layout: Known -> Bridge -> New
    const kX = rectKnown.left - wrapperRect.left + rectKnown.width / 2;
    const kY = rectKnown.bottom - wrapperRect.top;
    
    const bX = rectBridge.left - wrapperRect.left + rectBridge.width / 2;
    const bYTop = rectBridge.top - wrapperRect.top;
    const bYBottom = rectBridge.bottom - wrapperRect.top;
    
    const nX = rectNew.left - wrapperRect.left + rectNew.width / 2;
    const nY = rectNew.top - wrapperRect.top;

    // Draw path 1: Known to Bridge
    const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path1.setAttribute('d', `M ${kX} ${kY} Q ${kX} ${(kY + bYTop)/2 + 10} ${bX} ${bYTop - 5}`);
    path1.setAttribute('marker-end', 'url(#teammate-arrow)');
    svg.appendChild(path1);

    // Draw path 2: Bridge to New
    const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path2.setAttribute('d', `M ${bX} ${bYBottom} Q ${nX} ${(bYBottom + nY)/2 - 10} ${nX} ${nY - 8}`);
    path2.setAttribute('marker-end', 'url(#teammate-arrow)');
    svg.appendChild(path2);
  } else {
    // Left-to-right layout: Known -> Bridge -> New
    const kX = rectKnown.right - wrapperRect.left;
    const kY = rectKnown.top - wrapperRect.top + rectKnown.height / 2;
    
    const bXLeft = rectBridge.left - wrapperRect.left;
    const bXRight = rectBridge.right - wrapperRect.left;
    const bY = rectBridge.top - wrapperRect.top + rectBridge.height / 2;
    
    const nX = rectNew.left - wrapperRect.left;
    const nY = rectNew.top - wrapperRect.top + rectNew.height / 2;

    // Draw path 1: Known to Bridge
    const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path1.setAttribute('d', `M ${kX} ${kY} C ${(kX + bXLeft)/2} ${kY}, ${(kX + bXLeft)/2} ${bY}, ${bXLeft - 5} ${bY}`);
    path1.setAttribute('marker-end', 'url(#teammate-arrow)');
    svg.appendChild(path1);

    // Draw path 2: Bridge to New
    const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path2.setAttribute('d', `M ${bXRight} ${bY} C ${(bXRight + nX)/2} ${bY}, ${(bXRight + nX)/2} ${nY}, ${nX - 8} ${nY}`);
    path2.setAttribute('marker-end', 'url(#teammate-arrow)');
    svg.appendChild(path2);
  }
}

// Render word etymology details
function renderWordDetails(wordObj) {
  const container = document.getElementById('word-details-root');
  if (!container) return;

  // Pre-calculate teammate part of speech
  let teammatePos = '';
  if (wordObj.teammate_word && typeof appState !== 'undefined' && appState.words) {
    const foundTeammate = appState.words.find(w => w.word.toLowerCase() === wordObj.teammate_word.toLowerCase());
    if (foundTeammate) {
      teammatePos = foundTeammate.part_of_speech;
    }
  }

  // Split morpheme breakdown
  const segments = wordObj.breakdown.split('-');
  
  // Parse breakdown meanings (e.g. un:無|pre:前|ced:走...)
  const meaningsMap = {};
  if (wordObj.breakdown_meanings) {
    wordObj.breakdown_meanings.split('|').forEach(m => {
      const [key, val] = m.split(':');
      if (key && val) meaningsMap[key.trim().toLowerCase()] = val.trim();
    });
  }

  // Set up Tabs
  let tabMenuHTML = `
    <button class="modal-tab-btn active" onclick="switchModalTab('breakdown')">字根拆解</button>
  `;
  if (wordObj.teammate_word) {
    tabMenuHTML += `
      <button class="modal-tab-btn" onclick="switchModalTab('teammate')">神隊友聯想</button>
    `;
  }
  
  // Tab 1: Breakdown diagram components
  // Alternating bubble positioning: top and bottom
  const topBubbles = [];
  const bottomBubbles = [];
  
  segments.forEach((seg, index) => {
    const cleanSeg = seg.toLowerCase().trim();
    const type = getMorphemeType(cleanSeg); // From data.js
    const meaning = meaningsMap[cleanSeg] || "詞素";
    
    const bubbleHTML = `
      <div class="definition-bubble ${type}" data-index="${index}">
        <span class="bubble-label">${seg}</span>
        <span class="bubble-equals">=</span>
        <span class="bubble-meaning">${meaning}</span>
      </div>
    `;

    if (index % 2 === 0) {
      topBubbles.push(bubbleHTML);
    } else {
      bottomBubbles.push(bubbleHTML);
    }
  });

  const wordSegmentsHTML = segments.map((seg, index) => {
    const cleanSeg = seg.toLowerCase().trim();
    const type = getMorphemeType(cleanSeg);
    return `<span class="word-segment ${type}" data-index="${index}" data-type="${type}">${seg}</span>`;
  }).join('');

  // Assemble HTML
  container.innerHTML = `
    <div class="modal-header-section">
      <div class="modal-header-left" style="display: flex; flex-direction: column; gap: 0.25rem; align-items: flex-start;">
        <div style="display:flex; align-items:baseline; gap: 0.75rem; flex-wrap: wrap;">
          <h2 class="word-detail-name" style="margin: 0; line-height: 1.1;">${wordObj.word}</h2>
          <span class="word-detail-pos">${wordObj.part_of_speech}</span>
        </div>
        <div class="word-detail-translation" style="margin-top: 0.25rem; text-align: left;">${wordObj.translation}</div>
        <div class="word-detail-meta" style="margin-top: 0.25rem;">
          <button class="word-audio-btn" onclick="playTTS('${wordObj.word.replace(/'/g, "\\'")}', '${wordObj.part_of_speech}')">
            <i data-lucide="volume-2"></i> 發音
          </button>
        </div>
      </div>
      <div class="modal-tabs">
        ${tabMenuHTML}
      </div>
    </div>

    <!-- TAB 1: BREAKDOWN -->
    <div id="modal-tab-breakdown" class="tab-pane active">
      <div class="breakdown-diagram-wrapper" id="breakdown-diagram-area">
        <svg class="diagram-svg-overlay"></svg>
        
        <!-- Top row of bubbles -->
        <div class="definition-bubbles-container bubbles-top">
          ${topBubbles.join('')}
        </div>
        
        <!-- Central split word row -->
        <div class="interactive-word-row">
          ${wordSegmentsHTML}
        </div>
        
        <!-- Bottom row of bubbles -->
        <div class="definition-bubbles-container bubbles-bottom">
          ${bottomBubbles.join('')}
        </div>
      </div>
      
      <!-- Formula Banner -->
      <div class="formula-banner">
        <span class="formula-banner-label">記憶口訣</span>
        <span>${wordObj.formula || "無口訣"}</span>
      </div>
    </div>

    <!-- TAB 2: TEAMMATE -->
    ${wordObj.teammate_word ? `
    <div id="modal-tab-teammate" class="tab-pane">
      <div class="teammate-flow-wrapper" id="teammate-flow-area">
        <svg class="teammate-svg-connector"></svg>
        
        <div class="teammate-flow-container">
          <!-- Known word card -->
          <div class="teammate-card known-friend">
            <span class="teammate-card-badge">神隊友 (已知單字)</span>
            <div class="teammate-card-word">
              ${highlightRoot(wordObj.teammate_word, wordObj.teammate_root)}
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem; justify-content: center; width: 100%;">
              <span class="teammate-card-meaning">${wordObj.teammate_translation || ""}</span>
              <button class="teammate-audio-btn" onclick="playTTS('${wordObj.teammate_word.replace(/'/g, "\\'")}', '${teammatePos}')" title="發音" style="background: none; border: none; color: var(--color-primary); cursor: pointer; padding: 2px; display: inline-flex; align-items: center; justify-content: center; transition: transform 0.2s;">
                <i data-lucide="volume-2" style="width: 16px; height: 16px;"></i>
              </button>
            </div>
          </div>
          
          <!-- Shared root bridge -->
          <div class="teammate-connector-center">
            <div class="root-bridge-card">
              <span class="root-bridge-badge">共同詞素</span>
              <span style="font-size:1.25rem;">${wordObj.teammate_root}</span>
              <span class="root-bridge-meaning">${wordObj.teammate_root_meaning || "字根"}</span>
            </div>
          </div>
          
          <!-- Target word card -->
          <div class="teammate-card new-friend">
            <span class="teammate-card-badge">新朋友 (學習單字)</span>
            <div class="teammate-card-word">
              ${highlightRoot(wordObj.word, wordObj.teammate_root)}
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem; justify-content: center; width: 100%;">
              <span class="teammate-card-meaning">${wordObj.translation}</span>
              <button class="teammate-audio-btn" onclick="playTTS('${wordObj.word.replace(/'/g, "\\'")}', '${wordObj.part_of_speech}')" title="發音" style="background: none; border: none; color: var(--color-primary); cursor: pointer; padding: 2px; display: inline-flex; align-items: center; justify-content: center; transition: transform 0.2s;">
                <i data-lucide="volume-2" style="width: 16px; height: 16px;"></i>
              </button>
            </div>
          </div>
        </div>
        
        <div class="teammate-intro-desc">
          將熟知的簡單單字 <strong>${wordObj.teammate_word}</strong> 與生疏的詞素 <strong>${wordObj.teammate_root}</strong> 串聯，
          藉此推演並輕鬆學會進階單字 <strong>${wordObj.word}</strong>！
        </div>
      </div>
    </div>
    ` : ''}
  `;

  // Render icons inside the modal
  lucide.createIcons();

  // Force draw SVG paths after browser renders DOM nodes (wait a tick)
  setTimeout(() => {
    drawBreakdownConnections('breakdown-diagram-area');
    if (wordObj.teammate_word) {
      drawTeammateConnections('teammate-flow-area');
    }
  }, 100);
}

// Highlight the shared root in a word
function highlightRoot(word, root) {
  if (!root) return word;
  const index = word.toLowerCase().indexOf(root.toLowerCase());
  if (index === -1) return word;
  
  const prefix = word.substring(0, index);
  const matched = word.substring(index, index + root.length);
  const suffix = word.substring(index + root.length);
  
  return `${prefix}<span class="highlight">${matched}</span>${suffix}`;
}

// Switch tabs inside detail modal
function switchModalTab(tabName) {
  const btns = document.querySelectorAll('.modal-tab-btn');
  const panes = document.querySelectorAll('.tab-pane');
  
  btns.forEach(btn => {
    if (btn.getAttribute('onclick').includes(tabName)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  panes.forEach(pane => {
    if (pane.id === `modal-tab-${tabName}`) {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  });

  // Re-calculate paths when tab switches
  if (tabName === 'breakdown') {
    drawBreakdownConnections('breakdown-diagram-area');
  } else if (tabName === 'teammate') {
    drawTeammateConnections('teammate-flow-area');
  }
}

// Text to Speech with Context-Aware Stress Pronunciation for Heteronyms
function playTTS(text, pos) {
  if ('speechSynthesis' in window) {
    // Cancel any current speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.85; // slightly slower for students
    window.speechSynthesis.speak(utterance);
  } else {
    alert('您的瀏覽器不支援語音語音播放。');
  }
}

// Global window event listener to redraw SVGs on resize
window.addEventListener('resize', () => {
  const breakdownArea = document.getElementById('breakdown-diagram-area');
  if (breakdownArea && breakdownArea.offsetParent !== null) {
    drawBreakdownConnections('breakdown-diagram-area');
  }
  const teammateArea = document.getElementById('teammate-flow-area');
  if (teammateArea && teammateArea.offsetParent !== null) {
    drawTeammateConnections('teammate-flow-area');
  }
});
