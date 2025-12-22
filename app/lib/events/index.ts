/**
 * Events Module
 *
 * Centralized pub/sub event system for cross-feature communication.
 */

// EventBus singleton - used across the app
export { eventBus } from './EventBus'
export type {
  AppEvents,
  AppEventName,
  EventCallback,
  EventSubscription,
} from './EventBus'
