// Messaging Feature - UE5 Communication
export { MessagingProvider, useMessaging, useMessagingOptional } from './context/MessagingContext'
export type { MessagingContextValue } from './context/MessagingContext'

export { useMessageBus } from './hooks/useMessageBus'
export type { UseMessageBusReturn, UseMessageBusConfig } from './hooks/useMessageBus'

// Interlucent Message Bus (parallel implementation with backward compatibility)
export { useInterlucientMessageBus } from './hooks/useInterlucientMessageBus'
export type { UseInterlucientMessageBusReturn, UseInterlucientMessageBusConfig } from './hooks/useInterlucientMessageBus'
