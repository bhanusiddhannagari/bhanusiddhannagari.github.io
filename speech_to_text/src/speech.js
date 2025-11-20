/**
 * Speech Recognition Wrapper
 * 
 * Provides a clean interface for the Web Speech API with word-level callbacks.
 * Supports both interim (real-time) and final (confirmed) results.
 */

(function() {
  'use strict';

  // Browser compatibility check
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

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
  function createSpeechRecognizer(config) {
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
      console.error('Web Speech API not supported in this browser');
      return null;
    }

    // Create and configure recognizer
    const recognizer = new SpeechRecognition();
    recognizer.lang = lang;
    recognizer.continuous = continuous;
    recognizer.interimResults = interim;
    recognizer.maxAlternatives = 1;

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

    // Error handling
    recognizer.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (onError) {
        onError(event);
      }
    };

    // Start callback
    recognizer.onstart = () => {
      console.log('Speech recognition started');
      if (onStart) {
        onStart();
      }
    };

    // End callback
    recognizer.onend = () => {
      console.log('Speech recognition ended');
      if (onEnd) {
        onEnd();
      }
    };

    return recognizer;
  }

  // Export to global scope
  window.createSpeechRecognizer = createSpeechRecognizer;
})();
