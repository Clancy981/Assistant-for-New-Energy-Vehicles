"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Bot, Loader2, Send, User, X } from "lucide-react";

import { Button } from "@/components/ui/button";

type MessageRole = "assistant" | "user";

type AgentThought = {
  id: string;
  thought: string;
  observation?: string;
  tool?: string;
  createdAt?: number;
};

type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  thoughts: AgentThought[];
  createdAt: number;
  isStreaming?: boolean;
};

type SseEventPayload = {
  event?: string;
  answer?: string;
  conversation_id?: string;
  thought?: string;
  observation?: string;
  tool?: string;
  tool_name?: string;
  created_at?: number;
  message?: string;
  [key: string]: unknown;
};

const FORM_STORAGE_KEY = "ev_requirements_form_v1";
const CONVERSATION_STORAGE_KEY = "ev_chat_conversation_id_v1";
const USER_STORAGE_KEY = "ev_chat_user_id_v1";
const HISTORY_STORAGE_KEY = "ev_chat_history_v1";
const OPENING_MESSAGE_ID = "opening-statement-assistant-message";

function escapeHtml(raw: string) {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInlineMarkdown(raw: string) {
  let text = escapeHtml(raw);
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a class="text-blue-300 underline" href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  text = text.replace(/`([^`]+)`/g, '<code class="rounded bg-white/10 px-1 py-0.5 text-[0.85em]">$1</code>');
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return text;
}

function markdownToHtml(markdown: string) {
  if (!markdown.trim()) return "";

  const codeBlocks: string[] = [];
  let source = markdown.replace(/```([\w-]*)\n([\s\S]*?)```/g, (_, _lang: string, code: string) => {
    const html = `<pre class="overflow-x-auto rounded-lg bg-black/50 p-3 text-xs text-gray-100"><code>${escapeHtml(code)}</code></pre>`;
    const token = `@@CODE_BLOCK_${codeBlocks.length}@@`;
    codeBlocks.push(html);
    return token;
  });

  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const htmlParts: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) continue;

    const codeTokenMatch = line.match(/^@@CODE_BLOCK_(\d+)@@$/);
    if (codeTokenMatch) {
      htmlParts.push(codeBlocks[Number(codeTokenMatch[1])] ?? "");
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = renderInlineMarkdown(headingMatch[2]);
      const tag = level === 1 ? "h2" : level === 2 ? "h3" : "h4";
      htmlParts.push(`<${tag} class="mt-3 font-semibold text-white">${content}</${tag}>`);
      continue;
    }

    const quoteMatch = line.match(/^>\s+(.+)$/);
    if (quoteMatch) {
      htmlParts.push(
        `<blockquote class="my-2 border-l-2 border-white/20 pl-3 text-gray-300">${renderInlineMarkdown(quoteMatch[1])}</blockquote>`
      );
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const listItems: string[] = [line.replace(/^[-*]\s+/, "")];
      while (index + 1 < lines.length && /^[-*]\s+/.test(lines[index + 1])) {
        index += 1;
        listItems.push(lines[index].replace(/^[-*]\s+/, ""));
      }
      htmlParts.push(
        `<ul class="my-2 list-disc space-y-1 pl-5">${listItems
          .map((item) => `<li>${renderInlineMarkdown(item)}</li>`)
          .join("")}</ul>`
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const listItems: string[] = [line.replace(/^\d+\.\s+/, "")];
      while (index + 1 < lines.length && /^\d+\.\s+/.test(lines[index + 1])) {
        index += 1;
        listItems.push(lines[index].replace(/^\d+\.\s+/, ""));
      }
      htmlParts.push(
        `<ol class="my-2 list-decimal space-y-1 pl-5">${listItems
          .map((item) => `<li>${renderInlineMarkdown(item)}</li>`)
          .join("")}</ol>`
      );
      continue;
    }

    const paragraphLines = [line];
    while (
      index + 1 < lines.length &&
      lines[index + 1].trim() &&
      !/^@@CODE_BLOCK_(\d+)@@$/.test(lines[index + 1]) &&
      !/^(#{1,3})\s+/.test(lines[index + 1]) &&
      !/^>\s+/.test(lines[index + 1]) &&
      !/^[-*]\s+/.test(lines[index + 1]) &&
      !/^\d+\.\s+/.test(lines[index + 1])
    ) {
      index += 1;
      paragraphLines.push(lines[index]);
    }

    htmlParts.push(
      `<p class="my-2 leading-7">${paragraphLines.map((paragraphLine) => renderInlineMarkdown(paragraphLine)).join("<br/>")}</p>`
    );
  }

  source = htmlParts.join("");
  return source.replace(/@@CODE_BLOCK_(\d+)@@/g, (_match, group: string) => codeBlocks[Number(group)] ?? "");
}

function parseSseChunk(block: string): { event: string; payload: SseEventPayload } | null {
  const normalized = block.trim();
  if (!normalized) return null;

  const lines = normalized.split("\n");
  let namedEvent = "";
  const dataLines: string[] = [];
  const keyValues: Record<string, string> = {};

  for (const line of lines) {
    if (line.startsWith("event:")) {
      namedEvent = line.slice(6).trim();
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
      continue;
    }

    const separatorIndex = line.indexOf(":");
    if (separatorIndex > 0) {
      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      keyValues[key] = value;
    }
  }

  if (dataLines.length > 0) {
    const rawData = dataLines.join("\n");
    if (rawData === "[DONE]") {
      return { event: "done", payload: {} };
    }
    try {
      const parsed = JSON.parse(rawData) as SseEventPayload;
      const eventName =
        typeof parsed.event === "string" && parsed.event.trim().length > 0 ? parsed.event : namedEvent || "message";
      return { event: eventName, payload: parsed };
    } catch {
      return {
        event: namedEvent || "message",
        payload: {
          ...keyValues,
          answer: rawData,
        },
      };
    }
  }

  if (Object.keys(keyValues).length > 0) {
    const payload = keyValues as SseEventPayload;
    const event = payload.event || namedEvent || "message";
    return { event, payload };
  }

  return null;
}

function getOrCreateUserId() {
  if (typeof window === "undefined") return "ev-web-user";

  const cached = window.localStorage.getItem(USER_STORAGE_KEY);
  if (cached) return cached;

  const generated = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `u-${Date.now()}`;
  window.localStorage.setItem(USER_STORAGE_KEY, generated);
  return generated;
}

function readSavedInputs() {
  if (typeof window === "undefined") return {};

  const raw = window.localStorage.getItem(FORM_STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, string | boolean | number | null>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}

function readSavedHistory() {
  if (typeof window === "undefined") return [] as ChatMessage[];

  const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
  if (!raw) return [] as ChatMessage[];

  try {
    const parsed = JSON.parse(raw) as Array<{
      role?: unknown;
      content?: unknown;
      createdAt?: unknown;
      thoughts?: unknown;
    }>;

    if (!Array.isArray(parsed)) return [] as ChatMessage[];

    return parsed
      .map((item, index) => {
        const role = item.role === "assistant" ? "assistant" : item.role === "user" ? "user" : null;
        const content = typeof item.content === "string" ? item.content : "";
        if (!role || !content.trim()) return null;

        const createdAt =
          typeof item.createdAt === "number" && Number.isFinite(item.createdAt) ? item.createdAt : Date.now() + index;

        return {
          id: `history-${createdAt}-${index}`,
          role,
          content,
          thoughts: [],
          createdAt,
          isStreaming: false,
        } as ChatMessage;
      })
      .filter((item): item is ChatMessage => Boolean(item));
  } catch {
    return [] as ChatMessage[];
  }
}

function splitThinkBlocks(raw: string) {
  const thinkBlocks: string[] = [];
  let visibleContent = "";
  let pendingThink = "";
  let cursor = 0;

  while (cursor < raw.length) {
    const start = raw.indexOf("<think>", cursor);
    if (start === -1) {
      visibleContent += raw.slice(cursor);
      break;
    }

    visibleContent += raw.slice(cursor, start);
    const thinkContentStart = start + "<think>".length;
    const end = raw.indexOf("</think>", thinkContentStart);

    if (end === -1) {
      pendingThink = raw.slice(thinkContentStart).trim();
      break;
    }

    const block = raw.slice(thinkContentStart, end).trim();
    if (block.length > 0) {
      thinkBlocks.push(block);
    }

    cursor = end + "</think>".length;
  }

  return {
    visibleContent: visibleContent.trim(),
    thinkBlocks,
    pendingThink,
  };
}

function thoughtToMarkdown(thought: AgentThought) {
  const lines: string[] = [thought.thought];
  if (thought.tool) {
    lines.push(`\n工具：${thought.tool}`);
  }
  if (thought.observation) {
    lines.push(`\n观察：${thought.observation}`);
  }
  return lines.join("");
}

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string>("");
  const [formInputs, setFormInputs] = useState<Record<string, string | boolean | number | null>>({});
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState("ev-web-user");
  const initializedRef = useRef(false);

  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const typingQueueRef = useRef("");
  const typingTimerRef = useRef<number | null>(null);
  const currentAssistantIdRef = useRef<string | null>(null);

  const thoughtCount = useMemo(
    () => messages.filter((message) => message.role === "assistant").reduce((sum, message) => sum + message.thoughts.length, 0),
    [messages]
  );

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const currentUserId = getOrCreateUserId();
    setUserId(currentUserId);
    setFormInputs(readSavedInputs());
    const savedHistory = readSavedHistory();
    if (savedHistory.length > 0) {
      setMessages(savedHistory);
    }

    let cachedConversationId = "";
    if (typeof window !== "undefined") {
      cachedConversationId = window.localStorage.getItem(CONVERSATION_STORAGE_KEY) || "";
      if (cachedConversationId) {
        setConversationId(cachedConversationId);
      }
    }

    if (cachedConversationId || savedHistory.length > 0) {
      return;
    }

    const controller = new AbortController();
    const initOpeningStatement = async () => {
      try {
        const response = await fetch("/api/dify/parameters", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) return;
        const payload = (await response.json()) as { openingStatement?: string | null };
        const openingStatement = typeof payload.openingStatement === "string" ? payload.openingStatement.trim() : "";
        if (!openingStatement) return;

        setMessages((prev) => {
          if (prev.length > 0) return prev;
          return [
            {
              id: OPENING_MESSAGE_ID,
              role: "assistant",
              content: openingStatement,
              thoughts: [],
              createdAt: Date.now(),
            },
          ];
        });
      } catch (initError) {
        if ((initError as Error).name === "AbortError") return;
      }
    };

    void initOpeningStatement();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (messages.length === 0) {
      window.localStorage.removeItem(HISTORY_STORAGE_KEY);
      return;
    }

    const historyPayload = messages.map((message) => ({
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    }));
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historyPayload));
  }, [messages]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current !== null) {
        window.clearInterval(typingTimerRef.current);
      }
    };
  }, []);

  const ensureTypingTimer = () => {
    if (typingTimerRef.current !== null) return;

    typingTimerRef.current = window.setInterval(() => {
      if (!typingQueueRef.current || !currentAssistantIdRef.current) {
        return;
      }

      const chunk = typingQueueRef.current.slice(0, 2);
      typingQueueRef.current = typingQueueRef.current.slice(2);
      const targetId = currentAssistantIdRef.current;

      setMessages((prev) =>
        prev.map((message) =>
          message.id === targetId
            ? {
                ...message,
                content: `${message.content}${chunk}`,
              }
            : message
        )
      );
    }, 18);
  };

  const flushTypingQueue = () => {
    if (!typingQueueRef.current || !currentAssistantIdRef.current) return;

    const remain = typingQueueRef.current;
    typingQueueRef.current = "";
    const targetId = currentAssistantIdRef.current;

    setMessages((prev) =>
      prev.map((message) =>
        message.id === targetId
          ? {
              ...message,
              content: `${message.content}${remain}`,
            }
          : message
      )
    );
  };

  const pushThought = (assistantId: string, payload: SseEventPayload) => {
    const rawThought =
      typeof payload.thought === "string"
        ? payload.thought
        : typeof payload.message === "string"
          ? payload.message
          : typeof payload.answer === "string"
            ? payload.answer
            : "";

    const thoughtText = rawThought.trim();
    if (!thoughtText) return;

    const thought: AgentThought = {
      id: `${assistantId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      thought: thoughtText,
      observation: typeof payload.observation === "string" ? payload.observation : undefined,
      tool:
        typeof payload.tool === "string"
          ? payload.tool
          : typeof payload.tool_name === "string"
            ? payload.tool_name
            : undefined,
      createdAt: typeof payload.created_at === "number" ? payload.created_at : undefined,
    };

    setMessages((prev) =>
      prev.map((message) =>
        message.id === assistantId
          ? {
              ...message,
              thoughts: [...message.thoughts, thought],
            }
          : message
      )
    );
  };

  const setAssistantStreamingDone = (assistantId: string) => {
    flushTypingQueue();
    setMessages((prev) =>
      prev.map((message) =>
        message.id === assistantId
          ? {
              ...message,
              isStreaming: false,
            }
          : message
      )
    );
  };

  const handleSend = async () => {
    const question = input.trim();
    if (!question || isSending) return;

    setError(null);
    setInput("");

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: question,
      thoughts: [],
      createdAt: Date.now(),
    };

    const assistantId = `assistant-${Date.now()}`;
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      thoughts: [],
      createdAt: Date.now(),
      isStreaming: true,
    };

    currentAssistantIdRef.current = assistantId;
    typingQueueRef.current = "";
    ensureTypingTimer();

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsSending(true);

    try {
      const response = await fetch("/api/dify/chat-messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: question,
          inputs: formInputs,
          user: userId,
          conversationId,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || `请求失败：${response.status}`);
      }

      if (!response.body) {
        throw new Error("未收到流式响应数据");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        buffer = buffer.replace(/\r\n/g, "\n");

        let separatorIndex = buffer.indexOf("\n\n");
        while (separatorIndex !== -1) {
          const chunk = buffer.slice(0, separatorIndex);
          buffer = buffer.slice(separatorIndex + 2);

          const parsed = parseSseChunk(chunk);
          if (!parsed) {
            separatorIndex = buffer.indexOf("\n\n");
            continue;
          }

          const { event, payload } = parsed;
          const incomingConversationId =
            typeof payload.conversation_id === "string" ? payload.conversation_id : "";
          if (incomingConversationId) {
            setConversationId(incomingConversationId);
            if (typeof window !== "undefined") {
              window.localStorage.setItem(CONVERSATION_STORAGE_KEY, incomingConversationId);
            }
          }

          if (event === "agent_thought") {
            pushThought(assistantId, payload);
          } else if (event === "message" || event === "agent_message") {
            if (typeof payload.answer === "string" && payload.answer.length > 0) {
              typingQueueRef.current += payload.answer;
              ensureTypingTimer();
            }
          } else if (event === "message_end" || event === "agent_message_end") {
            setAssistantStreamingDone(assistantId);
          } else if (event === "done") {
            setAssistantStreamingDone(assistantId);
          } else if (event === "error") {
            const message = typeof payload.message === "string" ? payload.message : "对话过程中出现错误";
            throw new Error(message);
          }

          separatorIndex = buffer.indexOf("\n\n");
        }
      }

      const tailEvent = parseSseChunk(buffer);
      if (
        tailEvent &&
        (tailEvent.event === "message" || tailEvent.event === "agent_message") &&
        typeof tailEvent.payload.answer === "string"
      ) {
        typingQueueRef.current += tailEvent.payload.answer;
        ensureTypingTimer();
      }

      setAssistantStreamingDone(assistantId);
    } catch (requestError) {
      setAssistantStreamingDone(assistantId);
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId && !message.content
            ? {
                ...message,
                content: "抱歉，当前暂时无法完成对话请求，请稍后重试。",
              }
            : message
        )
      );
      setError(requestError instanceof Error ? requestError.message : "发送消息失败");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex max-w-5xl flex-col px-4 py-6 md:py-8">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-semibold text-white">智能选车对话</h1>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>需求字段：{Object.keys(formInputs).length}</span>
                <span>思考过程：{thoughtCount}</span>
                <span className="truncate">会话ID：{conversationId || "未建立"}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-white/20 bg-white/5 px-2.5 text-white hover:bg-white/10"
                onClick={() => router.push("/")}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                关闭对话
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex-1 rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-950 to-black">
          <div className="h-[66vh] overflow-y-auto p-4 md:p-6">
            {messages.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-gray-400">
                输入你的需求开始对话，消息将以流式方式返回并保持上下文。
              </div>
            ) : null}

            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[92%] rounded-2xl border px-4 py-3 md:max-w-[80%] ${
                      message.role === "assistant"
                        ? "border-white/10 bg-white/[0.04] text-left"
                        : "border-green-400/30 bg-green-500/10 text-right"
                    }`}
                  >
                    {(() => {
                      const parsed = message.role === "assistant" ? splitThinkBlocks(message.content) : null;
                      const visibleContent = parsed ? parsed.visibleContent : message.content;
                      const tagThinkBlocks = parsed ? parsed.thinkBlocks : [];
                      const fallbackThoughts = tagThinkBlocks.length === 0 ? message.thoughts.map(thoughtToMarkdown) : [];
                      const renderedThinkBlocks = [...tagThinkBlocks, ...fallbackThoughts];
                      const pendingThink = parsed?.pendingThink || "";

                      return (
                        <>
                          <div className="mb-2 flex items-center gap-2 text-xs text-gray-400">
                            {message.role === "assistant" ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                            <span>{message.role === "assistant" ? "AI 助手" : "你"}</span>
                            {message.isStreaming ? (
                              <span className="inline-flex items-center gap-1 text-green-300">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                思考中
                              </span>
                            ) : null}
                          </div>

                          <div
                            className="text-sm leading-7 text-gray-100"
                            dangerouslySetInnerHTML={{ __html: markdownToHtml(visibleContent || "...") }}
                          />

                          {message.role === "assistant" && (renderedThinkBlocks.length > 0 || pendingThink.length > 0) ? (
                            <div className="mt-3 space-y-2">
                              {renderedThinkBlocks.map((block, blockIndex) => (
                                <details
                                  key={`${message.id}-think-${blockIndex}`}
                                  className="rounded-lg border border-white/10 bg-black/35 p-3"
                                >
                                  <summary className="cursor-pointer text-xs text-blue-300">思考过程 #{blockIndex + 1}</summary>
                                  <div
                                    className="mt-2 text-xs text-gray-300"
                                    dangerouslySetInnerHTML={{ __html: markdownToHtml(block) }}
                                  />
                                </details>
                              ))}

                              {pendingThink.length > 0 ? (
                                <details open className="rounded-lg border border-white/10 bg-black/35 p-3">
                                  <summary className="cursor-pointer text-xs text-blue-300">思考过程（生成中）</summary>
                                  <div
                                    className="mt-2 text-xs text-gray-300"
                                    dangerouslySetInnerHTML={{ __html: markdownToHtml(pendingThink) }}
                                  />
                                </details>
                              ) : null}
                            </div>
                          ) : null}
                        </>
                      );
                    })()}
                  </div>
                </div>
              ))}
              <div ref={messageEndRef} />
            </div>
          </div>

          <div className="border-t border-white/10 p-3 md:p-4">
            {error ? (
              <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>
            ) : null}
            <div className="flex items-end gap-3">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入你的问题，按 Enter 发送，Shift + Enter 换行"
                className="min-h-12 flex-1 resize-none rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none transition focus:border-green-400/60 focus:ring-2 focus:ring-green-500/20"
                rows={2}
              />
              <Button
                onClick={() => void handleSend()}
                disabled={isSending || input.trim().length === 0}
                className="h-11 bg-gradient-to-r from-green-600 to-blue-600 text-white hover:from-green-700 hover:to-blue-700"
              >
                <Send className="mr-1 h-4 w-4" />
                发送
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
