'use client'

import { useEffect, useRef, useMemo, useState } from 'react'
import { X, Check, XIcon } from 'lucide-react'
import { useTheme } from '@/app/context/ThemeContext'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text, Float } from '@react-three/drei'
import * as THREE from 'three'

// App Color Palette
const COLORS = {
  primary: '#39BEAE',      // Teal Primary
  secondary: '#79CFC2',    // Teal Secondary
  error: '#df5e5e',        // Error Red
  navyPrimary: '#0D1D40',  // Navy Primary
  navySecondary: '#3E425F', // Navy Secondary
}

// Animated Point Component
function AnimatedPoint({ position, label, color, delay = 0, wrong = false }: {
  position: [number, number, number]
  label: string
  color: string
  delay?: number
  wrong?: boolean
}) {
  const ringRef = useRef<THREE.Mesh>(null)
  const ring2Ref = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() - delay
    if (t < 0) return

    if (ringRef.current) {
      const scale = 1 + Math.sin(t * 2) * 0.2
      ringRef.current.scale.setScalar(scale)
      const mat = ringRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.5 - Math.sin(t * 2) * 0.3
    }
    if (ring2Ref.current) {
      const scale = 1.2 + Math.sin(t * 2 + 1) * 0.3
      ring2Ref.current.scale.setScalar(scale)
      const mat = ring2Ref.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.3 - Math.sin(t * 2 + 1) * 0.2
    }
  })

  return (
    <Float speed={2} rotationIntensity={0} floatIntensity={wrong ? 0 : 0.3}>
      <group position={position}>
        <mesh ref={ringRef}>
          <ringGeometry args={[0.28, 0.32, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={ring2Ref}>
          <ringGeometry args={[0.4, 0.43, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>

        <mesh>
          <sphereGeometry args={[0.2, 32, 32]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.5}
            metalness={0.3}
            roughness={0.4}
          />
        </mesh>

        <mesh>
          <sphereGeometry args={[0.25, 32, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.2} />
        </mesh>

        <Text
          position={[0, 0, 0.25]}
          fontSize={0.15}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      </group>
    </Float>
  )
}

// Wrong Way Scene - Measuring from A to C instead of A to B
function WrongWayScene() {
  const dotRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const lineRef = useRef<THREE.Mesh>(null)
  const crossRef = useRef<THREE.Group>(null)

  // A is start, B is correct end, C is wrong end (user measures A to C instead of A to B)
  const pointA = new THREE.Vector3(-1.3, 0, 0)
  const pointB = new THREE.Vector3(1.3, 0, 0)  // Correct destination (shown but not connected)
  const pointC = new THREE.Vector3(0.5, -0.7, 0)  // Wrong destination (user mistakenly measures to here)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const progress = (t % 4) / 2.5
    const clampedProgress = Math.min(progress, 1)

    if (dotRef.current && glowRef.current) {
      const pos = pointA.clone().lerp(pointC, clampedProgress)
      dotRef.current.position.copy(pos)
      glowRef.current.position.copy(pos)
      dotRef.current.visible = clampedProgress < 1
      glowRef.current.visible = clampedProgress < 1
    }

    if (lineRef.current) {
      const currentEnd = pointA.clone().lerp(pointC, clampedProgress)
      const length = pointA.distanceTo(currentEnd)
      const midPoint = pointA.clone().lerp(currentEnd, 0.5)
      lineRef.current.position.copy(midPoint)
      lineRef.current.scale.x = length / 2.5
      const angle = Math.atan2(pointC.y - pointA.y, pointC.x - pointA.x)
      lineRef.current.rotation.z = angle
    }

    if (crossRef.current) {
      crossRef.current.visible = clampedProgress >= 1
      if (crossRef.current.visible) {
        const scale = Math.min((progress - 1) * 5, 1)
        crossRef.current.scale.setScalar(scale)
      }
    }
  })

  return (
    <group>
      <ambientLight intensity={0.3} />
      <pointLight position={[3, 3, 3]} intensity={0.8} color={COLORS.error} />

      {/* Point A - Start point */}
      <AnimatedPoint position={[-1.3, 0, 0]} label="A" color={COLORS.primary} wrong />

      {/* Point B - Correct destination (shown faded to indicate where they SHOULD go) */}
      <Float speed={2} rotationIntensity={0} floatIntensity={0}>
        <group position={[1.3, 0, 0]}>
          <mesh>
            <sphereGeometry args={[0.15, 32, 32]} />
            <meshStandardMaterial color={COLORS.primary} transparent opacity={0.3} />
          </mesh>
          <mesh>
            <ringGeometry args={[0.2, 0.22, 32]} />
            <meshBasicMaterial color={COLORS.primary} transparent opacity={0.2} side={THREE.DoubleSide} />
          </mesh>
          <Text position={[0, 0, 0.2]} fontSize={0.12} color={COLORS.primary} anchorX="center" anchorY="middle">
            B
          </Text>
        </group>
      </Float>

      {/* Point C - Wrong destination (where user incorrectly measures to) */}
      <AnimatedPoint position={[0.5, -0.7, 0]} label="C" color={COLORS.error} delay={0.3} wrong />

      {/* Dashed line hint from A to B (correct path - shown faded) */}
      <mesh position={[0, 0, -0.15]}>
        <boxGeometry args={[2.6, 0.01, 0.01]} />
        <meshBasicMaterial color={COLORS.primary} transparent opacity={0.15} />
      </mesh>

      {/* Wrong measurement line from A to C */}
      <mesh ref={lineRef}>
        <boxGeometry args={[2.5, 0.03, 0.01]} />
        <meshBasicMaterial color={COLORS.error} />
      </mesh>

      <mesh ref={dotRef}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color="white" />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color={COLORS.error} transparent opacity={0.4} />
      </mesh>

      {/* X mark */}
      <group ref={crossRef} position={[0, -1.0, 0]}>
        <mesh>
          <planeGeometry args={[1.6, 0.45]} />
          <meshBasicMaterial color={COLORS.navyPrimary} transparent opacity={0.95} />
        </mesh>
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[1.64, 0.49]} />
          <meshBasicMaterial color={COLORS.error} transparent opacity={0.5} />
        </mesh>
        <Text position={[-0.45, 0, 0.01]} fontSize={0.2} color={COLORS.error} anchorX="center" anchorY="middle">
          ✕
        </Text>
        <Text position={[0.2, 0, 0.01]} fontSize={0.11} color="white" anchorX="center" anchorY="middle">
          A → C (Wrong!)
        </Text>
      </group>
    </group>
  )
}

// Correct Way Scene
function CorrectWayScene() {
  const dotRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const lineRef = useRef<THREE.Mesh>(null)
  const checkRef = useRef<THREE.Group>(null)

  const startX = -1.3
  const endX = 1.3

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const progress = (t % 4) / 2.5
    const clampedProgress = Math.min(progress, 1)

    if (dotRef.current && glowRef.current) {
      const x = startX + (endX - startX) * clampedProgress
      dotRef.current.position.x = x
      glowRef.current.position.x = x
      dotRef.current.visible = clampedProgress < 1
      glowRef.current.visible = clampedProgress < 1
    }

    if (lineRef.current) {
      lineRef.current.scale.x = clampedProgress
      lineRef.current.position.x = startX + ((endX - startX) * clampedProgress) / 2
    }

    if (checkRef.current) {
      checkRef.current.visible = clampedProgress >= 1
      if (checkRef.current.visible) {
        const scale = Math.min((progress - 1) * 5, 1)
        checkRef.current.scale.setScalar(scale)
      }
    }
  })

  return (
    <group>
      <ambientLight intensity={0.4} />
      <pointLight position={[3, 3, 3]} intensity={1} color={COLORS.primary} />
      <pointLight position={[-3, 3, 3]} intensity={0.5} color={COLORS.secondary} />

      <AnimatedPoint position={[-1.3, 0, 0]} label="A" color={COLORS.primary} />
      <AnimatedPoint position={[1.3, 0, 0]} label="B" color={COLORS.secondary} delay={0.3} />

      <mesh position={[0, 0, -0.1]}>
        <boxGeometry args={[2.6, 0.015, 0.01]} />
        <meshBasicMaterial color={COLORS.primary} transparent opacity={0.2} />
      </mesh>

      <mesh ref={lineRef} position={[startX, 0, 0]}>
        <boxGeometry args={[2.6, 0.035, 0.01]} />
        <meshBasicMaterial color={COLORS.primary} />
      </mesh>

      <mesh ref={dotRef} position={[startX, 0, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color="white" />
      </mesh>
      <mesh ref={glowRef} position={[startX, 0, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial color="white" transparent opacity={0.3} />
      </mesh>

      {/* Check mark with measurement */}
      <group ref={checkRef} position={[0, -0.9, 0]}>
        <mesh>
          <planeGeometry args={[1.4, 0.45]} />
          <meshBasicMaterial color={COLORS.navyPrimary} transparent opacity={0.95} />
        </mesh>
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[1.44, 0.49]} />
          <meshBasicMaterial color={COLORS.primary} transparent opacity={0.5} />
        </mesh>
        <Text position={[-0.4, 0, 0.01]} fontSize={0.2} color={COLORS.primary} anchorX="center" anchorY="middle">
          ✓
        </Text>
        <Text position={[0.2, 0, 0.01]} fontSize={0.13} color="white" anchorX="center" anchorY="middle">
          1.25 m
        </Text>
      </group>
    </group>
  )
}

// Particles Background
function Particles({ color = COLORS.primary }) {
  const count = 30
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 6
      pos[i * 3 + 1] = (Math.random() - 0.5) * 3
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2 - 1
    }
    return pos
  }, [])

  const ref = useRef<THREE.Points>(null)

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.getElapsedTime() * 0.015
    }
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.025} color={color} transparent opacity={0.5} sizeAttenuation />
    </points>
  )
}

