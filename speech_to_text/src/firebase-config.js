/**
 * Firebase Configuration
 * 
 * SETUP INSTRUCTIONS:
 * ===================
 * 
 * 1. Create a Firebase Project:
 *    - Go to https://console.firebase.google.com/
 *    - Click "Add project" and follow the wizard
 *    - Give your project a name (e.g., "speech-rooms")
 * 
 * 2. Add a Web App:
 *    - In your Firebase project, click the Web icon (</>)
 *    - Register your app with a nickname
 *    - Copy the config object shown
 * 
 * 3. Enable Realtime Database:
 *    - In Firebase Console, go to "Realtime Database"
 *    - Click "Create Database"
 *    - Choose a location (e.g., us-central1)
 *    - Start in "Test mode" for development
 * 
 * 4. Replace Configuration:
 *    - Replace the REPLACE_ME values below with your actual config
 *    - Your config should look like this:
 *      {
 *        apiKey: "AIza...",
 *        authDomain: "your-project.firebaseapp.com",
 *        databaseURL: "https://your-project-default-rtdb.firebaseio.com",
 *        projectId: "your-project",
 *        storageBucket: "your-project.appspot.com",
 *        messagingSenderId: "123456789",
 *        appId: "1:123456789:web:abc123..."
 *      }
 * 
 * 5. Security Rules (IMPORTANT for production):
 *    In Firebase Console > Realtime Database > Rules, use:
 *    
 *    {
 *      "rules": {
 *        "rooms": {
 *          "$roomId": {
 *            ".read": true,
 *            "messages": {
 *              ".write": "newData.child('text').val().length <= 500",
 *              ".indexOn": ["timestamp"]
 *            },
 *            "meta": {
 *              ".write": "!data.exists()"
 *            }
 *          }
 *        }
 *      }
 *    }
 *    
 *    This ensures:
 *    - Anyone can read messages
 *    - Message text limited to 500 characters
 *    - Room metadata can only be written once (by creator)
 * 
 * 6. Optional: Add Firebase Authentication
 *    For better security, enable Anonymous or Email authentication
 *    and update rules to require auth.uid
 */

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC7ikv9Hb1jLHNuwR-pLWqQifqMv8bfDoY",
  authDomain: "speechtotext-5290f.firebaseapp.com",
  databaseURL: "https://speechtotext-5290f-default-rtdb.firebaseio.com",
  projectId: "speechtotext-5290f",
  storageBucket: "speechtotext-5290f.firebasestorage.app",
  messagingSenderId: "858332226888",
  appId: "1:858332226888:web:8deac4362457f498f1ff7d",
  measurementId: "G-KDKTWW3975"
};

// Validate configuration
if (firebaseConfig.apiKey === 'REPLACE_ME') {
  console.error(
    '%c⚠️ Firebase Configuration Missing!',
    'color: #ff3d00; font-size: 16px; font-weight: bold;'
  );
  console.log(
    '%cPlease update src/firebase-config.js with your Firebase project credentials.\n' +
    'See the comments in that file for detailed setup instructions.',
    'color: #999; font-size: 12px;'
  );
  
  // Show alert in UI
  const alertDiv = document.createElement('div');
  alertDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#ff3d00;color:white;padding:1rem;text-align:center;z-index:9999;';
  alertDiv.innerHTML = '<strong>⚠️ Firebase not configured!</strong> Update src/firebase-config.js with your credentials. <a href="https://console.firebase.google.com/" target="_blank" style="color:white;text-decoration:underline;">Get started</a>';
  document.body.prepend(alertDiv);
} else {
  console.log('[Firebase] Configuration loaded ✓');
}

// Initialize Firebase
try {
  const app = firebase.initializeApp(firebaseConfig);
  const db = firebase.database();
  
  // Export to global scope for easy access
  window.firebaseApp = app;
  window.firebaseDb = db;
  
  console.log('[Firebase] Initialized successfully ✓');
} catch (error) {
  console.error('[Firebase] Initialization failed:', error);
  alert('Firebase initialization failed. Please check your configuration.');
}
