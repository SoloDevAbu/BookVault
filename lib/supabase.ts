import { createClient } from '@supabase/supabase-js'

// Environment variables for Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client instance for client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin instance for server-side operations (file uploads, etc.)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Helper function to upload file to Supabase Storage
export async function uploadFile(
  bucket: string,
  filePath: string,
  file: File | ArrayBuffer,
  options?: {
    contentType?: string
    upsert?: boolean
  }
) {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, file, {
        contentType: options?.contentType || 'application/octet-stream',
        upsert: options?.upsert || false
      })

    if (error) {
      throw error
    }

    return { data, error: null }
  } catch (error) {
    console.error('Upload error:', error)
    return { data: null, error }
  }
}

// Helper function to get public URL for uploaded file
export function getPublicUrl(bucket: string, filePath: string) {
  const { data } = supabaseAdmin.storage
    .from(bucket)
    .getPublicUrl(filePath)
  
  return data.publicUrl
}

// Helper function to delete file from Supabase Storage
export async function deleteFile(bucket: string, filePath: string) {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .remove([filePath])

    if (error) {
      throw error
    }

    return { data, error: null }
  } catch (error) {
    console.error('Delete error:', error)
    return { data: null, error }
  }
} 