import { create } from "zustand";
import type { Product } from "@shared/schema";

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  addItem: (product: Product) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  setOpen: (open: boolean) => void;
  getTotal: () => number;
  getCount: () => number;
}

export const useCart = create<CartStore>((set, get) => ({
  items: [],
  isOpen: false,
  addItem: (product) => {
    set((state) => {
      const existing = state.items.find((i) => i.product.id === product.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
          isOpen: true,
        };
      }
      return { items: [...state.items, { product, quantity: 1 }], isOpen: true };
    });
  },
  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((i) => i.product.id !== productId),
    }));
  },
  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.product.id === productId ? { ...i, quantity } : i
      ),
    }));
  },
  clearCart: () => set({ items: [] }),
  setOpen: (open) => set({ isOpen: open }),
  getTotal: () => get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
  getCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));
