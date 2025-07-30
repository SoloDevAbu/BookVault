import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadFile, getPublicUrl, deleteFile } from '@/lib/supabase'

// Add dynamic configuration to prevent static export issues
export const dynamic = 'force-dynamic'

// Disable body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
}

// Storage bucket name - change this if you want to use a different bucket
const STORAGE_BUCKET = 'books'

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

    const formData = await request.formData()
    const title = formData.get('title') as string
    const author = formData.get('author') as string
    const description = formData.get('description') as string
    const category = formData.get('category') as string
    const coverImage = formData.get('coverImage') as string
    const pdfFile = formData.get('pdfFile') as File

    if (!title || !author || !category || !pdfFile) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check file size (50MB limit for Supabase free tier)
    const maxFileSize = 50 * 1024 * 1024 // 50MB in bytes
    if (pdfFile.size > maxFileSize) {
      return NextResponse.json(
        { error: `File size too large. Maximum allowed size is 50MB. Current file size: ${(pdfFile.size / (1024 * 1024)).toFixed(2)}MB` },
        { status: 400 }
      )
    }

    // Check file type
    if (pdfFile.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      )
    }

    // Upload PDF to Supabase Storage using helper function
    const fileName = `${Date.now()}-${pdfFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const fileBuffer = await pdfFile.arrayBuffer()
    
    const { data: uploadData, error: uploadError } = await uploadFile(
      STORAGE_BUCKET,
      fileName,
      fileBuffer,
      {
        contentType: 'application/pdf',
        upsert: false
      }
    )

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload PDF file' },
        { status: 500 }
      )
    }

    // Get public URL for the uploaded file using helper function
    const publicUrl = getPublicUrl(STORAGE_BUCKET, fileName)

    // Create book record in database
    const book = await prisma.book.create({
      data: {
        title,
        author,
        description: description || null,
        category: category as any,
        coverImage: coverImage || null,
        pdfUrl: publicUrl,
        fileName,
        fileSize: pdfFile.size,
        totalPages: null // You can implement PDF page counting if needed
      }
    })

    return NextResponse.json(
      { message: 'Book uploaded successfully', book },
      { status: 201 }
    )
  } catch (error) {
    console.error('Book upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const bookId = searchParams.get('id')

    if (!bookId) {
      return NextResponse.json(
        { error: 'Book ID required' },
        { status: 400 }
      )
    }

    // Get book details
    const book = await prisma.book.findUnique({
      where: { id: bookId }
    })

    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      )
    }

    // Delete file from Supabase Storage using helper function
    const { error: deleteError } = await deleteFile(STORAGE_BUCKET, book.fileName)

    if (deleteError) {
      console.error('File deletion error:', deleteError)
      // Continue with database deletion even if file deletion fails
    }

    // Delete book record from database
    await prisma.book.delete({
      where: { id: bookId }
    })

    return NextResponse.json(
      { message: 'Book deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Book deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}