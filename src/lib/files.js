// Cloud Storage file attachments. Files (PDF/PNG) are uploaded to Cloud Storage;
// their metadata + download URL live in a Firestore subcollection
// `bp_documents/{docId}/files/{fileId}`. Firebase-only (no localStorage fallback).
import { db, storage, firebaseEnabled } from './firebase.js'
import { collection, doc, onSnapshot, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { getCurrentUser } from './store.js'

const rid = (p) => p + Math.random().toString(36).slice(2, 9)
export const filesEnabled = firebaseEnabled && !!storage

function kindOf(file) {
  const t = (file.type || '').toLowerCase()
  if (t.includes('pdf')) return 'pdf'
  if (t.includes('image')) return 'png'
  return 'file'
}

// Live-subscribe to a document's files. Returns an unsubscribe function.
export function subscribeFiles(docId, cb) {
  if (!filesEnabled || !docId) {
    cb([])
    return () => {}
  }
  const q = query(collection(db, 'bp_documents', docId, 'files'), orderBy('createdAt', 'desc'))
  return onSnapshot(
    q,
    (snap) => {
      const arr = []
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }))
      cb(arr)
    },
    (e) => {
      console.error('files listener error', e)
      cb([])
    },
  )
}

export async function uploadFile(docId, file) {
  if (!filesEnabled) throw new Error('Storage not available')
  const id = rid('f')
  const path = `bp/${docId}/files/${id}-${file.name}`
  const r = ref(storage, path)
  await uploadBytes(r, file, { contentType: file.type || 'application/octet-stream' })
  const url = await getDownloadURL(r)
  const meta = {
    name: file.name,
    kind: kindOf(file),
    url,
    path,
    size: file.size || 0,
    uploadedBy: getCurrentUser(),
    createdAt: Date.now(),
  }
  await setDoc(doc(db, 'bp_documents', docId, 'files', id), meta)
  return { id, ...meta }
}

export async function deleteFile(docId, f) {
  if (!filesEnabled) return
  try {
    await deleteObject(ref(storage, f.path))
  } catch (e) {
    /* object may already be gone */
  }
  await deleteDoc(doc(db, 'bp_documents', docId, 'files', f.id))
}
