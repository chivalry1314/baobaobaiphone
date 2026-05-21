import type { CustomWidgetDefinition } from './stores/types';

const CUSTOM_WIDGET_LIBRARY_KEY = 'baobaobaiphone.customWidgetLibrary.v1';
export const CUSTOM_WIDGET_LIBRARY_CHANGED_EVENT = 'baobaobai:custom-widgets-changed';

export const readCustomWidgetLibrary = (): CustomWidgetDefinition[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_WIDGET_LIBRARY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === 'object') : [];
  } catch {
    return [];
  }
};

const writeCustomWidgetLibrary = (widgets: CustomWidgetDefinition[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CUSTOM_WIDGET_LIBRARY_KEY, JSON.stringify(widgets));
  window.dispatchEvent(new Event(CUSTOM_WIDGET_LIBRARY_CHANGED_EVENT));
};

export const upsertCustomWidgetLibraryItem = (widget: CustomWidgetDefinition) => {
  const widgets = readCustomWidgetLibrary();
  const index = widgets.findIndex((item) => item.id === widget.id || (item.name === widget.name && item.widgetCode === widget.widgetCode));
  const nextWidgets =
    index >= 0
      ? widgets.map((item, itemIndex) => (itemIndex === index ? { ...widget, id: item.id } : item))
      : [...widgets, widget];
  writeCustomWidgetLibrary(nextWidgets);
};

export const removeCustomWidgetLibraryItem = (
  id: string,
  match?: { name?: string; widgetCode?: string }
) => {
  const matchName = match?.name?.trim();
  const matchCode = match?.widgetCode?.trim();
  writeCustomWidgetLibrary(
    readCustomWidgetLibrary().filter((widget) => {
      if (widget.id === id) return false;
      if (matchName && matchCode && widget.name?.trim() === matchName && widget.widgetCode?.trim() === matchCode) {
        return false;
      }
      return true;
    })
  );
};
