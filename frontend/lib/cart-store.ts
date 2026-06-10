"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  CartItem,
  Exhibition,
  LiveChatMessage,
  LiveSession,
  Order,
  Product,
  Stall,
  User,
  UserRole,
  Vendor
} from "@/lib/types";

type LoginResult = { ok: true; user: User } | { ok: false; error: string };

type ProductInput = {
  title: string;
  description: string;
  price: number;
  compareAtPrice: number;
  stock: number;
  image?: string;
};

type ExhibitionInput = {
  title: string;
  description: string;
  status: Exhibition["status"];
};

type StallInput = {
  name: string;
  category: string;
  vendorId: string;
  mapX: number;
  mapY: number;
  isFeatured: boolean;
};

const emptyLiveSession: LiveSession = {
  id: "",
  exhibitionId: "",
  stallId: "",
  vendorId: "",
  livekitRoomName: "",
  status: "ended",
  pinnedProductId: null,
  viewerCount: 0,
  likesCount: 0,
  followCount: 0
};

type ExpoStore = {
  users: User[];
  credentials: Record<string, string>;
  exhibitions: Exhibition[];
  vendors: Vendor[];
  stalls: Stall[];
  currentUser: User | null;
  selectedAvatarId: string | null;
  cart: CartItem[];
  isCartOpen: boolean;
  lastOrder: Order | null;
  orders: Order[];
  products: Product[];
  liveSession: LiveSession;
  chatMessages: LiveChatMessage[];
  authToken: string | null;
  currentVendor: Vendor | null;
  setCurrentUser: (user: User | null, token?: string | null, vendor?: Vendor | null) => void;
  login: (email: string, password: string) => LoginResult;
  register: (payload: { name: string; email: string; password: string; role: UserRole }) => LoginResult;
  logout: () => void;
  createExhibition: (input: ExhibitionInput) => Exhibition;
  updateExhibitionStatus: (exhibitionId: string, status: Exhibition["status"]) => void;
  updateVendorStatus: (vendorId: string, status: Vendor["status"]) => void;
  createOrUpdateStall: (input: StallInput) => Stall;
  setSelectedAvatarId: (avatarId: string) => void;
  addToCart: (item: CartItem) => void;
  setCartItems: (items: CartItem[]) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  openCart: () => void;
  closeCart: () => void;
  clearCart: () => void;
  createLocalOrder: (paymentMethod: string) => Order;
  setLastOrder: (order: Order) => void;
  startLive: () => void;
  endLive: () => void;
  pinProduct: (productId: string) => void;
  syncLiveSession: (payload: { status?: LiveSession["status"]; pinnedProductId?: string; viewerCount?: number }) => void;
  setChatMessages: (messages: LiveChatMessage[]) => void;
  mergeChatMessages: (messages: LiveChatMessage[]) => void;
  sendChatMessage: (message: string, senderOverride?: Pick<User, "id" | "name" | "role">) => void;
  addVendorProduct: (input: ProductInput) => Product;
  updateVendorProductStatus: (productId: string, status: Product["status"]) => void;
  deleteVendorProduct: (productId: string) => void;
  updateOrderStatus: (orderId: string, status: Order["orderStatus"]) => void;
};

