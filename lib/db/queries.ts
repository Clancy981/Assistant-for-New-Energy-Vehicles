import { db } from './index';
import { evModels, favorites } from './schema';
import { eq, and, gte, lte, ilike } from 'drizzle-orm';

// EV Models 查询示例
export async function getAllEvModels() {
  return await db.select().from(evModels);
}

export async function getEvModelById(id: string) {
  return await db.select().from(evModels).where(eq(evModels.id, id));
}

export async function getEvModelsByBrand(brand: string) {
  return await db.select().from(evModels).where(eq(evModels.brand, brand));
}

export async function searchEvModels(searchTerm: string) {
  return await db
    .select()
    .from(evModels)
    .where(
      ilike(evModels.model, `%${searchTerm}%`)
    );
}

export async function getEvModelsByPriceRange(minPrice: number, maxPrice: number) {
  return await db
    .select()
    .from(evModels)
    .where(
      and(
        gte(evModels.priceMin, minPrice.toString()),
        lte(evModels.priceMax, maxPrice.toString())
      )
    );
}

// Favorites 查询示例
export async function getUserFavorites(userId: string) {
  return await db.select().from(favorites).where(eq(favorites.userId, userId));
}

export async function addFavorite(data: {
  userId: string;
  brand: string;
  model: string;
  reason?: string;
  id: string;
}) {
  return await db.insert(favorites).values(data).returning();
}

export async function removeFavorite(brand: string, model: string, id: string) {
  return await db
    .delete(favorites)
    .where(
      and(
        eq(favorites.brand, brand),
        eq(favorites.model, model),
        eq(favorites.id, id)
      )
    );
}

