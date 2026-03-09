let fbApp = null;
let fbDB = null;

const FB_CONFIG = {
  apiKey: "AIzaSyDbwgEONtKoCBK8TU8PAVMYkcWkA1ZWl40",
  authDomain: "loteria-e5950.firebaseapp.com",
  databaseURL: "https://loteria-e5950-default-rtdb.firebaseio.com",
  projectId: "loteria-e5950",
  storageBucket: "loteria-e5950.firebasestorage.app",
  messagingSenderId: "417635731733",
  appId: "1:417635731733:web:94f68af25cc22d9d67811c"
};

export function initFirebase() {
  if (fbApp) return { fbApp, fbDB };
  fbApp = firebase.initializeApp(FB_CONFIG);
  fbDB = firebase.database();
  return { fbApp, fbDB };
}

export function getDB() {
  if (!fbDB) initFirebase();
  return fbDB;
}
