import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

// Add dynamic configuration to prevent static export issues
export const dynamic = 'force-dynamic'