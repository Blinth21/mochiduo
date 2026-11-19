import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';

import type {
  BucketItem,
  ChatMessage,
  LocationSnapshot,
  LoveNote,
  MemoryItem,
  PartnerId,
  PartnerProfile,
  PlayBroadcastEvent,
  SyncConfig,
} from '@/types/couple';

let cachedClient: SupabaseClient | null = null;
let cachedKey = '';
let activeRoomChannel: RealtimeChannel | null = null;
let activeRoomKey = '';

export function getSupabaseClient(url: string, anonKey: string): SupabaseClient | null {
  const cleanUrl = url.trim();
  const cleanKey = anonKey.trim();
  if (!cleanUrl || !cleanKey) return null;

  const sig = `${cleanUrl}::${cleanKey}`;
  if (cachedClient && cachedKey === sig) {
    return cachedClient;
  }

  cachedClient = createClient(cleanUrl, cleanKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    realtime: {
      params: { eventsPerSecond: 15 },
    },
  });
  cachedKey = sig;
  return cachedClient;
}

export interface RoomSeedPayload {
  coupleTitle: string;
  anniversaryDate: string;
  hugCount: number;
  lastHugFrom: PartnerId | null;
  lastHugAt: number | null;
  partners: Record<PartnerId, PartnerProfile>;
  locations: Record<PartnerId, LocationSnapshot>;
  memories: MemoryItem[];
  bucketList: BucketItem[];
  loveNotes: LoveNote[];
  chatMessages: ChatMessage[];
}

export interface RemoteRoomData {
  coupleTitle: string;
  anniversaryDate: string;
  hugCount: number;
  lastHugFrom: PartnerId | null;
  lastHugAt: number | null;
  partners: Record<PartnerId, PartnerProfile>;
  locations: Record<PartnerId, LocationSnapshot>;
  memories: MemoryItem[];
  bucketList: BucketItem[];
  loveNotes: LoveNote[];
  chatMessages: ChatMessage[];
}

function formatSupabaseError(msg?: string | null): string {
  if (!msg) return 'Terjadi kesalahan koneksi Supabase.';
  if (msg.toLowerCase().includes('permission denied for table')) {
    return `${msg} — Jalankan GRANT ke role anon & authenticated di Supabase SQL Editor (lihat supabase/schema.sql).`;
  }
  return msg;
}

