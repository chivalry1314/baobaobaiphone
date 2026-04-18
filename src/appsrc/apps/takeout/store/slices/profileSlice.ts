import type { StoreApi } from 'zustand';
import type { DeliveryAddress } from '../../types';
import type { CreateAddressPayload, TakeoutStore, UpdateAddressPayload } from '../types';

type TakeoutSetState = StoreApi<TakeoutStore>['setState'];
type TakeoutGetState = StoreApi<TakeoutStore>['getState'];

const generateAddressId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `address-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;
};

const normalizeAddress = (payload: CreateAddressPayload): DeliveryAddress => ({
  id: generateAddressId(),
  name: payload.name.trim(),
  phone: payload.phone.trim(),
  detail: payload.detail.trim(),
  lat: payload.lat,
  lng: payload.lng,
  isDefault: Boolean(payload.isDefault),
});

const updateAddressWithDefaultConstraint = (
  addresses: DeliveryAddress[],
  nextDefaultId: string
): DeliveryAddress[] => {
  return addresses.map((address) => ({
    ...address,
    isDefault: address.id === nextDefaultId,
  }));
};

const ensureAtLeastOneDefaultAddress = (addresses: DeliveryAddress[]): DeliveryAddress[] => {
  if (addresses.length === 0) return addresses;
  if (addresses.some((address) => address.isDefault)) return addresses;

  const [first, ...rest] = addresses;
  if (!first) return [];

  return [{ ...first, isDefault: true }, ...rest];
};

export const createTakeoutProfileSlice = (
  set: TakeoutSetState,
  get: TakeoutGetState
): Pick<
  TakeoutStore,
  | 'addAddress'
  | 'updateAddress'
  | 'removeAddress'
  | 'setDefaultAddress'
  | 'setSelectedAddress'
  | 'setCoupons'
  | 'updateProfile'
> => ({
  addAddress: (payload) => {
    const normalized = normalizeAddress(payload);

    set((state) => {
      const cleared = normalized.isDefault
        ? state.addresses.map((address) => ({ ...address, isDefault: false }))
        : state.addresses;
      const next = ensureAtLeastOneDefaultAddress([...cleared, normalized]);
      const defaultAddress = next.find((address) => address.isDefault) || next[0] || null;

      return {
        addresses: next,
        selectedAddressId: defaultAddress ? defaultAddress.id : null,
      };
    });
  },

  updateAddress: (id, payload) => {
    set((state) => {
      const nextAddresses = state.addresses.map((address) => {
        if (address.id !== id) return address;

        return {
          ...address,
          ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
          ...(payload.phone !== undefined ? { phone: payload.phone.trim() } : {}),
          ...(payload.detail !== undefined ? { detail: payload.detail.trim() } : {}),
          ...(payload.lat !== undefined ? { lat: payload.lat } : {}),
          ...(payload.lng !== undefined ? { lng: payload.lng } : {}),
          ...(payload.isDefault !== undefined ? { isDefault: Boolean(payload.isDefault) } : {}),
        };
      });

      const defaultCandidate = nextAddresses.find((address) => address.isDefault);
      const withDefault = defaultCandidate
        ? updateAddressWithDefaultConstraint(nextAddresses, defaultCandidate.id)
        : ensureAtLeastOneDefaultAddress(nextAddresses);

      return {
        addresses: withDefault,
      };
    });
  },

  removeAddress: (id) => {
    set((state) => {
      const next = ensureAtLeastOneDefaultAddress(state.addresses.filter((address) => address.id !== id));
      const selectedAddressStillExists = next.some((address) => address.id === state.selectedAddressId);
      const defaultAddress = next.find((address) => address.isDefault) || next[0] || null;

      return {
        addresses: next,
        selectedAddressId:
          selectedAddressStillExists && state.selectedAddressId
            ? state.selectedAddressId
            : defaultAddress
            ? defaultAddress.id
            : null,
      };
    });
  },

  setDefaultAddress: (id) => {
    set((state) => {
      const found = state.addresses.find((address) => address.id === id);
      if (!found) return {};

      return {
        addresses: updateAddressWithDefaultConstraint(state.addresses, id),
        selectedAddressId: id,
      };
    });
  },

  setSelectedAddress: (id) => {
    if (!id) {
      const defaultAddress = get().addresses.find((address) => address.isDefault) || get().addresses[0] || null;
      set({ selectedAddressId: defaultAddress ? defaultAddress.id : null });
      return;
    }

    const found = get().addresses.some((address) => address.id === id);
    if (!found) return;

    set({ selectedAddressId: id });
  },

  setCoupons: (next) => {
    set((state) => ({
      coupons: typeof next === 'function' ? next(state.coupons) : next,
    }));
  },

  updateProfile: (payload) => {
    set((state) => ({
      profile: {
        ...state.profile,
        ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
        ...(payload.avatar !== undefined ? { avatar: payload.avatar.trim() } : {}),
        ...(payload.membershipLevel !== undefined ? { membershipLevel: payload.membershipLevel } : {}),
      },
    }));
  },
});
