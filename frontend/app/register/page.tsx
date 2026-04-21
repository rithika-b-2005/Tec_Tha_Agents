"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, ArrowRight, Mail, Phone } from "lucide-react"
import Header from "@/app/components/Header"

type Tab = "email" | "phone"

export default function RegisterPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("email")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", company: "", password: "",
  })

  useEffect(() => {
    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
      document.documentElement.style.overflow = ""
    }
  }, [])

  function switchTab(t: Tab) {
    setTab(t)
    setForm({ firstName: "", lastName: "", email: "", phone: "", company: "", password: "" })
    setError("")
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password.length < 8) return
    setLoading(true)
    setError("")
    try {
      const body = tab === "email"
        ? { firstName: form.firstName, lastName: form.lastName, email: form.email, company: form.company, password: form.password }
        : { firstName: form.firstName, lastName: form.lastName, phone: form.phone, company: form.company, password: form.password }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 409) {
          setError(data.error + " Redirecting to login…")
          setTimeout(() => router.push("/login"), 1500)
        } else {
          setError(data.error ?? "Registration failed.")
        }
        return
      }
      // Auto-login after registration
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tab === "email"
          ? { email: form.email, password: form.password }
          : { phone: form.phone, password: form.password }
        ),
      })
      if (loginRes.ok) {
        router.push("/workflow")
      } else {
        router.push("/login")
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = form.firstName && form.lastName && form.password.length >= 8 && !loading
    && (tab === "email" ? !!form.email : !!form.phone)

  return (
    <div className="h-screen overflow-hidden flex flex-col" style={{ background: "#e8eaed" }}>
      <Header />

      <div className="flex-1 flex items-center justify-center px-4 overflow-y-auto" style={{ paddingTop: "12vh" }}>
        <div className="w-full pb-6" style={{ maxWidth: 480 }}>

          <div className="bg-white rounded-2xl px-8 py-8">
            <h2 className="text-xl font-semibold text-[#20262D]">Create a new account</h2>
            <p className="text-sm text-[#333333] mt-1 mb-5">Get started with Tec Tha.</p>

            {/* Tabs */}
            <div className="flex rounded-xl mb-5 p-1 gap-1" style={{ background: "#e8eaed" }}>
              {(["email", "phone"] as const).map((t) => (
                <button key={t} type="button" onClick={() => switchTab(t)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                    tab === t ? "bg-white text-[#20262D] shadow-sm" : "text-[#333333] hover:text-[#20262D]"
                  }`}>
                  {t === "email" ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                  {t === "email" ? "Email" : "Mobile"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#20262D]">First name</label>
                  <input name="firstName" placeholder="Jane" required value={form.firstName} onChange={handleChange}
                    className="w-full h-10 px-3 rounded-lg border border-[#E0E0E0] bg-white text-[#20262D] placeholder:text-gray-400 text-sm outline-none focus:ring-2 focus:ring-[#276ef1] focus:border-transparent" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#20262D]">Last name</label>
                  <input name="lastName" placeholder="Smith" required value={form.lastName} onChange={handleChange}
                    className="w-full h-10 px-3 rounded-lg border border-[#E0E0E0] bg-white text-[#20262D] placeholder:text-gray-400 text-sm outline-none focus:ring-2 focus:ring-[#276ef1] focus:border-transparent" />
                </div>
              </div>

              {tab === "email" ? (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#20262D]">Email address</label>
                  <input name="email" type="email" placeholder="you@company.com" required value={form.email} onChange={handleChange}
                    className="w-full h-10 px-3 rounded-lg border border-[#E0E0E0] bg-white text-[#20262D] placeholder:text-gray-400 text-sm outline-none focus:ring-2 focus:ring-[#276ef1] focus:border-transparent" />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#20262D]">Mobile number</label>
                  <input name="phone" type="tel" placeholder="+91 98765 43210" required value={form.phone} onChange={handleChange}
                    className="w-full h-10 px-3 rounded-lg border border-[#E0E0E0] bg-white text-[#20262D] placeholder:text-gray-400 text-sm outline-none focus:ring-2 focus:ring-[#276ef1] focus:border-transparent" />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#20262D]">
                  Company <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input name="company" placeholder="Acme Inc." value={form.company} onChange={handleChange}
                  className="w-full h-10 px-3 rounded-lg border border-[#E0E0E0] bg-white text-[#20262D] placeholder:text-gray-400 text-sm outline-none focus:ring-2 focus:ring-[#276ef1] focus:border-transparent" />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#20262D]">Password</label>
                <div className="relative">
                  <input name="password" type={showPassword ? "text" : "password"} placeholder="Min. 8 characters"
                    required minLength={8} value={form.password} onChange={handleChange}
                    className="w-full h-10 px-3 pr-10 rounded-lg border border-[#E0E0E0] bg-white text-[#20262D] placeholder:text-gray-400 text-sm outline-none focus:ring-2 focus:ring-[#276ef1] focus:border-transparent" />
                  <button type="button" onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.password.length > 0 && form.password.length < 8 && (
                  <p className="text-xs text-amber-500">At least 8 characters required</p>
                )}
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <button type="submit" disabled={!canSubmit}
                className="w-full h-10 rounded-lg font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{ background: "#276ef1" }}>
                {loading ? "Creating account\u2026" : "Create account"} <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-[#333333] mt-4">
            Already have an account?{" "}
            <a href="/login" className="text-[#276ef1] font-medium hover:underline">Sign in</a>
          </p>

        </div>
      </div>
    </div>
  )
}
