import { buildWeekdayCharts } from './_builder.server.js';
import type { WeekdayCharts } from './types.js';

export const saturdaySuccessCharts: WeekdayCharts = buildWeekdayCharts(6);
