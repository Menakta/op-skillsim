'use client'

/**
 * Settings Page
 *
 * Teacher dashboard settings and configuration.
 */

import { Save, User, Bell, Shield, Palette } from 'lucide-react'
import { DashboardLayout } from '../components/layout'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'

export default function SettingsPage() {
  return (
    <DashboardLayout title="Settings" subtitle="Manage your account and preferences">
      <div className="max-w-3xl space-y-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-purple-400" />
              <CardTitle>Profile Settings</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Display Name</label>
              <input
                type="text"
                defaultValue="John Smith"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">Email</label>
              <input
                type="email"
                defaultValue="teacher@opskillsim.nz"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-purple-400" />
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
              <Palette className="w-5 h-5 text-purple-400" />
              <CardTitle>Appearance</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Theme</label>
              <select className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="system">System</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-purple-400" />
              <CardTitle>Security</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
              Change Password
            </button>
            <p className="text-gray-500 text-sm">
              Last password change: Never
            </p>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <button className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
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
        <p className="text-white font-medium">{label}</p>
        <p className="text-gray-500 text-sm">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          defaultChecked={defaultChecked}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:bg-purple-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
      </label>
    </div>
  )
}