function mergeMessages(existing: LiveChatMessage[], incoming: LiveChatMessage[]) {
  const byId = new Map<string, LiveChatMessage>();
  [...existing, ...incoming].forEach((message) => {
    byId.set(message.id, message);
  });
  return Array.from(byId.values()).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export const useExpoStore = create<ExpoStore>()(
  persist(
    (set, get) => ({
      users: [],
      credentials: {},
      exhibitions: [],
      vendors: [],
      stalls: [],
      currentUser: null,
      selectedAvatarId: null,
      cart: [],
      isCartOpen: false,
      lastOrder: null,
      orders: [],
      products: [],
      liveSession: emptyLiveSession,
      chatMessages: [],
      authToken: null,
      currentVendor: null,
  setCurrentUser: (user, token = null, vendor = null) => set({ currentUser: user, authToken: token, currentVendor: vendor, selectedAvatarId: user?.avatar ?? null }),
      login: () => ({ ok: false, error: "Use backend login API." }),
      register: () => ({ ok: false, error: "Use backend registration API." }),
      logout: () => set({ currentUser: null, authToken: null, currentVendor: null, cart: [], isCartOpen: false }),
      createExhibition: (input) => {
        void input;
        throw new Error("Use backend admin exhibition API.");
      },
      updateExhibitionStatus: (exhibitionId, status) =>
        set((state) => ({
          exhibitions: state.exhibitions.map((exhibition) =>
            exhibition.id === exhibitionId ? { ...exhibition, status } : exhibition
          )
        })),
      updateVendorStatus: (vendorId, status) =>
        set((state) => ({
          vendors: state.vendors.map((vendor) => (vendor.id === vendorId ? { ...vendor, status } : vendor))
        })),
      createOrUpdateStall: (input) => {
        void input;
        throw new Error("Use backend admin stall API.");
      },
      setSelectedAvatarId: (avatarId) => set((state) => ({
        selectedAvatarId: avatarId,
        currentUser: state.currentUser ? { ...state.currentUser, avatar: avatarId } : state.currentUser
      })),
      addToCart: (item) =>
        set((state) => {
          const existing = state.cart.find((entry) => entry.id === item.id);
          if (existing) {
            return {
              cart: state.cart.map((entry) =>
                entry.id === item.id ? { ...entry, quantity: entry.quantity + item.quantity } : entry
              ),
              isCartOpen: true
            };
          }
          return { cart: [...state.cart, item], isCartOpen: true };
        }),
      setCartItems: (items) => set({ cart: items }),
      updateQuantity: (productId, quantity) =>
        set((state) => ({
          cart: state.cart.map((item) => (item.id === productId ? { ...item, quantity: Math.max(1, quantity) } : item))
        })),
      removeFromCart: (productId) =>
        set((state) => ({ cart: state.cart.filter((item) => item.id !== productId) })),
      openCart: () => set({ isCartOpen: true }),
      closeCart: () => set({ isCartOpen: false }),
      clearCart: () => set({ cart: [], isCartOpen: false }),
      createLocalOrder: (paymentMethod) => {
        void paymentMethod;
        throw new Error("Use backend checkout API.");
      },
      setLastOrder: (order) =>
        set((state) => ({
          lastOrder: order,
          orders: state.orders.some((entry) => entry.id === order.id) ? state.orders : [order, ...state.orders]
        })),
      startLive: () =>
        set((state) => ({ liveSession: { ...state.liveSession, status: "live" } })),
      endLive: () => set((state) => ({ liveSession: { ...state.liveSession, status: "ended" } })),
      pinProduct: (productId) => set((state) => ({ liveSession: { ...state.liveSession, pinnedProductId: productId } })),
      syncLiveSession: (payload) =>
        set((state) => ({
          liveSession: {
            ...state.liveSession,
            status: payload.status ?? state.liveSession.status,
            pinnedProductId: payload.pinnedProductId ?? state.liveSession.pinnedProductId,
            viewerCount: payload.viewerCount ?? state.liveSession.viewerCount
          }
        })),
      setChatMessages: (messages) => set({ chatMessages: mergeMessages([], messages) }),
      mergeChatMessages: (messages) => set((state) => ({ chatMessages: mergeMessages(state.chatMessages, messages) })),
      sendChatMessage: (message, senderOverride) => {
        void message;
        void senderOverride;
        throw new Error("Use backend live chat API.");
      },
      addVendorProduct: (input) => {
        void input;
        throw new Error("Use backend vendor product API.");
      },
      updateVendorProductStatus: (productId, status) =>
        set((state) => ({
          products: state.products.map((product) => (product.id === productId ? { ...product, status } : product))
        })),
      deleteVendorProduct: (productId) =>
        set((state) => {
          const remainingProducts = state.products.filter((product) => product.id !== productId);
          return {
            products: remainingProducts,
            liveSession:
              state.liveSession.pinnedProductId === productId && remainingProducts[0]
                ? { ...state.liveSession, pinnedProductId: remainingProducts[0].id }
                : state.liveSession
          };
        }),
      updateOrderStatus: (orderId, status) =>
        set((state) => ({
          orders: state.orders.map((order) => (order.id === orderId ? { ...order, orderStatus: status } : order)),
          lastOrder: state.lastOrder?.id === orderId ? { ...state.lastOrder, orderStatus: status } : state.lastOrder
        }))
    }),
    {
      name: "ankita-expoverse-store",
      version: 3
    }
  )
);
