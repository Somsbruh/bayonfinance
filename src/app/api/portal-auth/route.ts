import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const { patientId, phone, dob } = await req.json();

        if (!patientId || !phone || !dob) {
            return NextResponse.json(
                { error: 'Patient ID, phone, and date of birth are required' },
                { status: 400 }
            );
        }

        // Look up the patient
        const { data: patient, error } = await supabase
            .from('patients')
            .select('id, name, phone, dob')
            .eq('id', patientId)
            .single();

        if (error || !patient) {
            return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
        }

        // Normalize phone: strip spaces, dashes, and leading country code for comparison
        const normalizePhone = (p: string) =>
            p.replace(/[\s\-\(\)]/g, '').replace(/^\+\d{1,3}/, '');

        const inputPhone = normalizePhone(phone);
        const storedPhone = normalizePhone(patient.phone || '');

        // Normalize DOB: both should be YYYY-MM-DD
        const inputDob = dob.trim();
        const storedDob = patient.dob ? patient.dob.trim() : '';

        const phoneMatch = inputPhone && storedPhone && inputPhone === storedPhone;
        const dobMatch = inputDob && storedDob && inputDob === storedDob;

        if (!phoneMatch || !dobMatch) {
            return NextResponse.json(
                { error: 'Phone number or date of birth does not match our records' },
                { status: 401 }
            );
        }

        // Authentication successful — generate a simple session token
        // Using a hash of patient ID + timestamp for a lightweight approach
        const token = Buffer.from(`${patient.id}:${Date.now()}`).toString('base64');

        return NextResponse.json({
            authenticated: true,
            token,
            patientName: patient.name,
        });
    } catch (err: any) {
        console.error('Portal auth error:', err);
        return NextResponse.json(
            { error: 'Authentication failed' },
            { status: 500 }
        );
    }
}
