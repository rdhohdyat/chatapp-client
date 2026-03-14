import { useState, useEffect, type KeyboardEvent } from 'react';
import io, { Socket } from 'socket.io-client';
import { Send, LogIn, LogOut, MessageSquare } from 'lucide-react';

interface MessageData {
  room: string;
  author: string;
  message: string;
  time: string;
  avatar: string;
}

const socket: Socket = io('http://localhost:3001');

const App = () => {
  const [username, setUsername] = useState<string>("");
  const [room, setRoom] = useState<string>("");
  const [showChat, setShowChat] = useState<boolean>(false);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const [messageList, setMessageList] = useState<MessageData[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [avatar, setAvatar] = useState<string>(`https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`);

  const generateNewAvatar = () => {
    const newSeed = Math.random();
    setAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${newSeed}`);
  };

  const joinRoom = (): void => {
    if (username !== "" && room !== "") {
      socket.emit("join_room", room);
      setShowChat(true);
    }
  };

  const sendMessage = async (): Promise<void> => {
    if (currentMessage !== "") {
      const messageData: MessageData = {
        room: room,
        author: username,
        message: currentMessage,
        avatar: avatar,
        time:
          new Date(Date.now()).getHours() +
          ":" +
          new Date(Date.now()).getMinutes().toString().padStart(2, '0'),
      };

      await socket.emit("send_message", messageData);
      setMessageList((list) => [...list, messageData]);
      setCurrentMessage("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, action: () => void): void => {
    if (e.key === "Enter") {
      action();
    }
  };

  useEffect(() => {
    const handleReceiveMessage = (data: MessageData) => {
      setMessageList((list) => [...list, data]);
    };

    const handleTyping = (data: { username: string, room: string }) => {
      setTypingUsers((prev) => {
        if (!prev.includes(data.username)) {
          return [...prev, data.username];
        }
        return prev;
      });
    };

    const handleStopTyping = (data: { username: string, room: string }) => {
      setTypingUsers((prev) => prev.filter(user => user !== data.username));
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("typing", handleTyping);
    socket.on("stop_typing", handleStopTyping);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("typing", handleTyping);
      socket.off("stop_typing", handleStopTyping);
    };
  }, []);

  if (!showChat) {
    return (
      <div className="auth-container">
        <MessageSquare size={48} color="#6366f1" style={{ marginBottom: '1rem' }} />
        <h1>SkyChat</h1>
        <p>Connect with friends in real-time</p>
        <div className="avatar-selector">
          <img src={avatar} alt="Profile" className="preview-avatar" />
          <button onClick={generateNewAvatar} className="random-btn">
            Change Avatar
          </button>
        </div>
        <div className="input-group">
          <input
            type="text"
            placeholder="Your Name"
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="text"
            placeholder="Room ID (e.g. general)"
            onChange={(e) => setRoom(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, joinRoom)}
          />
        </div>
        <button onClick={joinRoom} style={{ width: '100%' }}>
          Join Room
          <LogIn size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="chat-app">
      <div className="chat-header">
        <div className="header-info">
          <div className="status-dot"></div>
          <div>
            <h3>Room: {room}</h3>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Logged in as {username}
            </span>
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{ background: 'transparent', padding: '8px', border: 'none', cursor: 'pointer' }}
        >
          <LogOut size={20} color="#ef4444" />
        </button>
      </div>

      <div className="chat-messages">
        {messageList.map((content, index) => (
          <div
            key={index}
            className={`message-box ${username === content.author ? "send" : "receive"}`}
          >
            <div className="message-wrapper">
              <img src={content.avatar} alt="Avatar" className="chat-avatar" />
              <div className="message-content-group">
                <div className="message-content">
                  <p>{content.message}</p>
                </div>
                <div className="message-meta">
                  <span>{content.author === username ? "You" : content.author}</span>
                  <span>{content.time}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            <div className="typing-dots">
              <span></span><span></span><span></span>
            </div>
            <p>{typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...</p>
          </div>
        )}
      </div>

      <div className="chat-footer">
        <input
          type="text"
          value={currentMessage}
          placeholder="Type a message..."
          onChange={(e) => {
            setCurrentMessage(e.target.value);
            if (e.target.value !== "") {
              socket.emit("typing", { username, room });
            } else {
              socket.emit("stop_typing", { username, room });
            }
          }}
          onBlur={() => socket.emit("stop_typing", { username, room })}
          onKeyDown={(e) => handleKeyDown(e, sendMessage)}
        />
        <button className="send-btn" onClick={sendMessage}>
          <Send size={24} />
        </button>
      </div>
    </div>
  );
};

export default App;
