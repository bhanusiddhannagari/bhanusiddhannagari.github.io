/**
 * Speech Rooms - Main Application
 * 
 * Real-time speech-to-text messaging with word-by-word streaming.
 * Features:
 * - Separate room creation and joining
 * - All members can speak (not just creator)
 * - Word-by-word message streaming
 * - Auto-grouping with 5-second pause detection
 * - Real-time Firebase sync
 */

(function() {
  'use strict';

  // ========================================
  // UTILITY FUNCTIONS (Must be defined first)
  // ========================================
  
  /**
   * Generate a unique session ID with multiple entropy sources
   */
  function generateSessionId() {
    const random1 = Math.random().toString(36).substring(2, 10);
    const random2 = Math.random().toString(36).substring(2, 6);
    const timestamp = Date.now().toString(36);
    const entropy = performance.now().toString(36).replace('.', '');
    return `user_${random1}_${timestamp}_${random2}${entropy}`;
  }

  /**
   * Generate anonymous user name (Adjective + Animal + Number)
   */
  function generateAnonymousName() {
    const adjectives = [
      'Swift', 'Brave', 'Clever', 'Mighty', 'Noble', 'Fierce', 'Wise', 'Bold',
      'Quick', 'Calm', 'Proud', 'Gentle', 'Strong', 'Silent', 'Bright', 'Dark',
      'Wild', 'Free', 'Lucky', 'Happy', 'Jolly', 'Lively', 'Merry', 'Eager',
      'Daring', 'Loyal', 'Royal', 'Silver', 'Golden', 'Crystal'
    ];
    const animals = [
      'Tiger', 'Eagle', 'Dragon', 'Phoenix', 'Wolf', 'Lion', 'Bear', 'Hawk',
      'Falcon', 'Panther', 'Jaguar', 'Leopard', 'Cheetah', 'Fox', 'Raven',
      'Owl', 'Shark', 'Dolphin', 'Orca', 'Stallion', 'Buffalo', 'Rhino',
      'Elephant', 'Cobra', 'Viper', 'Scorpion', 'Spider', 'Lynx', 'Cougar', 'Puma'
    ];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const animal = animals[Math.floor(Math.random() * animals.length)];
    const num = Math.floor(Math.random() * 100);
    return `${adj}${animal}${num}`;
  }

  /**
   * Get or generate consistent name for a session ID
   */
  function getUserName(sessionId) {
    if (State.userNameCache.has(sessionId)) {
      return State.userNameCache.get(sessionId);
    }
    const name = generateAnonymousName();
    State.userNameCache.set(sessionId, name);
    return name;
  }

  /**
   * Save room state to localStorage
   */
  function saveRoomState(roomId, isCreator) {
    try {
      localStorage.setItem('speechRooms_currentRoom', JSON.stringify({
        roomId,
        isCreator,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn('[Storage] Failed to save room state:', e);
    }
  }

  /**
   * Restore room state from localStorage
   */
  function restoreRoomState() {
    try {
      const stored = localStorage.getItem('speechRooms_currentRoom');
      if (!stored) return null;
      
      const state = JSON.parse(stored);
      const age = Date.now() - state.timestamp;
      const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
      
      if (age > MAX_AGE) {
        localStorage.removeItem('speechRooms_currentRoom');
        return null;
      }
      
      return state;
    } catch (e) {
      console.warn('[Storage] Failed to restore room state:', e);
      return null;
    }
  }

  /**
   * Clear room state from localStorage
   */
  function clearRoomState() {
    try {
      localStorage.removeItem('speechRooms_currentRoom');
    } catch (e) {
      console.warn('[Storage] Failed to clear room state:', e);
    }
  }

  // ========================================
  // DOM ELEMENT REFERENCES
  // ========================================
  const DOM = {
    // Room Management
    createRoomBtn: document.getElementById('create-room-btn'),
    joinRoomInput: document.getElementById('join-room-input'),
    joinRoomBtn: document.getElementById('join-room-btn'),
    createdRoomHint: document.getElementById('created-room-hint'),
    roomIdDisplay: document.getElementById('room-id-display'),
    currentRoom: document.getElementById('current-room'),
    userRole: document.getElementById('user-role'),
    roomStatus: document.getElementById('room-status'),
    leaveRoomBtn: document.getElementById('leave-room-btn'),
    
    // Speech Controls
    startBtn: document.getElementById('start-btn'),
    stopBtn: document.getElementById('stop-btn'),
    liveTranscript: document.getElementById('live-transcript'),
    streamingDot: document.getElementById('streaming-dot'),
    supportWarning: document.getElementById('support-warning'),
    mobileTips: document.getElementById('mobile-tips'),
    
    // Messages
    messageList: document.getElementById('message-list'),
    messageContainer: document.getElementById('message-container'),
    emptyState: document.getElementById('empty-state'),
    clearMessagesBtn: document.getElementById('clear-messages-btn'),
    
    // Layout
    sidebar: document.getElementById('sidebar'),
    toggleSidebarBtn: document.getElementById('toggle-sidebar'),
    toggleMessagesBtn: document.getElementById('toggle-messages')
  };

  // ========================================
  // APPLICATION STATE
  // ========================================
  const State = {
    speechRecognizer: null,
    roomId: null,
    sessionId: generateSessionId(),
    userName: null,
    userNameCache: new Map(),
    isCreator: false,
    isListening: false,
    
    // Firebase references
    messagesRef: null,
    roomMetaRef: null,
    
    // Streaming state
    currentMessageRef: null,
    
    // UI state
    stopAutoScroll: false,
    scrollTimer: null
  };

  // ========================================
  // CONFIGURATION
  // ========================================
  const CONFIG = {
    PAUSE_DURATION_MS: 1000,  // 1 second pause to start new message
    ROOM_ID_LENGTH: 6,
    MAX_MESSAGES: 200
  };

  // ========================================
  // INITIALIZATION
  // ========================================
  
  /**
   * Initialize the application when DOM is ready
   */
  /**
   * Initialize the application
   */
  async function init() {
    const isMobile = window.innerWidth < 1024;
    
    await initSpeechRecognition();
    attachEventListeners();
    
    // Restore sidebar state from localStorage
    const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (sidebarCollapsed && DOM.sidebar) {
      DOM.sidebar.classList.add('collapsed');
      const icon = DOM.toggleSidebarBtn?.querySelector('svg path');
      if (icon) {
        icon.setAttribute('d', 'M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z');
      }
    }
    
    // Update ARIA attributes
    if (DOM.toggleSidebarBtn) {
      DOM.toggleSidebarBtn.setAttribute('aria-expanded', !sidebarCollapsed);
    }
    if (DOM.toggleMessagesBtn) {
      DOM.toggleMessagesBtn.setAttribute('aria-expanded', 'false');
    }
    
    // Restore previous room if available
    const savedRoom = restoreRoomState();
    if (savedRoom) {
      enterRoom(savedRoom.roomId, savedRoom.isCreator);
    }
    
    updateUI();
    
    // Add viewport resize handler for responsive behavior
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        // Handle resize if needed
      }, 250);
    });
  }

  /**
   * Initialize speech recognition
   */
  /**
   * Initialize speech recognition
   */
  async function initSpeechRecognition() {
    State.speechRecognizer = await window.createSpeechRecognizer({
      lang: 'en-US',
      onResult: handleSpeechResult,
      onError: handleSpeechError,
      onStart: handleSpeechStart,
      onEnd: handleSpeechEnd
    });

    if (!State.speechRecognizer) {
      DOM.supportWarning.hidden = false;
      DOM.startBtn.disabled = true;
      DOM.stopBtn.disabled = true;
    } else if (window.isMobileSpeech && DOM.mobileTips) {
      DOM.mobileTips.hidden = false;
      setTimeout(() => DOM.mobileTips.hidden = true, 8000);
    }
  }

  /**
   * Attach all event listeners
   */
  function attachEventListeners() {
    // Room management
    DOM.createRoomBtn.addEventListener('click', handleCreateRoom);
    DOM.joinRoomBtn.addEventListener('click', handleJoinRoom);
    DOM.leaveRoomBtn.addEventListener('click', handleLeaveRoom);
    DOM.joinRoomInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleJoinRoom();
      }
    });

    // Sidebar toggle
    if (DOM.toggleSidebarBtn) {
      DOM.toggleSidebarBtn.addEventListener('click', toggleSidebar);
    }
    
    // Messages expand toggle
    if (DOM.toggleMessagesBtn) {
      DOM.toggleMessagesBtn.addEventListener('click', toggleMessages);
    }

    // Speech controls
    DOM.startBtn.addEventListener('click', handleStartSpeech);
    DOM.stopBtn.addEventListener('click', handleStopSpeech);

    // Message list scroll handling
    DOM.messageList.addEventListener('wheel', handleUserScroll);
    DOM.messageList.addEventListener('touchmove', handleUserScroll);

    // Clear messages
    if (DOM.clearMessagesBtn) {
      DOM.clearMessagesBtn.addEventListener('click', handleClearMessages);
    }
  }

  // ========================================
  // ROOM MANAGEMENT
  // ========================================

  /**
   * Generate a random room ID
   */
  function generateRoomId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    for (let i = 0; i < CONFIG.ROOM_ID_LENGTH; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }

  /**
   * Handle room creation
   */
  function handleCreateRoom() {
    const newRoomId = generateRoomId();
    
    enterRoom(newRoomId, true);
    
    // Set creator metadata in Firebase
    if (window.firebaseDb) {
      window.firebaseDb.ref(`rooms/${newRoomId}/meta`).set({
        creator: State.sessionId,
        created: Date.now()
      });
      State.isCreator = true;
    }
    
    // Show room ID hint
    DOM.roomIdDisplay.textContent = newRoomId;
    DOM.createdRoomHint.hidden = false;
    
    updateUI();
  }

  /**
   * Handle joining an existing room
   */
  function handleJoinRoom() {
    const roomId = DOM.joinRoomInput.value.trim().toUpperCase();
    
    if (!roomId || roomId.length !== CONFIG.ROOM_ID_LENGTH) {
      alert(`Please enter a valid ${CONFIG.ROOM_ID_LENGTH}-character room ID`);
      return;
    }
    
    enterRoom(roomId, false);
  }

  /**
   * Handle leaving the current room
   */
  function handleLeaveRoom() {
    if (!State.roomId) return;
    
    // Stop speech if active
    if (State.isListening && State.speechRecognizer) {
      State.speechRecognizer.stop();
    }
    
    // Unsubscribe from Firebase
    if (State.messagesRef) {
      State.messagesRef.off();
      State.messagesRef = null;
    }
    
    // Clear state
    State.roomId = null;
    State.isCreator = false;
    resetStreamingState();
    clearRoomState();
    
    // Clear UI
    DOM.currentRoom.textContent = 'Not connected to any room';
    DOM.userRole.hidden = true;
    DOM.messageList.innerHTML = '';
    DOM.emptyState.hidden = false;
    DOM.clearMessagesBtn.hidden = true;
    DOM.createdRoomHint.hidden = true;
    DOM.joinRoomInput.value = '';
    
    updateUI();
  }

  /**
   * Toggle sidebar visibility
   */
  function toggleSidebar() {
    if (DOM.sidebar) {
      DOM.sidebar.classList.toggle('collapsed');
      const isCollapsed = DOM.sidebar.classList.contains('collapsed');
      
      // Update toggle button icon (change arrow direction)
      const icon = DOM.toggleSidebarBtn.querySelector('svg path');
      if (icon) {
        // Right arrow when collapsed (to expand), left arrow when expanded (to collapse)
        icon.setAttribute('d', isCollapsed 
          ? 'M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z'  // Right chevron
          : 'M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z' // Left chevron
        );
      }
      
      // Update ARIA attributes
      if (DOM.toggleSidebarBtn) {
        DOM.toggleSidebarBtn.setAttribute('aria-expanded', !isCollapsed);
      }
      
      // Save state to localStorage
      localStorage.setItem('sidebarCollapsed', isCollapsed);
    }
  }

  /**
   * Toggle messages panel visibility (mobile)
   */
  function toggleMessages() {
    const messagesSection = document.getElementById('messages');
    if (messagesSection) {
      messagesSection.classList.toggle('expanded');
      const isExpanded = messagesSection.classList.contains('expanded');
      if (DOM.toggleMessagesBtn) {
        DOM.toggleMessagesBtn.setAttribute('aria-expanded', isExpanded);
      }
    }
  }

  /**
   * Enter a room (create or join)
   */
  function enterRoom(roomId, isNewRoom) {
    // Stop speech if active
    if (State.isListening && State.speechRecognizer) {
      State.speechRecognizer.stop();
    }

    // Reset state
    resetStreamingState();
    
    State.roomId = roomId;
    State.isCreator = isNewRoom;
    
    // Save to localStorage for persistence
    saveRoomState(roomId, isNewRoom);
    
    // Update UI
    DOM.currentRoom.textContent = `Connected to room: ${roomId}`;
    DOM.userRole.textContent = 'Role: Member (can speak)';
    DOM.userRole.hidden = false;
    DOM.messageList.innerHTML = '';
    DOM.emptyState.hidden = true;
    DOM.clearMessagesBtn.hidden = false;
    DOM.leaveRoomBtn.hidden = false;
    
    // Subscribe to Firebase room
    subscribeToRoom(roomId);
    
    updateUI();
  }

  /**
   * Subscribe to room messages and metadata
   */
  function subscribeToRoom(roomId) {
    if (!window.firebaseDb) return;

    // Unsubscribe from previous room if any
    if (State.messagesRef) {
      State.messagesRef.off();
    }

    State.messagesRef = window.firebaseDb.ref(`rooms/${roomId}/messages`);
    
    // Listen for new messages
    State.messagesRef.limitToLast(CONFIG.MAX_MESSAGES).on('child_added', (snapshot) => {
      const message = snapshot.val();
      appendMessage(snapshot.key, message);
    });
    
    // Listen for message updates (word streaming)
    State.messagesRef.on('child_changed', (snapshot) => {
      const message = snapshot.val();
      updateMessage(snapshot.key, message);
    });

    // All members can speak - no need to check creator status
  }

  // ========================================
  // SPEECH RECOGNITION HANDLERS
  // ========================================

  /**
   * Handle speech recognition results
   */
  function handleSpeechResult({ finalTranscript, interimTranscript }) {
    if (!State.roomId || !State.messagesRef) {
      return;
    }

    const now = Date.now();
    
    // If we have interim results, update or create current streaming message
    if (interimTranscript) {
      // Safe text content update (prevents XSS)
      DOM.liveTranscript.textContent = interimTranscript;
      DOM.liveTranscript.style.opacity = '0.7';
      
      if (!State.currentMessageRef) {
        // Create new streaming message
        State.currentMessageRef = State.messagesRef.push({
          text: interimTranscript,
          timestamp: now,
          from: State.sessionId,
          streaming: true
        });
      } else {
        // Update existing streaming message
        State.currentMessageRef.update({
          text: interimTranscript,
          timestamp: now
        });
      }
    }
    
    // If we have final results, finalize the message
    if (finalTranscript) {
      if (State.currentMessageRef) {
        // Update existing message
        State.currentMessageRef.update({
          text: finalTranscript,
          timestamp: now,
          streaming: false
        });
        State.currentMessageRef = null;
      } else {
        // Create new final message (can happen if interim results were skipped)
        State.messagesRef.push({
          text: finalTranscript,
          timestamp: now,
          from: State.sessionId,
          streaming: false
        });
      }
      
      // Reset live transcript display
      DOM.liveTranscript.innerHTML = '<span class="placeholder">Your words will appear here as you speak...</span>';
      DOM.liveTranscript.style.opacity = '';
    }
  }

  /**
   * Handle speech recognition errors
   */
  function handleSpeechError(event) {
    const errorMessages = {
      'no-speech': 'No speech detected. Please try again.',
      'audio-capture': 'Microphone not accessible. Please check permissions.',
      'not-allowed': 'Microphone permission denied. Please enable in browser settings.',
      'not-supported': 'Speech recognition not supported. Use Chrome or Edge.',
      'network': 'Network error. Please check your connection.',
      'aborted': 'Speech recognition was stopped.'
    };

    const message = errorMessages[event.error] || `Speech error: ${event.error}`;
    
    // Show user-friendly message
    if (event.error === 'not-allowed' || event.error === 'audio-capture') {
      showErrorMessage(message + (window.isMobileSpeech ? ' Tap the microphone icon in your browser.' : ''));
    } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
      showErrorMessage(message);
    }
    
    // Reset UI on fatal errors
    if (event.error === 'not-allowed' || event.error === 'not-supported') {
      State.isListening = false;
      updateUI();
    }
  }

  /**
   * Handle speech recognition start
   */
  function handleSpeechStart() {
    State.isListening = true;
    DOM.streamingDot.hidden = false;
    updateUI();
  }

  /**
   * Handle speech recognition end
   */
  function handleSpeechEnd() {
    State.isListening = false;
    DOM.streamingDot.hidden = true;
    updateUI();
  }

  /**
   * Start speech recognition
   */
  function handleStartSpeech() {
    if (!State.speechRecognizer) return;
    State.speechRecognizer.start();
  }

  /**
   * Stop speech recognition
   */
  function handleStopSpeech() {
    if (State.speechRecognizer) {
      State.speechRecognizer.stop();
    }
    // Finalize any pending streaming message
    if (State.currentMessageRef) {
      const currentText = DOM.liveTranscript.textContent;
      // Only finalize if there's actual text (not just placeholder)
      if (currentText && !currentText.includes('Your words will appear')) {
        State.currentMessageRef.update({
          text: currentText,
          timestamp: Date.now(),
          streaming: false
        });
      }
      State.currentMessageRef = null;
    }
  }

  // ========================================
  // MESSAGE HANDLING
  // ========================================

  /**
   * Append a new message to the list
   */
  function appendMessage(messageId, message) {
    const li = document.createElement('li');
    li.setAttribute('data-msg-id', messageId);
    li.setAttribute('data-streaming', message.streaming ? 'true' : 'false');
    
    const time = new Date(message.timestamp);
    const isOwnMessage = message.from === State.sessionId;
    const userName = getUserName(message.from);
    
    // User name
    const nameSpan = document.createElement('span');
    nameSpan.className = 'message-name';
    nameSpan.textContent = isOwnMessage ? `${userName} (You)` : userName;
    
    // Message text
    const textSpan = document.createElement('span');
    textSpan.className = 'message-text';
    textSpan.textContent = message.text;
    if (message.streaming) {
      textSpan.textContent += ' ...';
    }
    
    // Timestamp
    const timeSpan = document.createElement('span');
    timeSpan.className = 'time';
    timeSpan.textContent = time.toLocaleTimeString();
    
    li.appendChild(nameSpan);
    li.appendChild(textSpan);
    li.appendChild(timeSpan);
    
    // Style own messages
    if (isOwnMessage) {
      li.style.borderLeftColor = '#2962ff';
      li.style.backgroundColor = 'rgba(41, 98, 255, 0.05)';
    }
    
    DOM.messageList.appendChild(li);
    DOM.emptyState.hidden = true;
    
    // Auto-scroll to bottom
    if (!State.stopAutoScroll) {
      DOM.messageList.scrollTop = DOM.messageList.scrollHeight;
    }
  }

  /**
   * Update an existing message (for word streaming)
   */
  function updateMessage(messageId, message) {
    const li = DOM.messageList.querySelector(`[data-msg-id="${messageId}"]`);
    if (!li) return;

    li.setAttribute('data-streaming', message.streaming ? 'true' : 'false');
    
    const textSpan = li.querySelector('.message-text') || li;
    const timeSpan = li.querySelector('.time');
    
    const time = new Date(message.timestamp);
    
    // Update text
    if (textSpan.tagName === 'SPAN') {
      textSpan.textContent = message.text;
      if (message.streaming) {
        textSpan.textContent += ' ...';
      }
    }
    
    // Update timestamp
    if (timeSpan) {
      timeSpan.textContent = time.toLocaleTimeString();
    }
    
    // Auto-scroll to bottom
    if (!State.stopAutoScroll) {
      DOM.messageList.scrollTop = DOM.messageList.scrollHeight;
    }
  }

  /**
   * Show an error message in the message list
   */
  function showErrorMessage(text) {
    const li = document.createElement('li');
    li.style.borderLeftColor = '#ff3d00';
    li.style.opacity = '0.8';
    li.textContent = '⚠️ ' + text;
    DOM.messageList.appendChild(li);
  }

  /**
   * Handle user scrolling (disable auto-scroll temporarily)
   */
  function handleUserScroll() {
    State.stopAutoScroll = true;
    
    if (State.scrollTimer) {
      clearTimeout(State.scrollTimer);
    }
    State.scrollTimer = setTimeout(() => {
      State.stopAutoScroll = false;
    }, 3000);
  }

  /**
   * Handle clear messages
   */
  function handleClearMessages() {
    if (confirm('Clear all messages from this room?')) {
      DOM.messageList.innerHTML = '';
      DOM.emptyState.hidden = false;
    }
  }

  // ========================================
  // STATE MANAGEMENT
  // ========================================

  /**
   * Reset streaming state
   */
  function resetStreamingState() {
    State.currentMessageRef = null;
    DOM.liveTranscript.innerHTML = '<span class="placeholder">Your words will appear here as you speak...</span>';
    DOM.liveTranscript.style.opacity = '';
    DOM.streamingDot.hidden = true;
  }

  /**
   * Update UI based on current state
   */
  function updateUI() {
    if (!State.speechRecognizer) {
      DOM.startBtn.disabled = true;
      DOM.stopBtn.disabled = true;
      DOM.startBtn.title = 'Speech recognition not supported';
      return;
    }

    if (!State.roomId) {
      DOM.startBtn.disabled = true;
      DOM.stopBtn.disabled = true;
      DOM.startBtn.title = 'Join or create a room first';
      return;
    }

    // All room members can speak
    DOM.startBtn.disabled = State.isListening;
    DOM.stopBtn.disabled = !State.isListening;
    DOM.startBtn.title = 'Start speaking';
  }

  // ========================================
  // APPLICATION ENTRY POINT
  // ========================================

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
