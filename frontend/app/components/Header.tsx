"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Menu, X, LogOut, LogIn } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const isLoggedIn = pathname !== "/login" && pathname !== "/" && pathname !== "/register"

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/login"
  }

  return (
    <motion.header
      initial={{ y: -72, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-black/[0.06]"
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link href={isLoggedIn ? "/workflow" : "/login"} className="flex items-center gap-2.5 shrink-0">
          <img src="/img/logo.png" alt="Tec Tha" width={36} height={36} className="rounded-full" />
          <span className="text-lg font-semibold tracking-tight text-black">Tec Tha</span>
        </Link>

        {/* Right CTAs */}
        <div className="hidden md:flex items-center gap-2.5 shrink-0">
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-gray-700 border border-gray-200 hover:border-gray-400 hover:text-gray-900 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-gray-700 border border-gray-200 hover:border-gray-400 hover:text-gray-900 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              Log In
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden p-2 rounded-lg hover:bg-black/5" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="md:hidden bg-white border-t border-black/[0.06] px-6 py-4 flex flex-col gap-1"
        >
          <div className="flex gap-2 pt-3">
            {isLoggedIn ? (
              <button
                onClick={() => { setMobileOpen(false); handleLogout() }}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-gray-700 border border-gray-200"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-gray-700 border border-gray-200"
              >
                <LogIn className="w-3.5 h-3.5" />
                Log In
              </Link>
            )}
          </div>
        </motion.div>
      )}
    </motion.header>
  )
}
