/**
 * Shared formatter for salon opening hours configured in Admin CMS (`/admin/cms?tab=hours`).
 * Ensures Homepage, Footer, and Contact page always reflect live CMS opening hours uniformly.
 */

export interface OpeningDayHours {
  open: string;
  close: string;
  closed: boolean;
}

export interface OpeningHoursRow {
  key: string;
  labelEn: string;
  labelVi: string;
  hoursTextEn: string;
  hoursTextVi: string;
  highlight?: boolean;
}

const DEFAULT_HOURS: Record<string, OpeningDayHours> = {
  monday: { open: '09:30', close: '18:30', closed: false },
  tuesday: { open: '09:30', close: '18:30', closed: false },
  wednesday: { open: '09:30', close: '18:30', closed: false },
  thursday: { open: '09:30', close: '20:00', closed: false },
  friday: { open: '09:30', close: '19:00', closed: false },
  saturday: { open: '09:00', close: '18:00', closed: false },
  sunday: { open: '10:00', close: '17:00', closed: false },
};

function getDayHours(
  raw: Record<string, any> | undefined,
  day: string
): OpeningDayHours {
  const entry = raw?.[day];
  if (entry && typeof entry === 'object' && ('open' in entry || 'closed' in entry)) {
    return {
      open: String(entry.open || DEFAULT_HOURS[day].open),
      close: String(entry.close || DEFAULT_HOURS[day].close),
      closed: Boolean(entry.closed),
    };
  }
  return DEFAULT_HOURS[day];
}

function formatDay(day: OpeningDayHours): { en: string; vi: string } {
  if (day.closed) {
    return { en: 'Closed', vi: 'Đóng cửa' };
  }
  const range = `${day.open} – ${day.close}`;
  return { en: range, vi: range };
}

export function buildOpeningHoursRows(
  openingHours?: Record<string, any>
): OpeningHoursRow[] {
  const mon = getDayHours(openingHours, 'monday');
  const tue = getDayHours(openingHours, 'tuesday');
  const wed = getDayHours(openingHours, 'wednesday');
  const thu = getDayHours(openingHours, 'thursday');
  const fri = getDayHours(openingHours, 'friday');
  const sat = getDayHours(openingHours, 'saturday');
  const sun = getDayHours(openingHours, 'sunday');

  const sameMonWed =
    mon.closed === tue.closed &&
    tue.closed === wed.closed &&
    mon.open === tue.open &&
    tue.open === wed.open &&
    mon.close === tue.close &&
    tue.close === wed.close;

  const rows: OpeningHoursRow[] = [];

  if (sameMonWed) {
    const f = formatDay(mon);
    rows.push({
      key: 'mon-wed',
      labelEn: 'Mon – Wed',
      labelVi: 'Thứ 2 – Thứ 4',
      hoursTextEn: f.en,
      hoursTextVi: f.vi,
    });
  } else {
    const dayMeta = [
      { key: 'monday', day: mon, en: 'Monday', vi: 'Thứ 2' },
      { key: 'tuesday', day: tue, en: 'Tuesday', vi: 'Thứ 3' },
      { key: 'wednesday', day: wed, en: 'Wednesday', vi: 'Thứ 4' },
    ];
    for (const d of dayMeta) {
      const f = formatDay(d.day);
      rows.push({
        key: d.key,
        labelEn: d.en,
        labelVi: d.vi,
        hoursTextEn: f.en,
        hoursTextVi: f.vi,
      });
    }
  }

  const thuFmt = formatDay(thu);
  const friFmt = formatDay(fri);
  const satFmt = formatDay(sat);
  const sunFmt = formatDay(sun);

  rows.push(
    {
      key: 'thursday',
      labelEn: thu.closed ? 'Thursday' : 'Thursday (Late)',
      labelVi: thu.closed ? 'Thứ 5' : 'Thứ 5 (Mở muộn)',
      hoursTextEn: thuFmt.en,
      hoursTextVi: thuFmt.vi,
      highlight: !thu.closed,
    },
    {
      key: 'friday',
      labelEn: 'Friday',
      labelVi: 'Thứ 6',
      hoursTextEn: friFmt.en,
      hoursTextVi: friFmt.vi,
    },
    {
      key: 'saturday',
      labelEn: 'Saturday',
      labelVi: 'Thứ 7',
      hoursTextEn: satFmt.en,
      hoursTextVi: satFmt.vi,
    },
    {
      key: 'sunday',
      labelEn: 'Sunday',
      labelVi: 'Chủ Nhật',
      hoursTextEn: sunFmt.en,
      hoursTextVi: sunFmt.vi,
    }
  );

  return rows;
}
