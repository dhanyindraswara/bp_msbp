// Firebase initialization. Only starts if a config is present; otherwise the
// store falls back to localStorage.
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { firebaseConfig, firebaseEnabled } from './firebaseConfig.js'

let db = null

if (firebaseEnabled) {
  try {
    const app = initializeApp(firebaseConfig)
    db = getFirestore(app)
  } catch (e) {
    console.error('Firebase init failed — falling back to localStorage.', e)
    db = null
  }
}

export { db, firebaseEnabled }
