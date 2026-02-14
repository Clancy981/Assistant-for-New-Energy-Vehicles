import { NextResponse } from "next/server"
import { asc, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { evModels } from "@/lib/db/schema"

export const dynamic = "force-dynamic"

const DEFAULT_PAGE_SIZE = 28
const MAX_PAGE_SIZE = 100
const QUERY_TIMEOUT_MS = 10000
const COUNT_QUERY_TIMEOUT_MS = 6000

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("DB_QUERY_TIMEOUT")), timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const rawPage = Number(searchParams.get("page") ?? "1")
    const rawPageSize = Number(searchParams.get("pageSize") ?? `${DEFAULT_PAGE_SIZE}`)

    const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1
    const pageSize =
      Number.isFinite(rawPageSize) && rawPageSize > 0
        ? Math.min(Math.floor(rawPageSize), MAX_PAGE_SIZE)
        : DEFAULT_PAGE_SIZE

    let total: number | null = null
    let totalPages: number | null = null

    try {
      const [countRow] = await withTimeout(
        db.select({ count: sql<number>`count(*)::int` }).from(evModels),
        COUNT_QUERY_TIMEOUT_MS
      )
      total = Number(countRow?.count ?? 0)
      totalPages = Math.max(1, Math.ceil(total / pageSize))
    } catch {
      total = null
      totalPages = null
    }

    const safePage = totalPages === null ? page : Math.min(page, totalPages)
    const offset = (safePage - 1) * pageSize
    const rows = await withTimeout(
      db
        .select({
          id: evModels.id,
          image: evModels.image,
          brand: evModels.brand,
          model: evModels.model,
          bodyType: evModels.bodyType,
          priceMin: evModels.priceMin,
          priceMax: evModels.priceMax,
        })
        .from(evModels)
        .orderBy(asc(evModels.id))
        .limit(pageSize + 1)
        .offset(offset),
      QUERY_TIMEOUT_MS
    )

    const hasNext = totalPages === null ? rows.length > pageSize : safePage < totalPages
    const data = hasNext ? rows.slice(0, pageSize) : rows

    return NextResponse.json({
      data,
      pagination: {
        page: safePage,
        pageSize,
        total,
        totalPages,
        hasPrevious: safePage > 1,
        hasNext,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR"
    return NextResponse.json(
      {
        data: [],
        pagination: {
          page: 1,
          pageSize: DEFAULT_PAGE_SIZE,
          total: null,
          totalPages: null,
          hasPrevious: false,
          hasNext: false,
        },
        error: message,
      },
      { status: 500 }
    )
  }
}
