"use client";

import { useState, useEffect } from "react";


type Message = 
{
  role: "user" | "assistant";
  content: string;
}

type Chat = {
  id: string;
  title: string ;
  messages: Message[];
  documentId: string | null;
  documentName: string | null;


};

const STORAGE_KEY = "chat-lists";


export default function Home(){
  
  //states for prompt , input , and loading status
  
  const [chats, setChats] = useState<Chat[]>([]);

  const [activeChatId, setActiveChatId] = useState<string | null>(null);


  const[input, setInput] = useState("");

  const[loading , setLoading] = useState(false);

  const[uploading, setUploading] = useState(false);

  const [uploadError, setUploadError] = useState<string | null>(null);



useEffect(() => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed: Chat[] = JSON.parse(saved);
    setChats(parsed);
    if(parsed.length > 0) {
      setActiveChatId(parsed[0].id);
    }

  }
}, []);

useEffect(() => {
  if (chats.length> 0){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  }

}, [chats]) ;

const activeChat = chats.find((c) => c.id === activeChatId);

const createNewChat = () => {
  const newChat: Chat = {
    id: crypto.randomUUID(),
    title: "New chat",
    messages: [],
    documentId: null,
    documentName: null,
  };
  setChats((prev) => [newChat, ...prev]);
  setActiveChatId(newChat.id);
};

const deleteChat = (id: string) => {
  setChats((prev) => prev.filter((c) => c.id !== id));
  if (activeChatId === id)
  {
    setActiveChatId(null);
  }
};

const updateActiveChatMessages = (updater: (prev: Message[]) => Message[]) => {
    setChats((prev) =>
      prev.map((c) => {
        if (c.id !== activeChatId) return c;

        const newMessages = updater(c.messages);
        const newTitle =
          c.messages.length === 0 && newMessages.length > 0
            ? newMessages[0].content.slice(0, 30)
            : c.title;

        return { ...c, messages: newMessages, title: newTitle };
      })
    );
 };

 const handleFileSelect =  async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if(!activeChatId){
    createNewChat();
  }

  setUploading(true);
  setUploadError(null);

  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("http://localhost:8000/upload", {
      method: "POST",
      body: formData,

    });

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`);

    }

    const data = await response.json();

    setChats((prev) =>
      prev.map((c) =>
      c.id === activeChatId ? 
    { ...c, documentId: data.document_id, documentName: data.filename }
    : c
  )  
    );

  } catch (error) {
    console.error("Upload Failed:", error);
    setUploadError("Failed to upload document. Please try again.");
    
  }

  finally {
    setUploading(false);
    e.target.value = "";
  }
};


  const sendMessage = async () => {
    if (input.trim() === "") return ;

    if(!activeChatId) {
      createNewChat();
      return ;
    }

   const userMessage: Message = {role: "user", content: input };

   updateActiveChatMessages((prev) => [...prev, userMessage]);

   setInput("");

   setLoading(true);

   try {

    const response = await fetch("http://localhost:8000/chat", {
      method: "POST",
      headers: {"Content-Type": "application/json" },
      body: JSON.stringify({
         message: userMessage.content,
         document_id: activeChat?.documentId ?? null,
      }),
    });

    const data = await response.json();

    const assistantMessage: Message = {
      role: "assistant",
      content: data.reply,
    };

    updateActiveChatMessages((prev) => [...prev, assistantMessage]);
   }
     catch (error) {
      console.error ("Failed to get response: ", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "Error: could not reach the backend.",

      };

      updateActiveChatMessages((prev) => [...prev, errorMessage]);
     } finally {
      setLoading(false);
     }

  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white flex flex-col">
        <button
          onClick={createNewChat}
          className="m-3 p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm"
        >
          + New chat
        </button>
        <div className="flex-1 overflow-y-auto">
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setActiveChatId(chat.id)}
              className={`flex justify-between items-center px-3 py-2 cursor-pointer text-sm ${
                chat.id === activeChatId
                  ? "bg-gray-700"
                  : "hover:bg-gray-800"
              }`}
            >
              <span className="truncate">{chat.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteChat(chat.id);
                }}
                className="text-gray-400 hover:text-red-400 ml-2"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat panel */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 bg-white border-b border-gray-300">
          <h1 className="text-lg font-semibold text-gray-800">
            {activeChat ? activeChat.title : "Local LLM Chat"}
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeChat?.messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] px-4 py-2 rounded-lg ${
                  msg.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-800 border border-gray-300"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[70%] px-4 py-2 rounded-lg bg-white text-gray-500 border border-gray-300">
                Thinking...
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-gray-300 flex gap-2 items-centre">

          <label
            className={`cursor-pointer px-3 py-2 rounded-lg border text-sm ${
              activeChat?.documentId
              ? "bg-green-700 border-green-600 text-white"
              : uploading
              ? "bg-gray-700 border-gray-600 text-gray-400"
              : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
            }`}
            >

              {uploading ? "Uploading..." : activeChat?.documentId ? "Attached" : "Attach"}
              <input
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
                />
            </label>

{uploadError && (
  <span className="text-xs text-red-400">{uploadError}</span>
)}


          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}