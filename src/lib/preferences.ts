export const widgetIds = ["overview", "training", "stress", "trend", "day", "nutrition", "report"] as const;
export type WidgetId = typeof widgetIds[number];
export type DashboardPreferences = { order: WidgetId[]; hidden: WidgetId[] };
export const notificationModes = ["on-demand", "important", "daily", "weekly", "off"] as const;
export type NotificationMode = typeof notificationModes[number];
export function validDashboard(v: DashboardPreferences): boolean {
  return !!v && Array.isArray(v.order) && Array.isArray(v.hidden) &&
    v.order.length === widgetIds.length && new Set(v.order).size === widgetIds.length &&
    v.order.every(id => widgetIds.includes(id)) &&
    new Set(v.hidden).size === v.hidden.length && v.hidden.every(id => widgetIds.includes(id));
}
