'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import type { ParsedMessage, LayerData, HierarchicalLayerData, WaypointData } from '@/app/lib/messageTypes'
import { WEB_TO_UE_MESSAGES } from '@/app/lib/messageTypes'
import type { UseMessageBusReturn } from '@/app/features/messaging/hooks/useMessageBus'
import { eventBus } from '@/app/lib/events'
import { useThrottledCallback } from '@/app/lib/performance'

// =============================================================================
// Layer State Type
// =============================================================================

export interface LayerStateData {
  layers: LayerData[]
  hierarchicalGroups: HierarchicalLayerData[]
  waypoints: WaypointData[]
  activeWaypointIndex: number
  activeWaypointName: string
}

// =============================================================================
// Callbacks
// =============================================================================

export interface LayerControlCallbacks {
  onLayerList?: (layers: LayerData[]) => void
  onHierarchicalList?: (groups: HierarchicalLayerData[]) => void
  onLayerUpdate?: () => void
  onWaypointList?: (waypoints: WaypointData[]) => void
  onWaypointUpdate?: (data: {
    activeIndex: number
    name: string
    isActive: boolean
    progress: number
  }) => void
}

// =============================================================================
// Initial State
// =============================================================================

const initialState: LayerStateData = {
  layers: [],
  hierarchicalGroups: [],
  waypoints: [],
  activeWaypointIndex: -1,
  activeWaypointName: 'None'
}

// =============================================================================
// Hook Return Type
// =============================================================================

export interface UseLayerControlReturn {
  state: LayerStateData
  // Layer actions
  refreshLayers: () => void
  refreshHierarchicalLayers: () => void
  toggleLayer: (index: number) => void
  isolateLayer: (index: number) => void
  showAllLayers: () => void
  hideAllLayers: () => void
  toggleMainGroup: (groupName: string) => void
  toggleChildGroup: (parentName: string, childIndex: number) => void
  // Waypoint actions
  refreshWaypoints: () => void
  activateWaypoint: (index: number) => void
  deactivateWaypoint: () => void
  // UI Mode helpers
  setWaypointActive: (index: number, name: string) => void
  setWaypointInactive: () => void
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useLayerControl(
  messageBus: UseMessageBusReturn,
  callbacks: LayerControlCallbacks = {}
): UseLayerControlReturn {
  const [state, setState] = useState<LayerStateData>(initialState)
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  // ==========================================================================
  // Message Handler
  // ==========================================================================

  useEffect(() => {
    const unsubscribe = messageBus.onMessage((message: ParsedMessage) => {
      const { type, dataString } = message
      const parts = dataString.split(':')

      switch (type) {
        case 'layer_list': {
          const count = parseInt(parts[0]) || 0
          const layerData = dataString.substring(parts[0].length + 1)
          const layers: LayerData[] = []

          if (count > 0 && layerData) {
            layerData.split(',').forEach(layer => {
              const [index, name, visible, actorCount] = layer.split(':')
              if (index !== undefined && name) {
                layers.push({
                  index: parseInt(index),
                  name,
                  visible: visible === 'true',
                  actorCount: parseInt(actorCount) || 0
                })
              }
            })
          }

          setState(prev => ({ ...prev, layers }))
          callbacksRef.current.onLayerList?.(layers)
          break
        }

        case 'hierarchical_list': {
          const count = parseInt(parts[0]) || 0
          const groupData = dataString.substring(parts[0].length + 1)
          const groups: HierarchicalLayerData[] = []

          if (count > 0 && groupData) {
            // Track Windows child layers to merge (Windows Left, Windows Right)
            const windowChildLayers: { name: string; visible: boolean; actorCount: number; parentName: string; childIndex: number }[] = []

            groupData.split(',').forEach(group => {
              const [name, visible, isChild, actorCount, parentName, childIndex] = group.split(':')
              if (name) {
                // Check if this is "Widnows Left" or "Widnows Right" (child of Windows parent)
                // Note: UE5 has typo "Widnows" instead of "Windows"
                const isWindowChild = isChild === 'true' && parentName === 'Windows' &&
                  (name === 'Widnows Left' || name === 'Widnows Right')

                if (isWindowChild) {
                  // Collect for merging, don't add to groups yet
                  windowChildLayers.push({
                    name,
                    visible: visible === 'true',
                    actorCount: parseInt(actorCount) || 0,
                    parentName: parentName || '',
                    childIndex: parseInt(childIndex) || 0
                  })
                } else {
                  groups.push({
                    name,
                    visible: visible === 'true',
                    isChild: isChild === 'true',
                    actorCount: parseInt(actorCount) || 0,
                    parentName: parentName || undefined,
                    childIndex: childIndex ? parseInt(childIndex) : undefined
                  })
                }
              }
            })

            // Update Windows parent to include merged child info
            if (windowChildLayers.length > 0) {
              const windowsParent = groups.find(g => g.name === 'Windows' && !g.isChild)
              if (windowsParent) {
                // Add merged layers info to the parent
                windowsParent.actorCount = windowChildLayers.reduce((sum, w) => sum + w.actorCount, 0)
                windowsParent.visible = windowChildLayers.every(w => w.visible)
                windowsParent._mergedLayers = windowChildLayers.map(w => ({
                  name: w.name,
                  parentName: w.parentName,
                  childIndex: w.childIndex
                }))
              }
            }
          }

          setState(prev => ({ ...prev, hierarchicalGroups: groups }))
          callbacksRef.current.onHierarchicalList?.(groups)
          break
        }

        case 'layer_update': {
          console.log('Layer update received, refreshing list')
          setTimeout(() => {
            messageBus.sendMessage(WEB_TO_UE_MESSAGES.LAYER_CONTROL, 'list')
          }, 100)
          callbacksRef.current.onLayerUpdate?.()
          break
        }

        case 'waypoint_list': {
          const count = parseInt(parts[0]) || 0
          const waypointData = dataString.substring(parts[0].length + 1)
          const waypoints: WaypointData[] = []

          if (count > 0 && waypointData) {
            waypointData.split(',').forEach(wp => {
              const [index, name] = wp.split(':')
              if (index !== undefined && name) {
                waypoints.push({ index: parseInt(index), name })
              }
            })
          }

          setState(prev => ({ ...prev, waypoints }))
          callbacksRef.current.onWaypointList?.(waypoints)
          break
        }

        case 'waypoint_update': {
          const activeIndex = parseInt(parts[0]) || -1
          const waypointName = parts[1] || 'None'
          const isActive = parts[2] === 'true'
          const progress = parseFloat(parts[3]) || 0

          setState(prev => ({
            ...prev,
            activeWaypointIndex: isActive ? activeIndex : -1,
            activeWaypointName: isActive ? waypointName : 'None'
          }))

          callbacksRef.current.onWaypointUpdate?.({
            activeIndex,
            name: waypointName,
            isActive,
            progress
          })
          break
        }
      }
    })

    return unsubscribe
  }, [messageBus])

  // ==========================================================================
  // Layer Actions (with throttling to prevent rapid clicks)
  // ==========================================================================

  const refreshLayersInternal = useCallback(() => {
    console.log('Refreshing layer list')
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.LAYER_CONTROL, 'list')
  }, [messageBus])

