import { NextResponse } from "next/server";

type ChatRequestBody = {
  query?: unknown;
  inputs?: unknown;
  user?: unknown;
  conversationId?: unknown;
};

function normalizeInputs(value: unknown): Record<string, string | number | boolean | null> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  const normalized: Record<string, string | number | boolean | null> = {};
  for (const [key, fieldValue] of Object.entries(value)) {
    if (
      typeof fieldValue === "string" ||
      typeof fieldValue === "number" ||
      typeof fieldValue === "boolean" ||
      fieldValue === null
    ) {
      normalized[key] = fieldValue;
    } else {
      normalized[key] = String(fieldValue);
    }
  }

  return normalized;
}

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!process.env.DIFY_EV_AGENT) {
    return NextResponse.json({ error: "DIFY_EV_AGENT environment variable is not set" }, { status: 500 });
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const inputs = normalizeInputs(body.inputs);
  const user = typeof body.user === "string" && body.user.trim().length > 0 ? body.user.trim() : "web-user";
  const conversationId =
    typeof body.conversationId === "string" && body.conversationId.trim().length > 0
      ? body.conversationId.trim()
      : "";

  const difyPayload = {
    query,
    inputs,
    response_mode: "streaming",
    conversation_id: conversationId,
    user,
  };

  const baseUrl = (process.env.DIFY_API_BASE_URL || "https://api.dify.ai").replace(/\/$/, "");
  const endpoint = `${baseUrl}/v1/chat-messages`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DIFY_EV_AGENT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(difyPayload),
      cache: "no-store",
    });

    if (!response.ok) {
      const details = await response.text();
      return NextResponse.json(
        { error: "Failed to request Dify chat-messages", details: details.slice(0, 1000) },
        { status: response.status }
      );
    }

    if (!response.body) {
      return NextResponse.json({ error: "Empty stream body from Dify" }, { status: 502 });
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unexpected error while requesting Dify chat-messages",
        details: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      },
      { status: 500 }
    );
  }
}
