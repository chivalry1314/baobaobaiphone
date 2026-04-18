import type { StoreApi } from 'zustand';
import type { DeliveryCartLine, DeliveryCartLineSelectedOption, DeliveryDish } from '../../types';
import type { TakeoutStore } from '../types';

type TakeoutSetState = StoreApi<TakeoutStore>['setState'];
type TakeoutGetState = StoreApi<TakeoutStore>['getState'];

const normalizeSelectedOptions = (
  options: DeliveryCartLineSelectedOption[] | undefined
): DeliveryCartLineSelectedOption[] => {
  if (!Array.isArray(options) || options.length === 0) return [];
  return options.map((option) => ({
    skuId: option.skuId,
    optionId: option.optionId,
    optionName: option.optionName,
    priceDelta: Number.isFinite(option.priceDelta) ? option.priceDelta : 0,
  }));
};

const composeLineId = (dishId: string, selectedOptions: DeliveryCartLineSelectedOption[]): string => {
  if (selectedOptions.length === 0) return `line-${dishId}`;
  const optionPart = selectedOptions
    .map((option) => `${option.skuId}:${option.optionId}`)
    .sort()
    .join('|');
  return `line-${dishId}-${optionPart}`;
};

const calculateUnitPrice = (dish: DeliveryDish, selectedOptions: DeliveryCartLineSelectedOption[]): number => {
  const optionTotal = selectedOptions.reduce((sum, item) => sum + item.priceDelta, 0);
  return Number((dish.price + optionTotal).toFixed(2));
};

const appendOrIncreaseCartLine = (
  cartLines: DeliveryCartLine[],
  dish: DeliveryDish,
  selectedOptions: DeliveryCartLineSelectedOption[]
): DeliveryCartLine[] => {
  const lineId = composeLineId(dish.id, selectedOptions);
  const found = cartLines.find((line) => line.id === lineId);
  if (!found) {
    return [
      ...cartLines,
      {
        id: lineId,
        merchantId: dish.merchantId,
        dishId: dish.id,
        dishName: dish.name,
        unitPrice: calculateUnitPrice(dish, selectedOptions),
        qty: 1,
        selectedOptions,
      },
    ];
  }

  return cartLines.map((line) =>
    line.id === lineId
      ? {
          ...line,
          qty: line.qty + 1,
        }
      : line
  );
};

export const createTakeoutCartSlice = (
  set: TakeoutSetState,
  get: TakeoutGetState
): Pick<
  TakeoutStore,
  | 'addDishToCart'
  | 'increaseCartLine'
  | 'decreaseCartLine'
  | 'removeCartLine'
  | 'clearCart'
  | 'clearMerchantCart'
> => ({
  addDishToCart: (dishId, selectedOptions) => {
    const dish = get().dishes.find((item) => item.id === dishId && item.status === 'on' && item.stock > 0);
    if (!dish) {
      set({ error: '商品不存在或已售罄。' });
      return;
    }

    const normalizedOptions = normalizeSelectedOptions(selectedOptions);
    set((state) => ({
      cartLines: appendOrIncreaseCartLine(state.cartLines, dish, normalizedOptions),
      activeMerchantId: dish.merchantId,
      error: null,
    }));
  },

  increaseCartLine: (lineId) => {
    set((state) => ({
      cartLines: state.cartLines.map((line) =>
        line.id === lineId
          ? {
              ...line,
              qty: line.qty + 1,
            }
          : line
      ),
    }));
  },

  decreaseCartLine: (lineId) => {
    set((state) => ({
      cartLines: state.cartLines
        .map((line) =>
          line.id === lineId
            ? {
                ...line,
                qty: Math.max(0, line.qty - 1),
              }
            : line
        )
        .filter((line) => line.qty > 0),
    }));
  },

  removeCartLine: (lineId) => {
    set((state) => ({
      cartLines: state.cartLines.filter((line) => line.id !== lineId),
    }));
  },

  clearCart: () => {
    set({ cartLines: [] });
  },

  clearMerchantCart: (merchantId) => {
    set((state) => ({
      cartLines: state.cartLines.filter((line) => line.merchantId !== merchantId),
    }));
  },
});
