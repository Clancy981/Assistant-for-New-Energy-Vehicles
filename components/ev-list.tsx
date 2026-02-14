"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, CarFront } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const PAGE_SIZE = 28

type EvListItem = {
  id: string
  image: string | null
  brand: string
  model: string
  bodyType: string
  priceMin: string | null
  priceMax: string | null
}

type Pagination = {
  page: number
  pageSize: number
  total: number | null
  totalPages: number | null
  hasPrevious: boolean
  hasNext: boolean
}

type EvListResponse = {
  data: EvListItem[]
  pagination: Pagination
}

type PageToken = number | "left-ellipsis" | "right-ellipsis"

function formatPrice(value: string | null) {
  if (!value) return null
  const numberValue = Number(value)
  if (Number.isNaN(numberValue)) return null
  return `¥${numberValue.toLocaleString("zh-CN")}`
}

function formatPriceRange(min: string | null, max: string | null) {
  const formattedMin = formatPrice(min)
  const formattedMax = formatPrice(max)

  if (formattedMin && formattedMax) {
    return `${formattedMin} - ${formattedMax}`
  }

  if (formattedMin) return `${formattedMin} 起`
  if (formattedMax) return `最高 ${formattedMax}`
  return "价格待更新"
}

function buildPageTokens(currentPage: number, totalPages: number | null): PageToken[] {
  if (!totalPages || totalPages <= 1) return [currentPage]

  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const tokens: PageToken[] = [1]
  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)

  if (start > 2) {
    tokens.push("left-ellipsis")
  }

  for (let page = start; page <= end; page += 1) {
    tokens.push(page)
  }

  if (end < totalPages - 1) {
    tokens.push("right-ellipsis")
  }

  tokens.push(totalPages)
  return tokens
}

export default function EvList() {
  const [items, setItems] = useState<EvListItem[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true
    const controller = new AbortController()
    let didTimeout = false
    const timeoutId = window.setTimeout(() => {
      didTimeout = true
      controller.abort()
    }, 15000)

    const fetchPage = async () => {
      if (isActive) {
        setIsLoading(true)
        setError(null)
      }

      try {
        const response = await fetch(`/api/ev-models?page=${page}&pageSize=${PAGE_SIZE}`, {
          cache: "no-store",
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`请求失败: ${response.status}`)
        }

        const payload = (await response.json()) as EvListResponse
        if (!isActive) return

        setItems(payload.data)
        setPagination(payload.pagination)

        if (payload.pagination.page !== page) {
          setPage(payload.pagination.page)
        }
      } catch (fetchError) {
        if (!isActive) return

        if ((fetchError as Error).name === "AbortError") {
          if (didTimeout) {
            setError("请求超时，请检查数据库连接后重试。")
          }
        } else {
          setError("加载车型列表失败，请稍后重试。")
        }
      } finally {
        clearTimeout(timeoutId)
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void fetchPage()

    return () => {
      isActive = false
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [page])

  const totalText =
    typeof pagination?.total === "number" ? `共 ${pagination.total.toLocaleString("zh-CN")} 款车型` : ""
  const pageTokens = buildPageTokens(pagination?.page ?? page, pagination?.totalPages ?? null)

  return (
    <section className="relative bg-black py-16">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-slate-950/30 to-black" />

      <div className="relative container mx-auto px-4">
        <div className="mb-10 space-y-3">
          <p className="inline-flex items-center gap-2 rounded-full border border-green-400/30 bg-green-500/10 px-3 py-1 text-sm text-green-300">
            <CarFront className="h-4 w-4" />
            EV 车型库
          </p>
          <h2 className="text-3xl font-bold text-white md:text-4xl">热门新能源车型</h2>
          <p className="text-gray-400">每页 28 条，点击卡片可在新窗口查看详情</p>
        </div>

        {error ? <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-red-300">{error}</p> : null}

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="h-[260px] animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-gray-300">
            暂无车型数据，请确认数据库连接和表内数据。
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/ev/${item.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group"
              >
                <Card className="h-full overflow-hidden border-white/10 bg-white/[0.03] backdrop-blur-sm transition hover:border-green-400/60 hover:shadow-[0_8px_28px_rgba(52,211,153,0.18)]">
                  <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800">
                    <img
                      src={item.image || "/placeholder.jpg"}
                      alt={`${item.brand} ${item.model}`}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.onerror = null
                        event.currentTarget.src = "/placeholder.jpg"
                      }}
                    />
                  </div>

                  <CardContent className="space-y-2.5 p-4">
                    <p className="text-xs text-green-300">{item.brand}</p>
                    <h3 className="line-clamp-2 text-base font-semibold text-white">{item.model}</h3>
                    <p className="inline-flex rounded-md bg-white/5 px-2.5 py-1 text-xs text-gray-300">{item.bodyType}</p>
                    <p className="text-xs font-medium text-blue-300">{formatPriceRange(item.priceMin, item.priceMax)}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-gray-400">
              第 {pagination?.page ?? page}
              {typeof pagination?.totalPages === "number" ? ` / ${pagination.totalPages}` : ""}
              {" "}页
              {totalText ? ` · ${totalText}` : ""}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-white/20 bg-white/5 px-3 text-white hover:bg-white/10"
                onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                disabled={isLoading || !pagination?.hasPrevious}
              >
                <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                上一页
              </Button>

              {pageTokens.map((token) =>
                typeof token === "number" ? (
                  <Button
                    key={token}
                    size="sm"
                    variant={token === (pagination?.page ?? page) ? "default" : "outline"}
                    className={
                      token === (pagination?.page ?? page)
                        ? "h-8 min-w-8 bg-white text-black hover:bg-white/90"
                        : "h-8 min-w-8 border-white/20 bg-white/5 text-white hover:bg-white/10"
                    }
                    onClick={() => setPage(token)}
                    disabled={isLoading}
                  >
                    {token}
                  </Button>
                ) : (
                  <span key={token} className="px-1 text-sm text-gray-500">
                    ...
                  </span>
                )
              )}

              <Button
                variant="outline"
                size="sm"
                className="h-8 border-white/20 bg-white/5 px-3 text-white hover:bg-white/10"
                onClick={() => setPage((currentPage) => currentPage + 1)}
                disabled={isLoading || !pagination?.hasNext}
              >
                下一页
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
