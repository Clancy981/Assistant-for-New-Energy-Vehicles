"use client";

import { useMemo, useState } from "react";
import { Loader2, MessageSquare, X } from "lucide-react";

import { Button } from "@/components/ui/button";

type StoredHistoryMessage = {
  role: "assistant" | "user";
  content: string;
  createdAt: number;
};

type ContactTestDriveButtonProps = {
  model: {
    id: string;
    brand: string;
    model: string;
    variant: string | null;
    bodyType: string;
    priceMin: string | null;
    priceMax: string | null;
    powerType: string;
  };
};

const HISTORY_STORAGE_KEY = "ev_chat_history_v1";
const USER_STORAGE_KEY = "ev_chat_user_id_v1";
const CONVERSATION_STORAGE_KEY = "ev_chat_conversation_id_v1";
const CONTACT_STORAGE_KEY = "ev_contact_info_v1";
const PHONE_REGEX = /(?:\+?86[-\s]?)?(1[3-9]\d{9})/;

function readHistory(): StoredHistoryMessage[] {
  const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Array<{ role?: unknown; content?: unknown; createdAt?: unknown }>;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        const role = item.role === "assistant" ? "assistant" : item.role === "user" ? "user" : null;
        const content = typeof item.content === "string" ? item.content.trim() : "";
        const createdAt =
          typeof item.createdAt === "number" && Number.isFinite(item.createdAt) ? item.createdAt : Date.now();
        if (!role || !content) return null;
        return { role, content, createdAt };
      })
      .filter((item): item is StoredHistoryMessage => Boolean(item));
  } catch {
    return [];
  }
}

function findPhoneFromHistory(history: StoredHistoryMessage[]) {
  for (const message of history) {
    if (message.role !== "user") continue;
    const compact = message.content.replace(/[^\d+]/g, "");
    const match = compact.match(PHONE_REGEX);
    if (match?.[1]) {
      return match[1];
    }
  }
  return "";
}

export default function ContactTestDriveButton({ model }: ContactTestDriveButtonProps) {
  const [open, setOpen] = useState(false);
  const [contactInput, setContactInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  const submitNotify = async (contact: string) => {
    const history = readHistory();
    const userId = window.localStorage.getItem(USER_STORAGE_KEY) || "";
    const conversationId = window.localStorage.getItem(CONVERSATION_STORAGE_KEY) || "";
    const pageUrl = window.location.href;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/lark-notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: {
            ...model,
            url: pageUrl,
          },
          userId,
          conversationId,
          contact,
          history,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || `发送失败：${response.status}`);
      }

      setFeedback("试驾联系信息已发送，我们会尽快联系你。");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "发送失败，请稍后重试。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContactTestDrive = async () => {
    if (isSubmitting) return;

    const history = readHistory();
    const phoneInHistory = findPhoneFromHistory(history);
    const savedContact = window.localStorage.getItem(CONTACT_STORAGE_KEY) || "";

    if (phoneInHistory) {
      await submitNotify(phoneInHistory);
      return;
    }

    if (savedContact.trim()) {
      await submitNotify(savedContact.trim());
      return;
    }

    setInputError(null);
    setContactInput("");
    setOpen(true);
  };

  const canSubmitContact = useMemo(() => contactInput.trim().length > 0, [contactInput]);

  const handleConfirmContact = async () => {
    const contact = contactInput.trim();
    if (!contact) {
      setInputError("请填写手机号或微信号。");
      return;
    }

    window.localStorage.setItem(CONTACT_STORAGE_KEY, contact);
    setOpen(false);
    await submitNotify(contact);
  };

  return (
    <>
      <div className="space-y-3">
        <Button
          className="h-11 w-full bg-gradient-to-r from-green-600 to-blue-600 text-white hover:from-green-700 hover:to-blue-700"
          onClick={() => void handleContactTestDrive()}
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
          联系试驾
        </Button>
        {feedback ? <p className="text-sm text-gray-300">{feedback}</p> : null}
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">补充联系方式</h3>
              <button
                type="button"
                className="rounded-md p-1 text-gray-400 hover:bg-white/10 hover:text-white"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-3 text-sm text-gray-300">你在对话中尚未提供手机号，请输入手机号或微信号用于联系试驾。</p>
            <input
              value={contactInput}
              onChange={(event) => {
                setContactInput(event.target.value);
                if (inputError) setInputError(null);
              }}
              placeholder="手机号或微信号"
              className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none transition focus:border-green-400/60 focus:ring-2 focus:ring-green-500/20"
            />
            {inputError ? <p className="mt-2 text-xs text-red-400">{inputError}</p> : null}

            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                onClick={() => setOpen(false)}
              >
                取消
              </Button>
              <Button
                className="bg-gradient-to-r from-green-600 to-blue-600 text-white hover:from-green-700 hover:to-blue-700"
                onClick={() => void handleConfirmContact()}
                disabled={!canSubmitContact || isSubmitting}
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                确认并发送
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
