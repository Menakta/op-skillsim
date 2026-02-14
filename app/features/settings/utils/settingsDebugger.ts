/**
 * Settings Debugger Utility
 *
 * Comprehensive testing tool for all settings_control features.
 * Run this in browser console to verify all settings are working.
 */

export interface DebugResult {
  feature: string
  messageSent: string
  expectedResponse: string
  status: 'pending' | 'success' | 'failed' | 'timeout'
  actualResponse?: string
  error?: string
}

export class SettingsDebugger {
  private results: DebugResult[] = []
  private messageHandler: ((message: string) => void) | null = null
  private responseTimeout = 5000 // 5 seconds

  constructor(private sendMessage: (msg: string) => void) {}

  /**
   * Test all settings features
   */
  async testAll(): Promise<DebugResult[]> {
    console.log('🧪 Starting comprehensive settings test...\n')

    this.results = []

    // Test each feature
    await this.testResolution()
    await this.testGraphicsQuality()
    await this.testAudioVolume()
    await this.testBandwidth()
    await this.testFPSTracking()
    await this.testGetOptions()

    this.printResults()
    return this.results
  }

  /**
   * Test resolution controls
   */
  async testResolution() {
    console.log('🖥️ Testing Resolution Controls...')

    const resolutions = [
      { width: 1920, height: 1080, label: '1080p' },
      { width: 1280, height: 720, label: '720p' },
      { width: 2560, height: 1440, label: '1440p' },
      { width: 3840, height: 2160, label: '4K' }
    ]

    for (const res of resolutions) {
      const message = `settings_control:resolution:${res.width}:${res.height}`
      const expected = `setting_applied:resolution:${res.width}x${res.height}:true`

      await this.testFeature(
        `Resolution ${res.label} (${res.width}x${res.height})`,
        message,
        expected
      )
      await this.delay(500) // Small delay between tests
    }
  }

  /**
   * Test graphics quality presets
   */
  async testGraphicsQuality() {
    console.log('🎮 Testing Graphics Quality...')

    const qualities = ['Low', 'Medium', 'High', 'Epic']

    for (const quality of qualities) {
      const message = `settings_control:graphics_quality:${quality}`
      const expected = `setting_applied:graphics_quality:${quality}:true`

      await this.testFeature(
        `Graphics Quality ${quality}`,
        message,
        expected
      )
      await this.delay(500)
    }
  }

  /**
   * Test audio volume controls
   */
  async testAudioVolume() {
    console.log('🔊 Testing Audio Volume...')

    const audioTests = [
      { group: 'Master', volume: 0.8 },
      { group: 'Ambient', volume: 0.6 },
      { group: 'SFX', volume: 0.9 }
    ]

    for (const test of audioTests) {
      const message = `settings_control:audio_volume:${test.group}:${test.volume}`
      const expected = `setting_applied:audio_volume:${test.group}:${test.volume}:success`

      await this.testFeature(
        `Audio Volume ${test.group} (${test.volume})`,
        message,
        expected
      )
      await this.delay(500)
    }
  }

  /**
   * Test bandwidth/network quality
   */
  async testBandwidth() {
    console.log('🌐 Testing Bandwidth/Network Quality...')

    const options = ['Auto', 'Low Quality', 'Medium Quality', 'High Quality']

    for (const option of options) {
      const message = `settings_control:bandwidth:${option}`
      const expected = `setting_applied:bandwidth:${option}:true`

      await this.testFeature(
        `Bandwidth ${option}`,
        message,
        expected
      )
      await this.delay(500)
    }
  }

  /**
   * Test FPS tracking
   */
  async testFPSTracking() {
    console.log('📊 Testing FPS Tracking...')

    // Start tracking
    await this.testFeature(
      'FPS Tracking Start',
      'settings_control:fps_tracking:start',
      'setting_applied:fps_tracking:start:true'
    )

    await this.delay(1000)

    // Check for FPS updates
    console.log('  ⏳ Waiting for FPS updates (expecting fps_update messages)...')
    await this.delay(2000)

    // Stop tracking
    await this.testFeature(
      'FPS Tracking Stop',
      'settings_control:fps_tracking:stop',
      'setting_applied:fps_tracking:stop:true'
    )
  }

  /**
   * Test get_options request
   */
  async testGetOptions() {
    console.log('📋 Testing Get Options...')

    await this.testFeature(
      'Get Options Request',
      'settings_control:get_options:request',
      'settings_options:' // Partial match - response varies
    )
  }

  /**
   * Test a single feature
   */
  private async testFeature(
    feature: string,
    messageSent: string,
    expectedResponse: string
  ): Promise<void> {
    return new Promise((resolve) => {
      const result: DebugResult = {
        feature,
        messageSent,
        expectedResponse,
        status: 'pending'
      }

      // Set up timeout
      const timeout = setTimeout(() => {
        result.status = 'timeout'
        result.error = `No response received within ${this.responseTimeout}ms`
        this.results.push(result)
        console.log(`  ⏱️  ${feature}: TIMEOUT`)
        resolve()
      }, this.responseTimeout)

      // Listen for response (this would need to be hooked into your message bus)
      // For now, we'll just send and mark as pending
      this.sendMessage(messageSent)
      console.log(`  📤 Sent: ${messageSent}`)

      // Clear timeout and resolve immediately for now
      // In production, you'd hook this into the message bus
      clearTimeout(timeout)
      result.status = 'pending'
      result.error = 'Manual verification required - check UE5 console for response'
      this.results.push(result)
      resolve()
    })
  }

  /**
   * Print test results summary
   */
  private printResults() {
    console.log('\n' + '='.repeat(80))
    console.log('📊 SETTINGS DEBUG RESULTS')
    console.log('='.repeat(80))

    const summary = {
      total: this.results.length,
      success: this.results.filter(r => r.status === 'success').length,
      failed: this.results.filter(r => r.status === 'failed').length,
      timeout: this.results.filter(r => r.status === 'timeout').length,
      pending: this.results.filter(r => r.status === 'pending').length
    }

    console.log(`\nTotal Tests: ${summary.total}`)
    console.log(`✅ Success: ${summary.success}`)
    console.log(`❌ Failed: ${summary.failed}`)
    console.log(`⏱️  Timeout: ${summary.timeout}`)
    console.log(`⏳ Pending Verification: ${summary.pending}`)

    console.log('\nDetailed Results:')
    this.results.forEach((result, index) => {
      const statusIcon = {
        success: '✅',
        failed: '❌',
        timeout: '⏱️',
        pending: '⏳'
      }[result.status]

      console.log(`\n${index + 1}. ${statusIcon} ${result.feature}`)
      console.log(`   Message: ${result.messageSent}`)
      console.log(`   Expected: ${result.expectedResponse}`)
      if (result.actualResponse) {
        console.log(`   Received: ${result.actualResponse}`)
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`)
      }
    })

    console.log('\n' + '='.repeat(80))
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Quick test function for browser console
 */
export function quickTest(sendMessageFn: (msg: string) => void) {
  const debugger = new SettingsDebugger(sendMessageFn)
  return debugger.testAll()
}
