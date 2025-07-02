import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(req: NextRequest, {params}: { params: { retrievalId: string } }) {
  const { retrievalId } = await params;
  try {
    const client = await clientPromise;
    const db = client.db();
    const doc = await db.collection('documents').findOne({ retrievalId });
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(doc);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch document metadata' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { retrievalId: string } }) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const { retrievalId } = await params;
    const update = await req.json();
    const result = await db.collection('documents').updateOne(
      { retrievalId },
      { $set: update }
    );
    return NextResponse.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update document metadata' }, { status: 500 });
  }
} 