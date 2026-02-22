// app/api/settings/recipient/route.ts
// این endpoint public هست چون از client-side صدا زده میشه
// فقط RECIPIENT_ADDRESS رو برمیگردونه (نه RELAYER_PRIVATE_KEY)
import { NextResponse } from 'next/server';
import { getSetting } from '@/lib/settings';

export async function GET() {
    try {
        const address = await getSetting('RECIPIENT_ADDRESS');
        return NextResponse.json({ address: address || null });
    } catch (err: any) {
        return NextResponse.json({ address: null });
    }
}