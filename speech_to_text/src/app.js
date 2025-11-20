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
    
    // Speech Controls
    startBtn: document.getElementById('start-btn'),
    stopBtn: document.getElementById('stop-btn'),
    liveTranscript: document.getElementById('live-transcript'),
    streamingDot: document.getElementById('streaming-dot'),
    supportWarning: document.getElementById('support-warning'),
    
    // Messages
    messageList: document.getElementById('message-list'),
    messageContainer: document.getElementById('message-container'),
    emptyState: document.getElementById('empty-state'),
    clearMessagesBtn: document.getElementById('clear-messages-btn')
  };

  // ========================================
  // APPLICATION STATE
  // ========================================
  const State = {
    speechRecognizer: null,
    roomId: null,
    sessionId: generateSessionId(),
    isCreator: false,
    isListening: false,
    
    // Firebase references
    messagesRef: null,
    roomMetaRef: null,
    
    // Streaming state
    currentMessageRef: null,
    currentWords: [],
    lastWordTimestamp: 0,
    pauseTimer: null,
    
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
  function init() {
    console.log('[App] Initializing Speech Rooms...');
    console.log('[App] Session ID:', State.sessionId);
    
    initSpeechRecognition();
    attachEventListeners();
    updateUI();
  }

  /**
   * Initialize speech recognition
   */
  function initSpeechRecognition() {
    State.speechRecognizer = window.createSpeechRecognizer({
      lang: 'en-US',
      continuous: true,
      interim: true,
      onResult: handleSpeechResult,
      onWord: handleWord,
      onError: handleSpeechError,
      onStart: handleSpeechStart,
      onEnd: handleSpeechEnd
    });

    if (!State.speechRecognizer) {
      DOM.supportWarning.hidden = false;
      DOM.startBtn.disabled = true;
      DOM.stopBtn.disabled = true;
      console.error('[App] Speech recognition not supported');
    }
  }

  /**
   * Attach all event listeners
   */
  function attachEventListeners() {
    // Room management
    DOM.createRoomBtn.addEventListener('click', handleCreateRoom);
    DOM.joinRoomBtn.addEventListener('click', handleJoinRoom);
    DOM.joinRoomInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleJoinRoom();
      }
    });

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
   * Generate a unique session ID for this user
   */
  function generateSessionId() {
    return 'user_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  }

  /**
   * Handle room creation
   */
  function handleCreateRoom() {
    const newRoomId = generateRoomId();
    console.log('[Room] Creating new room:', newRoomId);
    
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
    
    console.log('[Room] Joining room:', roomId);
    enterRoom(roomId, false);
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
    
    // Update UI
    DOM.currentRoom.textContent = `Connected to room: ${roomId}`;
    DOM.userRole.textContent = 'Role: Member (can speak)';
    DOM.userRole.hidden = false;
    DOM.messageList.innerHTML = '';
    DOM.emptyState.hidden = true;
    DOM.clearMessagesBtn.hidden = false;
    
    // Subscribe to Firebase room
    subscribeToRoom(roomId);
    
    updateUI();
  }

  /**
   * Subscribe to room messages and metadata
   */
  function subscribeToRoom(roomId) {
    if (!window.firebaseDb) {
      console.warn('[Firebase] Database not initialized');
      return;
    }

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
      DOM.liveTranscript.innerHTML = `<span style="opacity:0.7">${interimTranscript}</span>`;
      
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
    if (finalTranscript && State.currentMessageRef) {
      State.currentMessageRef.update({
        text: finalTranscript,
        timestamp: now,
        streaming: false
      });
      State.currentMessageRef = null;
      DOM.liveTranscript.innerHTML = '<span class="placeholder">Your words will appear here as you speak...</span>';
    }
  }

  /**
   * Handle individual word recognition (backup, not used with interim results)
   */
  function handleWord(word) {
    // Not used when interim results are enabled
    console.log('[Speech] Word recognized:', word);
  }

  /**
   * Handle speech recognition errors
   */
  function handleSpeechError(event) {
    console.error('[Speech] Error:', event.error, event);
    
    const errorMessages = {
      'no-speech': 'No speech detected. Please try again.',
      'audio-capture': 'No microphone found. Please check your device.',
      'not-allowed': 'Microphone permission denied.',
      'network': 'Network error occurred.'
    };

    const message = errorMessages[event.error] || `Speech error: ${event.error}`;
    showErrorMessage(message);
  }

  /**
   * Handle speech recognition start
   */
  function handleSpeechStart() {
    console.log('[Speech] Started listening');
    State.isListening = true;
    DOM.streamingDot.hidden = false;
    updateUI();
  }

  /**
   * Handle speech recognition end
   */
  function handleSpeechEnd() {
    console.log('[Speech] Stopped listening');
    State.isListening = false;
    DOM.streamingDot.hidden = true;
    updateUI();
  }

  /**
   * Start speech recognition
   */
  function handleStartSpeech() {
    if (!State.speechRecognizer) return;
    
    try {
      State.speechRecognizer.start();
    } catch (error) {
      console.warn('[Speech] Start called while active:', error);
    }
  }

  /**
   * Stop speech recognition
   */
  function handleStopSpeech() {
    if (State.speechRecognizer) {
      State.speechRecognizer.stop();
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
    
    li.appendChild(textSpan);
    li.appendChild(timeSpan);
    
    // Style own messages
    if (isOwnMessage) {
      li.style.borderLeftColor = '#2962ff';
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
    State.currentWords = [];
    State.lastWordTimestamp = 0;
    
    if (State.pauseTimer) {
      clearTimeout(State.pauseTimer);
      State.pauseTimer = null;
    }
    
    DOM.liveTranscript.innerHTML = '<span class="placeholder">Your words will appear here as you speak...</span>';
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
