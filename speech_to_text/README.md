# 🎤 Speech Rooms

**Real-time speech-to-text messaging with word-by-word streaming**

A lightweight web application that converts speech to text in real-time and shares it instantly with others in the same room. Built with Web Speech API, Firebase Realtime Database, and vanilla JavaScript.

---

## ✨ Features

### Core Functionality
- **🎙️ Live Speech Recognition** - Real-time speech-to-text using Web Speech API
- **💬 Word-by-Word Streaming** - See words appear instantly as the speaker talks
- **⏸️ Smart Pause Detection** - Automatically groups words into messages (5-second pause threshold)
- **🚪 Separate Create/Join** - Distinct controls for creating or joining rooms
- **👥 Multi-Speaker Support** - All room members can speak and share text
- **📱 Responsive Design** - Works on desktop and mobile devices
- **🌓 Dark/Light Mode** - Automatic theme based on system preference

### Technical Highlights
- **Zero Build Process** - Pure HTML/CSS/JS, no compilation needed
- **Real-time Sync** - Firebase Realtime Database for instant message delivery
- **Low Latency** - Word-level streaming for near-instant communication
- **Browser-Based** - No server-side code, fully client-side
- **Free Hosting** - Deploy on GitHub Pages at no cost

---

## 🚀 Quick Start

### Prerequisites
- Modern browser with Web Speech API support (Chrome, Edge recommended)
- Firebase account (free tier)
- GitHub account (for deployment)

### Setup Steps

#### 1. Clone/Download the Project
```bash
git clone <your-repo-url>
cd speech_to_text
```

#### 2. Configure Firebase

**A. Create Firebase Project**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** and follow the wizard
3. Name your project (e.g., `speech-rooms`)

**B. Add Web App**
1. In your Firebase project, click the Web icon `</>`
2. Register your app with a nickname
3. Copy the configuration object

**C. Enable Realtime Database**
1. Navigate to **"Realtime Database"** in the left menu
2. Click **"Create Database"**
3. Choose a location (e.g., `us-central1`)
4. Start in **"Test mode"** for development

**D. Update Configuration**
1. Open `src/firebase-config.js`
2. Replace all `REPLACE_ME` values with your Firebase config:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "your-project.firebaseapp.com",
     databaseURL: "https://your-project-default-rtdb.firebaseio.com",
     projectId: "your-project",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123..."
   };
   ```

**E. Set Security Rules** _(Important for production!)_
1. Go to **Realtime Database → Rules** in Firebase Console
2. Replace with the following rules:
   ```json
   {
     "rules": {
       "rooms": {
         "$roomId": {
           ".read": true,
           "messages": {
             ".write": "newData.child('text').val().length <= 500",
             ".indexOn": ["timestamp"]
           },
           "meta": {
             ".write": "!data.exists()"
           }
         }
       }
     }
   }
   ```

#### 3. Test Locally
1. Open `public/index.html` in Chrome or Edge
2. Click **"Create New Room"**
3. Note the generated room ID
4. Open another tab/window, enter the room ID, click **"Join Room"**
5. In the creator tab, click **"Start Speaking"**
6. Speak and watch words appear in real-time in both tabs!

#### 4. Deploy to GitHub Pages

**A. Create GitHub Repository**
```bash
git init
git add .
git commit -m "Initial commit: Speech Rooms app"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

**B. Enable GitHub Pages**
1. Go to your repository on GitHub
2. Navigate to **Settings → Pages**
3. Under **"Source"**, select branch `main` and folder `/public`
4. Click **Save**
5. Wait 1-2 minutes for deployment
6. Your app will be live at: `https://YOUR_USERNAME.github.io/YOUR_REPO/`

---

## 📖 How to Use

### Creating a Room
1. Open the application
2. Click **"➕ Create New Room"**
3. A random 6-character room ID is generated (e.g., `AB3KF9`)
4. Share this ID with people you want to join
5. Click **"🎙️ Start Speaking"** to begin
6. Speak naturally - words appear instantly as you talk
7. Pause for 5 seconds to start a new message

### Joining a Room
1. Get the room ID from the creator
2. Enter it in the **"Enter room ID to join"** field
3. Click **"🚪 Join Room"**
4. You'll see messages appear in real-time as the creator speaks
5. Only the creator can speak; you're in listen-only mode

### Understanding the Interface

- **Green pulsing dot (●)** - Actively listening to speech
- **"..." after text** - Message is still being spoken (streaming)
- **Blue left border** - Your own messages
- **Live Transcript** - Shows words as you're speaking them
- **Messages** - Finalized messages from the conversation

---

## 🛠️ Technical Architecture

