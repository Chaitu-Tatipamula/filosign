import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function PATCH(req: NextRequest, { params }: { params: { retrievalId: string } }) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const { retrievalId } = params;
    const { signerAddress } = await req.json();
    const result = await db.collection('documents').updateOne(
      { retrievalId },
      { $set: { status: 'signed', signedAt: new Date(), signerAddress } }
    );
    return NextResponse.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to sign document' }, { status: 500 });
  }
} 