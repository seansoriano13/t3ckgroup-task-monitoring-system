import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "../context/AuthContext"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { taskActivityService } from "../services/tasks/taskActivityService"
import { storageService } from "../services/storageService"
import { useEmployeeAvatarMap } from "../hooks/useEmployeeAvatarMap"
import Avatar from "./Avatar"
import Spinner from "@/components/ui/Spinner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { MessageCircle, Zap, ImageIcon, Paperclip, Send } from "lucide-react"

export default function InlineTaskChat({ task, isOpen, isSplitScreen }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const chatScrollRef = useRef(null)
  const chatFileInputRef = useRef(null)
  const [messageContent, setMessageContent] = useState("")
  const [chatAttachments, setChatAttachments] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const avatarMap = useEmployeeAvatarMap()

  useEffect(() => {
    if (!isOpen || !isSplitScreen) {
      setMessageContent("")
      setChatAttachments([])
    }
  }, [isOpen, isSplitScreen])

  const { data: chatMessages = [], isLoading: isLoadingChat } = useQuery({
    queryKey: ["chatMessages", "TASK", task?.id],
    queryFn: () => taskActivityService.getActivityForTask(task.id),
    enabled: !!task?.id && isOpen && isSplitScreen,
  })

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatMessages])

  useEffect(() => {
    if (!isSplitScreen || !task?.id || !isOpen) return
    const channel = taskActivityService.subscribeToActivity(
      task.id,
      () => {
        queryClient.invalidateQueries({
          queryKey: ["chatMessages", "TASK", task.id],
        })
      },
      "-split",
    )
    return () => {
      taskActivityService.unsubscribeFromActivity(channel)
    }
  }, [isSplitScreen, task?.id, isOpen, queryClient])

  const sendMessageMutation = useMutation({
    mutationFn: ({ content, attachmentUrls = [] }) => {
      const metadata =
        attachmentUrls.length > 0 ? { attachments: attachmentUrls } : null
      return taskActivityService.addComment(task.id, user.id, content, metadata)
    },
    onSuccess: () => {
      setMessageContent("")
      setChatAttachments([])
      queryClient.invalidateQueries({
        queryKey: ["chatMessages", "TASK", task?.id],
      })
      queryClient.invalidateQueries({ queryKey: ["activeChats", user?.id] })
    },
  })

  const addChatFiles = useCallback((files) => {
    const imageFiles = Array.from(files).filter((f) =>
      f.type.startsWith("image/"),
    )
    if (!imageFiles.length) return
    setChatAttachments((prev) => [
      ...prev,
      ...imageFiles.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      })),
    ])
  }, [])

  const removeChatAttachment = useCallback((index) => {
    setChatAttachments((prev) => {
      const next = [...prev]
      URL.revokeObjectURL(next[index].preview)
      next.splice(index, 1)
      return next
    })
  }, [])

  const handleChatPaste = useCallback(
    (e) => {
      const items = e.clipboardData?.items
      if (!items) return
      const imageItems = Array.from(items).filter((item) =>
        item.type.startsWith("image/"),
      )
      if (!imageItems.length) return
      e.preventDefault()
      addChatFiles(imageItems.map((item) => item.getAsFile()).filter(Boolean))
    },
    [addChatFiles],
  )

  const handleSendMessage = useCallback(
    async (e) => {
      e?.preventDefault()
      const hasText = messageContent.trim()
      const hasFiles = chatAttachments.length > 0
      if ((!hasText && !hasFiles) || !task?.id) return
      if (isUploading || sendMessageMutation.isPending) return
      setIsUploading(true)
      try {
        let attachmentUrls = []
        if (hasFiles) {
          attachmentUrls = await Promise.all(
            chatAttachments.map((a) =>
              storageService.uploadToCloudinary(a.file),
            ),
          )
        }
        sendMessageMutation.mutate({
          content: messageContent.trim(),
          attachmentUrls,
        })
      } catch (err) {
        console.error("Failed to upload chat attachments:", err)
      } finally {
        setIsUploading(false)
      }
    },
    [messageContent, chatAttachments, task?.id, isUploading, sendMessageMutation],
  )

  const timeAgo = (dateString) => {
    if (!dateString) return ""
    const d = new Date(dateString)
    const diffMs = new Date() - d
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  }

  const renderChatContent = (text) => {
    if (!text) return null
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = text.split(urlRegex)
    return parts.map((part, i) =>
      urlRegex.test(part) ? (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 opacity-90 hover:opacity-100 break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      ) : (
        <span key={i}>{part}</span>
      ),
    )
  }

  return (
    <div className="w-[380px] shrink-0 flex flex-col bg-card border-l border-border">
      {/* Chat Header */}
      <div className="h-[61px] px-4 border-b border-border flex items-center gap-3 shrink-0 bg-card/80 backdrop-blur-sm">
        <div className="p-1.5 rounded-lg bg-primary/10">
          <MessageCircle size={14} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-black truncate">Conversation</h3>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
            Task Chat
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar py-3 space-y-1"
      >
        {isLoadingChat ? (
          <div className="flex items-center justify-center h-full gap-2 text-muted-foreground italic text-xs">
            <Spinner size="sm" /> Fetching messages...
          </div>
        ) : chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-30 select-none gap-2">
            <MessageCircle size={48} strokeWidth={1} />
            <p className="text-sm font-black">Start a conversation</p>
          </div>
        ) : (
          chatMessages.map((m) => {
            const isMe = m.authorId === user?.id
            if (m.type === "SYSTEM") {
              return (
                <div
                  key={m.id}
                  className="flex items-start gap-2 py-2 px-3 opacity-60"
                >
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <Zap
                      size={10}
                      className="text-muted-foreground"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-muted-foreground italic leading-relaxed">
                      {m.content}
                    </p>
                    <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                      {timeAgo(m.createdAt)}
                    </p>
                  </div>
                </div>
              )
            }
            return (
              <div
                key={m.id}
                className={cn(
                  "flex gap-2 px-3 py-1.5",
                  isMe ? "flex-row-reverse" : "flex-row",
                )}
              >
                <Avatar
                  name={m.authorName || "?"}
                  src={avatarMap.get(m.authorId) ?? undefined}
                  size="sm"
                  className={cn(
                    m.authorIsHead || m.authorIsSuperAdmin
                      ? "bg-amber-3 text-amber-10 border-amber-6"
                      : m.authorIsHr
                        ? "bg-blue-3 text-blue-10 border-blue-6"
                        : "",
                  )}
                />
                <div
                  className={cn(
                    "max-w-[75%] min-w-0 flex flex-col",
                    isMe ? "items-end" : "items-start",
                  )}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">
                      {isMe ? "You" : m.authorName}
                    </span>
                    {m.authorIsHead && (
                      <span className="text-[7px] bg-amber-3/50 text-amber-11 px-1 rounded font-black uppercase">
                        Head
                      </span>
                    )}
                    {m.authorIsHr && (
                      <span className="text-[7px] bg-blue-3/50 text-blue-11 px-1 rounded font-black uppercase">
                        HR
                      </span>
                    )}
                    {m.authorIsSuperAdmin && (
                      <span className="text-[7px] bg-primary/10 text-foreground px-1 rounded font-black uppercase">
                        Admin
                      </span>
                    )}
                  </div>
                  <div
                    className={cn(
                      "px-3 py-2 rounded-2xl text-xs shadow-sm whitespace-pre-wrap break-words overflow-hidden",
                      isMe
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-muted border border-border rounded-tl-none",
                    )}
                  >
                    {m.content && (
                      <p>{renderChatContent(m.content)}</p>
                    )}
                    {m.metadata?.attachments?.length > 0 && (
                      <div
                        className={cn(
                          "flex flex-wrap gap-1.5",
                          m.content ? "mt-2" : "",
                        )}
                      >
                        {m.metadata.attachments.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-lg overflow-hidden border border-white/10 hover:opacity-90 transition-opacity"
                          >
                            <img
                              src={url}
                              alt={`attachment-${i + 1}`}
                              className="max-w-[160px] max-h-[160px] object-cover rounded-lg"
                              loading="lazy"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[8px] text-muted-foreground/60 mt-0.5 px-1 font-medium">
                    {timeAgo(m.createdAt)}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 border-t border-border bg-muted/10 shrink-0"
      >
        <input
          ref={chatFileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addChatFiles(e.target.files)
            e.target.value = ""
          }}
        />
        <div className="bg-card border border-border rounded-2xl p-1.5 focus-within:ring-2 ring-mauve-8/20 transition-shadow">
          {chatAttachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-2 pt-2 pb-1">
              {chatAttachments.map((att, i) => (
                <div
                  key={i}
                  className="relative group rounded-lg overflow-hidden border border-border"
                  style={{ width: 52, height: 52 }}
                >
                  <img
                    src={att.preview}
                    alt={`preview-${i}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeChatAttachment(i)}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <span className="text-white text-xs font-bold">✕</span>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => chatFileInputRef.current?.click()}
                className="w-[52px] h-[52px] rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
              >
                <ImageIcon size={16} />
              </button>
            </div>
          )}
          <Input
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            onPaste={handleChatPaste}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            placeholder="Write a message..."
            className="border-none shadow-none focus-visible:ring-0 text-sm h-9"
            disabled={sendMessageMutation.isPending || isUploading}
          />
          <div className="flex items-center justify-between px-2 pt-0.5 pb-0.5">
            <button
              type="button"
              onClick={() => chatFileInputRef.current?.click()}
              disabled={sendMessageMutation.isPending || isUploading}
              className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              title="Attach photo"
            >
              <Paperclip size={14} />
            </button>
            <Button
              disabled={
                (!messageContent.trim() &&
                  chatAttachments.length === 0) ||
                sendMessageMutation.isPending ||
                isUploading
              }
              type="submit"
              size="sm"
              className="h-7 px-3 rounded-xl font-bold gap-1.5 text-xs"
            >
              {isUploading ? (
                <>
                  <Spinner size="sm" /> Uploading
                </>
              ) : sendMessageMutation.isPending ? (
                "..."
              ) : (
                <>
                  Send <Send size={12} />
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
