"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'

interface PushSubscriptionInfo {
  isSupported: boolean
  isSubscribed: boolean
  permission: NotificationPermission
}

export function usePushNotifications() {
  const [subscriptionInfo, setSubscriptionInfo] = useState<PushSubscriptionInfo>({
    isSupported: false,
    isSubscribed: false,
    permission: 'default'
  })
  const [loading, setLoading] = useState(false)

  // Check if push notifications are supported and get current state
  useEffect(() => {
    const checkSupport = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setSubscriptionInfo(prev => ({ ...prev, isSupported: false }))
        return
      }

      setSubscriptionInfo(prev => ({
        ...prev,
        isSupported: true,
        permission: Notification.permission
      }))

      // Check if there's an existing subscription
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      setSubscriptionInfo(prev => ({
        ...prev,
        isSubscribed: !!subscription
      }))
    }

    checkSupport()
  }, [])

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')
        console.log('Service Worker registered:', registration)
        return registration
      } catch (error) {
        console.error('Service Worker registration failed:', error)
        throw error
      }
    }
    throw new Error('Service Workers not supported')
  }, [])

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications')
    }

    const permission = await Notification.requestPermission()
    setSubscriptionInfo(prev => ({ ...prev, permission }))
    
    return permission
  }, [])

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    setLoading(true)
    try {
      // Check permission first
      let permission = Notification.permission
      if (permission === 'default') {
        permission = await requestPermission()
      }

      if (permission !== 'granted') {
        toast.error('Notification permission denied')
        return false
      }

      // Register service worker
      await registerServiceWorker()
      const registration = await navigator.serviceWorker.ready

      // Get VAPID public key from environment or API
      const response = await fetch('/api/push/vapid-key')
      const { publicKey } = await response.json()

      // Subscribe to push manager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as any
      })

      // Save subscription to database
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const saveResponse = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userId: user.id,
          userAgent: navigator.userAgent
        }),
      })

      if (!saveResponse.ok) {
        throw new Error('Failed to save subscription')
      }

      setSubscriptionInfo(prev => ({ ...prev, isSubscribed: true }))
      toast.success('Push notifications enabled!')
      return true

    } catch (error) {
      console.error('Error subscribing to push:', error)
      toast.error('Failed to enable push notifications')
      return false
    } finally {
      setLoading(false)
    }
  }, [requestPermission, registerServiceWorker])

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()

        // Remove from database
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await fetch('/api/push/unsubscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              endpoint: subscription.endpoint,
              userId: user.id
            }),
          })
        }

        setSubscriptionInfo(prev => ({ ...prev, isSubscribed: false }))
        toast.success('Push notifications disabled')
        return true
      }
      return false
    } catch (error) {
      console.error('Error unsubscribing from push:', error)
      toast.error('Failed to disable push notifications')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    ...subscriptionInfo,
    loading,
    subscribe,
    unsubscribe,
    requestPermission
  }
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
