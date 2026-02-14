import { NextResponse } from "next/server";

type SupportedFieldType =
  | "text-input"
  | "secret-input"
  | "paragraph"
  | "number"
  | "select"
  | "options"
  | "radio"
  | "switch";

type NormalizedOption = {
  label: string;
  value: string;
};

type NormalizedField = {
  type: SupportedFieldType;
  label: string;
  variable: string;
  required: boolean;
  defaultValue: string | boolean;
  options?: NormalizedOption[];
  maxLength?: number;
  placeholder?: string;
};

const SUPPORTED_TYPES = new Set<SupportedFieldType>([
  "text-input",
  "secret-input",
  "paragraph",
  "number",
  "select",
  "options",
  "radio",
  "switch",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function localizeText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!isRecord(value)) return "";

  const preferredKeys = ["zh_Hans", "zh_CN", "zh", "en_US", "en"];
  for (const key of preferredKeys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }

  const firstString = Object.values(value).find((item) => typeof item === "string");
  return typeof firstString === "string" ? firstString : "";
}

function normalizeOptions(raw: unknown): NormalizedOption[] {
  if (!Array.isArray(raw)) return [];

  const options: NormalizedOption[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      options.push({ label: item, value: item });
      continue;
    }

    if (!isRecord(item)) {
      continue;
    }

    const value = item.value;
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
      continue;
    }

    const normalizedValue = String(value);
    const label = localizeText(item.label) || normalizedValue;
    options.push({ label, value: normalizedValue });
  }

  return options;
}

function normalizeDefaultValue(type: SupportedFieldType, value: unknown): string | boolean {
  if (type === "switch") {
    return Boolean(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "string") {
    return value;
  }

  return "";
}

function normalizeField(rawField: unknown): NormalizedField | null {
  if (!isRecord(rawField)) return null;

  let type: string | undefined;
  let config: Record<string, unknown> | null = null;

  if (typeof rawField.type === "string") {
    type = rawField.type;
    config = rawField;
  } else {
    const entry = Object.entries(rawField).find(
      ([key, value]) => SUPPORTED_TYPES.has(key as SupportedFieldType) && isRecord(value)
    );

    if (!entry) return null;
    type = entry[0];
    config = entry[1] as Record<string, unknown>;
  }

  if (!type || !SUPPORTED_TYPES.has(type as SupportedFieldType) || !config) {
    return null;
  }

  const variableCandidate = config.variable ?? config.name;
  if (typeof variableCandidate !== "string" || variableCandidate.trim().length === 0) {
    return null;
  }

  const normalizedType = type as SupportedFieldType;
  const label = localizeText(config.label) || variableCandidate;
  const options = normalizeOptions(config.options);
  const maxLength =
    typeof config.max_length === "number"
      ? config.max_length
      : typeof config.maxLength === "number"
        ? config.maxLength
        : undefined;
  const placeholder = localizeText(config.placeholder);

  return {
    type: normalizedType,
    label,
    variable: variableCandidate,
    required: Boolean(config.required),
    defaultValue: normalizeDefaultValue(normalizedType, config.default),
    options:
      normalizedType === "select" || normalizedType === "options" || normalizedType === "radio"
        ? options
        : undefined,
    maxLength: typeof maxLength === "number" && maxLength > 0 ? maxLength : undefined,
    placeholder: placeholder || undefined,
  };
}

export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.DIFY_EV_AGENT) {
    return NextResponse.json({ error: "DIFY_EV_AGENT environment variable is not set" }, { status: 500 });
  }

  const baseUrl = (process.env.DIFY_API_BASE_URL || "https://api.dify.ai").replace(/\/$/, "");
  const endpoint = `${baseUrl}/v1/parameters`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.DIFY_EV_AGENT}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const details = await response.text();
      return NextResponse.json(
        { error: "Failed to fetch Dify parameters", details: details.slice(0, 500) },
        { status: response.status }
      );
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const rawUserInputForm = Array.isArray(payload.user_input_form) ? payload.user_input_form : [];
    const fields = rawUserInputForm.map(normalizeField).filter((field): field is NormalizedField => Boolean(field));

    return NextResponse.json({
      userInputForm: fields,
      openingStatement: typeof payload.opening_statement === "string" ? payload.opening_statement : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unexpected error while requesting Dify parameters",
        details: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      },
      { status: 500 }
    );
  }
}
