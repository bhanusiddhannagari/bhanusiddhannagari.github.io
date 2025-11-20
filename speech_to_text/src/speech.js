/**
 * Speech Recognition Wrapper - Optimized
 * Simplified interface for Web Speech API with mobile support
 */

(function() {
  'use strict';

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  window.isMobileSpeech = isMobile;

  /**
   * Request microphone permission for mobile
   */
  async function requestMicPermission() {
    if (!navigator.mediaDevices?.getUserMedia) return false;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('[Speech] Mic permission denied:', error);
      return false;
    }
  }

  /**
   * Create speech recognizer
   */
  async function createSpeechRecognizer(config = {}) {
    const {
      lang = 'en-US',
      onResult,
      onError,
      onStart,
      onEnd
    } = config;

    if (!SpeechRecognition) {
      onError?.({ error: 'not-supported', message: 'Speech recognition not supported' });
      return null;
    }

    // Request mic permission on mobile
    if (isMobile && !await requestMicPermission()) {
      onError?.({ error: 'not-allowed', message: 'Microphone permission required' });
      return null;
    }

    const recognizer = new SpeechRecognition();
    recognizer.lang = lang;
    recognizer.continuous = true;
    recognizer.interimResults = true;
    recognizer.maxAlternatives = 1;

    let isActive = false;
    let isRunning = false;
    let restartTimeout = null;

    // Handle results
    recognizer.onresult = (event) => {
      let finalText = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += text;
        } else {
          interimText += text;
        }
      }

      onResult?.({ 
        finalTranscript: finalText.trim(), 
        interimTranscript: interimText.trim() 
      });
    };

    // Handle errors - only stop on fatal errors
    recognizer.onerror = (event) => {
      console.error('[Speech] Error:', event.error);
      
      const fatalErrors = ['audio-capture', 'not-allowed', 'not-supported'];
      if (fatalErrors.includes(event.error)) {
        isActive = false;
        onError?.(event);
      }
      // Ignore recoverable errors (no-speech, aborted, network)
    };

    // Handle start
    recognizer.onstart = () => {
      isRunning = true;
      onStart?.();
    };

    // Handle end - auto-restart on desktop only
    recognizer.onend = () => {
      isRunning = false;
      
      // Desktop: auto-restart if unexpected
      if (isActive && !isMobile && !restartTimeout) {
        restartTimeout = setTimeout(() => {
          restartTimeout = null;
          if (isActive && !isRunning) {
            try {
              recognizer.start();
            } catch (e) {
              console.warn('[Speech] Restart failed:', e);
            }
          }
        }, 50);
      } 
      
      // Only call onEnd when intentionally stopped (isActive = false)
      if (!isActive) {
        onEnd?.();
      } else if (isMobile) {
        // Mobile: browser stopped it, reset active state and notify
        isActive = false;
        onEnd?.();
      }
    };

    // Override start method
    const originalStart = recognizer.start.bind(recognizer);
    recognizer.start = function() {
      if (isRunning) return;
      isActive = true;
      try {
        return originalStart();
      } catch (e) {
        console.error('[Speech] Start failed:', e);
        isRunning = false;
      }
    };

    // Override stop method
    const originalStop = recognizer.stop.bind(recognizer);
    recognizer.stop = function() {
      isActive = false;
      if (restartTimeout) {
        clearTimeout(restartTimeout);
        restartTimeout = null;
      }
      if (isRunning) {
        try {
          return originalStop();
        } catch (e) {
          console.warn('[Speech] Stop failed:', e);
        }
      }
    };

    return recognizer;
  }

  window.createSpeechRecognizer = createSpeechRecognizer;

})();
