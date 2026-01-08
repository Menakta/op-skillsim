'use client'

import { useState } from 'react'
import { Layers, Eye, EyeOff, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'
import { useTheme } from '@/app/context/ThemeContext'

// =============================================================================
// Types
// =============================================================================

interface HierarchicalLayerData {
  name: string
  visible: boolean
  isChild: boolean
  actorCount: number
  parentName?: string
  childIndex?: number
}

// =============================================================================
// Props Interface
// =============================================================================

interface LayerControlsProps {
  /** List of hierarchical layer groups */
  hierarchicalGroups: HierarchicalLayerData[]
  /** Called to refresh the layer list */
  onRefresh: () => void
  /** Called to toggle a main group */
  onToggleMainGroup: (groupName: string) => void
  /** Called to toggle a child group */
  onToggleChildGroup: (parentName: string, childIndex: number) => void
  /** Called to show all layers */
  onShowAll: () => void
  /** Called to hide all layers */
  onHideAll: () => void
  /** Whether the controls are visible */
  isVisible: boolean
}

// =============================================================================
// Component
// =============================================================================

export function LayerControls({
  hierarchicalGroups,
  onRefresh,
  onToggleMainGroup,
  onToggleChildGroup,
  onShowAll,
  onHideAll,
  isVisible
}: LayerControlsProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  if (!isVisible) return null

  // Separate main groups and child groups
  const mainGroups = hierarchicalGroups.filter(g => !g.isChild)
  const childGroups = hierarchicalGroups.filter(g => g.isChild)

  // Get children for a parent
  const getChildren = (parentName: string) => {
    return childGroups.filter(g => g.parentName === parentName)
  }

  // Toggle expanded state for a group
  const toggleExpanded = (groupName: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupName)) {
        next.delete(groupName)
      } else {
        next.add(groupName)
      }
      return next
    })
  }

  return (
    <div className={`fixed left-4 bottom-4 z-30 w-53 max-h-[60vh] backdrop-blur-md rounded-xl border overflow-hidden flex flex-col ${
      isDark
        ? 'bg-black/80 border-white/10'
        : 'bg-white/90 border-gray-200 shadow-lg'
    }`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b flex-shrink-0 ${
        isDark
          ? 'bg-gradient-to-r from-[#39BEAE]/20 to-transparent border-white/10'
          : 'bg-gradient-to-r from-[#39BEAE]/10 to-transparent border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-3 h-5 text-[#39BEAE]" />
            <h3 className={`font-semibold text-xs ${isDark ? 'text-white' : 'text-gray-900'}`}>Layers</h3>
          </div>
          <button
            onClick={onRefresh}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark
                ? 'text-gray-400 hover:text-white hover:bg-white/10'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title="Refresh layers"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Show All / Hide All Buttons */}
      <div className={`px-4 py-1 border-b flex gap-2 flex-shrink-0 ${
        isDark ? 'border-white/10' : 'border-gray-200'
      }`}>
        <button
          onClick={onShowAll}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            isDark
              ? 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          Show All
        </button>
        <button
          onClick={onHideAll}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            isDark
              ? 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900'
          }`}
        >
          <EyeOff className="w-3.5 h-3.5" />
          Hide All
        </button>
      </div>

      {/* Layer List */}
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        {mainGroups.length === 0 ? (
          <div className="text-center py-6">
            <Layers className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>No layers available</p>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Click refresh to load layers</p>
          </div>
        ) : (
          <div className="space-y-1">
            {mainGroups.map((group) => {
              const children = getChildren(group.name)
              const hasChildren = children.length > 0
              const isExpanded = expandedGroups.has(group.name)

              return (
                <div key={group.name}>
                  {/* Main Group */}
                  <div className="flex items-center">
                    {/* Expand/Collapse Button */}
                    {hasChildren ? (
                      <button
                        onClick={() => toggleExpanded(group.name)}
                        className={`rounded transition-colors ${
                          isDark
                            ? 'text-gray-400 hover:text-white'
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3 h-3.5" />
                        )}
                      </button>
                    ) : (
                      <div className="w-5" />
                    )}

                    {/* Group Toggle Button */}
                    <button
                      onClick={() => onToggleMainGroup(group.name)}
                      className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm transition-all ${
                        group.visible
                          ? isDark
                            ? 'bg-[#39BEAE]/20 text-white'
                            : 'bg-[#39BEAE]/20 text-gray-900'
                          : isDark
                            ? 'bg-gray-800/30 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300'
                            : 'bg-gray-100/50 text-gray-500 hover:bg-gray-200/50 hover:text-gray-700'
                      }`}
                    >
                      {group.visible ? (
                        <Eye className="w-3.5 h-3.5 text-white bg-[#39BEAE] rounded-xl" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5" />
                      )}
                      <span className="flex-1 truncate">{group.name}</span>
                      {group.actorCount > 0 && (
                        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{group.actorCount}</span>
                      )}
                    </button>
                  </div>

                  {/* Child Groups */}
                  {hasChildren && isExpanded && (
                    <div className={`ml-5 mt-1 space-y-1 border-l pl-2 ${
                      isDark ? 'border-gray-700/50' : 'border-gray-300/50'
                    }`}>
                      {children.map((child) => (
                        <button
                          key={`${child.parentName}-${child.childIndex}`}
                          onClick={() => onToggleChildGroup(child.parentName!, child.childIndex!)}
                          className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg text-left text-xs transition-all ${
                            child.visible
                              ? isDark
                                ? 'bg-[#39BEAE]/10 text-white'
                                : 'bg-[#39BEAE]/10 text-gray-900'
                              : isDark
                                ? 'bg-gray-800/20 text-gray-500 hover:bg-gray-700/30 hover:text-gray-400'
                                : 'bg-gray-100/30 text-gray-500 hover:bg-gray-200/30 hover:text-gray-600'
                          }`}
                        >
                          {child.visible ? (
                            <Eye className="w-3 h-3 text-[#39BEAE]" />
                          ) : (
                            <EyeOff className="w-3 h-3" />
                          )}
                          <span className="flex-1 truncate">{child.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${isDark ? '#4b5563' : '#d1d5db'};
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${isDark ? '#6b7280' : '#9ca3af'};
        }
      `}</style>
    </div>
  )
}

export default LayerControls
