'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, ArrowLeft, ChevronLeft, ChevronRight, Download } from 'lucide-react'

interface Book {
  id: string
  title: string
  author: string
  description: string
  category: string
  coverImage: string
  pdfUrl: string
  totalPages: number
  createdAt: string
}

export default function BookReader() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [pdfLoaded, setPdfLoaded] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (params.id) {
      fetchBook()
    }
  }, [params.id])

  const fetchBook = async () => {
    try {
      const response = await fetch(`/api/books/${params.id}`)
      if (response.ok) {
        const bookData = await response.json()
        setBook(bookData)
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error fetching book:', error)
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const formatCategory = (category: string) => {
    return category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-12 w-12 text-blue-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading book...</p>
        </div>
      </div>
    )
  }

  if (!session || !book) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Library
                </Button>
              </Link>
              <div className="hidden md:block">
                <h1 className="text-xl font-semibold text-gray-900 truncate max-w-md">
                  {book.title}
                </h1>
                <p className="text-sm text-gray-600">by {book.author}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 hidden sm:block">
                Page {currentPage} of {book.totalPages || '?'}
              </span>
              <Button variant="outline" size="sm" asChild>
                <a href={book.pdfUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Book Info Card */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <div className="w-32 h-48 bg-gradient-to-br from-blue-100 to-orange-100 rounded-lg flex items-center justify-center">
                    {book.coverImage ? (
                      <img
                        src={book.coverImage}
                        alt={book.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <BookOpen className="h-12 w-12 text-blue-400" />
                    )}
                  </div>
                </div>
                
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{book.title}</h1>
                  <p className="text-lg text-gray-600 mb-3">by {book.author}</p>
                  <div className="flex items-center gap-4 mb-4">
                    <Badge variant="secondary">
                      {formatCategory(book.category)}
                    </Badge>
                    {book.totalPages && (
                      <span className="text-sm text-gray-500">
                        {book.totalPages} pages
                      </span>
                    )}
                  </div>
                  {book.description && (
                    <p className="text-gray-700 leading-relaxed">{book.description}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PDF Viewer */}
          <Card>
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Read Online</h2>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm px-3 py-1 bg-gray-100 rounded">
                    {currentPage} / {book.totalPages || '?'}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={book.totalPages ? currentPage >= book.totalPages : false}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border min-h-[600px] flex items-center justify-center">
                <div className="text-center">
                  <iframe
                    src={`${book.pdfUrl}#page=${currentPage}&view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
                    className="w-full h-[600px] border-0"
                    title={book.title}
                    onLoad={() => setPdfLoaded(true)}
                  />
                  {!pdfLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                      <div className="text-center">
                        <BookOpen className="h-12 w-12 text-blue-600 animate-pulse mx-auto mb-4" />
                        <p className="text-gray-600">Loading PDF...</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500">
                  Use the navigation buttons above or scroll within the PDF to read
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}