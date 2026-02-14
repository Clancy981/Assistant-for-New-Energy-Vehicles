import { NextResponse } from "next/server";

type NotifyRequest = {
  model?: {
    id?: unknown;
    brand?: unknown;
    model?: unknown;
    variant?: unknown;
    bodyType?: unknown;
    priceMin?: unknown;
    priceMax?: unknown;
    powerType?: unknown;
    url?: unknown;
  };
  userId?: unknown;
  conversationId?: unknown;
  contact?: unknown;
  history?: Array<{
    role?: unknown;
    content?: unknown;
    createdAt?: unknown;
  }>;
};

const FEISHU_WEBHOOK_URL =
  "https://open.feishu.cn/open-apis/bot/v2/hook/d6b16478-adc8-4946-999d-fa5743f8f8e2";

function safeString(value: unknown, fallback = "未知") {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function normalizeHistory(raw: NotifyRequest["history"]) {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      const role = item?.role === "assistant" ? "AI" : item?.role === "user" ? "用户" : null;
      const content = typeof item?.content === "string" ? item.content.trim() : "";
      if (!role || content.length === 0) return null;

      const createdAt =
        typeof item.createdAt === "number" && Number.isFinite(item.createdAt)
          ? new Date(item.createdAt).toLocaleString("zh-CN")
          : "";

      return {
        role,
        content: content.length > 600 ? `${content.slice(0, 600)}...` : content,
        createdAt,
      };
    })
    .filter((item): item is { role: string; content: string; createdAt: string } => Boolean(item))
    .slice(-20);
}

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: NotifyRequest;
  try {
    body = (await request.json()) as NotifyRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  const modelBrand = safeString(body.model?.brand);
  const modelName = safeString(body.model?.model);
  const modelVariant = safeString(body.model?.variant, "无");
  const modelBodyType = safeString(body.model?.bodyType);
  const modelPowerType = safeString(body.model?.powerType);
  const modelPriceMin = safeString(body.model?.priceMin, "未知");
  const modelPriceMax = safeString(body.model?.priceMax, "未知");
  const modelUrl = safeString(body.model?.url, "无");
  const modelId = safeString(body.model?.id, "未知");

  const userId = safeString(body.userId, "未提供");
  const conversationId = safeString(body.conversationId, "未建立");
  const contact = safeString(body.contact, "未提供");
  const history = normalizeHistory(body.history);

  const historyText =
    history.length > 0
      ? history
          .map((item, index) => {
            const timeText = item.createdAt ? `（${item.createdAt}）` : "";
            return `${index + 1}. ${item.role}${timeText}\n${item.content}`;
          })
          .join("\n\n")
      : "无可用对话记录";

  const messageText = [
    "【试驾联系通知】",
    "",
    `车型：${modelBrand} ${modelName}`,
    `版本：${modelVariant}`,
    `车型类型：${modelBodyType}`,
    `动力类型：${modelPowerType}`,
    `价格区间：${modelPriceMin} - ${modelPriceMax}`,
    `车型ID：${modelId}`,
    `详情页：${modelUrl}`,
    "",
    `用户ID：${userId}`,
    `会话ID：${conversationId}`,
    `联系方式：${contact}`,
    "",
    "【最近对话记录】",
    historyText,
  ].join("\n");

  const safeMessageText =
    messageText.length > 7000 ? `${messageText.slice(0, 7000)}\n\n...（内容过长已截断）` : messageText;

  try {
    const response = await fetch(FEISHU_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        msg_type: "text",
        content: {
          text: safeMessageText,
        },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const details = await response.text();
      return NextResponse.json(
        { error: "Failed to send Feishu notification", details: details.slice(0, 1000) },
        { status: response.status }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unexpected error while sending Feishu notification",
        details: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      },
      { status: 500 }
    );
  }
}
