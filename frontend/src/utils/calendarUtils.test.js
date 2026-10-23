import { describe, it, expect } from 'vitest';
import { calculateCalendarScrollTop } from './calendarUtils';

describe('calculateCalendarScrollTop', () => {
  it('scrolls so 5:00 PM (17:00) is in the middle of the visible timeline', () => {
    const time5pm = new Date(2026, 9, 23, 17, 0, 0);
    const containerHeight = 800;
    const headerHeight = 60;
    const scrollHeight = 1500;

    const scrollTop = calculateCalendarScrollTop(time5pm, containerHeight, headerHeight, scrollHeight);

    // Visible timeline height = 800 - 60 = 740px
    // Midpoint of visible timeline = 740 / 2 = 370px
    // 5pm = 17 * 60 = 1020px
    // Expected scrollTop = 1020 - 370 = 650px
    expect(scrollTop).toBe(650);

    // Verify screen coordinates:
    // Header spans y=0 to y=60
    // 5pm content y = 60 + 1020 = 1080
    // 5pm screen y = 1080 - 650 = 430
    // Distance from bottom of header (60) to 5pm = 430 - 60 = 370px
    // Distance from 5pm (430) to bottom of viewport (800) = 800 - 430 = 370px
    const screenY5pm = headerHeight + 17 * 60 - scrollTop;
    expect(screenY5pm - headerHeight).toBe(containerHeight - screenY5pm);
  });

  it('scrolls proportionally for different times of the day (e.g. 9:00 AM, 12:30 PM)', () => {
    const containerHeight = 800;
    const headerHeight = 60;
    const scrollHeight = 1500;

    const time9am = new Date(2026, 9, 23, 9, 0, 0);
    const scrollTop9am = calculateCalendarScrollTop(time9am, containerHeight, headerHeight, scrollHeight);
    // 9am = 9 * 60 = 540 -> 540 - 370 = 170
    expect(scrollTop9am).toBe(170);

    const screenY9am = headerHeight + 9 * 60 - scrollTop9am;
    expect(screenY9am - headerHeight).toBe(containerHeight - screenY9am);

    const time1230pm = new Date(2026, 9, 23, 12, 30, 0);
    const scrollTop1230pm = calculateCalendarScrollTop(time1230pm, containerHeight, headerHeight, scrollHeight);
    // 12:30pm = 12 * 60 + 30 = 750 -> 750 - 370 = 380
    expect(scrollTop1230pm).toBe(380);

    const screenY1230pm = headerHeight + 750 - scrollTop1230pm;
    expect(screenY1230pm - headerHeight).toBe(containerHeight - screenY1230pm);
  });

  it('accounts for varying header heights (e.g. when all-day events are present)', () => {
    const time5pm = new Date(2026, 9, 23, 17, 0, 0);
    const containerHeight = 900;
    const headerHeight = 120; // taller header due to all-day events
    const scrollHeight = 1560;

    const scrollTop = calculateCalendarScrollTop(time5pm, containerHeight, headerHeight, scrollHeight);

    // Visible height = 900 - 120 = 780
    // Midpoint = 390
    // 5pm = 1020
    // scrollTop = 1020 - 390 = 630
    expect(scrollTop).toBe(630);

    const screenY5pm = headerHeight + 17 * 60 - scrollTop;
    expect(screenY5pm - headerHeight).toBe(containerHeight - screenY5pm);
  });

  it('clamps early morning times to top (scrollTop = 0)', () => {
    const time1am = new Date(2026, 9, 23, 1, 0, 0);
    const containerHeight = 800;
    const headerHeight = 60;
    const scrollHeight = 1500;

    const scrollTop = calculateCalendarScrollTop(time1am, containerHeight, headerHeight, scrollHeight);
    expect(scrollTop).toBe(0);
  });

  it('clamps late night times to maxScroll (does not scroll past bottom of day)', () => {
    const time1145pm = new Date(2026, 9, 23, 23, 45, 0);
    const containerHeight = 800;
    const headerHeight = 60;
    const scrollHeight = 1500;

    const scrollTop = calculateCalendarScrollTop(time1145pm, containerHeight, headerHeight, scrollHeight);
    const maxScroll = scrollHeight - containerHeight; // 700
    expect(scrollTop).toBe(maxScroll);
  });

  it('handles zero or missing dimensions gracefully without NaN', () => {
    const scrollTop = calculateCalendarScrollTop(new Date(2026, 9, 23, 17, 0, 0), 0, 0, 0);
    expect(Number.isFinite(scrollTop)).toBe(true);
    expect(scrollTop).toBeGreaterThanOrEqual(0);
  });
});
