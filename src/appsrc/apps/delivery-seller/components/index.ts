export { SellerHome } from './SellerHome';
export { ShopManage } from './ShopManage';
export { ProductList } from './ProductList';
export { ProductForm } from './ProductForm';
export { OrderList } from './OrderList';
export { OrderDetail } from './OrderDetail';
export { StatsView } from './StatsView';
export { MarketingManage } from './MarketingManage';
export { MarketingForm } from './MarketingForm';
export { ReviewManage } from './ReviewManage';
export { MessageCenter } from './MessageCenter';
export { SettingsView } from './SettingsView';

// 导出 UI 组件
export { Toast, useToast, Loading, EmptyState, ConfirmDialog } from './ui';

// 导出 UI 组件类型
export type { ToastProps, ToastMessage, ToastType } from './ui';
export type { LoadingProps } from './ui';
export type { EmptyStateProps } from './ui';
export type { ConfirmDialogProps } from './ui';

// 导出 Props 类型（统一定义）
export interface SellerHomeProps {
  onNavigate?: (screen: string, params?: Record<string, unknown>) => void;
}

export interface ShopManageProps {
  onSave?: () => void;
}

export interface ProductListProps {
  onEdit?: (productId: string) => void;
  onAdd?: () => void;
}

export interface ProductFormProps {
  productId?: string;
  onSave?: () => void;
  onCancel?: () => void;
}

export interface ProductFormData {
  name: string;
  desc: string;
  price: number;
  originalPrice?: number;
  categoryId: string;
  stock: number;
  image?: string;
  skus: any[];
  status: 'on' | 'off';
}

export interface OrderListProps {
  onViewDetail?: (orderId: string) => void;
  initialFilter?: string;
}

export interface OrderDetailProps {
  orderId: string;
  onBack?: () => void;
}

export interface StatsViewProps {
  onBack?: () => void;
}

export interface MarketingManageProps {
  onBack?: () => void;
}
