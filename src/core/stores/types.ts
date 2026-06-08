import type { ComponentType } from 'react';
import type { GlobalSettings, WorldInfoEntry } from '../sdk/types';

export type { GlobalSettings, WorldInfoEntry };

/**
 * Widget static registration config.
 */
export interface WidgetConfig {
  id: string;
  name: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultIcon: string;
  component?: ComponentType<object>;
}

export type DesktopItemType = 'app' | 'widget';

export interface DesktopItemData {
  name?: string;
  backgroundImage?: string;
  placeholderIcon?: string;
  cornerRadius?: number;
  frosted?: number;
  shadow?: number;
  [key: string]: unknown;
}

export interface DesktopItem {
  instanceId: string;
  componentId: string;
  type: DesktopItemType;
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  data?: DesktopItemData;
}

export interface CustomWidgetDefinition {
  id: string;
  name: string;
  width: number;
  height: number;
  templateId: string;
  widgetCode: string;
  cornerRadius?: number;
  frosted?: number;
  shadow?: number;
  data?: DesktopItemData;
}

export interface DesktopLayoutConfig {
  rows: number;
  cols: number;
  pageCount: number;
  items: DesktopItem[];
  layoutMode?: 'auto' | 'custom';
  customWidgets?: CustomWidgetDefinition[];
}
