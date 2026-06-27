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
