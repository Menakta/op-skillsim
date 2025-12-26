'use client'

/**
 * Settings Page
 *
 * Teacher dashboard settings and configuration.
 * Uses global theme classes - no isDark checks needed.
 */

import { Save, User, Bell, Shield, Palette } from 'lucide-react'
import { DashboardLayout } from '../components/layout'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { useTheme } from '@/app/context/ThemeContext'
import { useAdmin, DemoModeNotice } from '../context/AdminContext'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { isLti } = useAdmin()

  return (
    <DashboardLayout title="Settings" subtitle="Manage your account and preferences">
      <div className="max-w-3xl space-y-6">
        {/* Demo Mode Notice */}
        <DemoModeNotice />

        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 theme-text-brand" />
              <CardTitle>Profile Settings</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm mb-2 theme-text-muted">Display Name</label>
              <input
                type="text"
                defaultValue="John Smith"
                className="w-full px-4 py-2 rounded-lg theme-input"
              />
            </div>
            <div>
              <label className="block text-sm mb-2 theme-text-muted">Email</label>
              <input
                type="email"
                defaultValue="teacher@opskillsim.nz"
                className="w-full px-4 py-2 rounded-lg theme-input"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 theme-text-brand" />
              <CardTitle>Notifications</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ToggleSetting
              label="Email notifications"
              description="Receive email updates about student progress"
              defaultChecked={true}
            />
            <ToggleSetting
              label="Assessment alerts"
              description="Get notified when students complete assessments"
              defaultChecked={true}
            />
            <ToggleSetting
              label="Weekly reports"
              description="Receive weekly summary reports"
              defaultChecked={false}
            />
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Palette className="w-5 h-5 theme-text-brand" />
              <CardTitle>Appearance</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm mb-2 theme-text-muted">Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
                className="w-full px-4 py-2 rounded-lg theme-input"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 theme-text-brand" />
              <CardTitle>Security</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <button className="px-4 py-2 rounded-lg transition-colors theme-btn-secondary">
              Change Password
            </button>
            <p className="text-sm theme-text-muted">
              Last password change: Never
            </p>
          </CardContent>
        </Card>

        {/* Save Button */}
        {isLti && (
          <div className="flex justify-end">
            <button className="flex items-center gap-2 px-6 py-2 rounded-lg transition-colors theme-btn-primary">
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

// Toggle Setting Component
interface ToggleSettingProps {
  label: string
  description: string
  defaultChecked?: boolean
}

function ToggleSetting({ label, description, defaultChecked = false }: ToggleSettingProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="font-medium theme-text-primary">{label}</p>
        <p className="text-sm theme-text-muted">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          defaultChecked={defaultChecked}
          className="sr-only peer"
        />
        <div className="w-11 h-6 rounded-full theme-bg-tertiary peer peer-checked:bg-purple-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
      </label>
    </div>
  )
}
