'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, ArrowLeft, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import Image from 'next/image'

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
  const [scale, setScale] = useState(1.0)

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

  // Add keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goToPreviousPage()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        goToNextPage()
      } else if (event.key === '+' || event.key === '=') {
        event.preventDefault()
        zoomIn()
      } else if (event.key === '-') {
        event.preventDefault()
        zoomOut()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [book?.totalPages])

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

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1))
  }

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(book?.totalPages || prev, prev + 1))
  }

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 2.0))
  }

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5))
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
        <div className="container mx-auto px-4 py-4 lg:max-w-none lg:px-8">
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
          </div>
        </div>
      </header>

      <div className="w-full px-4 py-8">
        <div className="max-w-4xl mx-auto lg:max-w-none lg:px-8">
          {/* Book Info Card */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <div className="w-32 h-48 bg-gradient-to-br from-blue-100 to-orange-100 rounded-lg flex items-center justify-center">
                    {book.coverImage ? (
                      <Image
                        src={book.coverImage}
                        alt={book.title}
                        className="w-full h-full object-cover rounded-lg"
                        width={128}
                        height={192}
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
              </div>
              
              <div className="bg-white rounded-lg border min-h-[600px] lg:min-h-[800px] flex items-center justify-center overflow-auto">
                <iframe
                  src={`${book.pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                  className="w-full h-[600px] lg:h-[800px] border-0"
                  title={book.title}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}