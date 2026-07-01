// Firebase initialization. Only starts if a config is present; otherwise the
// store falls back to localStorage. Uses a persistent (IndexedDB) Firestore
// cache so the app keeps working offline and syncs when back online.
import { initializeApp } from 'firebase/app'
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { firebaseConfig, firebaseEnabled } from './firebaseConfig.js'

let db = null

if (firebaseEnabled) {
  try {
    const app = initializeApp(firebaseConfig)
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      })
    } catch (e) {
      // Persistent cache can fail (e.g. private mode) — fall back to default.
      db = getFirestore(app)
    }
  } catch (e) {
    console.error('Firebase init failed — falling back to localStorage.', e)
    db = null
  }
}

export { db, firebaseEnabled }
