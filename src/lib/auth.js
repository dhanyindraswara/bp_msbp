// Firebase Authentication (Google sign-in). When Firebase isn't configured
// (localStorage mode), auth is bypassed so the app still runs locally.
import { auth, firebaseEnabled } from './firebase.js'
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'

export { firebaseEnabled }

// Subscribe to sign-in state. In local mode, immediately report "no auth needed".
export function watchAuth(cb) {
  if (!firebaseEnabled || !auth) {
    cb(null)
    return () => {}
  }
  return onAuthStateChanged(auth, cb)
}

export function signInGoogle() {
  if (!auth) return Promise.reject(new Error('Auth not available'))
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  return signInWithPopup(auth, provider)
}

export function signOutUser() {
  if (!auth) return Promise.resolve()
  return signOut(auth)
}
