"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Zap } from "lucide-react";

import PulsingBorderShader from "./components/pulsing-border-shader";
import { Button } from "@/components/ui/button";

type FieldType =
  | "text-input"
  | "secret-input"
  | "paragraph"
  | "number"
  | "select"
  | "options"
  | "radio"
  | "switch";

type FieldOption = {
  label: string;
  value: string;
};

type UserInputField = {
  type: FieldType;
  label: string;
  variable: string;
  required: boolean;
  defaultValue: string | boolean;
  options?: FieldOption[];
  maxLength?: number;
  placeholder?: string;
};

type ParametersResponse = {
  userInputForm: UserInputField[];
  openingStatement?: string | null;
  error?: string;
  details?: string;
};

type FormValues = Record<string, string | boolean>;
type FormErrors = Record<string, string>;

const LOCAL_STORAGE_KEY = "ev_requirements_form_v1";

function toInitialValue(field: UserInputField): string | boolean {
  if (field.type === "switch") {
    if (typeof field.defaultValue === "boolean") return field.defaultValue;
    return field.defaultValue === "true";
  }

  if (typeof field.defaultValue === "string") {
    return field.defaultValue;
  }

  return "";
}

function normalizeValueFromStorage(field: UserInputField, value: unknown): string | boolean {
  if (field.type === "switch") {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value === "true";
    return toInitialValue(field);
  }

  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return toInitialValue(field);
}

function buildInitialFormValues(fields: UserInputField[]): FormValues {
  const initialValues: FormValues = {};
  let storedValues: Record<string, unknown> = {};

  if (typeof window !== "undefined") {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      try {
        storedValues = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        storedValues = {};
      }
    }
  }

  for (const field of fields) {
    const storedValue = storedValues[field.variable];
    const normalized = normalizeValueFromStorage(field, storedValue);

    if (
      (field.type === "select" || field.type === "options" || field.type === "radio") &&
      typeof normalized === "string" &&
      normalized.length > 0 &&
      Array.isArray(field.options) &&
      field.options.length > 0
    ) {
      const optionValues = new Set(field.options.map((option) => option.value));
      initialValues[field.variable] = optionValues.has(normalized) ? normalized : toInitialValue(field);
    } else {
      initialValues[field.variable] = normalized;
    }
  }

  return initialValues;
}

function isRequiredFieldMissing(field: UserInputField, value: string | boolean | undefined): boolean {
  if (!field.required) return false;

  if (field.type === "switch") {
    return typeof value !== "boolean";
  }

  if (typeof value !== "string") return true;
  if (value.trim().length === 0) return true;

  if (field.type === "number" && Number.isNaN(Number(value))) {
    return true;
  }

  return false;
}

