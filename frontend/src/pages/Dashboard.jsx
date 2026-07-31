import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { motion } from "framer-motion";
import { LogOut, Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import ChatWindow from "./ChatWindow";

let socket;
let seenMessageIds = new Set();

function getSocket() {
  if (!socket) {
    const url = import.meta.env.DEV ? 'http://localhost:5005' : undefined;
    socket = io(url, { autoConnect: false });
  }
  return socket;
}

function decodeToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(base64).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
    return JSON.parse(json);
  } catch { return null; }
}

function getUserIdFromToken() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  const payload = decodeToken(token);
  return payload ? String(payload._id) : null;
}

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try {
      const data = localStorage.getItem("user");
      if (!data) return null;
      const parsed = JSON.parse(data);
      return parsed._id
        ? { ...parsed, _id: String(parsed._id) }
        : { ...parsed, _id: String(parsed.id) };
    } catch { return null; }
  });
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [editText, setEditText] = useState("");
  const [showForward, setShowForward] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState({});
  const [mediaPreview, setMediaPreview] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const activeChatRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const sendingRef = useRef(false);

  const userId = getUserIdFromToken();

  const showError = (msg) => { setError(msg); setTimeout(() => setError(""), 3000); };

  const addMessages = useCallback((newMsgs) => {
    const filtered = newMsgs.filter((m) => !seenMessageIds.has(m._id));
    newMsgs.forEach((m) => seenMessageIds.add(m._id));
    if (filtered.length) {
      setMessages((prev) => [...prev, ...filtered]);
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const res = await fetch("/api/conversations", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.conversations) setConversations(data.conversations);
    } catch (e) { showError("Failed to load conversations"); }
    finally { setLoadingConversations(false); }
  }, []);

  const fetchMessages = useCallback(async (conversationId) => {
    seenMessageIds = new Set();
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/messages/${conversationId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) { showError("Failed to load messages"); return; }
      const data = await res.json();
      setMessages(data.messages || []);
      markAsRead(conversationId);
    } catch (e) { showError("Failed to load messages"); }
    finally { setLoadingMessages(false); }
  }, []);

  const markAsRead = async (conversationId) => {
    try {
      await fetch("/api/messages/read", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ conversationId }),
      });
    } catch (e) { /* ignore */ }
  };

  useEffect(() => {
    if (!getUserIdFromToken()) { navigate("/login"); return; }

    const fetchUser = async () => {
      try {
        const res = await fetch("/api/users/me", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user) { setUser(data.user); localStorage.setItem("user", JSON.stringify(data.user)); }
        }
      } catch (e) { /* ignore */ }
    };
    fetchUser();
    fetchConversations();

    const skt = getSocket();
    skt.auth = { token: localStorage.getItem("token") };
    if (!skt.connected) skt.connect();

    skt.on("connect", () => {
      setConnectionStatus("connected");
      if (activeChatRef.current) {
        skt.emit("join-conversation", activeChatRef.current._id);
      }
    });
    skt.on("disconnect", (reason) => {
      setConnectionStatus(reason === "io server disconnect" ? "disconnected" : "reconnecting");
    });
    skt.on("connect_error", () => setConnectionStatus("reconnecting"));
    const onNewMessage = (msg) => {
      const current = activeChatRef.current;
      if (current && String(msg.conversation) === String(current._id)) {
        addMessages([msg]);
      }
      fetchConversations();
      if (current && String(msg.conversation) === String(current._id)) {
        markAsRead(current._id);
      }
    };

    const onEdited = (msg) => {
      setMessages((prev) => prev.map((m) => m._id === msg._id ? msg : m));
    };

    const onDeleted = (msg) => {
      setMessages((prev) => prev.map((m) =>
        m._id === msg._id ? { ...m, content: msg.content, isDeleted: true } : m
      ));
    };

    const onTyping = ({ userId, conversationId, isTyping }) => {
      const key = `${conversationId}:${userId}`;
      setTypingUsers((prev) => {
        if (isTyping) return { ...prev, [key]: true };
        const next = { ...prev }; delete next[key]; return next;
      });
    };

    const onStatus = ({ userId, status }) => {
      setOnlineUsers((prev) => ({ ...prev, [userId]: status }));
    };

    const onReacted = ({ messageId, reactions }) => {
      setMessages((prev) => prev.map((m) =>
        m._id === messageId ? { ...m, reactions } : m
      ));
    };

    const onRead = ({ conversationId }) => {
      const uid = getUserIdFromToken();
      setMessages((prev) => prev.map((m) =>
        String(m.conversation) === String(conversationId) &&
        String(m.sender?._id || m.sender) !== uid
          ? { ...m, status: "read" } : m
      ));
      fetchConversations();
    };

    skt.on("new-message", onNewMessage);
    skt.on("message-edited", onEdited);
    skt.on("message-deleted", onDeleted);
    skt.on("user-typing", onTyping);
    skt.on("user-status", onStatus);
    skt.on("messages-read", onRead);
    skt.on("message-reacted", onReacted);

    return () => {
      skt.off("new-message", onNewMessage);
      skt.off("message-edited", onEdited);
      skt.off("message-deleted", onDeleted);
      skt.off("user-typing", onTyping);
      skt.off("user-status", onStatus);
      skt.off("messages-read", onRead);
      skt.off("message-reacted", onReacted);
      skt.off("connect_error");
      skt.off("connect");
      skt.off("disconnect");
    };
  }, []);

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  useEffect(() => {
    if (window.innerWidth <= 768 && !activeChat) setShowSidebar(true);
  }, [activeChat]);

  const searchUsers = async (q) => {
    if (!q.trim()) { setUsers([]); return; }
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) { /* ignore */ }
  };

  const startConversation = async (participantId) => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ participantId }),
      });
      if (!res.ok) { showError("Failed to create conversation"); return; }
      const data = await res.json();
      if (data.conversation) {
        setActiveChat(data.conversation); setUsers([]); setSearchQuery("");
        getSocket().emit("join-conversation", data.conversation._id);
        fetchMessages(data.conversation._id); fetchConversations();
      }
    } catch (e) { showError("Failed to create conversation"); }
  };

  const handleTyping = (e) => {
    setMessageText(e.target.value);
    const chat = activeChatRef.current;
    if (!chat) return;
    getSocket().emit("typing", { conversationId: chat._id, isTyping: true });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      getSocket().emit("typing", { conversationId: chat._id, isTyping: false });
    }, 1500);
  };

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/files/upload", {
        method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: formData,
      });
      if (!res.ok) { showError("Upload failed"); return null; }
      const data = await res.json();
      return data.file;
    } catch (e) { showError("Upload failed"); return null; }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadFile(file);
    if (result) setMediaPreview(result);
    e.target.value = "";
  };

  const handleCameraCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadFile(file);
    if (result) setMediaPreview(result);
    e.target.value = "";
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if ((!messageText.trim() && !mediaPreview) || !activeChat || sendingRef.current) return;
    sendingRef.current = true;
    getSocket().emit("typing", { conversationId: activeChat._id, isTyping: false });
    const body = { conversationId: activeChat._id, content: messageText || "" };
    if (mediaPreview) {
      body.mediaUrl = mediaPreview.url;
      body.messageType = mediaPreview.mimetype.startsWith("image/") ? "image"
        : mediaPreview.mimetype.startsWith("video/") ? "video"
        : mediaPreview.mimetype.startsWith("audio/") ? "audio" : "document";
    }
    if (replyTo) body.replyTo = replyTo._id;
    const text = messageText;
    setMessageText(""); setReplyTo(null); setMediaPreview(null);
    try {
      const res = await fetch("/api/messages", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) { showError("Failed to send message"); setMessageText(text); return; }
      const data = await res.json();
      if (data.message) { addMessages([data.message]); fetchConversations(); }
    } catch (e) { showError("Failed to send message"); setMessageText(text); }
    finally { sendingRef.current = false; }
  };

  const handleEdit = async (msgId) => {
    if (!editText.trim()) return;
    try {
      const res = await fetch(`/api/messages/${msgId}`, {
        method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ content: editText }),
      });
      if (!res.ok) { showError("Failed to edit message"); return; }
      const data = await res.json();
      setMessages((prev) => prev.map((m) => m._id === msgId ? data.message : m));
      setEditingMsg(null); setEditText("");
    } catch (e) { showError("Failed to edit message"); }
  };

  const handleDelete = async (msgId) => {
    if (!confirm("Delete this message?")) return;
    try {
      const res = await fetch(`/api/messages/${msgId}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) { showError("Failed to delete message"); return; }
      const data = await res.json();
      setMessages((prev) => prev.map((m) => m._id === msgId ? { ...m, content: data.message.content, isDeleted: true } : m));
    } catch (e) { showError("Failed to delete message"); }
  };

  const handleReact = async (msgId, emoji) => {
    try {
      const res = await fetch(`/api/messages/${msgId}/react`, {
        method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ emoji }),
      });
      if (!res.ok) { showError("Failed to react"); return; }
      const data = await res.json();
      setMessages((prev) => prev.map((m) => m._id === msgId ? { ...m, reactions: data.reactions } : m));
    } catch (e) { showError("Failed to react"); }
  };

  const handleForward = async (msgId, targetConvId) => {
    try {
      const res = await fetch("/api/messages/forward", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ messageId: msgId, targetConversationId: targetConvId }),
      });
      if (!res.ok) { showError("Failed to forward message"); return; }
      setShowForward(null); showError("Message forwarded!");
    } catch (e) { showError("Failed to forward message"); }
  };

  const getOtherParticipant = (conv) => {
    if (!conv?.participants) return null;
    return conv.participants.find((p) => String(p._id) !== userId);
  };

  const isOnline = (uid) => onlineUsers[uid] === "online";

  const getTypingText = () => {
    if (!activeChat) return "";
    const other = getOtherParticipant(activeChat);
    if (!other) return "";
    const key = `${activeChat._id}:${other._id}`;
    if (typingUsers[key]) return `${other.name} is typing...`;
    return "";
  };

  const handleLogout = () => { getSocket().disconnect(); localStorage.clear(); navigate("/"); };

  if (!user) return null;

  return (
    <div className="dashboard-container">
      <div className="dashboard-scene">
      <motion.div className="dashboard-header" initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 100, damping: 22 }}>
        <div className="dashboard-header-left">
          <button className="menu-btn" onClick={() => setShowSidebar(true)} title="Open sidebar">
            <Menu size={18} />
          </button>
          <h1>Vync</h1>
        </div>
        <button onClick={handleLogout} className="logout-btn" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <LogOut size={14} /> <span className="logout-text">Logout</span>
        </button>
      </motion.div>
      {error && <motion.div className="error-bar" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0 }}>{error}</motion.div>}
      {connectionStatus !== "connected" && (
        <motion.div className={`connection-bar ${connectionStatus}`} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
          {connectionStatus === "reconnecting" ? "Reconnecting..." : "Disconnected"}
        </motion.div>
      )}
      <div className="dashboard-body">
        <Sidebar
          user={user}
          setUser={setUser}
          conversations={conversations}
          activeChat={activeChat}
          setActiveChat={setActiveChat}
          userId={userId}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          users={users}
          setUsers={setUsers}
onlineUsers={onlineUsers}
            showSidebar={showSidebar}
            setShowSidebar={setShowSidebar}
            socket={getSocket()}
            loading={loadingConversations}
          fetchMessages={fetchMessages}
          searchUsers={searchUsers}
          startConversation={startConversation}
          showError={showError}
          getOtherParticipant={getOtherParticipant}
          isOnline={isOnline}
        />
        <div className="chat-area">
          <ChatWindow
            activeChat={activeChat}
            messages={messages}
            userId={userId}
            replyTo={replyTo}
            setReplyTo={setReplyTo}
            editingMsg={editingMsg}
            setEditingMsg={setEditingMsg}
            editText={editText}
            setEditText={setEditText}
            messageText={messageText}
            mediaPreview={mediaPreview}
            setMediaPreview={setMediaPreview}
            typingUsers={typingUsers}
            showForward={showForward}
            setShowForward={setShowForward}
            conversations={conversations}
            socket={getSocket()}
            setShowSidebar={setShowSidebar}
            sendMessage={sendMessage}
            fetchConversations={fetchConversations}
            handleTyping={handleTyping}
            handleEdit={handleEdit}
            handleDelete={handleDelete}
            handleReact={handleReact}
            handleForward={handleForward}
            handleFileSelect={handleFileSelect}
            handleCameraCapture={handleCameraCapture}
            showError={showError}
            getOtherParticipant={getOtherParticipant}
            isOnline={isOnline}
            getTypingText={getTypingText}
            loadingMessages={loadingMessages}
          />
        </div>
      </div>
      </div>
    </div>
  );
}

export default Dashboard;
