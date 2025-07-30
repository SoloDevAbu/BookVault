'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Upload, Trash2, User, LogOut, Plus, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Helper function to get Supabase public URL
const getSupabasePublicUrl = (fileName: string) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  return `${supabaseUrl}/storage/v1/object/public/books/${fileName}`
}

interface Book {
  id: string
  title: string
  author: string
  description: string
  category: string
  coverImage: string
  fileSize: number
  createdAt: string
}

const categories = [
  'FICTION',
  'NON_FICTION',
  'SCIENCE',
  'HISTORY',
  'BIOGRAPHY',
  'TECHNOLOGY',
  'PHILOSOPHY',
  'POLITICS',
  'BUSINESS',
  'HEALTH',
  'EDUCATION',
  'ROMANCE',
  'MYSTERY',
  'FANTASY',
  'OTHER'
]

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Form state
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin')
    } else if (status === 'authenticated') {
      // Check if user is admin (you can modify this check)
      if (session?.user?.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
        router.push('/dashboard')
      } else {
        fetchBooks()
      }
    }
  }, [status, session, router])

  const fetchBooks = async () => {
    try {
      const response = await fetch('/api/books?limit=50')
      const data = await response.json()
      setBooks(data.books || [])
    } catch (error) {
      console.error('Error fetching books:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)
    setError('')
    setSuccess('')

    if (!pdfFile) {
      setError('Please select a PDF file')
      setUploading(false)
      return
    }

    try {
      // Generate unique filename
      const fileName = `${Date.now()}-${pdfFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

      // Get signed URL for direct upload
      const urlResponse = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName,
          fileSize: pdfFile.size,
          fileType: pdfFile.type,
        })
      })

      const urlData = await urlResponse.json()

      if (!urlResponse.ok) {
        setError(urlData.error || 'Failed to generate upload URL')
        setUploading(false)
        return
      }

      // Upload file directly to Supabase using signed URL
      const uploadResponse = await fetch(urlData.signedUrl, {
        method: 'PUT',
        body: pdfFile,
        headers: {
          'Content-Type': 'application/pdf',
        }
      })

      if (!uploadResponse.ok) {
        setError('Failed to upload file to storage')
        setUploading(false)
        return
      }

      // Get public URL for the uploaded file
      const publicUrl = getSupabasePublicUrl(fileName)

      // Save metadata to database via API route
      const response = await fetch('/api/admin/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          author,
          description,
          category,
          coverImage,
          pdfUrl: publicUrl,
          fileName,
          fileSize: pdfFile.size,
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Book uploaded successfully!')
        // Reset form
        setTitle('')
        setAuthor('')
        setDescription('')
        setCategory('')
        setCoverImage('')
        setPdfFile(null)
        // Reset file input
        const fileInput = document.getElementById('pdfFile') as HTMLInputElement
        if (fileInput) fileInput.value = ''
        // Refresh books list
        fetchBooks()
      } else {
        setError(data.error || 'Failed to save book metadata')
      }
    } catch (error) {
      console.error('Upload error:', error)
      setError('Something went wrong. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (bookId: string) => {
    if (!confirm('Are you sure you want to delete this book? This will permanently remove both the database record and the PDF file from storage.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/books?id=${bookId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        if (data.fileDeleted) {
          setSuccess('Book and PDF file deleted successfully!')
        } else {
          setSuccess('Book deleted from database, but there was an issue deleting the PDF file from storage.')
        }
        fetchBooks()
      } else {
        setError(data.error || 'Failed to delete book')
      }
    } catch (error) {
      console.error('Delete error:', error)
      setError('Something went wrong. Please try again.')
    }
  }

  const formatCategory = (category: string) => {
    return category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-12 w-12 text-blue-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  if (!session || session.user?.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don&apos;t have permission to access this page.</p>
          <Link href="/dashboard">
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/admin" className="flex items-center space-x-2">
                <BookOpen className="h-8 w-8 text-blue-600" />
                <span className="text-2xl font-bold text-gray-900">BookVault Admin</span>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  View Site
                </Button>
              </Link>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>{session.user?.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/api/auth/signout')}
                className="text-gray-600 hover:text-red-600"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upload Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Plus className="h-5 w-5" />
                  <span>Upload New Book</span>
                </CardTitle>
                <CardDescription>
                  Add a new book to the platform by filling out the form below
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert className="mb-4 border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-600">{error}</AlertDescription>
                  </Alert>
                )}
                
                {success && (
                  <Alert className="mb-4 border-green-200 bg-green-50">
                    <AlertCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-600">{success}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter book title"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="author">Author *</Label>
                    <Input
                      id="author"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="Enter author name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select value={category} onValueChange={setCategory} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {formatCategory(cat)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter book description"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="coverImage">Cover Image URL</Label>
                    <Input
                      id="coverImage"
                      value={coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                      placeholder="Enter cover image URL (optional)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pdfFile">PDF File *</Label>
                    <Input
                      id="pdfFile"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Only PDF files are allowed. Maximum file size: 50MB
                    </p>
                    {pdfFile && (
                      <p className={`text-xs ${pdfFile.size > 50 * 1024 * 1024 ? 'text-red-500' : 'text-green-500'}`}>
                        File size: {(pdfFile.size / (1024 * 1024)).toFixed(2)}MB
                      </p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Upload className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Book
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Books List */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Uploaded Books ({books.length})</CardTitle>
                <CardDescription>
                  Manage all books in the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {books.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No books uploaded yet</p>
                    </div>
                  ) : (
                    books.map((book) => (
                      <div key={book.id} className="flex items-start justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{book.title}</h3>
                          <p className="text-sm text-gray-600 mb-2">by {book.author}</p>
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge variant="secondary" className="text-xs">
                              {formatCategory(book.category)}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {formatFileSize(book.fileSize)}
                            </span>
                          </div>
                          {book.description && (
                            <p className="text-sm text-gray-500 line-clamp-2">
                              {book.description}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(book.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}