### File Structure
```
speech_to_text/
├── public/
│   ├── index.html          # Main UI
│   └── style.css           # Styles with CSS variables
├── src/
│   ├── app.js              # Core application logic
│   ├── speech.js           # Web Speech API wrapper
│   └── firebase-config.js  # Firebase initialization
├── assets/
│   └── favicon.png         # Site icon
├── .github/
│   └── copilot-instructions.md
├── README.md
├── LICENSE
└── .gitignore
```

### Data Flow

1. **Speech Input** → Web Speech API captures audio
2. **Word Detection** → API returns words as they're recognized
3. **Word Streaming** → Each word immediately pushed to Firebase
4. **Message Grouping** → Words accumulated in one message
5. **Pause Detection** → 5s silence → new message started
6. **Real-time Sync** → Firebase broadcasts to all clients
7. **UI Update** → Words appear instantly in all tabs

### Firebase Data Structure
```json
{
  "rooms": {
    "AB3KF9": {
      "meta": {
        "creator": "user_abc123def",
        "created": 1700000000000
      },
      "messages": {
        "-NabcXYZ123": {
          "text": "hello world this is a test",
          "timestamp": 1700000012345,
          "from": "user_abc123def",
          "streaming": false
        }
      }
    }
  }
}
```

---

## 🌐 Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | Best experience |
| Edge | ✅ Full | Chromium-based, works great |
| Safari | ⚠️ Partial | No interim results, limited word streaming |
| Firefox | ❌ No | Web Speech API not supported |

**Recommendation**: Use latest Chrome or Edge for optimal experience.

---

## 🔐 Security Considerations

### Test Mode vs Production

**Test Mode** (default)
- Anyone can read/write
- Good for development
- ⚠️ NOT secure for public use

**Production Mode**
```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": "auth != null",
        "messages": {
          ".write": "auth != null && newData.child('text').val().length <= 500",
          ".indexOn": ["timestamp"]
        },
        "meta": {
          ".write": "auth != null && !data.exists()"
        }
      }
    }
  }
}
```

### Recommended Enhancements
1. **Enable Firebase Authentication** (Anonymous or Email)
2. **Add rate limiting** using Cloud Functions
3. **Sanitize message text** to prevent XSS
4. **Implement room expiration** (auto-delete after 24h)
5. **Add CAPTCHA** to prevent bot abuse

---

## 🎨 Customization

### Change Pause Duration
Edit `src/app.js`:
```javascript
const CONFIG = {
  PAUSE_DURATION_MS: 3000,  // Change to 3 seconds
  // ...
};
```

### Change Recognition Language
Edit `src/app.js`:
```javascript
State.speechRecognizer = window.createSpeechRecognizer({
  lang: 'es-ES',  // Spanish
  // or 'fr-FR', 'de-DE', 'ja-JP', etc.
  // ...
});
```

### Customize Colors
Edit CSS variables in `public/style.css`:
```css
:root {
  --accent-primary: #ff5722;  /* Change primary color */
  --streaming-color: #ffeb3b; /* Change streaming indicator */
  /* ... */
}
```

---

## 🐛 Troubleshooting

### "Microphone permission denied"
- Check browser permissions (🔒 icon in address bar)
- Allow microphone access when prompted
- On mobile, use HTTPS (required for mic access)

### "Firebase not configured"
- Make sure you replaced all `REPLACE_ME` values in `src/firebase-config.js`
- Check browser console for specific error messages
- Verify Firebase project is active and billing enabled (if needed)

### Words not appearing in real-time
- Check Firebase Realtime Database is enabled (not Firestore)
- Verify database rules allow writes
- Check network tab in DevTools for Firebase errors

### Speech recognition not starting
- Only works in supported browsers (Chrome/Edge)
- Requires HTTPS in production (HTTP only works on localhost)
- Check microphone is not being used by another app

---

## 🚧 Known Limitations

1. **No persistence** - Messages cleared when all users leave
2. **No user names** - Messages only show timestamps
3. **Single speaker** - Only room creator can speak
4. **No recording** - Messages can't be exported (yet)
5. **Limited to 200 messages** per room (configurable)

---

## 🔮 Future Enhancements

- [ ] Add user display names/avatars
- [ ] Multi-speaker support with turn-taking
- [ ] Export transcript to PDF/TXT
- [ ] Language selector in UI
- [ ] Message search/filter
- [ ] Room password protection
- [ ] Video/screen sharing integration
- [ ] Mobile app (React Native)
- [ ] Voice activity visualization

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/YOUR_REPO/issues)
- **Discussions**: [GitHub Discussions](https://github.com/YOUR_USERNAME/YOUR_REPO/discussions)

---

## 🙏 Acknowledgments

- Built with [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- Powered by [Firebase](https://firebase.google.com/)
- Hosted on [GitHub Pages](https://pages.github.com/)

---

**Made with ❤️ for real-time communication**
