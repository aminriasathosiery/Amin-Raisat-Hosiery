import { notFound } from 'next/navigation';
import { getCachedPublicProducts } from '@/lib/catalogServer';
import { ProductDetailClient } from './ProductDetailClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProductDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const products = await getCachedPublicProducts();
  const matched =
    products.find((p) => p.slug === params.slug || p.id === params.slug) || null;

  if (!matched && products.length > 0) {
    notFound();
  }

  return <ProductDetailClient initialProduct={matched} />;
}
