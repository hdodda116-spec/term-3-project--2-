import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { MdSend, MdEmojiEmotions, MdAutoFixHigh } from 'react-icons/md';
import EmojiPicker from 'emoji-picker-react';
import './App.css';

// Initialize socket connection outside component to avoid reconnects on render
// But connect only when user logs in
const socket = io('http://localhost:5000', { autoConnect: false });

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [activeChat, setActiveChat] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const messagesEndRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const handleAIFix = async () => {
    if (!currentMessage.trim()) return;
    setIsFixing(true);
    try {
      const response = await fetch("http://localhost:5000/api/chat/fix", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Socket event listeners
    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('login_success', (user) => {
      setIsJoined(true);
      setLoginError('');
    });

    socket.on('login_error', (error) => {
      setLoginError(error);
      socket.disconnect();
    });

    socket.on('online_users', (users) => {
      setOnlineUsers(users);
    });

    socket.on('receive_private_message', (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on('user_joined', (user) => {
      // Optional: Add a system message "User joined"
    });

    socket.on('user_left', (user) => {
      // Optional: Add a system message "User left"
    });

    return () => {
      socket.off('connect');
      socket.off('login_success');
      socket.off('login_error');
      socket.off('online_users');
      socket.off('receive_private_message');
      socket.off('user_joined');
      socket.off('user_left');
    };
  }, []);

  // Handle clicking outside emoji picker to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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

      // Emit to server
      socket.emit('private_message', messageData);
      
      // Update local state immediately
      setMessages((prev) => [...prev, messageData]);
      setCurrentMessage('');
      setShowEmojiPicker(false);
    }
  };

  const onEmojiClick = (emojiObject) => {
    setCurrentMessage(prevInput => prevInput + emojiObject.emoji);
  };

  if (!isJoined) {
    return (
      <div className="login-screen fade-in">
        <div className="login-card">
          <h1>Welcome to Chat</h1>
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
            {loginError && <p style={{color: '#ff4d4d', marginTop: '-1rem', marginBottom: '1rem', fontSize: '0.9rem'}}>{loginError}</p>}
            <button type="submit" className="btn-primary" disabled={!username.trim() || !password.trim()}>
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container fade-in">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="user-profile">
            <div className="avatar">{username.charAt(0).toUpperCase()}</div>
            <span>{username}</span>
          </div>
        </div>
        
        <div className="contact-list">
          {/* List of online users (excluding self) */}
          {onlineUsers.filter(u => u !== username).map((user, index) => (
            <div 
              key={index} 
              className={`contact-item ${activeChat === user ? 'active' : ''}`}
              onClick={() => setActiveChat(user)}
              style={{ backgroundColor: activeChat === user ? 'var(--bg-secondary)' : '' }}
            >
              <div className="avatar">{user.charAt(0).toUpperCase()}</div>
              <div className="contact-info">
                <div className="contact-name">{user}</div>
                <div className="contact-status">
                  <span className="status-dot"></span> Online
                </div>
              </div>
            </div>
          ))}
          {onlineUsers.filter(u => u !== username).length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No other users online.
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="chat-area">
        {!activeChat ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>
            <h2>Welcome to Chat</h2>
            <p style={{ marginTop: '10px' }}>Select a contact from the sidebar to start messaging.</p>
          </div>
        ) : (
          <>
            <div className="chat-header">
              <div className="contact-info" style={{ marginLeft: 0 }}>
                <div className="contact-name">{activeChat}</div>
                <div className="contact-status" style={{ color: 'var(--text-secondary)' }}>
                  Online
                </div>
              </div>
            </div>

            <div className="chat-messages">
              {messages.filter(msg => 
                (msg.sender === username && msg.receiver === activeChat) || 
                (msg.sender === activeChat && msg.receiver === username)
              ).map((msg, index) => {
                const isSentByMe = msg.sender === username;
                return (
                  <div
                    key={index}
                    className={`message ${isSentByMe ? 'message-sent' : 'message-received'}`}
                  >
                    {!isSentByMe && <div className="message-sender">{msg.sender}</div>}
                    <div className="message-text">{msg.text}</div>
                    <div className="message-time">{msg.timestamp}</div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-container">
              <div ref={emojiPickerRef}>
                <button 
                  className="emoji-btn" 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  type="button"
                >
                  <MdEmojiEmotions size={28} />
                </button>
                {showEmojiPicker && (
                  <div className="emoji-picker-wrapper">
                    <EmojiPicker 
                      onEmojiClick={onEmojiClick}
                      theme="dark"
                      searchDisabled={false}
                      skinTonesDisabled={true}
                    />
                  </div>
                )}
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
                  placeholder="Type a message..."
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  disabled={isFixing}
                />
                <button 
                  type="submit" 
                  className="btn-send"
                  disabled={!currentMessage.trim()}
                >
                  <MdSend size={22} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
