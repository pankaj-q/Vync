import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Paperclip, Camera, Mic, MicOff, Search, X, Check, CheckCheck, Reply, Forward, Edit3, Trash2, ChevronLeft } from "lucide-react";

const msgVariants = {
  initial: { opacity: 0, y: 20, scale: 0.9, rotateX: -10 },
  animate: { opacity: 1, y: 0, scale: 1, rotateX: 0 },
  exit: { opacity: 0, scale: 0.9, rotateX: 10, transition: { duration: 0.15 } },
};

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const MORE_EMOJIS = ["😍", "🔥", "🎉", "💯", "✅", "⭐", "👏", "💪", "🤣", "🥹", "😎", "🤗", "😡", "💀", "🙌", "✨", "🫡", "😭", "🥺", "🤔", "😴", "🥳", "👀", "💅"];

function ChatWindow({
  activeChat,
  messages,
  userId,
  replyTo,
  setReplyTo,
  editingMsg,
  setEditingMsg,
  editText,
  setEditText,
  messageText,
  mediaPreview,
  setMediaPreview,
  showForward,
  setShowForward,
  conversations,
  socket,
  setShowSidebar,
  sendMessage,
  handleTyping,
  handleEdit,
  handleDelete,
  handleReact,
  handleForward,
  handleFileSelect,
  handleCameraCapture,
  showError,
  getOtherParticipant,
  isOnline,
  getTypingText,
  fetchConversations,
  loadingMessages,
}) {
  const messagesEndRef = useRef(null);
  const editInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [reactingMsgId, setReactingMsgId] = useState(null);
  const [showMore, setShowMore] = useState(false);
  const pickerRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDur, setRecordingDur] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const streamRef = useRef(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setLocalSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { editInputRef.current?.focus(); }, [editingMsg]);

  useEffect(() => {
    if (!reactingMsgId) return;
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setReactingMsgId(null);
        setShowMore(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [reactingMsgId]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        clearInterval(recordingTimerRef.current);
        setRecordingDur(0);
        setIsRecording(false);
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], "voice.webm", { type: "audio/webm" });
        const formData = new FormData();
        formData.append("file", file);
        try {
          const res = await fetch("/api/files/upload", {
            method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            body: formData,
          });
          if (!res.ok) { showError("Upload failed"); stream.getTracks().forEach(t => t.stop()); return; }
          const data = await res.json();
          const body = { conversationId: activeChat._id, content: "", mediaUrl: data.file.url, messageType: "voice" };
          const msgRes = await fetch("/api/messages", {
            method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
            body: JSON.stringify(body),
          });
          if (!msgRes.ok) showError("Failed to send voice message");
          fetchConversations();
        } catch (e) { showError("Upload failed"); }
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
      const start = Date.now();
      recordingTimerRef.current = setInterval(() => setRecordingDur(Math.floor((Date.now() - start) / 1000)), 200);
    } catch (e) { showError("Microphone access denied"); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleSearch = (value) => {
    setLocalSearchQuery(value);
    clearTimeout(searchTimeoutRef.current);
    if (!value.trim()) { setSearchResults([]); return; }
    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/messages/${activeChat?._id}/search?q=${encodeURIComponent(value.trim())}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (res.ok) { const data = await res.json(); setSearchResults(data.messages || []); }
      } catch (e) { /* ignore */ }
      setIsSearching(false);
    }, 300);
  };

  const highlightText = (text, query) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={i} className="search-highlight">{part}</mark>
        : part
    );
  };

  if (!activeChat) {
    return (
      <motion.div className="no-chat-selected" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h2>Select a conversation to start chatting</h2>
      </motion.div>
    );
  }

  return (
    <>
      <div className="chat-window">
        <div className="chat-header">
          {showSearch ? (
            <div className="chat-search-bar">
              <input type="text" placeholder="Search messages..." value={searchQuery} autoFocus
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") { setShowSearch(false); setLocalSearchQuery(""); setSearchResults([]); } }} />
              <button className="icon-btn small-icon-btn" onClick={() => { setShowSearch(false); setLocalSearchQuery(""); setSearchResults([]); }} title="Close search">
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <button className="back-btn" onClick={() => setShowSidebar(true)} title="Back to conversations">
                <ChevronLeft size={20} />
              </button>
              <div className="chat-user-avatar">{getOtherParticipant(activeChat)?.name?.[0] || "?"}</div>
              <div style={{ flex: 1 }}>
                <div className="chat-user-name">{getOtherParticipant(activeChat)?.name || "Unknown"}</div>
                <div className="chat-user-status">
                  {getOtherParticipant(activeChat) && isOnline(String(getOtherParticipant(activeChat)._id))
                    ? <span className="online">Online</span>
                    : <span className="offline">Offline</span>}
                </div>
              </div>
              <button className="icon-btn small-icon-btn" onClick={() => setShowSearch(true)} title="Search messages">
                <Search size={16} />
              </button>
            </>
          )}
        </div>
        <div className="messages-container">
          {searchResults.length > 0 && (
            <div className="search-results-bar">{searchResults.length} result{searchResults.length > 1 ? "s" : ""} found</div>
          )}
          {messages.length === 0 && searchResults.length === 0 && !showSearch && <div className="no-messages" style={{ textAlign: "center", color: "#9ca3af", margin: "auto", fontSize: 14 }}>No messages yet. Start a conversation!</div>}
          {loadingMessages && messages.length === 0 && <div className="loading-spinner" />}
          <AnimatePresence initial={false}>
            {(showSearch ? searchResults : messages).map((msg) => {
              const senderId = String(msg.sender?._id || msg.sender || '');
              const isMine = senderId === userId;
              return (
                <motion.div key={msg._id} layout
                  variants={msgVariants} initial="initial" animate="animate" exit="exit"
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  className={`message ${isMine ? "mine" : "theirs"}`}
                  onDoubleClick={() => setReactingMsgId(reactingMsgId === msg._id ? null : msg._id)}>
                  {editingMsg === msg._id ? (
                    <div className="edit-mode">
                      <input ref={editInputRef} value={editText} onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleEdit(msg._id); if (e.key === "Escape") { setEditingMsg(null); setEditText(""); } }} />
                      <div className="edit-actions">
                        <button onClick={() => handleEdit(msg._id)} className="small-btn"><Edit3 size={11} style={{ marginRight: 4 }} />Save</button>
                        <button onClick={() => { setEditingMsg(null); setEditText(""); }} className="small-btn cancel">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="message-bubble">
                      {msg.replyTo && (
                        <div className="reply-preview">
                          <Reply size={10} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                          <span>Replying to {msg.replyTo.sender?.name || "someone"}</span>
                          <span className="reply-text">{msg.replyTo.content?.slice(0, 50)}</span>
                        </div>
                      )}
                      {msg.mediaUrl && !msg.isDeleted && (
                        <div className="message-media">
                          {msg.messageType === "image" && <img src={msg.mediaUrl} alt="image" loading="lazy" />}
                          {msg.messageType === "video" && <video src={msg.mediaUrl} controls preload="metadata" />}
                          {msg.messageType === "audio" && <audio src={msg.mediaUrl} controls />}
                          {msg.messageType === "voice" && <div className="voice-message"><audio src={msg.mediaUrl} controls /></div>}
                          {msg.messageType === "document" && <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="file-link">Download file</a>}
                        </div>
                      )}
                      <div className={`message-text ${msg.isDeleted ? "deleted" : ""}`}>
                        {msg.isDeleted ? msg.content : showSearch ? highlightText(msg.content, searchQuery) : msg.content}
                      </div>
                      <div className="message-footer">
                        <span className="message-time">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {msg.isEdited && !msg.isDeleted && <span className="edited-badge"> edited</span>}
                        </span>
                        {isMine && (
                          <span className="status-icon">
                            {msg.status === "read" ? <CheckCheck size={14} /> : <Check size={14} />}
                          </span>
                        )}
                        {isMine && !msg.isDeleted && (
                          <div className="message-actions">
                            <button className="action-btn" title="Edit" onClick={() => { setEditingMsg(msg._id); setEditText(msg.content); }}><Edit3 size={12} /></button>
                            <button className="action-btn" title="Delete" onClick={() => handleDelete(msg._id)}><Trash2 size={12} /></button>
                            <button className="action-btn" title="Reply" onClick={() => setReplyTo(msg)}><Reply size={12} /></button>
                            <button className="action-btn" title="Forward" onClick={() => setShowForward(msg)}><Forward size={12} /></button>
                          </div>
                        )}
                        {!isMine && !msg.isDeleted && (
                          <div className="message-actions">
                            <button className="action-btn" title="Reply" onClick={() => setReplyTo(msg)}><Reply size={12} /></button>
                            <button className="action-btn" title="Forward" onClick={() => setShowForward(msg)}><Forward size={12} /></button>
                          </div>
                        )}
                      </div>
                      {msg.reactions?.length > 0 && (
                        <div className="message-reactions">
                          {msg.reactions.reduce((acc, r) => {
                            const existing = acc.find(e => e.emoji === r.emoji);
                            if (existing) existing.users.push(r.user);
                            else acc.push({ emoji: r.emoji, users: [r.user] });
                            return acc;
                          }, []).map(({ emoji, users }) => (
                            <button key={emoji} className={`reaction-badge ${users.some(u => String(u._id || u) === userId) ? "mine" : ""}`}
                              onClick={() => handleReact(msg._id, emoji)}
                              title={users.map(u => u.name || "Unknown").join(", ")}>
                              {emoji} {users.length}
                            </button>
                          ))}
                          <button className="reaction-add" onClick={() => handleReact(msg._id, "👍")}>+</button>
                        </div>
                      )}
                    </div>
                  )}
                  {reactingMsgId === msg._id && (
                    <div className="reaction-picker" ref={pickerRef}>
                      {REACTIONS.map(emoji => (
                        <button key={emoji} className="reaction-option" onClick={() => { handleReact(msg._id, emoji); setReactingMsgId(null); setShowMore(false); }}>
                          {emoji}
                        </button>
                      ))}
                      <button className="reaction-option more-btn" onClick={() => setShowMore(!showMore)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      </button>
                      {showMore && (
                        <div className="emoji-grid">
                          {MORE_EMOJIS.map(emoji => (
                            <button key={emoji} className="reaction-option" onClick={() => { handleReact(msg._id, emoji); setReactingMsgId(null); setShowMore(false); }}>
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
        <AnimatePresence>
          {getTypingText() && (
            <motion.div className="typing-indicator"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              {getTypingText()}
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {replyTo && (
            <motion.div className="reply-bar"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
              <Reply size={14} style={{ flexShrink: 0, color: "#22c55e" }} />
              <span>Replying to <strong>{String(replyTo.sender?._id || replyTo.sender) === userId ? "yourself" : replyTo.sender?.name}</strong></span>
              <span className="reply-text">{replyTo.content?.slice(0, 60)}</span>
              <button className="small-btn cancel" onClick={() => setReplyTo(null)} style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}><X size={12} /></button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="input-area">
        <AnimatePresence>
          {mediaPreview && (
            <motion.div className="media-preview"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              {mediaPreview.mimetype.startsWith("image/") && <img src={mediaPreview.url} alt="preview" />}
              {mediaPreview.mimetype.startsWith("video/") && <video src={mediaPreview.url} controls />}
              {mediaPreview.mimetype.startsWith("audio/") && <audio src={mediaPreview.url} controls />}
              {!mediaPreview.mimetype.startsWith("image/") && !mediaPreview.mimetype.startsWith("video/") && !mediaPreview.mimetype.startsWith("audio/") && <span>{mediaPreview.filename}</span>}
              <button className="small-btn cancel" onClick={() => setMediaPreview(null)} style={{ display: "flex", alignItems: "center", gap: 4 }}><X size={12} /></button>
            </motion.div>
          )}
        </AnimatePresence>
        <form className="message-input-row" onSubmit={sendMessage}>
          <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" onChange={handleCameraCapture}
            style={{ position: 'fixed', top: '-100px', left: '-100px', opacity: 0, pointerEvents: 'none' }} />
          <button type="button" className="icon-btn" onClick={() => cameraInputRef.current?.click()} title="Take photo">
            <Camera size={18} />
          </button>
          <input type="file" ref={fileInputRef} accept="image/*,video/*,audio/*" onChange={handleFileSelect}
            style={{ position: 'fixed', top: '-100px', left: '-100px', opacity: 0, pointerEvents: 'none' }} />
          <button type="button" className="icon-btn" onClick={() => fileInputRef.current?.click()} title="Attach file">
            <Paperclip size={18} />
          </button>
          {isRecording ? (
            <div className="recording-active">
              <span className="recording-dot" />
              <span className="recording-time">{String(recordingDur).padStart(2, "0")}s</span>
              <button type="button" className="icon-btn recording-stop-btn" onClick={stopRecording} title="Stop recording">
                <MicOff size={18} />
              </button>
            </div>
          ) : (
            <button type="button" className="icon-btn" onClick={startRecording} title="Record voice" disabled={!activeChat}>
              <Mic size={18} />
            </button>
          )}
          <input type="text" placeholder="Type a message..." value={messageText}
            onChange={handleTyping} />
          <button type="submit" className="icon-btn send-btn" disabled={!messageText.trim() && !mediaPreview} title="Send">
            <Send size={18} />
          </button>
        </form>
      </div>

      <AnimatePresence>
        {showForward && (
          <motion.div className="modal-overlay" onClick={() => setShowForward(null)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal" onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}>
              <h3>Forward message</h3>
              <div className="forward-list">
                {conversations.filter((c) => c._id !== activeChat?._id).map((c) => {
                  const other = getOtherParticipant(c);
                  return (
                    <div key={c._id} className="forward-item" onClick={() => handleForward(showForward._id, c._id)}>
                      <div className="forward-avatar">{other?.name?.[0] || "?"}</div>
                      <span>{other?.name || "Unknown"}</span>
                    </div>
                  );
                })}
                {conversations.filter((c) => c._id !== activeChat?._id).length === 0 && (
                  <p className="empty-state">No other conversations</p>
                )}
              </div>
              <button className="small-btn cancel" onClick={() => setShowForward(null)} style={{ alignSelf: "flex-end", display: "flex", alignItems: "center", gap: 4 }}><X size={12} /> Cancel</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ChatWindow;
