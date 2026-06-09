import { buildWeekdayCharts } from './_builder.server.js';
import type { WeekdayCharts } from './types.js';

export const wednesdaySuccessCharts: WeekdayCharts = buildWeekdayCharts(3);
