import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, Image as ImageIcon, X, User, Mic, Square, Play, Trash2, Check } from 'lucide-react';
import { ChatMessage, Coach } from '../types';
import { getAiCoachResponse } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';
import { MessageMenu } from './MessageMenu';

interface ChatProps {
  currentUserId?: string;
  coachName?: string;
  selectedCoachId?: string;
  isCoachView?: boolean;
  onMessagesRead?: () => void;
}

export const Chat: React.FC<ChatProps> = ({ currentUserId: propUserId, coachName: initialCoachName, selectedCoachId, isCoachView, onMessagesRead }) => {
  const [coachName, setCoachName] = useState(initialCoachName);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (!selectedCoachId) return [];
    try {
      const cacheKey = `chat_cache_${selectedCoachId}`;
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return [];
      const parsed = JSON.parse(cached);
      return Array.isArray(parsed) ? parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(() => {
    if (!selectedCoachId) return false;
    const cacheKey = `chat_cache_${selectedCoachId}`;
    return !localStorage.getItem(cacheKey);
  });
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(propUserId || null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const markMessagesAsRead = async (userId: string, senderId: string) => {
    if (!userId || !senderId) return;
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_id', userId)
        .eq('sender_id', senderId)
        .eq('is_read', false);

      if (error) {
        console.error("Error marking messages as read:", error);
      }
      if (onMessagesRead) onMessagesRead();
    } catch (err) {
      console.error("Critical error in markMessagesAsRead:", err);
    }
  };

  useEffect(() => {
    let channel: any;
    let isMounted = true;

    const setupChat = async () => {
      try {
        // Only show individual loading if no cache
        const cacheKey = `chat_cache_${selectedCoachId}`;
        const cached = localStorage.getItem(cacheKey);
        if (!cached && isMounted) {
          setIsLoading(true);
          setMessages([]);
        }

        if (isMounted) {
          const userId = propUserId;
          if (!userId) {
            // Only fetch session if NOT passed via props to save time
            const { data: { session } } = await supabase.auth.getSession();
            if (session && isMounted) {
              setCurrentUserId(session.user.id);
            } else if (isMounted) {
              setIsLoading(false);
              return;
            }
          } else {
            setCurrentUserId(userId);
          }
        }

        const userId = propUserId || (await supabase.auth.getSession()).data.session?.user.id;
        if (!userId) {
          if (isMounted) setIsLoading(false);
          return;
        }

        if (selectedCoachId) {
          // fetch messages and coach info in parallel
          Promise.all([
            fetchMessages(userId, isMounted),
            fetchCoachInfo()
          ]);

          // mark as read in background, don't await to avoid UI block
          markMessagesAsRead(userId, selectedCoachId);
        } else {
          if (isMounted) setIsLoading(false);
        }

        if (!isMounted) return;

        // Subscribe to real-time messages
        channel = supabase
          .channel(`realtime:messages:${userId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `receiver_id=eq.${userId}`,
            },
            (payload: any) => {
              if (!isMounted) return;
              const newMsg = payload.new;
              if (newMsg.sender_id === selectedCoachId) {
                setMessages(prev => [...prev, {
                  id: newMsg.id,
                  senderId: newMsg.sender_id,
                  receiverId: newMsg.receiver_id,
                  text: newMsg.text,
                  imageUrl: newMsg.image_url,
                  audioUrl: newMsg.audio_url,
                  timestamp: new Date(newMsg.created_at),
                  isAi: false
                }]);
                markMessagesAsRead(userId, selectedCoachId);
              }
            }
          )
          .subscribe();

      } catch (err) {
        console.error("Error in setupChat:", err);
        if (isMounted) setIsLoading(false);
      }
    };

    setupChat();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [selectedCoachId]);

  const fetchMessages = async (userId: string, isMounted: boolean = true) => {
    if (!selectedCoachId) return;

    try {
      // Simplify query to the absolute minimum: just messages where user is sender or receiver
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (data && isMounted) {
        // Filter client-side to be 100% sure we have ONLY this conversation
        const conversationMessages = data.filter(m =>
          (m.sender_id === userId && m.receiver_id === selectedCoachId) ||
          (m.sender_id === selectedCoachId && m.receiver_id === userId)
        );

        const formattedMessages = conversationMessages.map(m => ({
          id: m.id,
          senderId: m.sender_id,
          receiverId: m.receiver_id,
          text: m.text,
          imageUrl: m.image_url,
          audioUrl: m.audio_url,
          timestamp: new Date(m.created_at),
          isAi: false,
          editedAt: m.edited_at ? new Date(m.edited_at) : undefined,
          editedText: m.edited_text,
          isDeleted: m.is_deleted,
          deletedForSender: m.deleted_for_sender,
          deletedForReceiver: m.deleted_for_receiver,
          deletedAt: m.deleted_at ? new Date(m.deleted_at) : undefined
        })).reverse();

        setMessages(formattedMessages);
        // Save to cache
        localStorage.setItem(`chat_cache_${selectedCoachId}`, JSON.stringify(formattedMessages));
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      if (isMounted) setIsLoading(false);
    }
  };

  const fetchCoachInfo = async () => {
    if (!selectedCoachId) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', selectedCoachId)
      .single();

    if (data) {
      setCoachName(data.name);
    }
  };

  const clearChat = async () => {
    if (!currentUserId || !selectedCoachId) return;
    if (!window.confirm("حذف كل الرسائل؟ لا يمكن التراجع عن هذا الإجراء.")) return;

    try {
      setIsLoading(true);
      // Nuclear delete: split into two simple requests to ensure bypass filter limitations
      await Promise.all([
        supabase.from('messages').delete().match({ sender_id: currentUserId, receiver_id: selectedCoachId }),
        supabase.from('messages').delete().match({ sender_id: selectedCoachId, receiver_id: currentUserId })
      ]);

      setMessages([]);
      localStorage.removeItem(`chat_cache_${selectedCoachId}`);
    } catch (err) {
      console.error("Error clearing chat:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error starting recording:", err);
      alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const deleteRecording = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }
    setAudioUrl(null);
    setAudioBlob(null);
    setRecordingTime(0);
    setIsPreviewPlaying(false);
  };

  const togglePreviewPlayback = () => {
    if (previewAudioRef.current) {
      if (isPreviewPlaying) {
        previewAudioRef.current.pause();
      } else {
        previewAudioRef.current.play();
      }
      setIsPreviewPlaying(!isPreviewPlaying);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage && !audioBlob) || !currentUserId || !selectedCoachId) return;

    let finalAudioUrl = null;

    if (audioBlob) {
      const fileName = `${currentUserId}/${Date.now()}.webm`;
      const { data, error: uploadError } = await supabase.storage
        .from('audio-messages')
        .upload(fileName, audioBlob);

      if (uploadError) {
        console.error('Audio upload error:', uploadError);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('audio-messages')
        .getPublicUrl(fileName);

      finalAudioUrl = publicUrl;
    }

    const newMessage = {
      sender_id: currentUserId,
      receiver_id: selectedCoachId,
      text: input,
      image_url: selectedImage || null,
      audio_url: finalAudioUrl
    };

    // Optimistic update
    const tempId = Date.now().toString();
    setMessages(prev => [...prev, {
      id: tempId,
      senderId: currentUserId,
      receiverId: selectedCoachId,
      text: input,
      imageUrl: selectedImage || undefined,
      audioUrl: audioUrl || undefined,
      timestamp: new Date(),
      isAi: false
    }]);

    setInput('');
    setSelectedImage(null);
    setAudioUrl(null);
    setAudioBlob(null);

    const { data, error } = await supabase
      .from('messages')
      .insert([newMessage])
      .select()
      .single();

    if (error) {
      console.error("Error sending message:", error);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      alert(`Failed to send message: ${error.message}`);
    }
  };

  const handleEditMessage = (messageId: string, currentText: string) => {
    setEditingMessageId(messageId);
    setEditText(currentText);
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!editText.trim()) return;

    try {
      const { error } = await supabase.rpc('edit_message', {
        message_id: messageId,
        new_text: editText.trim()
      });

      if (error) throw error;

      // Update local state
      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? {
            ...msg,
            editedText: msg.editedText || msg.text,
            text: editText.trim(),
            editedAt: new Date()
          }
          : msg
      ));

      setEditingMessageId(null);
      setEditText('');
    } catch (err) {
      console.error('Error editing message:', err);
      alert('Failed to edit message');
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  const handleDeleteMessage = async (messageId: string, deleteForEveryone: boolean) => {
    try {
      if (deleteForEveryone) {
        const { error } = await supabase.rpc('delete_message_for_everyone', {
          message_id: messageId
        });

        if (error) throw error;

        // Update local state - mark as deleted
        setMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? { ...msg, isDeleted: true, deletedAt: new Date() }
            : msg
        ));
      } else {
        const { error } = await supabase.rpc('delete_message_for_me', {
          message_id: messageId
        });

        if (error) throw error;

        // Remove from local state (delete for me)
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
      }
    } catch (err) {
      console.error('Error deleting message:', err);
      alert('Failed to delete message');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] animate-fade-in">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-4 pb-4 border-b border-zinc-800">
        <div className="w-10 h-10 bg-lime-400/20 rounded-full flex items-center justify-center text-lime-400">
          {isCoachView ? <User size={20} /> : <Bot size={20} />}
        </div>
        <div className="flex-1">
          <h2 className="text-white font-bold">{coachName || (isCoachView ? 'Athlete' : 'Gym Smart AI')}</h2>
          <div className="flex items-center space-x-2">
            <p className="text-xs text-lime-400 flex items-center">
              <span className="w-1.5 h-1.5 bg-lime-400 rounded-full mr-1.5 animate-pulse"></span>
              Online
            </p>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
          title="Clear Conversation"
        >
          <Trash2 size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide relative">
        {isLoading && messages.length > 0 && (
          <div className="absolute top-0 right-0 bg-zinc-900/80 px-2 py-1 rounded-bl-lg text-[8px] text-lime-400 flex items-center z-10">
            <span className="w-1 h-1 bg-lime-400 rounded-full mr-1 animate-pulse"></span>
            Updating...
          </div>
        )}
        {messages.length === 0 && !isTyping && !isLoading ? (
          <div className="text-center py-20 text-zinc-600 text-sm">
            {isCoachView ? "Start a conversation with your athlete." : "No messages yet. Say hi to your coach!"}
          </div>
        ) : null}

        {messages.map((msg) => {
          // Check if message should be hidden (deleted for current user)
          const isHiddenForMe = msg.senderId === currentUserId
            ? msg.deletedForSender
            : msg.deletedForReceiver;

          if (isHiddenForMe) return null;

          const isSender = msg.senderId === currentUserId;
          const isEditing = editingMessageId === msg.id;

          return (
            <div key={msg.id} className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`group max-w-[80%] p-4 rounded-2xl text-sm space-y-2 relative ${isSender
                  ? 'bg-lime-400 text-black rounded-tr-none font-medium'
                  : 'bg-zinc-800 text-zinc-200 rounded-tl-none'
                  }`}
              >
                {/* Message Menu - Only for sender and not deleted */}
                {isSender && !msg.isDeleted && !isEditing && (
                  <div className="absolute -top-2 -right-2">
                    <MessageMenu
                      messageId={msg.id}
                      isSender={isSender}
                      onEdit={() => handleEditMessage(msg.id, msg.text)}
                      onDelete={(deleteForEveryone) => handleDeleteMessage(msg.id, deleteForEveryone)}
                    />
                  </div>
                )}

                {/* Deleted Message Placeholder */}
                {msg.isDeleted ? (
                  <div className="flex items-center space-x-2 text-zinc-500 italic">
                    <Trash2 size={14} />
                    <span>This message was deleted</span>
                  </div>
                ) : (
                  <>
                    {/* Image */}
                    {msg.imageUrl && (
                      <img src={msg.imageUrl} alt="Uploaded" className="rounded-lg max-w-full h-auto mb-2" />
                    )}

                    {/* Audio */}
                    {msg.audioUrl && (
                      <div className="flex items-center space-x-3 bg-black/20 p-3 rounded-xl border border-white/10 mb-2 min-w-[200px]">
                        <button
                          onClick={(e) => {
                            const audio = e.currentTarget.nextElementSibling as HTMLAudioElement;
                            if (audio.paused) audio.play();
                            else audio.pause();
                          }}
                          className="w-10 h-10 bg-lime-400 rounded-full flex items-center justify-center text-black hover:scale-105 transition-transform"
                        >
                          <Play size={16} fill="currentColor" />
                        </button>
                        <audio src={msg.audioUrl} className="hidden" />
                        <div className="flex-1 space-y-1">
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="w-1/3 h-full bg-lime-400 animate-pulse"></div>
                          </div>
                          <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                            <span>0:00</span>
                            <span>Voice Message</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Text - Edit Mode or Display */}
                    {msg.text && (
                      <>
                        {isEditing ? (
                          <div className="space-y-2">
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full bg-black/20 text-white p-2 rounded-lg outline-none resize-none"
                              rows={3}
                              autoFocus
                            />
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleSaveEdit(msg.id)}
                                className="flex-1 bg-black/30 hover:bg-black/40 text-white font-bold py-2 px-3 rounded-lg transition-all flex items-center justify-center space-x-1"
                              >
                                <Check size={14} />
                                <span>Save</span>
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="flex-1 bg-black/20 hover:bg-black/30 text-white font-bold py-2 px-3 rounded-lg transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p>{msg.text}</p>
                            {msg.editedAt && (
                              <p className="text-[10px] opacity-60 mt-1 italic">Edited</p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 px-4 py-3 rounded-2xl rounded-tl-none flex space-x-1">
              <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="mt-4">
        {!selectedCoachId && !isCoachView ? (
          <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 text-center text-zinc-500 text-sm italic">
            Please select a coach from the Dashboard to start chatting.
          </div>
        ) : !selectedCoachId && isCoachView ? (
          <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 text-center text-zinc-500 text-sm italic">
            Please select an athlete from your dashboard to chat.
          </div>
        ) : (
          <>
            {selectedImage && (
              <div className="flex items-center space-x-2 mb-2 bg-zinc-900 p-2 rounded-lg inline-flex">
                <img src={selectedImage} alt="Preview" className="w-12 h-12 rounded object-cover" />
                <button onClick={() => setSelectedImage(null)} className="p-1 hover:bg-zinc-800 rounded-full">
                  <X size={16} className="text-zinc-500" />
                </button>
              </div>
            )}
            {audioUrl && (
              <div className="flex items-center space-x-3 mb-2 bg-zinc-900 p-2 rounded-2xl border border-zinc-800 animate-slide-up">
                <button
                  onClick={togglePreviewPlayback}
                  className="w-8 h-8 bg-lime-400 rounded-full flex items-center justify-center text-black hover:scale-105 transition-transform"
                >
                  {isPreviewPlaying ? <Square size={12} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                </button>
                <audio
                  ref={previewAudioRef}
                  src={audioUrl}
                  onEnded={() => setIsPreviewPlaying(false)}
                  className="hidden"
                />
                <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className={`h-full bg-lime-400 transition-all duration-300 ${isPreviewPlaying ? 'w-full' : 'w-0'}`}></div>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">{formatTime(recordingTime)}</span>
                <button onClick={deleteRecording} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-red-400 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageSelect}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-colors hover:bg-zinc-800"
              >
                <ImageIcon size={20} />
              </button>

              {isRecording ? (
                <div className="flex-1 bg-zinc-900 border border-lime-400/50 text-white rounded-full px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    <span className="text-sm font-medium">Recording...</span>
                  </div>
                  <span className="text-sm font-mono text-lime-400">{formatTime(recordingTime)}</span>
                  <button
                    onClick={stopRecording}
                    className="p-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                  >
                    <Square size={16} fill="currentColor" />
                  </button>
                </div>
              ) : (
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={isCoachView ? "Message athlete..." : "Ask your coach..."}
                  className="flex-1 bg-zinc-900 border border-zinc-800 text-white rounded-full px-5 py-3 outline-none focus:border-lime-400 transition-colors placeholder:text-zinc-600"
                />
              )}

              {!input.trim() && !selectedImage && !audioUrl && !isRecording ? (
                <button
                  onClick={startRecording}
                  className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-400 hover:text-lime-400 hover:bg-zinc-800 transition-all border border-zinc-800"
                >
                  <Mic size={20} />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={(!input.trim() && !selectedImage && !audioUrl) || isTyping || !selectedCoachId || isRecording}
                  className="w-12 h-12 bg-lime-400 rounded-full flex items-center justify-center text-black hover:scale-105 disabled:opacity-50 disabled:scale-100 transition-all shadow-lg shadow-lime-400/20"
                >
                  <Send size={20} />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};