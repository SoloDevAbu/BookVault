import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Add dynamic configuration to prevent static export issues
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Test bucket access
    const { data: buckets, error: bucketError } = await supabaseAdmin.storage.listBuckets()
    
    if (bucketError) {
      return NextResponse.json({
        error: 'Bucket list error',
        details: bucketError
      }, { status: 500 })
    }

    // Check if 'books' bucket exists
    const booksBucket = buckets?.find(bucket => bucket.name === 'books')
    
    if (!booksBucket) {
      return NextResponse.json({
        error: 'Books bucket not found',
        availableBuckets: buckets?.map(b => b.name) || [],
        message: 'Please create a bucket named "books" in your Supabase dashboard'
      }, { status: 404 })
    }

    // Test file listing in books bucket
    const { data: files, error: fileError } = await supabaseAdmin.storage
      .from('books')
      .list()

    return NextResponse.json({
      success: true,
      bucketExists: true,
      bucketName: booksBucket.name,
      bucketId: booksBucket.id,
      files: files || [],
      fileError: fileError
    })

  } catch (error) {
    console.error('Supabase test error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error
    }, { status: 500 })
  }
} 