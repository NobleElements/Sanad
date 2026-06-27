import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useCalendarStore from '../store/useCalendarStore';
import { expandEvents } from '../utils/calendarUtils';
import { addDays } from 'date-fns';

export default function NotificationManager() {
  const { events, fetchEvents } = useCalendarStore();
  const navigate = useNavigate();
  const notifiedEventsRef = useRef(new Set());
  const [permission, setPermission] = React.useState(
    'Notification' in window ? Notification.permission : 'denied'
  );

  // Request permissions on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(perm => {
        setPermission(perm);
      });
    }

    // Ensure we have events loaded if they aren't already
    if (events.length === 0) {
      fetchEvents();
    }
  }, []);

  // Set up the 1-minute poller
  useEffect(() => {
    if (permission !== 'granted') return;

    const checkNotifications = () => {
      const now = new Date();
      // Only check up to the next 24 hours to limit expansion
      const endWindow = addDays(now, 1);
      
      const expandedEvents = expandEvents(events, now, endWindow);

      expandedEvents.forEach(evt => {
        // Skip if this event has no notification preference or is an all-day event
        if (evt.notificationPreference == null || evt.isAllDay) return;

        const eventStart = new Date(evt.renderDate || evt.startDate);
        // Correct time based on original start date
        const originalStart = new Date(evt.startDate);
        eventStart.setHours(originalStart.getHours(), originalStart.getMinutes(), 0, 0);

        // Calculate when the notification should fire
        const notifyTime = new Date(eventStart.getTime() - evt.notificationPreference * 60000);
        
        // If the current time has passed the notify time but is within a 10-minute window of it
        // (Browsers heavily throttle setInterval for background tabs, so we need a wide window)
        const diffMs = now.getTime() - notifyTime.getTime();
        
        if (diffMs >= 0 && diffMs < 10 * 60000) {
          const uniqueInstanceId = `${evt.instanceId || evt.id}_${notifyTime.getTime()}`;
          
          if (!notifiedEventsRef.current.has(uniqueInstanceId)) {
            console.log(`[NotificationManager] Firing notification for ${evt.title} at ${notifyTime.toISOString()}`);
            
            // Fire notification
            const notification = new Notification(`Upcoming Event: ${evt.title}`, {
              body: evt.notificationPreference === 0 
                ? 'Starting now!' 
                : `Starting in ${evt.notificationPreference} minutes.`
            });

            notification.onclick = () => {
              navigate('/calendar');
              window.focus();
            };

            notifiedEventsRef.current.add(uniqueInstanceId);
          }
        }
      });
    };

    // Run immediately, then every 60 seconds
    checkNotifications();
    const interval = setInterval(checkNotifications, 60000);

    return () => clearInterval(interval);
  }, [events, navigate, permission]);

  return null;
}
