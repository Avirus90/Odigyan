import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAsSkDiFZpk1eqMWS4qDDxx5ksZBONSJ4Q",
  authDomain: "odigyan-a5d08.firebaseapp.com",
  projectId: "odigyan-a5d08",
  storageBucket: "odigyan-a5d08.firebasestorage.app",
  messagingSenderId: "25985064791",
  appId: "1:25985064791:web:b935dbf321dbc0b2c5e812",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

const appRoot = document.getElementById("app");
const authBox = document.getElementById("authBox");

function setAuthUI(user) {
  authBox.innerHTML = "";
  if (!user) {
    const btn = document.createElement("button");
    btn.textContent = "Sign in with Google";
    btn.onclick = () => signInWithPopup(auth, provider);
    authBox.appendChild(btn);
    return;
  }

  const name = document.createElement("span");
  name.className = "small";
  name.textContent = user.displayName || user.email || "Logged in";

  const out = document.createElement("button");
  out.className = "secondary";
  out.textContent = "Logout";
  out.onclick = () => signOut(auth);

  authBox.append(name, out);
}

function htmlFromTemplate(id) {
  return document.getElementById(id).content.cloneNode(true);
}

async function loadHome() {
  appRoot.innerHTML = "";
  appRoot.appendChild(htmlFromTemplate("homeTpl"));
  const bannerArea = document.getElementById("bannerArea");
  try {
    const q = query(collection(db, "banners"), where("isActive", "==", true), orderBy("order", "asc"), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) {
      bannerArea.textContent = "No active banner found.";
      return;
    }
    const b = snap.docs[0].data();
    bannerArea.innerHTML = `<img src="${b.imageUrl}" alt="Banner" style="max-width:100%;border-radius:10px"/>`;
  } catch {
    bannerArea.textContent = "Banner not available (check Firestore rules/data).";
  }
}

async function loadCourses() {
  appRoot.innerHTML = "";
  appRoot.appendChild(htmlFromTemplate("coursesTpl"));
  const list = document.getElementById("courseList");
  list.innerHTML = "Loading…";

  try {
    const q = query(collection(db, "courses"), where("isPublished", "==", true), limit(20));
    const snap = await getDocs(q);
    list.innerHTML = "";
    if (snap.empty) {
      list.textContent = "No published courses.";
      return;
    }

    snap.forEach((docSnap) => {
      const c = docSnap.data();
      const card = document.createElement("div");
      card.className = "course";
      card.innerHTML = `
        <h4>${c.title || "Untitled Course"}</h4>
        <p class="small">${c.description || "No description"}</p>
        <p><strong>${c.isFree ? "Free" : `₹${c.price || "Paid"}`}</strong></p>
      `;
      list.appendChild(card);
    });
  } catch {
    list.textContent = "Unable to load courses from Firestore.";
  }
}

async function loadCurrentAffairs() {
  appRoot.innerHTML = "";
  appRoot.appendChild(htmlFromTemplate("currentTpl"));
  const list = document.getElementById("caList");
  list.innerHTML = "Loading…";

  try {
    const q = query(collection(db, "currentAffairs"), orderBy("publishedAt", "desc"), limit(20));
    const snap = await getDocs(q);
    list.innerHTML = "";
    if (snap.empty) {
      list.textContent = "No current affairs found.";
      return;
    }

    snap.forEach((docSnap) => {
      const a = docSnap.data();
      const article = document.createElement("article");
      article.innerHTML = `
        <h4>${a.title || "Untitled"}</h4>
        <p class="small">${a.category || "General"}</p>
        <p>${a.content || "No content"}</p>
      `;
      list.appendChild(article);
    });
  } catch {
    list.textContent = "Unable to load current affairs from Firestore.";
  }
}

function route() {
  const path = location.hash.replace(/^#/, "") || "/";
  if (path === "/courses") return loadCourses();
  if (path === "/current-affairs") return loadCurrentAffairs();
  return loadHome();
}

onAuthStateChanged(auth, (user) => setAuthUI(user));
window.addEventListener("hashchange", route);
route();
