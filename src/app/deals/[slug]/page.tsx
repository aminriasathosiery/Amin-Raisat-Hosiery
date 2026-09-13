import { notFound } from 'next/navigation';
import { DealDetailClient } from './DealDetailClient';
import { fetchDealBySlug } from '@/lib/deals';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DealPage({ params }: { params: { slug: string } }) {
  const deal = await fetchDealBySlug(params.slug);

  if (!deal) {
    notFound();
  }

  return <DealDetailClient deal={deal} />;
}
