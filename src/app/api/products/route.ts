import { NextResponse } from 'next/server';
import {
  getCachedPublicProducts,
  getCachedPublicCategories,
  getCachedPublicSettings,
} from '@/lib/catalogServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const [products, { categories, subcategories }, settings] = await Promise.all([
      getCachedPublicProducts(),
      getCachedPublicCategories(),
      getCachedPublicSettings(),
    ]);

    return NextResponse.json(
      {
        products,
        categories,
        subcategories,
        settings,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (err) {
    console.warn('API /api/products live fetch notice:', err);
    return NextResponse.json({
      products: [],
      categories: [],
      subcategories: [],
    });
  }
}
