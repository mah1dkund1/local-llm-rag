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

const generateTitle = (text: string , maxLength: number = 30): string => {
  if (text.length <= maxLength) return text;

  const truncated = text.slice(0,  maxLength);
  const lastSpaceIndex = truncated.lastIndexOf("");

  const cleanTruncated = lastSpaceIndex > 0 ? truncated.slice(0, lastSpaceIndex) : truncated;

  return cleanTruncated + "...";


} ;

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
            ? generateTitle(newMessages[0].content)
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
    if (uploading) return;
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
  <div className="relative flex h-screen bg-[#0B0E1A] overflow-hidden">
    {/* Ambient glow, sits behind everything, barely visible */}
    <div className="pointer-events-none absolute -top-40 left-1/3 w-[600px] h-[600px] bg-gradient-to-br from-indigo-600/20 to-purple-600/10 rounded-full blur-3xl" />

    {/* Sidebar */}
    <div className="relative w-64 bg-gradient-to-b from-[#12162A] to-[#0F1226] text-white flex flex-col border-r border-white/[0.06]">
     
      
      
      <div className="p-4 border-b border-white/[0.06]">
    <h2 className="text-white font-semibold">Yapper GPT</h2>
  </div>
      
      <div className="flex-1 overflow-y-auto px-1.5 space-y-0.5">
        {chats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => setActiveChatId(chat.id)}
            className={`group flex justify-between items-center px-3 py-2.5 rounded-lg cursor-pointer text-sm border-l-2 transition-all duration-200 ${
              chat.id === activeChatId
                ? "bg-white/[0.06] border-purple-400 text-white"
                : "border-transparent text-[#8B90B3] hover:bg-white/[0.03] hover:text-[#E8E9F5]"
            }`}
          >
            <span className="truncate font-medium">{chat.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteChat(chat.id);
              }}
              className="text-[#8B90B3] hover:text-red-400 ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
       <button
        onClick={createNewChat}
        className="m-3 p-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-sm font-medium text-white shadow-lg shadow-purple-900/30 transition-all duration-200"
      >
        + New chat
      </button>
    </div>

    {/* Main chat panel */}
    <div className="relative flex-1 flex flex-col">
      <div className="p-4 bg-white/[0.02] backdrop-blur-md border-b border-white/[0.06]">
        <h1 className="text-lg font-semibold text-[#E8E9F5] tracking-tight">
          {activeChat ? activeChat.title : "Local LLM Chat"}
        </h1>
        {activeChat?.documentName && (
          <p className="text-xs text-purple-300/80 mt-1 font-medium">
            📄 {activeChat.documentName} attached
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {activeChat?.messages.map((msg, index) => (
          <div
            key={index}
            className={`flex animate-[fadeSlideIn_0.25s_ease-out] ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-900/20"
                  : "bg-white/[0.04] backdrop-blur-sm text-[#E8E9F5] border border-white/[0.06]"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[70%] px-4 py-2.5 rounded-2xl bg-white/[0.04] text-[#8B90B3] border border-white/[0.06] text-sm">
              Thinking...
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white/[0.02] backdrop-blur-md border-t border-white/[0.06] flex gap-2 items-center">
        <label
          className={`cursor-pointer px-3 py-2 rounded-xl border text-sm font-medium transition-all duration-200 ${
            activeChat?.documentId
              ? "bg-purple-500/15 border-purple-400/40 text-purple-200"
              : uploading
              ? "bg-white/[0.03] border-white/[0.08] text-[#8B90B3]"
              : "bg-white/[0.03] border-white/[0.08] text-[#8B90B3] hover:bg-white/[0.06] hover:text-[#E8E9F5]"
          }`}
        >
          {uploading ? "Uploading..." : activeChat?.documentId ? "📎 Attached" : "📎 Attach"}
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
          className="flex-1 border border-white/[0.08] rounded-xl px-4 py-2.5 bg-white/[0.03] text-[#E8E9F5] placeholder:text-[#8B90B3] focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400/40 transition-all duration-200"
        />
        <button
          onClick={sendMessage}
          disabled={loading || uploading}
          className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-purple-900/30 transition-all duration-200 disabled:opacity-40 disabled:shadow-none"
        >
          Send
        </button>
      </div>
    </div>
  </div>
);
}