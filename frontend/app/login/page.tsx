"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, ArrowRight, Mail, Phone } from "lucide-react"
import Header from "@/app/components/Header"


export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<"email" | "phone">("email")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({ email: "", phone: "", password: "" })

  useEffect(() => {
    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
      document.documentElement.style.overflow = ""
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function switchTab(t: "email" | "phone") {
    setTab(t)
    setForm({ email: "", phone: "", password: "" })
    setError("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tab === "email"
          ? { email: form.email, password: form.password }
          : { phone: form.phone, password: form.password }
        ),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Login failed.")
        return
      }
      router.push("/workflow")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = tab === "email"
    ? !!(form.email && form.password)
    : !!(form.phone && form.password)

  return (
    <div className="h-screen overflow-hidden flex flex-col" style={{ background: "#e8eaed" }}>
      <Header />

      <div className="flex-1 flex items-center justify-center px-4" style={{ paddingTop: "8vh" }}>
        <div className="w-full" style={{ maxWidth: 480 }}>

          {/* Card */}
          <div className="bg-white rounded-2xl px-8 py-8">
            <h2 className="text-xl font-semibold text-[#20262D]">Welcome back</h2>
            <p className="text-sm text-[#333333] mt-1 mb-5">Log in to your account to continue</p>

            {/* Email / Phone tabs */}
            <div
              className="flex rounded-xl mb-5 p-1 gap-1"
              style={{ background: "#e8eaed" }}
            >
              {(["email", "phone"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => switchTab(t)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                    tab === t
                      ? "bg-white text-[#20262D] shadow-sm"
                      : "text-[#333333] hover:text-[#20262D]"
                  }`}
                >
                  {t === "email" ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                  {t === "email" ? "Email" : "Mobile"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {tab === "email" ? (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#20262D]">Email address</label>
                  <input
                    name="email"
                    type="email"
                    placeholder="you@company.com"
                    required
                    value={form.email}
                    onChange={handleChange}
                    className="w-full h-10 px-3 rounded-lg border border-[#E0E0E0] bg-white text-[#20262D] placeholder:text-gray-400 text-sm outline-none focus:ring-2 focus:ring-[#276ef1] focus:border-transparent"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#20262D]">Mobile number</label>
                  <input
                    name="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    required
                    value={form.phone}
                    onChange={handleChange}
                    className="w-full h-10 px-3 rounded-lg border border-[#E0E0E0] bg-white text-[#20262D] placeholder:text-gray-400 text-sm outline-none focus:ring-2 focus:ring-[#276ef1] focus:border-transparent"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#20262D]">Password</label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Your password"
                    required
                    value={form.password}
                    onChange={handleChange}
                    className="w-full h-10 px-3 pr-10 rounded-lg border border-[#E0E0E0] bg-white text-[#20262D] placeholder:text-gray-400 text-sm outline-none focus:ring-2 focus:ring-[#276ef1] focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={!canSubmit || loading}
                className="w-full h-10 rounded-lg font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{ background: "#276ef1" }}
              >
                {loading ? "Signing in\u2026" : "Sign in"} <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Below-card link */}
          <p className="text-center text-sm text-[#333333] mt-4">
            Don&apos;t have an account?{" "}
            <a href="/register" className="text-[#276ef1] font-medium hover:underline">
              Sign up
            </a>
          </p>

        </div>
      </div>
    </div>
  )
}
