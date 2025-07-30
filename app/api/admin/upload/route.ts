import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'

// Add dynamic configuration to prevent static export issues
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin using role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { fileName, fileSize, fileType } = body

    if (!fileName || !fileSize || !fileType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check file size (50MB limit for Supabase free tier)
    const maxFileSize = 50 * 1024 * 1024 // 50MB in bytes
    if (fileSize > maxFileSize) {
      return NextResponse.json(
        { error: `File size too large. Maximum allowed size is 50MB. Current file size: ${(fileSize / (1024 * 1024)).toFixed(2)}MB` },
        { status: 400 }
      )
    }

    // Check file type
    if (fileType !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      )
    }

    // Generate signed URL for direct upload
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('books')
      .createSignedUploadUrl(fileName)

    if (signedUrlError) {
      console.error('Signed URL error:', signedUrlError)
      return NextResponse.json(
        { error: 'Failed to generate upload URL' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      signedUrl: signedUrlData.signedUrl,
      fileName,
      fileSize
    })

  } catch (error) {
    console.error('Upload URL generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 