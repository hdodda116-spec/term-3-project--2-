import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { MdSend, MdEmojiEmotions, MdAutoFixHigh, MdSearch, MdAdd, MdClose } from 'react-icons/md';
import EmojiPicker from 'emoji-picker-react';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://term-3-project-2.onrender.com';
const socket = io(BACKEND_URL, { autoConnect: false });

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [activeChat, setActiveChat] = useState(null); // Can be a username or a groupName
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Group Modal States
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);

  const messagesEndRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const handleAIFix = async () => {
    if (!currentMessage.trim()) return;
    setIsFixing(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat/fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: currentMessage }),
      });
      
      const data = await response.json();
      if (data.correctedText) {
        setCurrentMessage(data.correctedText);
      }
    } catch (error) {
      console.error("Failed to fix message:", error);
    } finally {
      setIsFixing(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    socket.on('connect', () => console.log('Connected to server'));
    socket.on('login_success', (user) => {
      setIsJoined(true);
      setLoginError('');
    });
    socket.on('login_error', (error) => {
      setLoginError(error);
      socket.disconnect();
    });
    socket.on('online_users', (users) => setOnlineUsers(users));
    
    socket.on('sync_groups', (fetchedGroups) => {
      setGroups(fetchedGroups);
    });

    socket.on('group_created', (newGroup) => {
      setGroups((prev) => [...prev, newGroup]);
    });

    socket.on('receive_private_message', (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      socket.off('connect');
      socket.off('login_success');
      socket.off('login_error');
      socket.off('online_users');
      socket.off('sync_groups');
      socket.off('group_created');
      socket.off('receive_private_message');
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleJoin = (e) => {
    e.preventDefault();
    if (username.trim() && password.trim()) {
      socket.connect();
      socket.emit('join', { username, password });
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (currentMessage.trim() && activeChat) {
      const messageData = {
        sender: username,
        receiver: activeChat,
        text: currentMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      socket.emit('private_message', messageData);
      setMessages((prev) => [...prev, messageData]);
      setCurrentMessage('');
      setShowEmojiPicker(false);
    }
  };

  const handleCreateGroup = (e) => {
    e.preventDefault();
    if (newGroupName.trim() && selectedMembers.length > 0) {
      const membersToInclude = [...selectedMembers, username]; // Add self to group
      socket.emit('create_group', { name: newGroupName.trim(), members: membersToInclude });
      setIsGroupModalOpen(false);
      setNewGroupName('');
      setSelectedMembers([]);
    }
  };

  const toggleMemberSelection = (member) => {
    if (selectedMembers.includes(member)) {
      setSelectedMembers(selectedMembers.filter(m => m !== member));
    } else {
      setSelectedMembers([...selectedMembers, member]);
    }
  };

  const onEmojiClick = (emojiObject) => {
    setCurrentMessage(prevInput => prevInput + emojiObject.emoji);
  };

  const filteredUsers = onlineUsers.filter(u => u !== username && u.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredGroups = groups.filter(g => g.members.includes(username) && g.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (!isJoined) {
    return (
      <div className="login-screen">
        <motion.div 
          className="login-card"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h1>Neon Chat</h1>
          <p>Demo users: Alice, Bob, Charlie<br/>(Password: password123)</p>
          <form onSubmit={handleJoin}>
            <input
              type="text"
              className="login-input"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
            <input
              type="password"
              className="login-input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {loginError && <motion.p initial={{opacity:0}} animate={{opacity:1}} style={{color: '#ff4d4d', marginTop: '-1rem', marginBottom: '1rem', fontSize: '0.9rem'}}>{loginError}</motion.p>}
            <button type="submit" className="btn-primary" disabled={!username.trim() || !password.trim()}>
              Enter Network
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <motion.div 
        className="sidebar"
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="sidebar-header">
          <div className="sidebar-top">
            <div className="user-profile">
              <div className="avatar">{username.charAt(0).toUpperCase()}</div>
              <div>
                <span style={{ fontWeight: 'bold' }}>{username}</span>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <motion.span 
                    key={onlineUsers.length}
                    initial={{ scale: 1.5, color: '#00ffff' }}
                    animate={{ scale: 1, color: 'var(--text-secondary)' }}
                    transition={{ duration: 0.5 }}
                  >
                    {onlineUsers.length}
                  </motion.span> Online Users
                </div>
              </div>
            </div>
            <button className="create-group-btn" onClick={() => setIsGroupModalOpen(true)} title="Create Group">
              <MdAdd size={22} />
            </button>
          </div>
          
          <div className="search-container">
            <MdSearch size={20} className="search-icon" />
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search contacts..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="contact-list">
          {filteredGroups.length > 0 && <div className="section-title">Groups</div>}
          <AnimatePresence>
            {filteredGroups.map((group, index) => (
              <motion.div 
                key={group.name} 
                className={`contact-item ${activeChat === group.name ? 'active' : ''}`}
                onClick={() => setActiveChat(group.name)}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="avatar" style={{ background: 'linear-gradient(135deg, #00ffff, #0088ff)' }}>
                  {group.name.charAt(0).toUpperCase()}
                </div>
                <div className="contact-info">
                  <div className="contact-name">{group.name}</div>
                  <div className="contact-status">
                    {group.members.length} Members
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          <div className="section-title">Direct Messages</div>
          <AnimatePresence>
            {filteredUsers.map((user, index) => (
              <motion.div 
                key={user} 
                className={`contact-item ${activeChat === user ? 'active' : ''}`}
                onClick={() => setActiveChat(user)}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="avatar">{user.charAt(0).toUpperCase()}</div>
                <div className="contact-info">
                  <div className="contact-name">{user}</div>
                  <div className="contact-status">
                    <span className="status-dot"></span> Online
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredUsers.length === 0 && filteredGroups.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No contacts found.
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Chat Area */}
      <div className="chat-area">
        {!activeChat ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}
          >
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(0, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', boxShadow: '0 0 30px rgba(0, 255, 255, 0.2)' }}>
              <MdSend size={40} color="var(--accent-cyan)" />
            </div>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>Neon Network</h2>
            <p>Select a contact or group to initiate transmission.</p>
          </motion.div>
        ) : (
          <>
            <div className="chat-header">
              <div className="contact-info" style={{ marginLeft: 0 }}>
                <div className="contact-name" style={{ fontSize: '1.2rem' }}>{activeChat}</div>
                <div className="contact-status" style={{ color: 'var(--text-secondary)' }}>
                  {groups.some(g => g.name === activeChat) ? 'Group Chat' : 'Direct Message'}
                </div>
              </div>
            </div>

            <div className="chat-messages">
              <AnimatePresence>
                {messages.filter(msg => {
                  const isGroupChat = groups.some(g => g.name === activeChat);
                  if (isGroupChat) {
                    return msg.receiver === activeChat;
                  }
                  return (msg.sender === username && msg.receiver === activeChat) || 
                         (msg.sender === activeChat && msg.receiver === username);
                }).map((msg, index) => {
                  const isSentByMe = msg.sender === username;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`message ${isSentByMe ? 'message-sent' : 'message-received'}`}
                    >
                      {!isSentByMe && <div className="message-sender">{msg.sender}</div>}
                      <div className="message-text">{msg.text}</div>
                      <div className="message-time">{msg.timestamp}</div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-container">
              <div ref={emojiPickerRef}>
                <button className="emoji-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)} type="button">
                  <MdEmojiEmotions size={26} />
                </button>
                <AnimatePresence>
                  {showEmojiPicker && (
                    <motion.div 
                      className="emoji-picker-wrapper"
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    >
                      <EmojiPicker onEmojiClick={onEmojiClick} theme="dark" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button
                className={`ai-fix-btn ${isFixing ? 'fixing' : ''}`}
                onClick={handleAIFix}
                type="button"
                title="AI Correct & Rewrite"
                disabled={isFixing || !currentMessage.trim()}
              >
                <MdAutoFixHigh size={24} />
              </button>
              <form style={{ flex: 1, display: 'flex', gap: '1rem', alignItems: 'center' }} onSubmit={handleSendMessage}>
                <input
                  type="text"
                  className="chat-input"
                  placeholder={`Message ${activeChat}...`}
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  disabled={isFixing}
                />
                <button type="submit" className="btn-send" disabled={!currentMessage.trim()}>
                  <MdSend size={22} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* Group Creation Modal */}
      <AnimatePresence>
        {isGroupModalOpen && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
            >
              <h2>Create New Group</h2>
              <input 
                type="text" 
                className="login-input" 
                placeholder="Group Name" 
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              
              <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Select Members:</h3>
              <div className="checkbox-list">
                {onlineUsers.filter(u => u !== username).map(user => (
                  <label key={user} className="checkbox-item">
                    <input 
                      type="checkbox" 
                      checked={selectedMembers.includes(user)}
                      onChange={() => toggleMemberSelection(user)}
                      style={{ accentColor: 'var(--accent-cyan)' }}
                    />
                    <span style={{ color: 'var(--text-primary)' }}>{user}</span>
                  </label>
                ))}
                {onlineUsers.filter(u => u !== username).length === 0 && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No other users currently online.</p>
                )}
              </div>

              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => {
                  setIsGroupModalOpen(false);
                  setNewGroupName('');
                  setSelectedMembers([]);
                }}>
                  Cancel
                </button>
                <button 
                  className="btn-primary" 
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim() || selectedMembers.length === 0}
                  style={{ flex: 1, padding: '0.8rem' }}
                >
                  Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
