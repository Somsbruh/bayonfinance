import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuid } from 'uuid';

const s3 = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
});

const BUCKET = process.env.R2_BUCKET_NAME || 'clinical-photos';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const patientId = formData.get('patientId') as string | null;

        if (!file || !patientId) {
            return NextResponse.json(
                { error: 'file and patientId are required' },
                { status: 400 }
            );
        }

        // Generate a unique key for R2
        const ext = file.name.split('.').pop() || 'bin';
        const fileKey = `patients/${patientId}/${uuid()}.${ext}`;

        // Convert file to buffer and upload server-side (no CORS issues)
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        await s3.send(new PutObjectCommand({
            Bucket: BUCKET,
            Key: fileKey,
            Body: buffer,
            ContentType: file.type || 'application/octet-stream',
        }));

        return NextResponse.json({
            fileKey,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
        });
    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: error.message || 'Upload failed' },
            { status: 500 }
        );
    }
}

// Increase body size limit for file uploads (default is 1MB)
export const config = {
    api: {
        bodyParser: false,
    },
};
