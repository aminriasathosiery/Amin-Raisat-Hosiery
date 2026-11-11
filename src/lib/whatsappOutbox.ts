import { SupabaseClient } from '@supabase/supabase-js';
import { formatWhatsAppNumber, WHATSAPP_NUMBER } from '@/lib/whatsapp';

export interface NotificationOutboxSeed {
  channel: 'whatsapp';
  recipient_type: 'admin' | 'customer';
  recipient_phone: string;
  event_type: 'order_created' | 'order_status_updated';
  dedupe_key: string;
  payload: {
    orderNumber: string;
    customerName: string;
    totalAmount: number;
    status?: string;
    messageText: string;
  };
}

export function buildOrderCreatedOutboxJobs(params: {
  orderKeyForDedupe: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  city: string;
  totalAmount: number;
  paymentMethod: string;
  adminWhatsapp?: string;
}): NotificationOutboxSeed[] {
  const adminPhone = formatWhatsAppNumber(params.adminWhatsapp || WHATSAPP_NUMBER);
  const customerPhone = formatWhatsAppNumber(params.customerPhone);
  const payLabel = params.paymentMethod === 'cod' ? 'COD' : 'Bank Transfer';

  const adminMsg =
    `New Order #${params.orderNumber}\n` +
    `Customer: ${params.customerName} (${params.customerPhone})\n` +
    `City: ${params.city}\n` +
    `Total: Rs. ${params.totalAmount} (${payLabel})`;

  const customerMsg =
    `Assalam-o-Alaikum ${params.customerName}, thank you for ordering from Amin Raisat Hosiery! ` +
    `Your Order #${params.orderNumber} (Rs. ${params.totalAmount}) has been received cleanly and will be confirmed shortly.`;

  return [
    {
      channel: 'whatsapp',
      recipient_type: 'admin',
      recipient_phone: adminPhone,
      event_type: 'order_created',
      dedupe_key: `order_created:admin:${params.orderKeyForDedupe}`,
      payload: {
        orderNumber: params.orderNumber,
        customerName: params.customerName,
        totalAmount: params.totalAmount,
        messageText: adminMsg,
      },
    },
    {
      channel: 'whatsapp',
      recipient_type: 'customer',
      recipient_phone: customerPhone,
      event_type: 'order_created',
      dedupe_key: `order_created:customer:${params.orderKeyForDedupe}`,
      payload: {
        orderNumber: params.orderNumber,
        customerName: params.customerName,
        totalAmount: params.totalAmount,
        messageText: customerMsg,
      },
    },
  ];
}

export function buildOrderStatusOutboxJob(params: {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  newStatus: string;
  totalAmount: number;
}): NotificationOutboxSeed {
  const customerPhone = formatWhatsAppNumber(params.customerPhone);
  const msg =
    `Assalam-o-Alaikum ${params.customerName}, your Amin Raisat Hosiery Order #${params.orderNumber} status is now: *${params.newStatus}*. ` +
    `Thank you for shopping with us!`;

  return {
    channel: 'whatsapp',
    recipient_type: 'customer',
    recipient_phone: customerPhone,
    event_type: 'order_status_updated',
    dedupe_key: `order_status:${params.newStatus.toLowerCase()}:customer:${params.orderId}`,
    payload: {
      orderNumber: params.orderNumber,
      customerName: params.customerName,
      totalAmount: params.totalAmount,
      status: params.newStatus,
      messageText: msg,
    },
  };
}

export async function enqueueOutboxJobsSafely(
  db: SupabaseClient,
  orderId: string,
  jobs: NotificationOutboxSeed[]
): Promise<void> {
  if (!jobs.length) return;
  try {
    const rows = jobs.map((j) => ({
      order_id: orderId,
      channel: j.channel,
      recipient_type: j.recipient_type,
      recipient_phone: j.recipient_phone,
      event_type: j.event_type,
      dedupe_key: j.dedupe_key,
      payload: j.payload,
      status: 'pending',
    }));

    await db
      .from('notification_outbox')
      .upsert(rows, { onConflict: 'dedupe_key', ignoreDuplicates: true });
  } catch (err) {
    // Graceful no-op if migration_v14 outbox table has not yet been applied
    console.warn('Notification outbox enqueue skipped cleanly:', (err as Error)?.message);
  }
}

export function isWhatsAppCloudConfigured(): boolean {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  return Boolean(token && token.length > 20 && phoneId && phoneId.length > 5);
}

/**
 * Dispatches pending/failed-retryable WhatsApp outbox jobs using Meta WhatsApp Cloud API.
 * Strictly server-side; never exposes API tokens to clients.
 * If WhatsApp Cloud API credentials are absent, marks rows as `manual_required` so Admin
 * has clear visibility and can open 1-click wa.me links or retry once configured.
 */
export async function processNotificationOutbox(
  db: SupabaseClient,
  options: { limit?: number; onlyJobId?: string } = {}
): Promise<{ processed: number; sent: number; failed: number; manualRequired: number }> {
  const limit = Math.min(25, Math.max(1, options.limit || 10));
  const cloudReady = isWhatsAppCloudConfigured();

  let query = db
    .from('notification_outbox')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (options.onlyJobId) {
    query = query.eq('id', options.onlyJobId);
  } else {
    query = query
      .in('status', ['pending', 'failed'])
      .lte('next_retry_at', new Date().toISOString());
  }

  const { data: jobs, error } = await query;
  if (error || !jobs || jobs.length === 0) {
    return { processed: 0, sent: 0, failed: 0, manualRequired: 0 };
  }

  let sent = 0;
  let failed = 0;
  let manualRequired = 0;

  for (const job of jobs) {
    if (!cloudReady) {
      await db
        .from('notification_outbox')
        .update({
          status: 'manual_required',
          last_error: 'WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID not configured; use Admin wa.me link or configure Cloud API.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      manualRequired++;
      continue;
    }

    const attempts = (Number(job.attempts) || 0) + 1;
    const maxAttempts = Number(job.max_attempts) || 5;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    try {
      const apiUrl = `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: job.recipient_phone,
          type: 'text',
          text: { body: job.payload?.messageText || '' },
        }),
        signal: controller.signal,
      });

      const respJson = await res.json().catch(() => ({}));
      clearTimeout(timer);

      if (res.ok && respJson?.messages?.[0]?.id) {
        await db
          .from('notification_outbox')
          .update({
            status: 'sent',
            attempts,
            provider_message_id: respJson.messages[0].id,
            sent_at: new Date().toISOString(),
            last_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);
        sent++;
      } else {
        throw new Error(respJson?.error?.message || `WhatsApp API HTTP ${res.status}`);
      }
    } catch (err: any) {
      clearTimeout(timer);
      const isPermanent = attempts >= maxAttempts;
      const backoffSeconds = Math.pow(2, attempts) * 30;
      const nextRetry = new Date(Date.now() + backoffSeconds * 1000).toISOString();

      await db
        .from('notification_outbox')
        .update({
          status: isPermanent ? 'failed' : 'pending',
          attempts,
          next_retry_at: isPermanent ? null : nextRetry,
          last_error: err?.message || 'WhatsApp dispatch failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      failed++;
    }
  }

  return { processed: jobs.length, sent, failed, manualRequired };
}

