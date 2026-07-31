import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X } from "lucide-react";

function Sidebar({
  user,
  setUser,
  conversations,
  activeChat,
  setActiveChat,
  userId,
  searchQuery,
  setSearchQuery,
  users,
  setUsers,
  onlineUsers,
  showSidebar,
  setShowSidebar,
  socket,
  fetchMessages,
  searchUsers,
  startConversation,
  showError,
  getOtherParticipant,
  isOnline,
  loading,
}) {
  const [showProfile, setShowProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileAvatarFile, setProfileAvatarFile] = useState(null);
  const [profileAvatarPreview, setProfileAvatarPreview] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const searchRef = useRef(null);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setUsers([]);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleOpenProfile = () => {
    setProfileName(user?.name || "");
    setProfileBio(user?.bio || "");
    setProfileAvatarFile(null);
    setProfileAvatarPreview(null);
    setShowProfile(true);
  };

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileAvatarFile(file);
    setProfileAvatarPreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!profileName.trim()) return;
    setSavingProfile(true);
    try {
      const formData = new FormData();
      formData.append("name", profileName.trim());
      formData.append("bio", profileBio.trim());
      if (profileAvatarFile) formData.append("avatar", profileAvatarFile);
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: formData,
      });
      if (!res.ok) { showError("Failed to update profile"); setSavingProfile(false); return; }
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
        setShowProfile(false);
      }
    } catch (e) { showError("Failed to update profile"); }
    finally { setSavingProfile(false); }
  };

  return (
    <>
      {showSidebar && <div className="sidebar-backdrop" onClick={() => setShowSidebar(false)} />}
      <div className={`sidebar ${showSidebar ? "open" : ""}`}>
        <div className="user-profile" onClick={handleOpenProfile} style={{ cursor: "pointer" }}>
          <div className="avatar">
            {user.avatarUrl ? <img src={user.avatarUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : user.name?.[0]}
          </div>
          <div className="user-info">
            <h3>{user.name}</h3>
            {user.bio && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{user.bio}</div>}
            <span className="status online">Online</span>
          </div>
        </div>
        <div className="search-box" ref={searchRef}>
          <input type="text" placeholder="Search users..." value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); searchUsers(e.target.value); }} />
          {users.length > 0 && (
            <motion.div className="search-results" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
              {users.map((u) => (
                <div key={u._id} className="search-item" onClick={() => startConversation(u._id)}>
                  <div className="search-avatar">{u.name?.[0]}</div>
                  <div><div className="search-name">{u.name}</div><div className="search-email">{u.email}</div></div>
                </div>
              ))}
            </motion.div>
          )}
        </div>
        <div className="conversations">
          {loading && <div className="loading-spinner" />}
          {!loading && conversations.length === 0 && <p className="empty-state">No conversations yet</p>}
          <AnimatePresence>
            {conversations.map((c) => {
              const other = getOtherParticipant(c);
              return (
                <motion.div key={c._id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                  className={`conversation-item ${activeChat?._id === c._id ? "active" : ""}`}
                  onClick={() => { setActiveChat(c); setShowSidebar(false); socket.emit("join-conversation", c._id); fetchMessages(c._id); }}>
                  <div className="conversation-avatar">{other?.name?.[0] || "?"}</div>
                  <div className="conversation-info">
                    <div className="conversation-name">
                      {other?.name || "Unknown"}
                      {other && <span className={`online-dot ${isOnline(String(other._id)) ? "online" : "offline"}`} />}
                    </div>
                    {c.lastMessage?.content && <div className="conversation-last">{c.lastMessage.content.slice(0, 40)}</div>}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showProfile && (
          <motion.div className="modal-overlay" onClick={() => setShowProfile(false)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal" onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}>
              <h3>Edit Profile</h3>
              <form onSubmit={handleUpdateProfile} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <div className="avatar" style={{ width: 72, height: 72, fontSize: 28, cursor: "pointer", position: "relative" }} onClick={() => avatarInputRef.current?.click()}>
                    {profileAvatarPreview ? <img src={profileAvatarPreview} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : user?.avatarUrl ? <img src={user.avatarUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : profileName?.[0] || user?.name?.[0]}
                    <div style={{ position: "absolute", bottom: 0, right: 0, background: "#fff", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border-glass)" }}>
                      <Camera size={14} style={{ color: "var(--text-secondary)" }} />
                    </div>
                  </div>
                  <input type="file" ref={avatarInputRef} accept="image/*" onChange={handleAvatarSelect}
                    style={{ position: "fixed", top: "-100px", left: "-100px", opacity: 0, pointerEvents: "none" }} />
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Tap to change photo</span>
                </div>
                <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>Name</label>
                <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Your name" required />
                <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>Bio</label>
                <textarea value={profileBio} onChange={(e) => setProfileBio(e.target.value)} placeholder="Tell about yourself..." rows={3}
                  style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-glass)", fontSize: 13, outline: "none", background: "var(--bg-deep)", color: "var(--text-primary)", resize: "none", fontFamily: "inherit" }}
                  maxLength={200} />
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                  <button type="button" className="small-btn cancel" onClick={() => setShowProfile(false)}>Cancel</button>
                  <button type="submit" className="small-btn" disabled={savingProfile} style={{ background: "var(--accent)", color: "#fff", border: "none" }}>{savingProfile ? "Saving..." : "Save"}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Sidebar;
