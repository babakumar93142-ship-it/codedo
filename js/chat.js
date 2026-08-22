// ===== CodeGuru — Friends & Chat =====
import { db, watchAuth, loginWithGoogle, logout } from "./auth.js";
import {
  collection, query, where, getDocs, addDoc, doc, updateDoc,
  onSnapshot, orderBy, serverTimestamp, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = (sel) => document.querySelector(sel);
const gate = $("#gate");
const wrap = $("#chatWrap");
const friendList = $("#friendList");
const requestsBox = $("#requestsBox");
const searchInput = $("#friendSearch");
const searchResults = $("#searchResults");
const chatMsgs = $("#chatMsgs");
const chatInput = $("#chatInput");
const chatHeader = $("#chatHeader");
const sendBtn = $("#sendBtn");

let me = null;
let myProfile = null;
let activeFriendId = null;
let unsubMsgs = null;

watchAuth((user, profile) => {
  if (!user) {
    gate.style.display = "block";
    wrap.style.display = "none";
    $("#gateBtn").onclick = () => loginWithGoogle().catch(e => alert(e.message));
    return;
  }
  me = user;
  myProfile = profile;
  gate.style.display = "none";
  wrap.style.display = "grid";
  loadFriendsAndRequests();
});

// ---- search users by email to add as friend ----
searchInput.addEventListener("keydown", async (e) => {
  if (e.key !== "Enter") return;
  const term = searchInput.value.trim().toLowerCase();
  if (!term) return;
  const snap = await getDocs(collection(db, "users"));
  const matches = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(u => u.id !== me.uid && u.email.toLowerCase().includes(term));

  searchResults.innerHTML = matches.map(u => `
    <div class="f-item">
      ${u.name} <span style="color:var(--muted);font-size:11px">(${u.email})</span>
      <button class="btn ghost" data-id="${u.id}" style="float:right;padding:3px 8px;font-size:11px">Add friend</button>
    </div>
  `).join("") || `<div class="empty">No user found</div>`;

  searchResults.querySelectorAll("button").forEach(btn => {
    btn.onclick = async () => {
      await addDoc(collection(db, "friendRequests"), {
        from: me.uid,
        fromName: myProfile.name,
        to: btn.dataset.id,
        status: "pending",
        createdAt: serverTimestamp()
      });
      btn.textContent = "Sent ✓";
      btn.disabled = true;
    };
  });
});

// ---- load incoming requests + accepted friends ----
async function loadFriendsAndRequests() {
  const reqSnap = await getDocs(query(
    collection(db, "friendRequests"),
    where("to", "==", me.uid), where("status", "==", "pending")
  ));
  const requests = reqSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  requestsBox.innerHTML = requests.length ? requests.map(r => `
    <div class="f-item">
      ${r.fromName} wants to connect
      <button class="btn" data-id="${r.id}" data-from="${r.from}" style="float:right;padding:3px 8px;font-size:11px">Accept</button>
    </div>
  `).join("") : "";

  requestsBox.querySelectorAll("button").forEach(btn => {
    btn.onclick = async () => {
      await updateDoc(doc(db, "friendRequests", btn.dataset.id), { status: "accepted" });
      loadFriendsAndRequests();
    };
  });

  const acceptedSnap = await getDocs(query(
    collection(db, "friendRequests"),
    where("status", "==", "accepted")
  ));
  const friendUids = acceptedSnap.docs
    .map(d => d.data())
    .filter(r => r.from === me.uid || r.to === me.uid)
    .map(r => r.from === me.uid ? r.to : r.from);

  if (!friendUids.length) {
    friendList.innerHTML = `<div class="empty">Koi friend nahi hai abhi. Upar search karke add karo.</div>`;
    return;
  }

  const friends = [];
  for (const uid of friendUids) {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) friends.push({ id: uid, ...snap.data() });
  }

  friendList.innerHTML = friends.map(f => `
    <div class="f-item" data-id="${f.id}" data-name="${f.name}">${f.name}</div>
  `).join("");

  friendList.querySelectorAll(".f-item").forEach(item => {
    item.onclick = () => openChat(item.dataset.id, item.dataset.name, item);
  });
}

function chatIdFor(a, b) {
  return [a, b].sort().join("_");
}

function openChat(friendId, friendName, el) {
  activeFriendId = friendId;
  document.querySelectorAll(".friend-list .f-item.active").forEach(e => e.classList.remove("active"));
  el.classList.add("active");
  chatHeader.textContent = friendName;
  chatInput.disabled = false;
  sendBtn.disabled = false;

  if (unsubMsgs) unsubMsgs();
  const chatId = chatIdFor(me.uid, friendId);
  const msgsRef = collection(db, "chats", chatId, "messages");
  const q = query(msgsRef, orderBy("createdAt", "asc"));

  unsubMsgs = onSnapshot(q, (snap) => {
    chatMsgs.innerHTML = snap.docs.map(d => {
      const m = d.data();
      const mine = m.senderId === me.uid;
      return `<div class="msg ${mine ? "mine" : "theirs"}">${escapeHtml(m.text)}</div>`;
    }).join("");
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
  });
}

sendBtn.onclick = sendMessage;
chatInput.addEventListener("keydown", (e) => { if (e.key === "Enter") sendMessage(); });

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text || !activeFriendId) return;
  const chatId = chatIdFor(me.uid, activeFriendId);
  await setDoc(doc(db, "chats", chatId), { members: [me.uid, activeFriendId] }, { merge: true });
  await addDoc(collection(db, "chats", chatId, "messages"), {
    text, senderId: me.uid, createdAt: serverTimestamp()
  });
  chatInput.value = "";
}

function escapeHtml(str = "") {
  return str.replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}