export async function joinOrCreateRoom(
  config: SyncConfig,
  seed: RoomSeedPayload
): Promise<{ data?: RemoteRoomData; created?: boolean; error?: string }> {
  const client = getSupabaseClient(config.supabaseUrl, config.supabaseAnonKey);
  const code = config.roomCode.trim().toUpperCase();
  if (!client || !code) {
    return { error: 'URL Supabase, Anon Key, dan Kode Pasangan wajib diisi.' };
  }

  const { data: existingRoom, error: fetchErr } = await client
    .from('couple_rooms')
    .select('*')
    .eq('room_code', code)
    .maybeSingle();

  if (fetchErr) {
    return { error: formatSupabaseError(fetchErr.message) };
  }

  if (existingRoom) {
    const [memRes, buckRes, noteRes, msgRes] = await Promise.all([
      client
        .from('couple_memories')
        .select('data')
        .eq('room_code', code)
        .order('created_at', { ascending: false }),
      client
        .from('couple_buckets')
        .select('data')
        .eq('room_code', code)
        .order('updated_at', { ascending: false }),
      client
        .from('couple_notes')
        .select('data')
        .eq('room_code', code)
        .order('created_at', { ascending: false }),
      client
        .from('couple_messages')
        .select('data')
        .eq('room_code', code)
        .order('created_at', { ascending: true })
        .limit(200),
    ]);

    return {
      created: false,
      data: {
        coupleTitle: existingRoom.couple_title,
        anniversaryDate: existingRoom.anniversary_date,
        hugCount: existingRoom.hug_count,
        lastHugFrom: existingRoom.last_hug_from,
        lastHugAt: existingRoom.last_hug_at,
        partners: {
          p1: existingRoom.p1_profile,
          p2: existingRoom.p2_profile,
        },
        locations: {
          p1: existingRoom.p1_location,
          p2: existingRoom.p2_location,
        },
        memories: (memRes.data ?? []).map((r: any) => r.data as MemoryItem),
        bucketList: (buckRes.data ?? []).map((r: any) => r.data as BucketItem),
        loveNotes: (noteRes.data ?? []).map((r: any) => r.data as LoveNote),
        chatMessages: msgRes.error
          ? seed.chatMessages
          : (msgRes.data ?? []).map((r: any) => r.data as ChatMessage),
      },
    };
  }

  // Create new room seeded with current device's initial data
  const { error: insertRoomErr } = await client.from('couple_rooms').insert({
    room_code: code,
    couple_title: seed.coupleTitle,
    anniversary_date: seed.anniversaryDate,
    hug_count: seed.hugCount,
    last_hug_from: seed.lastHugFrom,
    last_hug_at: seed.lastHugAt,
    p1_profile: seed.partners.p1,
    p2_profile: seed.partners.p2,
    p1_location: seed.locations.p1,
    p2_location: seed.locations.p2,
  });

  if (insertRoomErr) {
    return { error: formatSupabaseError(insertRoomErr.message) };
  }

  await Promise.all([
    seed.memories.length > 0
      ? client.from('couple_memories').upsert(
          seed.memories.map((m) => ({
            id: m.id,
            room_code: code,
            data: m,
            created_at: m.createdAt,
          }))
        )
      : Promise.resolve(),
    seed.bucketList.length > 0
      ? client.from('couple_buckets').upsert(
          seed.bucketList.map((b) => ({
            id: b.id,
            room_code: code,
            data: b,
            updated_at: b.doneAt ?? Date.now(),
          }))
        )
      : Promise.resolve(),
    seed.loveNotes.length > 0
      ? client.from('couple_notes').upsert(
          seed.loveNotes.map((n) => ({
            id: n.id,
            room_code: code,
            data: n,
            created_at: n.createdAt,
          }))
        )
      : Promise.resolve(),
    seed.chatMessages.length > 0
      ? client
          .from('couple_messages')
          .upsert(
            seed.chatMessages.map((msg) => ({
              id: msg.id,
              room_code: code,
              data: msg,
              created_at: msg.createdAt,
            }))
          )
          .then(() => undefined, () => undefined)
      : Promise.resolve(),
  ]);

  return { created: true, data: seed };
}

export interface RoomRealtimeHandlers {
  activePartnerId: PartnerId;
  onRoomUpdate: (row: any) => void;
  onMemoryUpsert: (item: MemoryItem) => void;
  onMemoryDelete: (id: string) => void;
  onBucketUpsert: (item: BucketItem) => void;
  onBucketDelete: (id: string) => void;
  onNoteUpsert: (item: LoveNote) => void;
  onNoteDelete: (id: string) => void;
  onMessageUpsert: (item: ChatMessage) => void;
  onMessageDelete: (id: string) => void;
  onTypingChange: (senderId: PartnerId, isTyping: boolean) => void;
  onLiveLocationBroadcast: (partnerId: PartnerId, loc: LocationSnapshot) => void;
  onPlayEvent?: (event: PlayBroadcastEvent) => void;
  onPresenceChange: (online: Record<PartnerId, boolean>) => void;
  onStatusChange: (status: 'connected' | 'error', err?: string) => void;
}

