import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  const client = await clientPromise;
  try {
    const db = client.db();
    const doc = await req.json();
    await db.collection('documents').insertOne(doc);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to save document metadata' }, { status: 500 });
  }
} 