'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/', label: 'Today' },
  { href: '/tasks', label: 'Projects & Tasks' },
]

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold">
              Runtime PM
            </Link>
            <div className="flex gap-1">
              {NAV_ITEMS.map((item) => {
                // Check if current path matches (including /projects redirect to /tasks)
                const isActive = pathname === item.href || 
                  (item.href === '/tasks' && pathname === '/projects') ||
                  (item.href === '/tasks' && pathname?.startsWith('/tasks'))
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  )
}

