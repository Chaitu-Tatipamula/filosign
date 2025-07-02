import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get('userAddress');
    if (!userAddress) {
      return NextResponse.json({ error: 'Missing userAddress' }, { status: 400 });
    }
    const docs = await db.collection('documents').find({
      status: 'signed',
      $or: [
        { senderAddress: { $regex: new RegExp(`^${userAddress}$`, 'i') } },
        { recipientAddress: { $regex: new RegExp(`^${userAddress}$`, 'i') } }
      ]
    }).toArray();
    return NextResponse.json(docs);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch signed documents' }, { status: 500 });
  }
} 