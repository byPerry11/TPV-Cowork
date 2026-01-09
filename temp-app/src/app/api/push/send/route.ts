import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Configure web-push with VAPID details (Lazy load)
const setupWebPush = () => {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn('VAPID keys are missing during build time or runtime configuration')
    return false
  }

  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:example@yourdomain.com',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )
    return true
  } catch (error) {
    console.error('Failed to configure web-push:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  if (!setupWebPush()) {
    return NextResponse.json(
      { error: 'Push notification service not configured' },
      { status: 500 }
    )
  }

  try {
    const { userId, title, body, url, data, tag } = await request.json()

    if (!userId || !title || !body) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get all subscriptions for this user
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json(
        { message: 'No subscriptions found for user' },
        { status: 200 }
      )
    }

    // Prepare push notification payload
    const payload = JSON.stringify({
      title,
      body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      url: url || '/dashboard/notifications',
      tag: tag || 'notification',
      data: data || {}
    })

    // Send push notification to all user's subscriptions
    const pushPromises = subscriptions.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh_key,
            auth: sub.auth_key
          }
        }

        await webpush.sendNotification(pushSubscription, payload)
        return { success: true, endpoint: sub.endpoint }
      } catch (error: any) {
        console.error('Push send error:', error)

        // If subscription is no longer valid (410 Gone), delete it
        if (error.statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id)
          
          return { success: false, endpoint: sub.endpoint, removed: true }
        }

        return { success: false, endpoint: sub.endpoint, error: error.message }
      }
    })

    const results = await Promise.all(pushPromises)

    const successCount = results.filter(r => r.success).length
    const failedCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failedCount,
      results
    })

  } catch (error) {
    console.error('Error in send endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to process queued notifications
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get unsent notifications from queue
    const { data: notifications, error } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('sent', false)
      .order('created_at', { ascending: true })
      .limit(50)

    if (error) {
      console.error('Error fetching notification queue:', error)
      return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 })
    }

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({ message: 'No pending notifications' })
    }

    // Process each notification
    const processPromises = notifications.map(async (notification) => {
      try {
        // Send push using POST logic
        const response = await fetch(`${request.url}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: notification.user_id,
            title: notification.title,
            body: notification.body,
            url: notification.data?.url,
            data: notification.data
          })
        })

        if (response.ok) {
          // Mark as sent
          await supabase
            .from('notification_queue')
            .update({ sent: true, sent_at: new Date().toISOString() })
            .eq('id', notification.id)
        }

        return { id: notification.id, success: response.ok }
      } catch (error) {
        console.error('Error processing notification:', notification.id, error)
        return { id: notification.id, success: false }
      }
    })

    const results = await Promise.all(processPromises)
    
    return NextResponse.json({
      processed: results.length,
      successful: results.filter(r => r.success).length
    })

  } catch (error) {
    console.error('Error processing queue:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
