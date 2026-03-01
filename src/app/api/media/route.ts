import { NextRequest, NextResponse } from 'next/server';
import { S3Client, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
});

const BUCKET = process.env.R2_BUCKET_NAME || 'clinical-photos';

// GET: Generate a presigned GET URL for viewing a file
export async function GET(req: NextRequest) {
    try {
        const fileKey = req.nextUrl.searchParams.get('fileKey');
        if (!fileKey) {
            return NextResponse.json({ error: 'fileKey is required' }, { status: 400 });
        }

        const command = new GetObjectCommand({
            Bucket: BUCKET,
            Key: fileKey,
        });

        const viewUrl = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour

        return NextResponse.json({ viewUrl });
    } catch (error: any) {
        console.error('Error generating view URL:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate view URL' },
            { status: 500 }
        );
    }
}

// DELETE: Remove a file from R2
export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json();
        const { fileKey } = body;

        if (!fileKey) {
            return NextResponse.json({ error: 'fileKey is required' }, { status: 400 });
        }

        const command = new DeleteObjectCommand({
            Bucket: BUCKET,
            Key: fileKey,
        });

        await s3.send(command);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting file:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete file' },
            { status: 500 }
        );
    }
}