export default function Component() {
  const router = useRouter();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [fields, setFields] = useState<UserInputField[]>([]);
  const [formValues, setFormValues] = useState<FormValues>({});
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isChatOpen) return;

    const controller = new AbortController();

    const fetchFormParameters = async () => {
      setFormLoading(true);
      setFormError(null);
      setFieldErrors({});

      try {
        const response = await fetch("/api/dify/parameters", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        const payload = (await response.json()) as ParametersResponse;
        if (!response.ok) {
          const message = payload?.error || "获取调研表单失败，请稍后重试。";
          throw new Error(message);
        }

        const formFields = Array.isArray(payload.userInputForm) ? payload.userInputForm : [];
        setFields(formFields);
        setFormValues(buildInitialFormValues(formFields));
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setFormError(error instanceof Error ? error.message : "获取调研表单失败，请稍后重试。");
        setFields([]);
        setFormValues({});
      } finally {
        setFormLoading(false);
      }
    };

    void fetchFormParameters();

    return () => controller.abort();
  }, [isChatOpen]);

  useEffect(() => {
    if (typeof window === "undefined" || fields.length === 0) return;

    const dataToPersist: Record<string, string | boolean> = {};
    for (const field of fields) {
      const currentValue = formValues[field.variable];
      dataToPersist[field.variable] = currentValue ?? toInitialValue(field);
    }

    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToPersist));
  }, [fields, formValues]);

  const handleFieldChange = (variable: string, value: string | boolean) => {
    setFormValues((prev) => ({ ...prev, [variable]: value }));

    setFieldErrors((prev) => {
      if (!prev[variable]) return prev;
      const next = { ...prev };
      delete next[variable];
      return next;
    });

    if (formError) {
      setFormError(null);
    }
  };

  const handleStartSelectCar = () => {
    const nextErrors: FormErrors = {};

    for (const field of fields) {
      const value = formValues[field.variable];
      if (isRequiredFieldMissing(field, value)) {
        nextErrors[field.variable] = `${field.label}为必填项`;
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setFormError("请填写完成所有必填项后再开始选车。");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setIsChatOpen(false);
    router.push("/chat");
    setIsSubmitting(false);
  };

  const renderField = (field: UserInputField) => {
    const value = formValues[field.variable];
    const error = fieldErrors[field.variable];
    const commonClassName =
      "w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none transition focus:border-green-400/60 focus:ring-2 focus:ring-green-500/20";

    return (
      <div key={field.variable} className="space-y-2">
        <label className="block text-sm font-medium text-gray-200">
          {field.label}
          {field.required ? <span className="ml-1 text-red-400">*</span> : null}
        </label>

        {field.type === "paragraph" ? (
          <textarea
            className={`${commonClassName} min-h-24 resize-y`}
            placeholder={field.placeholder || "请输入"}
            maxLength={field.maxLength}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => handleFieldChange(field.variable, event.target.value)}
          />
        ) : null}

        {field.type === "number" ? (
          <input
            type="number"
            inputMode="decimal"
            className={commonClassName}
            placeholder={field.placeholder || "请输入数字"}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => handleFieldChange(field.variable, event.target.value)}
          />
        ) : null}

        {(field.type === "select" || field.type === "options") && Array.isArray(field.options) ? (
          <select
            className={commonClassName}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => handleFieldChange(field.variable, event.target.value)}
          >
            <option value="">请选择</option>
            {field.options.map((option) => (
              <option key={`${field.variable}-${option.value}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : null}

        {field.type === "radio" && Array.isArray(field.options) ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {field.options.map((option) => (
              <label
                key={`${field.variable}-${option.value}`}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-200"
              >
                <input
                  type="radio"
                  name={field.variable}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(event) => handleFieldChange(field.variable, event.target.value)}
                  className="h-4 w-4 border-white/20 bg-black text-green-500 focus:ring-green-500/30"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        ) : null}

        {field.type === "switch" ? (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-200">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(event) => handleFieldChange(field.variable, event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-black text-green-500 focus:ring-green-500/30"
            />
            <span>{Boolean(value) ? "已开启" : "未开启"}</span>
          </label>
        ) : null}

        {(field.type === "text-input" || field.type === "secret-input") ? (
          <input
            type={field.type === "secret-input" ? "password" : "text"}
            className={commonClassName}
            placeholder={field.placeholder || "请输入"}
            maxLength={field.maxLength}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => handleFieldChange(field.variable, event.target.value)}
          />
        ) : null}

        {error ? <p className="text-xs text-red-400">{error}</p> : null}
      </div>
    );
  };

  return (
    <div className="overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-black to-blue-900/20" />

      <div className="relative z-10 container mx-auto px-4 py-14 md:py-16">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="space-y-8 lg:pr-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-sm text-green-300">
              <Zap className="h-4 w-4" />
              AI智能新能源汽车助手
            </div>

            <div className="space-y-6">
              <h1 className="text-5xl font-bold leading-tight tracking-tight lg:text-7xl">
                发现您的{" "}
                <span className="bg-gradient-to-r from-green-400 via-blue-400 to-teal-400 bg-clip-text text-transparent">
                  理想座驾
                </span>
              </h1>

              <p className="max-w-2xl text-xl leading-relaxed text-gray-300 lg:text-2xl">
                通过我们的AI智能助手，帮助您发现最适合您的新能源汽车。个性化推荐，专业分析，让您的购车决策更加智能高效。
              </p>
            </div>

            <div className="flex flex-col gap-4 pt-4 sm:flex-row">
              <Button
                size="lg"
                className="group rounded-full bg-gradient-to-r from-green-600 to-blue-600 px-8 py-6 text-lg text-white hover:from-green-700 hover:to-blue-700"
                onClick={() => setIsChatOpen(true)}
              >
                开始寻找
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="rounded-full border-gray-600 bg-transparent px-8 py-6 text-lg text-white hover:bg-gray-800"
              >
                观看演示
              </Button>
            </div>

            <div className="flex items-center gap-8 pt-8 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                24/7在线服务
              </div>
              <div>免费咨询</div>
              <div>专业推荐</div>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              <div className="absolute inset-0 scale-110 bg-gradient-to-r from-green-500/20 to-blue-500/20 blur-3xl" />

              <div className="relative">
                <PulsingBorderShader />
              </div>

              <div
                className="absolute -right-4 -top-4 h-3 w-3 animate-bounce rounded-full bg-green-400"
                style={{ animationDelay: "0s" }}
              />
              <div
                className="absolute -left-6 top-1/3 h-2 w-2 animate-bounce rounded-full bg-blue-400"
                style={{ animationDelay: "1s" }}
              />
              <div
                className="absolute -right-8 bottom-1/4 h-4 w-4 animate-bounce rounded-full bg-teal-400"
                style={{ animationDelay: "2s" }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />

      {isChatOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4"
          onClick={() => setIsChatOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-4 top-3 z-10 text-sm text-gray-300 hover:text-white"
              onClick={() => setIsChatOpen(false)}
            >
              关闭
            </button>

            <div className="flex h-[78vh] min-h-[460px] flex-col bg-gradient-to-b from-zinc-900 to-black p-6 md:p-8">
              <div>
                <h2 className="text-2xl font-semibold text-white">告诉我你心仪的车？</h2>
                <p className="mt-2 text-sm text-gray-400">填写需求后，点击“开始选车”进入下一步对话页面。</p>
              </div>

              {formError ? (
                <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
                  {formError}
                </div>
              ) : null}

              <div className="mt-5 flex-1 overflow-y-auto pr-1">
                {formLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={`form-skeleton-${index}`}
                        className="h-14 animate-pulse rounded-xl border border-white/10 bg-white/[0.03]"
                      />
                    ))}
                  </div>
                ) : fields.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-300">
                    暂无可用表单字段，请先在 Dify 应用配置 `user_input_form`。
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fields.map((field) => renderField(field))}
                  </div>
                )}
              </div>

              <div className="mt-6 border-t border-white/10 pt-4">
                <Button
                  className="h-11 w-full bg-gradient-to-r from-green-600 to-blue-600 text-white hover:from-green-700 hover:to-blue-700"
                  onClick={handleStartSelectCar}
                  disabled={formLoading || isSubmitting || fields.length === 0}
                >
                  开始选车
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