interface MeasurementGuideModalProps {
  isOpen: boolean
  onClose: () => void
}

export function MeasurementGuideModal({ isOpen, onClose }: MeasurementGuideModalProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [showCorrect, setShowCorrect] = useState(false)

  // Auto switch between wrong and correct
  useEffect(() => {
    if (!isOpen) {
      setShowCorrect(false)
      return
    }

    const interval = setInterval(() => {
      setShowCorrect(prev => !prev)
    }, 4000)

    return () => clearInterval(interval)
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/85" onClick={onClose} />

      <div className={`relative z-10 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl ${
        isDark ? 'bg-[#0D1D40]' : 'bg-white'
      }`}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4 text-white/60" />
        </button>

        {/* Toggle tabs */}
        <div className="absolute top-4 left-4 z-20 flex gap-1 p-1 rounded-lg bg-black/30 backdrop-blur-sm">
          <button
            onClick={() => setShowCorrect(false)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
              !showCorrect ? 'bg-[#df5e5e]/20 text-[#df5e5e]' : 'text-white/50 hover:text-white/70'
            }`}
          >
            <XIcon className="w-3 h-3" />
            Wrong
          </button>
          <button
            onClick={() => setShowCorrect(true)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
              showCorrect ? 'bg-[#39BEAE]/20 text-[#39BEAE]' : 'text-white/50 hover:text-white/70'
            }`}
          >
            <Check className="w-3 h-3" />
            Correct
          </button>
        </div>

        {/* 3D Canvas */}
        <div className={`relative h-52 transition-colors duration-500 ${
          showCorrect ? 'bg-[#0D1D40]' : 'bg-[#1a1520]'
        }`}>
          <Canvas camera={{ position: [0, 0, 3], fov: 50 }} dpr={[1, 2]}>
            <Particles color={showCorrect ? COLORS.primary : COLORS.error} />
            {showCorrect ? <CorrectWayScene /> : <WrongWayScene />}
          </Canvas>
          <div className={`absolute inset-x-0 bottom-0 h-16 pointer-events-none transition-colors duration-500 ${
            isDark
              ? 'bg-gradient-to-t from-[#0D1D40] to-transparent'
              : 'bg-gradient-to-t from-white to-transparent'
          }`} />
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-2">
            {showCorrect ? (
              <div className="p-1 rounded-full bg-[#39BEAE]/20">
                <Check className="w-4 h-4 text-[#39BEAE]" />
              </div>
            ) : (
              <div className="p-1 rounded-full bg-[#df5e5e]/20">
                <XIcon className="w-4 h-4 text-[#df5e5e]" />
              </div>
            )}
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {showCorrect ? 'Correct Way' : 'Wrong Way'}
            </h3>
          </div>

          <p className={`text-sm mb-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {showCorrect
              ? 'Always measure from Point A to Point B for accurate results'
              : 'Don\'t measure to wrong points like C or D - always A to B'
            }
          </p>

          {/* Steps - only show for correct */}
          {showCorrect && (
            <div className="flex gap-2 mb-5">
              {['Tap Start', 'Tap End', 'Get Result'].map((step, i) => (
                <div key={i} className={`flex-1 py-2 px-2 rounded-lg text-center ${
                  isDark ? 'bg-white/5' : 'bg-gray-100'
                }`}>
                  <div className={`text-base font-bold mb-0.5 ${
                    i === 0 ? 'text-[#39BEAE]' : i === 1 ? 'text-[#79CFC2]' : isDark ? 'text-white' : 'text-[#0D1D40]'
                  }`}>
                    {i + 1}
                  </div>
                  <div className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {step}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tips for wrong way */}
          {!showCorrect && (
            <div className={`mb-5 p-3 rounded-lg ${isDark ? 'bg-[#df5e5e]/10' : 'bg-[#df5e5e]/5'}`}>
              <p className={`text-xs ${isDark ? 'text-[#df5e5e]' : 'text-[#c45c5c]'}`}>
                <strong>Tip:</strong> Always measure from Point A to Point B. Don&apos;t measure to other points like C or D.
              </p>
            </div>
          )}

          <button
            onClick={onClose}
            className={`w-full py-3 rounded-xl font-semibold transition-all active:scale-[0.98] ${
              showCorrect
                ? 'bg-gradient-to-r from-[#39BEAE] to-[#79CFC2] text-white hover:shadow-lg hover:shadow-[#39BEAE]/25'
                : 'bg-gradient-to-r from-[#3E425F] to-[#0D1D40] text-white hover:from-[#4a4f6d] hover:to-[#162850]'
            }`}
          >
            {showCorrect ? 'Start Measuring' : 'Show Correct Way'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default MeasurementGuideModal
