import type { ComponentType } from 'react';

/**
 * 应用市场展示元数据（可选）
 */
export interface AppMarketMeta {
  /** 市场卡片图标（建议使用 emoji） */
  icon?: string;
  /** 作者/发布方 */
  author?: string;
  /** 市场展示大小说明 */
  size?: string;
  /** 市场标签 */
  tags?: string[];
  /** 市场排序（值越小越靠前） */
  sortOrder?: number;
  /** 线上运行 HTML（可选，存在时支持运行时安装） */
  html?: string;
}

/**
 * 应用清单定义。
 * 任意应用要被系统加载，都需要导出符合此协议的配置。
 */
export interface AppManifest {
  /** 应用唯一标识 */
  id: string;
  /** 应用显示名称 */
  name: string;
  /** 图标名称（对应 lucide-react 图标） */
  icon: string;
  /** 图标背景色 */
  color?: string;
  /** 应用入口组件 */
  component: ComponentType<AppProps>;
  /** 需要申请的系统权限 */
  permissions?: SystemPermission[];
  /** 是否为系统应用（系统应用会在桌面常驻，且不可删除） */
  isSystem?: boolean;
  /** 应用版本 */
  version?: string;
  /** 应用描述 */
  description?: string;
  /** 应用市场展示元信息（可选） */
  market?: AppMarketMeta;
  /** 远程模块地址（用于模块联邦） */
  remoteEntry?: string;
}

/** 应用入口组件参数 */
export interface AppProps {
  onClose: () => void;
  /** 系统透传的上下文参数 */
  context?: AppContext;
}

/** 应用运行上下文 */
export interface AppContext {
  /** 当前激活应用 ID */
  activeAppId: string | null;
  /** 系统透传参数 */
  params?: Record<string, unknown>;
}

/** 系统权限类型 */
export type SystemPermission =
  | 'battery'
  | 'vibration'
  | 'notification'
  | 'location'
  | 'camera'
  | 'microphone';

/** 电池信息 */
export interface BatteryInfo {
  level: number;
  charging: boolean;
  chargingTime?: number;
  dischargingTime?: number;
}

/** 通知参数 */
export interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  tag?: string;
}

/** 全局设置 */
export interface GlobalSettings {
  chatProvider: 'openai' | 'siliconflow';
  apiKey: string;
  baseUrl: string;
  model: string;

  memoryApiKey: string;
  memoryBaseUrl: string;
  memoryModel: string;
  memoryAutoSummaryThreshold: number;
  memoryAutoSummaryMaxRounds: number;
  memoryAutoSummaryMinBatch: number;
  memoryAutoSummaryMaxBatch: number;
  memoryAutoSummaryKeepRecentMin: number;
  memoryAutoSummaryKeepRecentRatio: number;

  imageApiKey: string;
  imageBaseUrl: string;
  imageModel: string;
  imageSize: string;

  temperature: number;
  maxTokens: number;

  voiceProvider: 'none' | 'minimax';
  voiceApiKey: string;
  voiceBaseUrl: string;
  voiceModel: string;
  voiceVoiceId: string;
  voiceMinimaxGroupId: string;
  voiceAutoPlay: boolean;
  pushEnabled: boolean;
  pushServerBaseUrl: string;
  pushUserId: string;
  pushDeviceId: string;
  pushLastEndpoint: string | null;
  pushLastSyncedAt: string | null;

  // 字体设置
  fontFamily: string;
  customFontData?: string | null;
  customFontName?: string | null;
  customFontFormat?: string | null;

  // 壁纸设置
  wallpaper: string | null;
  wallpaperOpacity: number;

  // 自定义图标
  customIcons: Record<string, string>;

  // 全局图标样式
  iconSize: number;
  iconRadius: number;
  iconFrosted: number;
  iconShadow: number;
  showAppName: boolean;
}

/** 世界书条目 */
export interface WorldInfoEntry {
  id: string;
  name: string;
  keywords: string[];
  content: string;
  triggerMode: 'keyword' | 'constant' | 'disabled';
  insertionOrder: number;
  scope: 'global' | 'character';
}


/** Desktop item type */
export type DesktopItemType = 'app' | 'widget';

/** Optional desktop item payload for widget/app customization */
export interface DesktopItemData {
  name?: string;
  backgroundImage?: string;
  placeholderIcon?: string;
  cornerRadius?: number;
  frosted?: number;
  shadow?: number;
  backgroundOpacity?: number;
  [key: string]: unknown;
}

/** Desktop item rendered on home screens */
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
  backgroundOpacity?: number;
  data?: DesktopItemData;
}

/** Desktop layout config shared with apps */
export interface DesktopLayoutConfig {
  rows: number;
  cols: number;
  pageCount: number;
  items: DesktopItem[];
  layoutMode?: 'auto' | 'custom';
  customWidgets?: CustomWidgetDefinition[];
}