export function subscribeToRoom(
  config: SyncConfig,
  handlers: RoomRealtimeHandlers
): () => void {
  const client = getSupabaseClient(config.supabaseUrl, config.supabaseAnonKey);
  const code = config.roomCode.trim().toUpperCase();
  if (!client || !code) return () => {};

  const channel: RealtimeChannel = client
    .channel(`mochiduo-room-${code}`, {
      config: {
        presence: { key: handlers.activePartnerId },
      },
    })
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'couple_rooms', filter: `room_code=eq.${code}` },
      (payload) => {
        if (payload.new) handlers.onRoomUpdate(payload.new);
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'couple_memories', filter: `room_code=eq.${code}` },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const oldId = (payload.old as any)?.id;
          if (oldId) handlers.onMemoryDelete(oldId);
        } else if ((payload.new as any)?.data) {
          handlers.onMemoryUpsert((payload.new as any).data as MemoryItem);
        }
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'couple_buckets', filter: `room_code=eq.${code}` },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const oldId = (payload.old as any)?.id;
          if (oldId) handlers.onBucketDelete(oldId);
        } else if ((payload.new as any)?.data) {
          handlers.onBucketUpsert((payload.new as any).data as BucketItem);
        }
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'couple_notes', filter: `room_code=eq.${code}` },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const oldId = (payload.old as any)?.id;
          if (oldId) handlers.onNoteDelete(oldId);
        } else if ((payload.new as any)?.data) {
          handlers.onNoteUpsert((payload.new as any).data as LoveNote);
        }
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'couple_messages', filter: `room_code=eq.${code}` },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const oldId = (payload.old as any)?.id;
          if (oldId) handlers.onMessageDelete(oldId);
        } else if ((payload.new as any)?.data) {
          handlers.onMessageUpsert((payload.new as any).data as ChatMessage);
        }
      }
    )
    .on('broadcast', { event: 'typing' }, (msg) => {
      const payload = msg.payload as { senderId?: PartnerId; isTyping?: boolean } | undefined;
      if (payload?.senderId) {
        handlers.onTypingChange(payload.senderId, Boolean(payload.isTyping));
      }
    })
    .on('broadcast', { event: 'live_location' }, (msg) => {
      const payload = msg.payload as { partnerId?: PartnerId; location?: LocationSnapshot } | undefined;
      if (payload?.partnerId && payload?.location) {
        handlers.onLiveLocationBroadcast(payload.partnerId, payload.location);
      }
    })
    .on('broadcast', { event: 'play_game' }, (msg) => {
      const payload = msg.payload as PlayBroadcastEvent | undefined;
      if (payload?.type && handlers.onPlayEvent) {
        handlers.onPlayEvent(payload);
      }
    })
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      handlers.onPresenceChange({
        p1: Boolean(state.p1 && state.p1.length > 0),
        p2: Boolean(state.p2 && state.p2.length > 0),
      });
    })
    .subscribe(async (status, err) => {
      if (status === 'SUBSCRIBED') {
        activeRoomChannel = channel;
        activeRoomKey = code;
        handlers.onStatusChange('connected');
        await channel
          .track({
            partnerId: handlers.activePartnerId,
            onlineAt: Date.now(),
          })
          .catch(() => {});
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        handlers.onStatusChange('error', err?.message ?? 'Koneksi realtime terputus');
      }
    });

  return () => {
    if (activeRoomChannel === channel) {
      activeRoomChannel = null;
      activeRoomKey = '';
    }
    client.removeChannel(channel).catch(() => {});
  };
}

export function broadcastTyping(roomCode: string, senderId: PartnerId, isTyping: boolean): void {
  if (!activeRoomChannel || activeRoomKey !== roomCode.trim().toUpperCase()) return;
  void activeRoomChannel.send({
    type: 'broadcast',
    event: 'typing',
    payload: { senderId, isTyping },
  });
}

export function broadcastLiveLocation(
  roomCode: string,
  partnerId: PartnerId,
  location: LocationSnapshot
): void {
  if (!activeRoomChannel || activeRoomKey !== roomCode.trim().toUpperCase()) return;
  void activeRoomChannel.send({
    type: 'broadcast',
    event: 'live_location',
    payload: { partnerId, location },
  });
}

