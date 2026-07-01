// Firebase web app config.
//
// Paste the config from Firebase console → Project settings → Your apps → Web app.
// The apiKey is a PUBLIC client identifier (it is meant to ship in the browser),
// so it is fine to keep here in the repo. Access is controlled by Firestore
// Security Rules, not by hiding this key.
//
// Leave apiKey empty ('') to run the app on localStorage only (no backend).
export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
}

export const firebaseEnabled = !!firebaseConfig.apiKey
