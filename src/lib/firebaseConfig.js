// Firebase web app config.
//
// The apiKey is a PUBLIC client identifier (it is meant to ship in the browser),
// so it is fine to keep here in the repo. Access is controlled by Firestore
// Security Rules, not by hiding this key.
//
// Leave apiKey empty ('') to run the app on localStorage only (no backend).
export const firebaseConfig = {
  apiKey: 'AIzaSyD_Wnzf9aqegF0s4lxJVn7rFF_rPq5NlDA',
  authDomain: 'stones-bp.firebaseapp.com',
  projectId: 'stones-bp',
  storageBucket: 'stones-bp.firebasestorage.app',
  messagingSenderId: '650600312208',
  appId: '1:650600312208:web:bcca7adbbb7e16f2795715',
}

export const firebaseEnabled = !!firebaseConfig.apiKey
