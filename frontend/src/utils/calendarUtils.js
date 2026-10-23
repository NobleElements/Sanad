import { addDays } from 'date-fns';

// Helper to expand recurring events for rendering or evaluating
// This is a simplified expansion that evaluates rules strictly for the visible range
export const expandEvents = (events, start, end) => {
  const expanded = [];
  events.forEach(evt => {
    if (!evt.recurrenceRule) {
      const eStart = new Date(evt.startDate);
      const eEnd = new Date(evt.endDate);
      if (eEnd >= start && eStart <= end) {
        expanded.push({ ...evt, renderDate: eStart });
      }
    } else {
      try {
        const rule = JSON.parse(evt.recurrenceRule);
        let curr = new Date(evt.startDate);
        // Safety limit
        let iter = 0;
        while (curr <= end && iter < 1000) {
          if (curr >= start) {
            expanded.push({ ...evt, instanceId: `${evt.id}_${curr.getTime()}`, renderDate: new Date(curr) });
          }
          if (rule.type === 'daily') {
            curr = addDays(curr, rule.interval || 1);
          } else if (rule.type === 'weekly') {
            curr = addDays(curr, 7 * (rule.interval || 1));
          } else {
            break; // not fully implemented all rules
          }
          iter++;
        }
      } catch (e) {
        // If parsing fails, just render once
        expanded.push(evt);
      }
    }
  });
  return expanded;
};

/**
 * Calculates the target scrollTop for the calendar timeline so that the given time of day
 * is centered vertically within the visible timeline area.
 * 
 * @param {Date} [time=new Date()] The time of day to center.
 * @param {number} [containerHeight=0] The clientHeight of the scrollable container.
 * @param {number} [headerHeight=0] The offsetHeight of the sticky header.
 * @param {number} [scrollHeight=0] The total scrollHeight of the scrollable container.
 * @returns {number} The clamped scrollTop position in pixels.
 */
export const calculateCalendarScrollTop = (
  time = new Date(),
  containerHeight = 0,
  headerHeight = 0,
  scrollHeight = 0
) => {
  const currentMinutes = time.getHours() * 60 + time.getMinutes();
  const visibleTimelineHeight = containerHeight - headerHeight;
  const visibleHeight = visibleTimelineHeight > 0 ? visibleTimelineHeight : containerHeight;

  // Center the target time in the visible timeline area
  const targetScrollTop = currentMinutes - (visibleHeight > 0 ? visibleHeight / 2 : 300);
  const maxScroll = scrollHeight > containerHeight ? scrollHeight - containerHeight : 0;

  if (maxScroll > 0) {
    return Math.max(0, Math.min(Math.round(targetScrollTop), maxScroll));
  }
  return Math.max(0, Math.round(targetScrollTop));
};

