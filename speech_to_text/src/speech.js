/**
 * Speech Recognition Wrapper
 * 
 * Provides a clean interface for the Web Speech API with word-level callbacks.
 * Supports both interim (real-time) and final (confirmed) results.
 * Enhanced mobile support with auto-restart and permission handling.
 */

(function() {
  'use strict';

  // Browser compatibility check
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  // Enhanced mobile detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  console.log('[Speech] Device detection:', {
    isMobile,
    isIOS,
    isAndroid,
    isSafari,
    userAgent: navigator.userAgent
  });

  /**
   * Request microphone permission explicitly for mobile
   */
  async function requestMicrophonePermission() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('[Speech] getUserMedia not supported');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[Speech] Microphone permission granted');
      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('[Speech] Microphone permission denied:', error);
      return false;
    }
  }

  /**
   * Creates a configured speech recognizer instance
   * 
   * @param {Object} config - Configuration object
   * @param {string} config.lang - Language code (default: 'en-US')
   * @param {boolean} config.interim - Enable interim results (default: true)
   * @param {boolean} config.continuous - Continuous recognition (default: true)
   * @param {Function} config.onResult - Callback for recognition results
   * @param {Function} config.onWord - Callback for each recognized word
   * @param {Function} config.onError - Callback for errors
   * @param {Function} config.onStart - Callback when recognition starts
   * @param {Function} config.onEnd - Callback when recognition ends
   * @returns {Object|null} Configured recognizer or null if unsupported
   */
  async function createSpeechRecognizer(config) {
    const {
      lang = 'en-US',
      interim = true,
      continuous = true,
      onResult,
      onWord,
      onError,
      onStart,
      onEnd
    } = config;

    // Check browser support
    if (!SpeechRecognition) {
      console.error('[Speech] Web Speech API not supported in this browser');
      if (onError) {
        onError({ error: 'not-supported', message: 'Speech recognition not supported' });
      }
      return null;
    }

    // Request microphone permission on mobile devices
    if (isMobile) {
      console.log('[Speech] Requesting microphone permission for mobile...');
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        console.error('[Speech] Microphone permission required');
        if (onError) {
          onError({ error: 'not-allowed', message: 'Microphone permission required' });
        }
        return null;
      }
    }

    // Create and configure recognizer
    const recognizer = new SpeechRecognition();
    recognizer.lang = lang;
    
    // Use continuous mode for both mobile and desktop
    recognizer.continuous = true;
    recognizer.interimResults = true;
    recognizer.maxAlternatives = 1;
    
    if (isMobile) {
      console.log('[Speech] Mobile mode: continuous=true, stable recognition');
    } else {
      console.log('[Speech] Desktop mode: continuous=true');
    }

    // Track recognition state
    let isRecognizing = false;
    let shouldBeActive = false;
    let restartTimeout = null;

    /**
     * Handle recognition results
     * Processes both interim and final transcripts, extracts words from final results
     */
    recognizer.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      // Process all result items from the current result index
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptText = result[0].transcript;

        if (result.isFinal) {
          // Final result: confirmed text
          finalTranscript += transcriptText;
          console.log('[Speech] Final result:', transcriptText);

          // Extract and emit individual words from final transcript
          if (onWord) {
            const words = transcriptText.trim().split(/\s+/).filter(Boolean);
            words.forEach(word => onWord(word));
          }
        } else {
          // Interim result: real-time preview
          interimTranscript += transcriptText;
        }
      }

      // Callback with processed transcripts
      if (onResult) {
        onResult({
          finalTranscript: finalTranscript.trim(),
          interimTranscript: interimTranscript.trim()
        });
      }
    };

    // Error handling with mobile-specific recovery
    recognizer.onerror = (event) => {
      console.error('[Speech] Recognition error:', event.error, event);
      
      // Handle specific mobile errors
      if (event.error === 'no-speech') {
        console.log('[Speech] No speech detected - will auto-restart');
        // Don't stop shouldBeActive, let it auto-restart in onend
        return;
      } else if (event.error === 'audio-capture') {
        console.error('[Speech] Audio capture failed - check microphone');
        shouldBeActive = false;
      } else if (event.error === 'not-allowed') {
        console.error('[Speech] Microphone permission denied');
        shouldBeActive = false;
      } else if (event.error === 'network') {
        console.error('[Speech] Network error - will retry');
        // Don't stop shouldBeActive for network errors, let it retry
        return;
      } else if (event.error === 'aborted') {
        console.log('[Speech] Recognition aborted by user');
        return; // Don't call onError for user-initiated abort
      }
      
      // Only call onError for serious errors
      if (onError && event.error !== 'no-speech' && event.error !== 'aborted' && event.error !== 'network') {
        onError(event);
      }
    };

    // Start callback
    recognizer.onstart = () => {
      isRecognizing = true;
      console.log('[Speech] Recognition started');
      if (onStart) {
        onStart();
      }
    };

    // End callback with smart auto-restart only if needed
    recognizer.onend = () => {
      isRecognizing = false;
      console.log('[Speech] Recognition ended, shouldBeActive:', shouldBeActive);
      
      // Disable auto-restart on mobile to avoid notification sound repeating
      // On desktop, allow auto-restart for better continuous experience
      if (shouldBeActive && !restartTimeout && !isMobile) {
        const delay = 50;
        console.log(`[Speech] Auto-restarting in ${delay}ms`);
        
        restartTimeout = setTimeout(() => {
          restartTimeout = null;
          if (shouldBeActive && !isRecognizing) {
            try {
              console.log('[Speech] Auto-restarting after unexpected end');
              originalStart();
            } catch (e) {
              console.warn('[Speech] Failed to auto-restart:', e.message);
            }
          }
        }, delay);
      } else if (!shouldBeActive) {
        // Only call onEnd if we're actually stopping (not restarting)
        if (onEnd) {
          onEnd();
        }
      }
    };

    // Enhanced start/stop methods with state tracking
    const originalStart = recognizer.start.bind(recognizer);
    const originalStop = recognizer.stop.bind(recognizer);
    const originalAbort = recognizer.abort.bind(recognizer);

    recognizer.start = function() {
      console.log('[Speech] start() called, isRecognizing:', isRecognizing);
      
      if (isRecognizing) {
        console.warn('[Speech] Already recognizing, ignoring start()');
        return;
      }
      
      shouldBeActive = true;
      
      try {
        return originalStart();
      } catch (e) {
        console.error('[Speech] Start failed:', e);
        isRecognizing = false;
        
        // Retry on InvalidStateError
        if (e.name === 'InvalidStateError') {
          console.log('[Speech] Retrying start after 500ms...');
          setTimeout(() => {
            try {
              originalStart();
            } catch (err) {
              console.error('[Speech] Retry failed:', err);
            }
          }, 500);
        }
      }
    };

    recognizer.stop = function() {
      console.log('[Speech] stop() called');
      shouldBeActive = false;
      
      if (restartTimeout) {
        clearTimeout(restartTimeout);
        restartTimeout = null;
      }
      
      if (isRecognizing) {
        try {
          return originalStop();
        } catch (e) {
          console.warn('[Speech] Stop failed:', e);
        }
      }
    };

    recognizer.abort = function() {
      console.log('[Speech] abort() called');
      shouldBeActive = false;
      
      if (restartTimeout) {
        clearTimeout(restartTimeout);
        restartTimeout = null;
      }
      
      if (isRecognizing) {
        try {
          return originalAbort();
        } catch (e) {
          console.warn('[Speech] Abort failed:', e);
        }
      }
    };

    // Add helper to check if active
    recognizer.isActive = function() {
      return shouldBeActive && isRecognizing;
    };

    return recognizer;
  }

  // Export to global scope
  window.createSpeechRecognizer = createSpeechRecognizer;
  window.isMobileSpeech = isMobile;
  window.isIOSSpeech = isIOS;
  window.isAndroidSpeech = isAndroid;

})();
