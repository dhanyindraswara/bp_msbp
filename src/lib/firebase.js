// Firebase initialization. Only starts if a config is present; otherwise the
// store falls back to localStorage. Uses a persistent (IndexedDB) Firestore
// cache so the app keeps working offline and syncs when back online.
import { initializeApp } from 'firebase/app'
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'
import { getFunctions } from 'firebase/functions'
import { firebaseConfig, firebaseEnabled } from './firebaseConfig.js'

let db = null
let auth = null
let storage = null
let functions = null

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
    auth = getAuth(app)
    storage = getStorage(app)
    functions = getFunctions(app, 'us-central1')
  } catch (e) {
    console.error('Firebase init failed — falling back to localStorage.', e)
    db = null
    auth = null
    storage = null
    functions = null
  }
}

export { db, auth, storage, functions, firebaseEnabled }
