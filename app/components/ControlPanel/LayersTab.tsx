'use client'

import type { TrainingState } from '@/app/hooks/useTrainingMessagesComposite'

// =============================================================================
// Props Interface
// =============================================================================

interface LayersTabProps {
  state: TrainingState
  onRefreshWaypoints: () => void
  onActivateWaypoint: (index: number) => void
  onDeactivateWaypoint: () => void
  onRefreshLayers: () => void
  onRefreshHierarchicalLayers: () => void
  onToggleLayer: (index: number) => void
  onShowAllLayers: () => void
  onHideAllLayers: () => void
  onToggleMainGroup: (groupName: string) => void
  onToggleChildGroup: (parentName: string, childIndex: number) => void
}

// =============================================================================
// Component
// =============================================================================

export function LayersTab({
  state,
  onRefreshWaypoints,
  onActivateWaypoint,
  onDeactivateWaypoint,
  onRefreshLayers,
  onRefreshHierarchicalLayers,
  onToggleLayer,
  onShowAllLayers,
  onHideAllLayers,
  onToggleMainGroup,
  onToggleChildGroup
}: LayersTabProps) {
  return (
    <div className="space-y-4">
      {/* Layer Controls */}
      <div className="bg-[#1e2a4a] rounded-lg p-4 border border-[#2c3e50]">
        <h3 className="text-blue-400 text-sm font-medium border-b border-[#2c3e50] pb-2 mb-3">👁️ Layer Visibility</h3>

        {/* Layer List */}
        <div className="max-h-48 overflow-y-auto mb-3 space-y-1">
          {state.hierarchicalGroups.length > 0 ? (
            state.hierarchicalGroups.map((group, index) => (
              <button
                key={`${group.name}-${index}`}
                onClick={() => {
                  if (group.isChild && group.parentName !== undefined && group.childIndex !== undefined) {
                    onToggleChildGroup(group.parentName, group.childIndex)
                  } else {
                    onToggleMainGroup(group.name)
                  }
                }}
                className={`w-full p-2 rounded text-left text-xs transition-colors ${
                  group.visible
                    ? 'bg-[#2c3e50] text-white'
                    : 'bg-gray-700 text-gray-400 opacity-50'
                } ${group.isChild ? 'ml-4' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span>
                    {group.isChild ? '└ ' : '📁 '}
                    {group.name}
                    <span className="text-gray-500 ml-1">({group.actorCount})</span>
                  </span>
                  <span>{group.visible ? '👁️' : '🚫'}</span>
                </div>
              </button>
            ))
          ) : state.layers.length > 0 ? (
            state.layers.map((layer) => (
              <button
                key={layer.index}
                onClick={() => onToggleLayer(layer.index)}
                className={`w-full p-2 rounded text-left text-xs transition-colors ${
                  layer.visible
                    ? 'bg-[#2c3e50] text-white'
                    : 'bg-gray-700 text-gray-400 opacity-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>
                    🏗️ {layer.name}
                    <span className="text-gray-500 ml-1">({layer.actorCount})</span>
                  </span>
                  <span>{layer.visible ? '👁️' : '🚫'}</span>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center text-gray-500 py-4">
              Click Refresh to load layers
            </div>
          )}
        </div>

        {/* Layer Actions */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button
            onClick={onShowAllLayers}
            className="p-2 bg-gray-600 text-white rounded text-xs hover:bg-gray-500 transition-colors"
          >
            👁️ Show All
          </button>
          <button
            onClick={onHideAllLayers}
            className="p-2 bg-gray-600 text-white rounded text-xs hover:bg-gray-500 transition-colors"
          >
            🚫 Hide All
          </button>
        </div>
        <button
          onClick={() => {
            onRefreshLayers()
            onRefreshHierarchicalLayers()
          }}
          className="w-full p-2 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
        >
          🔄 Refresh Layers
        </button>
      </div>

      {/* Waypoints Widget */}
      <div className="bg-[#1e2a4a] rounded-lg p-4 border border-[#2c3e50]">
        <h3 className="text-blue-400 text-sm font-medium border-b border-[#2c3e50] pb-2 mb-3">📍 Waypoints</h3>

        {/* Active Waypoint Indicator */}
        {state.activeWaypointIndex >= 0 && (
          <div className="bg-blue-500/20 border border-blue-500 text-blue-300 p-2 rounded mb-3">
            <div className="text-xs font-bold">Active: {state.activeWaypointName}</div>
          </div>
        )}

        <div className="max-h-36 overflow-y-auto mb-3 space-y-1">
          {state.waypoints.length > 0 ? (
            state.waypoints.map((waypoint) => (
              <button
                key={waypoint.index}
                onClick={() => onActivateWaypoint(waypoint.index)}
                className={`w-full p-2 rounded text-left text-xs transition-colors ${
                  state.activeWaypointIndex === waypoint.index
                    ? 'bg-blue-500/30 border border-blue-500 text-blue-300'
                    : 'bg-[#2c3e50] text-white hover:bg-[#3c5070]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    state.activeWaypointIndex === waypoint.index ? 'bg-green-500' : 'bg-gray-500'
                  }`} />
                  📍 {waypoint.name}
                </div>
              </button>
            ))
          ) : (
            <div className="text-center text-gray-500 py-4">
              Click Refresh to load waypoints
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {state.activeWaypointIndex >= 0 && (
            <button
              onClick={onDeactivateWaypoint}
              className="p-2 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
            >
              ❌ Exit Waypoint
            </button>
          )}
          <button
            onClick={onRefreshWaypoints}
            className={`p-2 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors ${
              state.activeWaypointIndex >= 0 ? '' : 'col-span-2'
            }`}
          >
            🔄 Refresh
          </button>
        </div>
      </div>
    </div>
  )
}

export default LayersTab