  const refreshHierarchicalLayersInternal = useCallback(() => {
    console.log('Refreshing hierarchical layer list')
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.HIERARCHICAL_CONTROL, 'list')
  }, [messageBus])

  // Throttle refresh actions to 100ms (fast for dropdown auto-fetch)
  const refreshLayers = useThrottledCallback(refreshLayersInternal, 100)
  const refreshHierarchicalLayers = useThrottledCallback(refreshHierarchicalLayersInternal, 100)

  const toggleLayerInternal = useCallback((index: number) => {
    const layer = state.layers.find(l => l.index === index)
    console.log('Toggling layer:', index)
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.LAYER_CONTROL, `toggle:${index}`)
    if (layer) {
      eventBus.emit('layer:toggled', { layerName: layer.name, visible: !layer.visible })
    }
    setTimeout(() => {
      messageBus.sendMessage(WEB_TO_UE_MESSAGES.LAYER_CONTROL, 'list')
    }, 200)
  }, [messageBus, state.layers])

  // Throttle layer toggle to 300ms
  const toggleLayer = useThrottledCallback(toggleLayerInternal, 300)

  const isolateLayerInternal = useCallback((index: number) => {
    const layer = state.layers.find(l => l.index === index)
    console.log('Isolating layer:', index)
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.LAYER_CONTROL, `isolate:${index}`)
    if (layer) {
      eventBus.emit('layer:isolated', { layerName: layer.name })
    }
  }, [messageBus, state.layers])

  // Throttle isolate to 300ms
  const isolateLayer = useThrottledCallback(isolateLayerInternal, 300)

  const showAllLayersInternal = useCallback(() => {
    console.log('Showing all layers')
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.HIERARCHICAL_CONTROL, 'show_all')
    eventBus.emit('layer:allShown', undefined)
    setTimeout(() => {
      messageBus.sendMessage(WEB_TO_UE_MESSAGES.HIERARCHICAL_CONTROL, 'list')
    }, 200)
  }, [messageBus])

  const hideAllLayersInternal = useCallback(() => {
    console.log('Hiding all layers')
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.HIERARCHICAL_CONTROL, 'hide_all')
    eventBus.emit('layer:allHidden', undefined)
    setTimeout(() => {
      messageBus.sendMessage(WEB_TO_UE_MESSAGES.HIERARCHICAL_CONTROL, 'list')
    }, 200)
  }, [messageBus])

  // Throttle show/hide all to 500ms
  const showAllLayers = useThrottledCallback(showAllLayersInternal, 500)
  const hideAllLayers = useThrottledCallback(hideAllLayersInternal, 500)

  const toggleMainGroupInternal = useCallback((groupName: string) => {
    // Check if this is a merged layer (e.g., "Windows" with merged children)
    const group = state.hierarchicalGroups.find(g => g.name === groupName && !g.isChild)

    if (group?._mergedLayers && group._mergedLayers.length > 0) {
      // Toggle all original child layers for merged group
      console.log('Toggling merged Windows layers:', group._mergedLayers)
      group._mergedLayers.forEach((layer, idx) => {
        setTimeout(() => {
          messageBus.sendMessage(WEB_TO_UE_MESSAGES.HIERARCHICAL_CONTROL, `toggle_child:${layer.parentName}:${layer.childIndex}`)
        }, idx * 50)
      })
      setTimeout(() => {
        messageBus.sendMessage(WEB_TO_UE_MESSAGES.HIERARCHICAL_CONTROL, 'list')
      }, group._mergedLayers.length * 50 + 100)
    } else {
      // Normal toggle
      console.log('Toggling main group:', groupName)
      messageBus.sendMessage(WEB_TO_UE_MESSAGES.HIERARCHICAL_CONTROL, `toggle_main:${groupName}`)
      setTimeout(() => {
        messageBus.sendMessage(WEB_TO_UE_MESSAGES.HIERARCHICAL_CONTROL, 'list')
      }, 200)
    }
  }, [messageBus, state.hierarchicalGroups])

  const toggleChildGroupInternal = useCallback((parentName: string, childIndex: number) => {
    // Check if this is a merged layer (e.g., "Windows")
    const group = state.hierarchicalGroups.find(g => g.parentName === parentName && g.childIndex === childIndex)

    if (group?._mergedLayers && group._mergedLayers.length > 0) {
      // Toggle all original layers for merged group
      console.log('Toggling merged layers:', group._mergedLayers)
      group._mergedLayers.forEach((layer, idx) => {
        setTimeout(() => {
          messageBus.sendMessage(WEB_TO_UE_MESSAGES.HIERARCHICAL_CONTROL, `toggle_child:${layer.parentName}:${layer.childIndex}`)
        }, idx * 50) // Stagger requests slightly
      })
      setTimeout(() => {
        messageBus.sendMessage(WEB_TO_UE_MESSAGES.HIERARCHICAL_CONTROL, 'list')
      }, group._mergedLayers.length * 50 + 100)
    } else {
      // Normal toggle
      console.log('Toggling child group:', parentName, childIndex)
      messageBus.sendMessage(WEB_TO_UE_MESSAGES.HIERARCHICAL_CONTROL, `toggle_child:${parentName}:${childIndex}`)
      setTimeout(() => {
        messageBus.sendMessage(WEB_TO_UE_MESSAGES.HIERARCHICAL_CONTROL, 'list')
      }, 200)
    }
  }, [messageBus, state.hierarchicalGroups])

  // Throttle group toggles to 300ms
  const toggleMainGroup = useThrottledCallback(toggleMainGroupInternal, 300)
  const toggleChildGroup = useThrottledCallback(toggleChildGroupInternal, 300)

  // ==========================================================================
  // Waypoint Actions
  // ==========================================================================

  const refreshWaypoints = useCallback(() => {
    console.log('Refreshing waypoint list')
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.WAYPOINT_CONTROL, 'list')
  }, [messageBus])

  const activateWaypoint = useCallback((index: number) => {
    console.log('Activating waypoint:', index)
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.WAYPOINT_CONTROL, `activate:${index}`)

    const waypoint = state.waypoints.find(w => w.index === index)
    if (waypoint) {
      setState(prev => ({
        ...prev,
        activeWaypointIndex: index,
        activeWaypointName: waypoint.name
      }))
    }
  }, [state.waypoints, messageBus])

  const deactivateWaypoint = useCallback(() => {
    console.log('Deactivating waypoint')
    messageBus.sendMessage(WEB_TO_UE_MESSAGES.WAYPOINT_CONTROL, 'deactivate')
    setState(prev => ({
      ...prev,
      activeWaypointIndex: -1,
      activeWaypointName: 'None'
    }))
  }, [messageBus])

  // ==========================================================================
  // UI Mode Helpers
  // ==========================================================================

  const setWaypointActive = useCallback((index: number, name: string) => {
    setState(prev => ({
      ...prev,
      activeWaypointIndex: index,
      activeWaypointName: name
    }))
  }, [])

  const setWaypointInactive = useCallback(() => {
    setState(prev => ({
      ...prev,
      activeWaypointIndex: -1,
      activeWaypointName: 'None'
    }))
  }, [])

  return {
    state,
    refreshLayers,
    refreshHierarchicalLayers,
    toggleLayer,
    isolateLayer,
    showAllLayers,
    hideAllLayers,
    toggleMainGroup,
    toggleChildGroup,
    refreshWaypoints,
    activateWaypoint,
    deactivateWaypoint,
    setWaypointActive,
    setWaypointInactive
  }
}

export default useLayerControl
