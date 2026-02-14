import Link from "next/link"
import { eq } from "drizzle-orm"
import { ArrowLeft } from "lucide-react"
import { notFound } from "next/navigation"

import { Button } from "@/components/ui/button"
import ContactTestDriveButton from "@/components/contact-test-drive-button"
import { db } from "@/lib/db"
import { evModels } from "@/lib/db/schema"

export const dynamic = "force-dynamic"

type DetailItemProps = {
  label: string
  value: string
}

function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="mb-2 text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm text-white">{value}</p>
    </div>
  )
}

function formatPrice(value: string | null) {
  if (!value) return "暂无"
  const numberValue = Number(value)
  if (Number.isNaN(numberValue)) return value
  return `¥${numberValue.toLocaleString("zh-CN")}`
}

function formatPriceRange(min: string | null, max: string | null) {
  const minText = formatPrice(min)
  const maxText = formatPrice(max)

  if (minText !== "暂无" && maxText !== "暂无") return `${minText} - ${maxText}`
  if (minText !== "暂无") return `${minText} 起`
  if (maxText !== "暂无") return `最高 ${maxText}`
  return "暂无"
}

function display(value: string | number | null) {
  if (value === null || value === undefined || value === "") return "暂无"
  return String(value)
}

function formatDate(value: string | null) {
  if (!value) return "暂无"
  return value
}

function toFeatureTags(value: unknown) {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (typeof item === "string") return item
      if (typeof item === "number" || typeof item === "boolean") return String(item)
      return null
    })
    .filter((item): item is string => Boolean(item && item.trim()))
}

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function EvDetailPage({ params }: PageProps) {
  const { id } = await params
  const [model] = await db.select().from(evModels).where(eq(evModels.id, id)).limit(1)
  const featureTags = toFeatureTags(model?.driverAssistFeatures)

  if (!model) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-black to-black" />

      <div className="relative container mx-auto px-4 py-10">
        <Button asChild variant="ghost" className="mb-8 text-gray-300 hover:bg-white/10 hover:text-white">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回首页
          </Link>
        </Button>

        <div className="grid gap-8 lg:grid-cols-[1.2fr,1fr]">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
            <img
              src={model.image || "/placeholder.jpg"}
              alt={`${model.brand} ${model.model}`}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="space-y-4">
            <p className="inline-flex rounded-full border border-green-400/40 bg-green-500/10 px-3 py-1 text-xs text-green-300">
              {model.bodyType}
            </p>
            <h1 className="text-3xl font-bold md:text-4xl">
              {model.brand} {model.model}
            </h1>
            <p className="text-lg text-blue-300">{formatPriceRange(model.priceMin, model.priceMax)}</p>
            <p className="text-gray-300">
              动力类型: <span className="text-white">{display(model.powerType)}</span>
            </p>
            <p className="text-gray-300">
              市场定位: <span className="text-white">{display(model.marketPosition)}</span>
            </p>
            <div className="pt-2">
              <ContactTestDriveButton
                model={{
                  id: model.id,
                  brand: model.brand,
                  model: model.model,
                  variant: model.variant,
                  bodyType: model.bodyType,
                  priceMin: model.priceMin,
                  priceMax: model.priceMax,
                  powerType: model.powerType,
                }}
              />
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <DetailItem label="ID" value={display(model.id)} />
          <DetailItem label="品牌" value={display(model.brand)} />
          <DetailItem label="车型" value={display(model.model)} />
          <DetailItem label="版本" value={display(model.variant)} />
          <DetailItem label="车身类型" value={display(model.bodyType)} />
          <DetailItem label="动力类型" value={display(model.powerType)} />
          <DetailItem label="上市日期" value={formatDate(model.releaseDate)} />
          <DetailItem label="最低价格" value={formatPrice(model.priceMin)} />
          <DetailItem label="最高价格" value={formatPrice(model.priceMax)} />
          <DetailItem label="续航里程 (km)" value={display(model.rangeKm)} />
          <DetailItem label="电池容量 (kWh)" value={display(model.batteryCapacityKwh)} />
          <DetailItem label="自动驾驶级别" value={display(model.autonomousLevel)} />
          <DetailItem label="数据来源" value={display(model.source)} />
          <DetailItem label="创建时间" value={display(model.createdAt?.toISOString?.() ?? null)} />
          <DetailItem label="更新时间" value={display(model.updatedAt?.toISOString?.() ?? null)} />
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="mb-3 text-lg font-semibold text-white">辅助驾驶特性</h2>
          {featureTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {featureTags.map((tag, index) => (
                <span
                  key={`${tag}-${index}`}
                  className="rounded-full border border-green-400/30 bg-green-500/10 px-3 py-1 text-xs text-green-200"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">暂无</p>
          )}
        </div>
      </div>
    </div>
  )
}
