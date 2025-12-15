'use client'

import { useState, useEffect } from 'react'

interface LtiFormData {
  consumerKey: string
  userId: string
  userName: string
  userEmail: string
  role: string
  contextId: string
  contextTitle: string
}

export default function LtiDemoPage() {
  const [formData, setFormData] = useState<LtiFormData>({
    consumerKey: 'demo-consumer',
    userId: 'demo-user-001',
    userName: 'Demo User',
    userEmail: 'demo@example.com',
    role: 'Learner',
    contextId: 'course-001',
    contextTitle: 'Demo Course'
  })

  const [launchUrl, setLaunchUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Set the launch URL based on current origin
    if (typeof window !== 'undefined') {
      setLaunchUrl(`${window.location.origin}/api/auth/lti`)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Generate LTI launch parameters with valid OAuth signature
      const response = await fetch('/api/auth/lti-demo-params', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          launchUrl
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate LTI parameters')
      }

      const { params } = await response.json()

      // Create and submit form
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = launchUrl

      for (const [key, value] of Object.entries(params)) {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = key
        input.value = value as string
        form.appendChild(input)
      }

      document.body.appendChild(form)
      form.submit()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  const presetUsers = [
    { name: 'Student Demo', userId: 'student-001', email: 'student@example.com', role: 'Learner' },
    { name: 'Teacher Demo', userId: 'teacher-001', email: 'teacher@example.com', role: 'Instructor' },
    { name: 'Admin Demo', userId: 'admin-001', email: 'admin@example.com', role: 'Administrator' }
  ]

  const loadPreset = (preset: typeof presetUsers[0]) => {
    setFormData(prev => ({
      ...prev,
      userName: preset.name,
      userId: preset.userId,
      userEmail: preset.email,
      role: preset.role
    }))
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">LTI Launch Demo</h1>
          <p className="text-gray-400">
            Simulate an LTI 1.0 launch as if coming from iQualify
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-4 mb-8">
          <h3 className="text-blue-300 font-medium mb-2">What is this?</h3>
          <p className="text-gray-300 text-sm">
            This page simulates an LTI (Learning Tools Interoperability) launch from a Learning
            Management System like iQualify. In production, users would click a link in iQualify
            and be automatically logged into OP SkillSim. This demo lets you test that flow.
          </p>
        </div>

        {/* Preset Users */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
          <h3 className="text-white font-medium mb-3">Quick Presets</h3>
          <div className="flex flex-wrap gap-2">
            {presetUsers.map((preset) => (
              <button
                key={preset.userId}
                onClick={() => loadPreset(preset)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
              >
                {preset.name} ({preset.role})
              </button>
            ))}
          </div>
        </div>

        {/* LTI Launch Form */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-white font-medium mb-4">LTI Launch Parameters</h3>

          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Consumer Key */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Consumer Key (Tool Consumer)
              </label>
              <select
                name="consumerKey"
                value={formData.consumerKey}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="demo-consumer">demo-consumer (for testing)</option>
                <option value="iqualify-dev">iqualify-dev (development)</option>
              </select>
            </div>

            {/* User ID */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                User ID (from LMS)
              </label>
              <input
                type="text"
                name="userId"
                value={formData.userId}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* User Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                name="userName"
                value={formData.userName}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                name="userEmail"
                value={formData.userEmail}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                LTI Role
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Learner">Learner (Student)</option>
                <option value="Instructor">Instructor (Teacher)</option>
                <option value="Administrator">Administrator</option>
                <option value="urn:lti:role:ims/lis/Learner">urn:lti:role:ims/lis/Learner</option>
                <option value="urn:lti:role:ims/lis/Instructor">urn:lti:role:ims/lis/Instructor</option>
              </select>
            </div>

            {/* Context (Course) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Context ID (Course ID)
                </label>
                <input
                  type="text"
                  name="contextId"
                  value={formData.contextId}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Context Title (Course Name)
                </label>
                <input
                  type="text"
                  name="contextTitle"
                  value={formData.contextTitle}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Launch URL (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Launch URL
              </label>
              <input
                type="text"
                value={launchUrl}
                readOnly
                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {loading ? 'Launching...' : 'Simulate LTI Launch'}
            </button>
          </form>
        </div>

        {/* Back to Login */}
        <div className="mt-6 text-center">
          <a
            href="/login"
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            ← Back to Email Login
          </a>
        </div>
      </div>
    </div>
  )
}
