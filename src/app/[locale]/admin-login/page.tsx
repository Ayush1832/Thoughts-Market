'use client'

import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import HeaderLogo from '@/components/HeaderLogo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function AdminLoginPage() {
  const router = useRouter()
  const locale = useLocale()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Invalid email or password')
        setIsLoading(false)
        return
      }

      // Verify session was created
      const verifyResponse = await fetch('/api/admin/debug', {
        credentials: 'include',
      })

      const verifyData = await verifyResponse.json()

      if (!verifyData.isValid) {
        setError('Session verification failed. Please try again.')
        setIsLoading(false)
        return
      }

      setSuccess(true)

      // Redirect to admin dashboard
      setTimeout(() => {
        router.push(`/${locale}/admin`)
      }, 500)
    }
    catch (err: any) {
      setError(err.message || 'Login failed')
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-900 to-slate-800 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-8 shadow-xl">
          {/* Brand */}
          <div className="mb-6 flex justify-center text-white">
            <HeaderLogo />
          </div>

          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-2xl font-bold text-white">Admin Portal</h1>
            <p className="text-sm text-slate-400">Secure authentication required</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <Label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={isLoading}
                className="
                  w-full border-slate-600 bg-slate-700 text-white
                  placeholder:text-slate-500
                  focus:border-blue-500
                "
                required
              />
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-300">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="
                    w-full border-slate-600 bg-slate-700 pr-11 text-white
                    placeholder:text-slate-500
                    focus:border-blue-500
                  "
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="rounded-md border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400">
                ✓ Authentication successful. Redirecting...
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading || success}
              className="mt-6 w-full rounded-lg bg-blue-600 py-2 font-medium text-white transition hover:bg-blue-700"
            >
              {isLoading ? 'Authenticating...' : 'Sign In'}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 border-t border-slate-700 pt-6">
            <p className="text-center text-xs text-slate-500">
              Restricted access • Authorized administrators only
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
