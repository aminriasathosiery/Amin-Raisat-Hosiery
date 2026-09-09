import { NextResponse } from 'next/server';
import { supabaseServer, createAdminClient, isSupabaseConfigured } from '@/lib/supabase';
import { isReviewDeleted, getReviewApprovalOverride } from '@/lib/reviews/moderationStore';

export const dynamic = 'force-dynamic';

function getDbClient() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      return createAdminClient();
    } catch {
      return supabaseServer;
    }
  }
  return supabaseServer;
}

// Basic anti-spam: very simple in-memory rate limit (resets on server restart)
const recentSubmissions = new Map<string, number>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const last = recentSubmissions.get(ip);
  if (last && now - last < 30_000) return true; // 30 seconds cooldown per IP
  recentSubmissions.set(ip, now);
  // Clean up old entries periodically
  if (recentSubmissions.size > 5000) {
    for (const [k, v] of recentSubmissions.entries()) {
      if (now - v > 120_000) recentSubmissions.delete(k);
    }
  }
  return false;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: true,
        reviews: [],
        averageRating: 5.0,
        totalReviews: 0,
        ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      });
    }

    const dbClient = getDbClient();
    let query = dbClient
      .from('reviews')
      .select('*')
      .eq('is_approved', true)
      .order('created_at', { ascending: false });

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data: reviewsData, error } = await query;

    if (error) {
      console.error('Fetch reviews error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const reviews = (reviewsData || [])
      .filter((r: any) => {
        if (isReviewDeleted(r.id)) return false;
        const override = getReviewApprovalOverride(r.id);
        if (override === false) return false;
        return true;
      })
      .map((r: any) => ({
        id: r.id,
        productId: r.product_id,
        userId: r.user_id || undefined,
        orderId: r.order_id || undefined,
        customerName: r.customer_name,
        customerCity: r.customer_city || '',
        rating: Number(r.rating) || 5,
        comment: r.comment,
        createdAt: r.created_at,
        isApproved: true,
      }));

    const totalReviews = reviews.length;
    const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sumRating = 0;

    reviews.forEach((r) => {
      const rounded = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
      ratingBreakdown[rounded] = (ratingBreakdown[rounded] || 0) + 1;
      sumRating += r.rating;
    });

    const averageRating = totalReviews > 0 ? Number((sumRating / totalReviews).toFixed(1)) : 5.0;

    return NextResponse.json({
      success: true,
      reviews,
      totalReviews,
      averageRating,
      ratingBreakdown,
    });
  } catch (err: any) {
    console.error('GET reviews API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Rate limiting by IP
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many submissions. Please wait a moment before submitting another review.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { productId, customerName, customerCity, rating, comment } = body;

    // Server-side validation
    const cleanName = customerName?.toString().trim();
    const cleanComment = comment?.toString().trim();
    const cleanCity = customerCity?.toString().trim();
    const parsedRating = Number(rating);

    if (!cleanName || cleanName.length < 2 || cleanName.length > 100) {
      return NextResponse.json(
        { error: 'Please provide your name (2–100 characters).' },
        { status: 400 }
      );
    }

    if (!cleanComment || cleanComment.length < 2 || cleanComment.length > 1000) {
      return NextResponse.json(
        { error: 'Review comment must be between 2 and 1000 characters.' },
        { status: 400 }
      );
    }

    if (!parsedRating || parsedRating < 1 || parsedRating > 5 || !Number.isInteger(parsedRating)) {
      return NextResponse.json(
        { error: 'Rating must be a whole number between 1 and 5.' },
        { status: 400 }
      );
    }

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required.' }, { status: 400 });
    }

    // Spam check: reject suspiciously long identical content or HTML
    if (/<[^>]+>/.test(cleanComment) || /<[^>]+>/.test(cleanName)) {
      return NextResponse.json({ error: 'Invalid input detected.' }, { status: 400 });
    }

    const dbClient = getDbClient();

    if (isSupabaseConfigured()) {
      // Verify the product exists in the database
      const { data: productRow } = await dbClient
        .from('products')
        .select('id')
        .eq('id', productId)
        .maybeSingle();

      if (!productRow) {
        return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
      }

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);

      const reviewPayload: any = {
        product_id: isUuid ? productId : null,
        user_id: null,
        order_id: null,
        customer_name: cleanName,
        customer_city: cleanCity || null,
        rating: parsedRating,
        comment: cleanComment,
        is_approved: true,
      };

      let insertedId = `rev-${Date.now()}`;
      let { data: insertedData, error: insErr } = await dbClient
        .from('reviews')
        .insert(reviewPayload)
        .select()
        .single();

      // If user_id or order_id columns don't exist yet, strip them and retry
      if (
        insErr &&
        (insErr.code === 'PGRST204' ||
          insErr.code === '42703' ||
          insErr.message?.includes('user_id') ||
          insErr.message?.includes('order_id'))
      ) {
        delete reviewPayload.user_id;
        delete reviewPayload.order_id;
        const retry = await dbClient.from('reviews').insert(reviewPayload).select().single();
        insertedData = retry.data;
        insErr = retry.error;
      }

      if (insErr) {
        console.error('Supabase review insert error:', insErr);
        return NextResponse.json({ error: insErr.message }, { status: 500 });
      }

      if (insertedData) {
        insertedId = insertedData.id;
      }

      const review = {
        id: insertedId,
        productId,
        userId: undefined,
        orderId: undefined,
        customerName: cleanName,
        customerCity: cleanCity || undefined,
        rating: parsedRating,
        comment: cleanComment,
        createdAt: new Date().toISOString(),
        isApproved: true,
      };

      return NextResponse.json({ success: true, review }, { status: 201 });
    }

    // Fallback if Supabase not configured (demo mode)
    const demoReview = {
      id: `rev-${Date.now()}`,
      productId,
      userId: undefined,
      customerName: cleanName,
      customerCity: cleanCity || undefined,
      rating: parsedRating,
      comment: cleanComment,
      createdAt: new Date().toISOString(),
      isApproved: true,
    };

    return NextResponse.json({ success: true, review: demoReview }, { status: 201 });
  } catch (err: any) {
    console.error('Review API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
