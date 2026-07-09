"use client";

import { useState, useEffect } from "react";


type Message = 
{
  role: "user" | "assistant";
  content: string;
}

const STORAGE_KEY = "chat-history";


export default function Home(){
  
  //states for prompt , input , and loading status
  
  const [messages, setMessages] = useState<Message[]>([]);

  const[input, setInput] = useState("");

  const[loading , setLoading] = useState(false);



useEffect(() => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    setMessages(JSON.parse(saved));

  }
}, []);

useEffect(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  const sendMessage = async () => {
    if ( input.trim() === "") return;

    const userMessage: Message = { role: "user", content: input  } ;
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {

      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify({message: userMessage.content }),

      });

      const data = await response.json();

      const assistantMessage: Message = {
        role: "assistant",
        content: data.reply,
      
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Failed to get response", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "Error: could not reach the backend.",

      };

      setMessages((prev) => [...prev, errorMessage]);

    }  finally {
      setLoading(false);

    }

  } ;

const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === "Enter") {
    sendMessage();
  }
};

const clearChat = () => {
  setMessages([]);
  localStorage.removeItems(STORAGE_KEY);
}

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      <div className="flex justify-between items-center p-4 bg-gray-900 border-b border-gray-800">
        <h1 className="text-lg font-semibold text-gray-100">Local LLM Chat</h1>
        <button
          onClick={clearChat}
          className="text-sm text-gray-400 hover:text-red-400"
        >
          Clear chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[70%] px-4 py-2 rounded-lg ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-100 border border-gray-700"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[70%] px-4 py-2 rounded-lg bg-gray-800 text-gray-400 border border-gray-700">
              Thinking...
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-gray-900 border-t border-gray-800 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 border border-gray-700 rounded-lg px-4 py-2 bg-gray-800 text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}