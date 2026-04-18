import React from 'react';
import { motion } from 'motion/react';
import { X, MapPin, User, Phone } from 'lucide-react';
import type { DeliveryAddress } from '../types';

export interface AddressFormPayload {
  name: string;
  phone: string;
  detail: string;
  isDefault: boolean;
}

export interface TakeoutAddressFormProps {
  initialData?: DeliveryAddress | null;
  onSubmit: (data: AddressFormPayload) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const validatePhone = (phone: string): boolean => {
  return /^1[3-9]\d{9}$/.test(phone);
};

export const TakeoutAddressForm: React.FC<TakeoutAddressFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = React.useState<AddressFormPayload>({
    name: initialData?.name || '',
    phone: initialData?.phone || '',
    detail: initialData?.detail || '',
    isDefault: initialData?.isDefault || false,
  });

  const [errors, setErrors] = React.useState<Partial<Record<keyof AddressFormPayload, string>>>({});

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof AddressFormPayload, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = '请输入收货人姓名';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = '姓名至少 2 个字';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = '请输入手机号';
    } else if (!validatePhone(formData.phone.trim())) {
      newErrors.phone = '请输入正确的手机号';
    }

    if (!formData.detail.trim()) {
      newErrors.detail = '请输入详细地址';
    } else if (formData.detail.trim().length < 5) {
      newErrors.detail = '地址太短，请详细填写';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({
      ...formData,
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      detail: formData.detail.trim(),
    });
  };

  const inputClass = (fieldName: keyof AddressFormPayload) =>
    `w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors ${
      errors[fieldName]
        ? 'border-red-300 bg-red-50 focus:border-red-400'
        : 'border-gray-200 bg-white focus:border-orange-400'
    }`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h3 className="text-base font-semibold text-gray-800">
            {initialData ? '编辑地址' : '新增地址'}
          </h3>
          <button
            type="button"
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            onClick={onCancel}
            disabled={isLoading}
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-4 py-4">
          {/* 收货人 */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-700">
              <User size={14} />
              收货人
            </label>
            <input
              type="text"
              className={inputClass('name')}
              placeholder="请输入收货人姓名"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              disabled={isLoading}
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* 手机号 */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-700">
              <Phone size={14} />
              手机号
            </label>
            <input
              type="tel"
              className={inputClass('phone')}
              placeholder="请输入 11 位手机号"
              value={formData.phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
              disabled={isLoading}
            />
            {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
          </div>

          {/* 详细地址 */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-700">
              <MapPin size={14} />
              详细地址
            </label>
            <textarea
              className={`${inputClass('detail')} min-h-[80px] resize-none`}
              placeholder="请输入街道、小区、楼号等详细信息"
              value={formData.detail}
              onChange={(e) => setFormData((prev) => ({ ...prev, detail: e.target.value }))}
              disabled={isLoading}
            />
            {errors.detail && <p className="mt-1 text-xs text-red-500">{errors.detail}</p>}
          </div>

          {/* 设为默认 */}
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
              checked={formData.isDefault}
              onChange={(e) => setFormData((prev) => ({ ...prev, isDefault: e.target.checked }))}
              disabled={isLoading}
            />
            <span className="text-xs text-gray-600">设为默认地址</span>
          </label>
        </div>

        <div className="flex gap-2 border-t border-gray-100 px-4 py-3">
          <button
            type="button"
            className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-700 active:bg-gray-50"
            onClick={onCancel}
            disabled={isLoading}
          >
            取消
          </button>
          <button
            type="button"
            className="flex-1 rounded-xl bg-gray-900 py-2.5 text-sm font-medium text-white active:bg-gray-800 disabled:opacity-50"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? '保存中...' : '保存'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