export function broadcastPlayEvent(roomCode: string, event: PlayBroadcastEvent): void {
  if (!activeRoomChannel || activeRoomKey !== roomCode.trim().toUpperCase()) return;
  void activeRoomChannel.send({
    type: 'broadcast',
    event: 'play_game',
    payload: event,
  });
}

export async function pushRoomFields(
  config: SyncConfig,
  fields: Record<string, unknown>
): Promise<void> {
  if (!config.enabled) return;
  const client = getSupabaseClient(config.supabaseUrl, config.supabaseAnonKey);
  const code = config.roomCode.trim().toUpperCase();
  if (!client || !code) return;
  await client
    .from('couple_rooms')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('room_code', code);
}

export async function pushMemoryUpsert(config: SyncConfig, item: MemoryItem): Promise<void> {
  if (!config.enabled) return;
  const client = getSupabaseClient(config.supabaseUrl, config.supabaseAnonKey);
  const code = config.roomCode.trim().toUpperCase();
  if (!client || !code) return;
  await client.from('couple_memories').upsert({
    id: item.id,
    room_code: code,
    data: item,
    created_at: item.createdAt,
  });
}

export async function pushMemoryDelete(config: SyncConfig, id: string): Promise<void> {
  if (!config.enabled) return;
  const client = getSupabaseClient(config.supabaseUrl, config.supabaseAnonKey);
  if (!client) return;
  await client.from('couple_memories').delete().eq('id', id);
}

export async function pushBucketUpsert(config: SyncConfig, item: BucketItem): Promise<void> {
  if (!config.enabled) return;
  const client = getSupabaseClient(config.supabaseUrl, config.supabaseAnonKey);
  const code = config.roomCode.trim().toUpperCase();
  if (!client || !code) return;
  await client.from('couple_buckets').upsert({
    id: item.id,
    room_code: code,
    data: item,
    updated_at: Date.now(),
  });
}

export async function pushBucketDelete(config: SyncConfig, id: string): Promise<void> {
  if (!config.enabled) return;
  const client = getSupabaseClient(config.supabaseUrl, config.supabaseAnonKey);
  if (!client) return;
  await client.from('couple_buckets').delete().eq('id', id);
}

export async function pushNoteUpsert(config: SyncConfig, item: LoveNote): Promise<void> {
  if (!config.enabled) return;
  const client = getSupabaseClient(config.supabaseUrl, config.supabaseAnonKey);
  const code = config.roomCode.trim().toUpperCase();
  if (!client || !code) return;
  await client.from('couple_notes').upsert({
    id: item.id,
    room_code: code,
    data: item,
    created_at: item.createdAt,
  });
}

export async function pushNoteDelete(config: SyncConfig, id: string): Promise<void> {
  if (!config.enabled) return;
  const client = getSupabaseClient(config.supabaseUrl, config.supabaseAnonKey);
  if (!client) return;
  await client.from('couple_notes').delete().eq('id', id);
}

export async function pushMessageUpsert(config: SyncConfig, item: ChatMessage): Promise<void> {
  if (!config.enabled) return;
  const client = getSupabaseClient(config.supabaseUrl, config.supabaseAnonKey);
  const code = config.roomCode.trim().toUpperCase();
  if (!client || !code) return;
  await client
    .from('couple_messages')
    .upsert({
      id: item.id,
      room_code: code,
      data: item,
      created_at: item.createdAt,
    })
    .then(() => undefined, () => undefined);
}

export async function pushMessageDelete(config: SyncConfig, id: string): Promise<void> {
  if (!config.enabled) return;
  const client = getSupabaseClient(config.supabaseUrl, config.supabaseAnonKey);
  if (!client) return;
  await client
    .from('couple_messages')
    .delete()
    .eq('id', id)
    .then(() => undefined, () => undefined);
}
