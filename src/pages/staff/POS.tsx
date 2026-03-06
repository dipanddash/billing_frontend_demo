import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Instagram, ShoppingCart, Tag } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const BASE_URL = "https://demo-j5fde.ondigitalocean.app";
const HOLD_CART_KEY = "staff_pos_hold_cart_v1";

/* ================= TYPES ================= */

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  price: string;
  category_name: string;
  image: string;
  gst_percent: number;
  is_available?: boolean;
  availability_reason?: string | null;
}

interface ComboItem {
  id: string;
  combo: string;
  product: string;
  product_name: string;
  quantity: number;
}

interface Combo {
  id: string;
  name: string;
  price: string;
  gst_percent: number;
  image: string;
  is_active: boolean;
  items: ComboItem[];
  is_available?: boolean;
  availability_reason?: string | null;
}

interface Addon {
  id: string;
  name: string;
  price: number;
  image?: string;
}

interface SelectedAddon {
  id: string;
  name: string;
  price: number;
  qty: number;
}

interface CartItem {
  key: string;
  type: "product" | "combo";
  id: string;
  name: string;
  price: number;
  basePrice?: number;
  qty: number;
  image?: string;
  gst_percent: number;
  comboItems?: ComboItem[];
  selectedAddons?: SelectedAddon[];
}

interface OrderDetails {
  id: string;
  order_type: string;
  customer_name: string;
  phone?: string;
  customer_phone?: string;
  table_number?: string;
  token_number?: string;
  session?: string;
}

interface PendingSelection {
  type: "product" | "combo";
  product?: Product;
  combo?: Combo;
  selectedAddons?: SelectedAddon[];
  mode?: "add" | "edit";
  editingCartKey?: string;
}

interface InvoiceLineItem {
  name: string;
  quantity: number;
  base_price: number;
  line_total: number;
  addons?: InvoiceLineItemAddon[];
}

interface InvoiceLineItemAddon {
  name: string;
  quantity_per_item?: number;
  quantity_total?: number;
  unit_price?: number;
  line_total?: number;
}

interface InvoiceCouponDetails {
  code?: string;
  discount_type?: "AMOUNT" | "PERCENT" | string;
  value?: number | string;
  discount_amount?: number | string;
}

interface InvoiceData {
  bill_number: string;
  date: string;
  customer_name: string;
  staff?: string;
  subtotal: number | string;
  total_gst: number | string;
  discount: number | string;
  manual_discount?: number | string;
  coupon_discount?: number | string;
  discount_type?: string;
  coupon_details?: InvoiceCouponDetails | null;
  discount_breakdown?: {
    manual_discount?: number | string;
    coupon_discount?: number | string;
    total_discount?: number | string;
  };
  final_amount: number | string;
  line_items?: InvoiceLineItem[];
  items?: InvoiceLineItem[];
}

interface AppliedCoupon {
  id: number;
  code: string;
  discount_type: "AMOUNT" | "PERCENT";
  value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
}

/* ================= COMPONENT ================= */

export default function SalesTransactionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order");
  const quickStartOrderType = (searchParams.get("new_order") || "").toUpperCase();
  const sessionIdParam = searchParams.get("session");
  const tableNumberParam = searchParams.get("table_number");
  const tokenNumberParam = searchParams.get("token_number");
  const customerNameParam = searchParams.get("customer_name");
  const token = localStorage.getItem("access");

  /* ================= STATE ================= */

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [expandedAddonRows, setExpandedAddonRows] = useState<Record<string, boolean>>({});
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [runtimeOrderId, setRuntimeOrderId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [creatingTakeaway, setCreatingTakeaway] = useState(false);
  const [posNotice, setPosNotice] = useState("");
  const [showTakeawayModal, setShowTakeawayModal] = useState(false);
  const [takeawayCustomerName, setTakeawayCustomerName] = useState("");
  const [takeawayPhone, setTakeawayPhone] = useState("");
  const [takeawayError, setTakeawayError] = useState("");
  const [hasHeldCart, setHasHeldCart] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null);
  const [pendingQty, setPendingQty] = useState("1");
  const [pendingQtyError, setPendingQtyError] = useState("");
  const [pendingAddonSearch, setPendingAddonSearch] = useState("");
  const [showAllAddonsModal, setShowAllAddonsModal] = useState(false);
  const [pendingAddonEditorId, setPendingAddonEditorId] = useState<string | null>(null);
  const [pendingAddonEditorQty, setPendingAddonEditorQty] = useState("1");
  const [pendingAddonEditorError, setPendingAddonEditorError] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "UPI">("CASH");
  const [paymentReference, setPaymentReference] = useState("");
  const [cashGiven, setCashGiven] = useState("");
  const [discountPercentInput, setDiscountPercentInput] = useState("");
  const [discountAmountInput, setDiscountAmountInput] = useState("");
  const [discountMode, setDiscountMode] = useState<"percent" | "amount">("amount");
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [paying, setPaying] = useState(false);
  const [markingPending, setMarkingPending] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    const activeKeys = new Set(cart.map((item) => item.key));
    setExpandedAddonRows((prev) => {
      const next: Record<string, boolean> = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (activeKeys.has(key)) next[key] = value;
      });
      return next;
    });
  }, [cart]);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchDropdownRef = useRef<HTMLDivElement | null>(null);
  const pendingQtyInputRef = useRef<HTMLInputElement | null>(null);
  const queryOrderContext = useMemo<OrderDetails | null>(() => {
    if (!tableNumberParam && !tokenNumberParam && !customerNameParam) return null;
    return {
      id: "",
      order_type: "DINE_IN",
      customer_name: customerNameParam ?? "",
      table_number: tableNumberParam ?? "",
      token_number: tokenNumberParam ?? "",
      session: sessionIdParam ?? "",
    };
  }, [customerNameParam, sessionIdParam, tableNumberParam, tokenNumberParam]);
  const effectiveOrderId = runtimeOrderId ?? orderId;
  const hasBillingContext = Boolean(effectiveOrderId || queryOrderContext);
  const isDineInContext = (orderDetails?.order_type ?? queryOrderContext?.order_type) === "DINE_IN";

  const openNewPosBilling = () => {
    window.open("/staff/pos", "_blank", "noopener,noreferrer");
  };

  const isEditableTarget = (target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    if (!el) return false;
    const tag = el.tagName?.toLowerCase();
    return tag === "input" || tag === "textarea" || el.isContentEditable;
  };

  const getContextError = () =>
    "Select Dine In or Take Away first. Products are locked until billing starts.";

  const getApiErrorMessage = (err: unknown, fallback: string): string => {
    if (Array.isArray(err)) {
      return err.length > 0 ? String(err[0]) : fallback;
    }
    if (err && typeof err === "object") {
      const obj = err as Record<string, unknown>;
      const detail = obj["detail"];
      if (Array.isArray(detail) && detail.length > 0) return String(detail[0]);
      return String(obj["detail"] ?? obj["error"] ?? obj["message"] ?? obj["raw"] ?? fallback);
    }
    return fallback;
  };

  const getCreatedOrderId = (value: unknown): string => {
    if (!value || typeof value !== "object") return "";
    const obj = value as Record<string, unknown>;
    const nestedOrder = obj["order"];
    const nestedOrderId =
      nestedOrder && typeof nestedOrder === "object"
        ? (nestedOrder as Record<string, unknown>)["id"]
        : undefined;
    return String(obj["id"] ?? obj["order_id"] ?? nestedOrderId ?? "");
  };

  const startTakeawayFromPos = async () => {
    if (!token || creatingTakeaway) return;
    const customerName = takeawayCustomerName.trim();
    const customerPhoneRaw = takeawayPhone.trim();
    const customerPhoneDigits = takeawayPhone.replace(/\D/g, "").trim();
    if (!customerName) {
      setTakeawayError("Enter customer name.");
      return;
    }
    if (!customerPhoneRaw) {
      setTakeawayError("Enter mobile number.");
      return;
    }
    if (customerPhoneDigits.length < 10) {
      setTakeawayError("Enter a valid mobile number.");
      return;
    }
    try {
      setCreatingTakeaway(true);
      setTakeawayError("");
      const payloadVariants = [
        { order_type: "TAKEAWAY", customer_name: customerName, customer_phone: customerPhoneRaw },
        { order_type: "TAKEAWAY", customer_name: customerName, customer_phone: customerPhoneDigits },
        { order_type: "TAKE_AWAY", customer_name: customerName, customer_phone: customerPhoneRaw },
        { order_type: "TAKE_AWAY", customer_name: customerName, customer_phone: customerPhoneDigits },
        { order_type: "TAKEAWAY", customer_name: customerName, phone: customerPhoneRaw },
        { order_type: "TAKEAWAY", customer_name: customerName, phone: customerPhoneDigits },
      ];

      let lastError = "Unable to create takeaway order.";
      let data: Record<string, unknown> | null = null;
      for (const payload of payloadVariants) {
        const res = await fetch(`${BASE_URL}/api/orders/create/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          data = await res.json();
          break;
        }

        const err: unknown = await res.json().catch(() => ({}));
        lastError = getApiErrorMessage(err, `Take Away failed (HTTP ${res.status}).`);
      }

      if (!data) throw new Error(lastError);
      const createdId = getCreatedOrderId(data);
      if (!createdId) throw new Error("Takeaway order created but id missing.");
      setRuntimeOrderId(createdId);
      setPosNotice("");
      setShowTakeawayModal(false);
      setTakeawayCustomerName("");
      setTakeawayPhone("");
      setTakeawayError("");
      navigate(`/staff/pos?order=${encodeURIComponent(createdId)}`, { replace: true });
    } catch (error) {
      console.error(error);
      setTakeawayError(error instanceof Error ? error.message : "Could not start Take Away billing.");
    } finally {
      setCreatingTakeaway(false);
    }
  };

  const startPartnerOrderFromPos = async (partner: "SWIGGY" | "ZOMATO") => {
    if (!token || creatingTakeaway) return;
    try {
      setCreatingTakeaway(true);
      setPosNotice("");
      const payloadVariants = [
        { order_type: partner, customer_name: partner },
        { order_type: partner, customer_name: partner, customer_phone: "" },
        { order_type: "TAKEAWAY", customer_name: partner },
      ];

      let data: Record<string, unknown> | null = null;
      let lastError = `Unable to start ${partner} order.`;
      for (const payload of payloadVariants) {
        const res = await fetch(`${BASE_URL}/api/orders/create/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          data = await res.json();
          break;
        }

        const err: unknown = await res.json().catch(() => ({}));
        lastError = getApiErrorMessage(err, `${partner} failed (HTTP ${res.status}).`);
      }

      if (!data) throw new Error(lastError);
      const createdId = getCreatedOrderId(data);
      if (!createdId) throw new Error(`${partner} order created but id missing.`);

      setRuntimeOrderId(createdId);
      navigate(`/staff/pos?order=${encodeURIComponent(createdId)}`, { replace: true });
    } catch (error) {
      console.error(error);
      setPosNotice(error instanceof Error ? error.message : `Could not start ${partner} order.`);
    } finally {
      setCreatingTakeaway(false);
    }
  };

  /* ================= LOAD PRODUCTS ================= */

  useEffect(() => {
    if (!token) return;

    fetch(`${BASE_URL}/api/products/categories/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setCategories([{ id: "all", name: "All" }, ...d]));

    fetch(`${BASE_URL}/api/products/products/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        const mapped: Product[] = list.map((product: Record<string, unknown>) => ({
          id: String(product.id ?? ""),
          name: String(product.name ?? ""),
          price: String(product.price ?? "0"),
          category_name: String(product.category_name ?? ""),
          image: String(product.image_url ?? product.image ?? ""),
          gst_percent: Number(product.gst_percent ?? 0),
          is_available: Boolean(product.is_available ?? true),
          availability_reason: product.availability_reason ? String(product.availability_reason) : null,
        }));
        setProducts(mapped);
      });

    fetch(`${BASE_URL}/api/products/combos/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        const mapped: Combo[] = list.map((combo: Record<string, unknown>) => ({
          id: String(combo.id ?? ""),
          name: String(combo.name ?? ""),
          price: String(combo.price ?? "0"),
          gst_percent: Number(combo.gst_percent ?? 0),
          image: String(combo.image_url ?? combo.image ?? ""),
          is_active: Boolean(combo.is_active),
          is_available: Boolean(combo.is_available ?? true),
          availability_reason: combo.availability_reason ? String(combo.availability_reason) : null,
          items: Array.isArray(combo.items)
            ? combo.items.map((item: Record<string, unknown>) => ({
                id: String(item.id ?? ""),
                combo: String(item.combo ?? combo.id ?? ""),
                product: String(item.product ?? ""),
                product_name: String(item.product_name ?? ""),
                quantity: Number(item.quantity ?? 0),
              }))
            : [],
        }));
        setCombos(mapped);
      });

    fetch(`${BASE_URL}/api/products/addons/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        const mapped: Addon[] = list.map((addon: Record<string, unknown>) => ({
          id: String(addon.id ?? ""),
          name: String(addon.name ?? ""),
          price: Number(addon.price ?? 0),
          image: String(addon.image_url ?? addon.image ?? ""),
        }));
        setAddons(mapped);
      });
  }, [token]);

  useEffect(() => {
    setHasHeldCart(Boolean(sessionStorage.getItem(HOLD_CART_KEY)));
  }, []);

  useEffect(() => {
    if (!quickStartOrderType || !token) return;
    if (quickStartOrderType === "TAKEAWAY") {
      setPosNotice("");
      setTakeawayError("");
      setShowTakeawayModal(true);
      navigate("/staff/pos", { replace: true });
      return;
    }
    if (quickStartOrderType === "SWIGGY" || quickStartOrderType === "ZOMATO") {
      void startPartnerOrderFromPos(quickStartOrderType as "SWIGGY" | "ZOMATO");
      navigate("/staff/pos", { replace: true });
    }
  }, [quickStartOrderType, token]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ================= LOAD ORDER DETAILS ================= */

  useEffect(() => {
    if (!effectiveOrderId || !token) return;

    fetch(`${BASE_URL}/api/orders/${effectiveOrderId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        console.log("ORDER DETAILS:", data);
        setOrderDetails(data);
      })
      .catch(err => console.error(err));
  }, [effectiveOrderId, token]);

  /* ================= FILTER ================= */

  const filteredProducts = products.filter(p =>
    (activeCategory === "All" || p.category_name === activeCategory) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const searchSuggestions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return products
      .filter((p) => p.name.toLowerCase().includes(term))
      .slice(0, 8);
  }, [products, search]);

  const showSearchDropdown = isSearchFocused && searchSuggestions.length > 0;

  const filteredCombos = combos.filter((c) =>
    activeCategory === "Combo" && c.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPendingAddons = useMemo(() => {
    const term = pendingAddonSearch.trim().toLowerCase();
    if (!term) return addons;
    return addons.filter((addon) => addon.name.toLowerCase().includes(term));
  }, [addons, pendingAddonSearch]);
  const previewPendingAddons = useMemo(() => filteredPendingAddons.slice(0, 4), [filteredPendingAddons]);

  const pendingSelectedAddons = useMemo(
    () => (pendingSelection?.type === "product" ? pendingSelection.selectedAddons ?? [] : []),
    [pendingSelection]
  );

  const pendingAddonUnitTotal = useMemo(
    () => pendingSelectedAddons.reduce((sum, addon) => sum + addon.price * addon.qty, 0),
    [pendingSelectedAddons]
  );

  const pendingProductUnitPrice = useMemo(() => {
    if (pendingSelection?.type !== "product" || !pendingSelection.product) return 0;
    return Number(pendingSelection.product.price || 0) + pendingAddonUnitTotal;
  }, [pendingAddonUnitTotal, pendingSelection]);
  const isEditingPendingSelection = pendingSelection?.mode === "edit";

  /* ================= CART ================= */

  const buildProductCartItem = (p: Product, qty = 1, selectedAddonRows: SelectedAddon[] = []) => {
    const selectedAddons = selectedAddonRows
      .filter((addon) => addon.qty > 0)
      .map((addon) => ({
        ...addon,
        qty: Math.max(1, Math.floor(addon.qty)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const addonKey = selectedAddons.map((addon) => `${addon.id}:${addon.qty}`).join(",");
    const unitAddonPrice = selectedAddons.reduce((sum, addon) => sum + addon.price * addon.qty, 0);
    const unitPrice = parseFloat(p.price) + unitAddonPrice;
    return {
      key: `product:${p.id}:${addonKey}`,
      type: "product" as const,
      id: p.id,
      name: p.name,
      price: unitPrice,
      basePrice: parseFloat(p.price),
      qty,
      image: p.image,
      gst_percent: Number(p.gst_percent || 0),
      selectedAddons,
    };
  };

  const addToCart = (p: Product, qty = 1, selectedAddonRows: SelectedAddon[] = []) => {
    if (!hasBillingContext) {
      setPosNotice(getContextError());
      return;
    }
    const nextItem = buildProductCartItem(p, qty, selectedAddonRows);
    setCart(prev => {
      const ex = prev.find(i => i.key === nextItem.key);
      if (ex) {
        return prev.map(i =>
          i.key === nextItem.key ? { ...i, qty: i.qty + qty } : i
        );
      }
      return [
        ...prev,
        nextItem,
      ];
    });
  };

  const addComboToCart = (combo: Combo, qty = 1) => {
    if (!hasBillingContext) {
      setPosNotice(getContextError());
      return;
    }
    setCart((prev) => {
      const key = `combo:${combo.id}`;
      const ex = prev.find((i) => i.key === key);
      if (ex) {
        return prev.map((i) => (i.key === key ? { ...i, qty: i.qty + qty } : i));
      }
      return [
        ...prev,
        {
          key,
          type: "combo",
          id: combo.id,
          name: combo.name,
          price: parseFloat(combo.price),
          qty,
          image: combo.image,
          gst_percent: Number(combo.gst_percent || 0),
          comboItems: combo.items,
        },
      ];
    });
  };

  const openQtyModalForProduct = (product: Product) => {
    if (!hasBillingContext) {
      setPosNotice(getContextError());
      return;
    }
    if (product.is_available === false) {
      setPosNotice(product.availability_reason || "This item is out of stock.");
      return;
    }
    setPendingSelection({ type: "product", product, selectedAddons: [], mode: "add" });
    setPendingQty("1");
    setPendingQtyError("");
    setPendingAddonSearch("");
    setShowAllAddonsModal(false);
    setPendingAddonEditorId(null);
    setPendingAddonEditorQty("1");
    setPendingAddonEditorError("");
  };

  const openQtyModalForCombo = (combo: Combo) => {
    if (!hasBillingContext) {
      setPosNotice(getContextError());
      return;
    }
    if (combo.is_available === false) {
      setPosNotice(combo.availability_reason || "This combo is out of stock.");
      return;
    }
    setPendingSelection({ type: "combo", combo, mode: "add" });
    setPendingQty("1");
    setPendingQtyError("");
    setPendingAddonSearch("");
    setShowAllAddonsModal(false);
    setPendingAddonEditorId(null);
    setPendingAddonEditorQty("1");
    setPendingAddonEditorError("");
  };

  const closeQtyModal = () => {
    setPendingSelection(null);
    setPendingQty("1");
    setPendingQtyError("");
    setPendingAddonSearch("");
    setShowAllAddonsModal(false);
    setPendingAddonEditorId(null);
    setPendingAddonEditorQty("1");
    setPendingAddonEditorError("");
  };

  const openQtyModalForCartItem = (item: CartItem) => {
    if (item.type !== "product") return;
    const mappedProduct =
      products.find((product) => product.id === item.id) ??
      ({
        id: item.id,
        name: item.name,
        price: String(item.basePrice ?? item.price),
        category_name: "",
        image: item.image ?? "",
        gst_percent: Number(item.gst_percent || 0),
        is_available: true,
      } as Product);
    setPendingSelection({
      type: "product",
      product: mappedProduct,
      selectedAddons: [...(item.selectedAddons ?? [])],
      mode: "edit",
      editingCartKey: item.key,
    });
    setPendingQty(String(item.qty));
    setPendingQtyError("");
    setPendingAddonSearch("");
    setShowAllAddonsModal(false);
    setPendingAddonEditorId(null);
    setPendingAddonEditorQty("1");
    setPendingAddonEditorError("");
  };

  const setPendingAddonQty = (addon: Addon, nextQty: number) => {
    const qty = Math.floor(nextQty);
    setPendingSelection((prev) => {
      if (!prev || prev.type !== "product") return prev;
      const existing = prev.selectedAddons ?? [];
      const next = [...existing];
      const idx = next.findIndex((row) => row.id === addon.id);
      if (qty <= 0) {
        return { ...prev, selectedAddons: next.filter((row) => row.id !== addon.id) };
      }
      if (idx >= 0) {
        next[idx] = { ...next[idx], qty };
      } else {
        next.push({ id: addon.id, name: addon.name, price: addon.price, qty });
      }
      return {
        ...prev,
        selectedAddons: next,
      };
    });
  };

  const openPendingAddonQtyEditor = (addon: Addon) => {
    const currentQty =
      pendingSelection?.type === "product"
        ? pendingSelection.selectedAddons?.find((row) => row.id === addon.id)?.qty
        : undefined;
    setPendingAddonEditorId(addon.id);
    setPendingAddonEditorQty(currentQty ? String(currentQty) : "1");
    setPendingAddonEditorError("");
  };

  const submitPendingAddonQtyEditor = (addon: Addon) => {
    const parsed = Math.floor(Number(pendingAddonEditorQty));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setPendingAddonEditorError("Enter a valid addon quantity.");
      return;
    }
    setPendingAddonQty(addon, parsed);
    setPendingAddonEditorId(null);
    setPendingAddonEditorQty("1");
    setPendingAddonEditorError("");
  };

  const closePendingAddonQtyEditor = () => {
    setPendingAddonEditorId(null);
    setPendingAddonEditorQty("1");
    setPendingAddonEditorError("");
  };

  const renderAddonRows = (addonList: Addon[]) => (
    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
      {addonList.map((addon) => {
        const selectedAddon = pendingSelectedAddons.find((row) => row.id === addon.id);
        const currentQty = selectedAddon?.qty ?? 0;
        const isEditingThisAddon = pendingAddonEditorId === addon.id;
        return (
          <div
            key={addon.id}
            className={`rounded-xl border bg-white p-2.5 ${
              currentQty > 0 ? "border-purple-300 shadow-sm" : "border-purple-100"
            }`}
          >
            <div className="flex items-center gap-3">
              <img
                src={
                  addon.image ||
                  "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=120&q=80"
                }
                alt={addon.name}
                className="h-12 w-12 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-purple-950">{addon.name}</p>
                <p className="text-xs text-purple-700">
                  Rs {addon.price.toFixed(2)}
                  {currentQty > 0 ? ` | Added x${currentQty}` : ""}
                </p>
              </div>
              {!isEditingThisAddon && (
                <button
                  type="button"
                  onClick={() => openPendingAddonQtyEditor(addon)}
                  className="inline-flex items-center gap-1 rounded-full border border-purple-300 bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-200"
                >
                  {currentQty > 0 ? "Edit Qty" : "Add"}
                </button>
              )}
            </div>

            {isEditingThisAddon && (
              <div className="mt-2 rounded-lg border border-purple-200 bg-purple-50/60 p-2">
                <div className="flex items-center gap-2">
                  <Input
                    autoFocus
                    type="number"
                    min={1}
                    step={1}
                    value={pendingAddonEditorQty}
                    onChange={(e) => {
                      setPendingAddonEditorQty(e.target.value);
                      if (pendingAddonEditorError) setPendingAddonEditorError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        submitPendingAddonQtyEditor(addon);
                      }
                    }}
                    placeholder="Qty"
                    className="h-9 rounded-lg border-purple-200 bg-white text-sm text-purple-900"
                  />
                  <Button
                    type="button"
                    onClick={() => submitPendingAddonQtyEditor(addon)}
                    className="h-9 bg-[linear-gradient(135deg,#7c3aed_0%,#5b21b6_100%)] px-3 text-xs text-white hover:opacity-95"
                  >
                    Enter
                  </Button>
                  {currentQty > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setPendingAddonQty(addon, 0);
                        closePendingAddonQtyEditor();
                      }}
                      className="h-9 border-rose-200 px-3 text-xs text-rose-600 hover:bg-rose-50"
                    >
                      Remove
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closePendingAddonQtyEditor}
                    className="h-9 border-purple-200 px-3 text-xs text-purple-700 hover:bg-purple-50"
                  >
                    Cancel
                  </Button>
                </div>
                {pendingAddonEditorError && (
                  <p className="mt-1 text-xs font-medium text-violet-700">{pendingAddonEditorError}</p>
                )}
              </div>
            )}
          </div>
        );
      })}
      {addonList.length === 0 && (
        <p className="text-center text-xs text-purple-600/70">No addons found.</p>
      )}
    </div>
  );

  const confirmPendingQty = (keepOpen = false) => {
    if (!pendingSelection) return;
    const qtyNum = Number(pendingQty);
    if (!Number.isInteger(qtyNum) || qtyNum <= 0) {
      setPendingQtyError("Enter a valid quantity greater than 0.");
      return;
    }

    if (pendingSelection.type === "product" && pendingSelection.product) {
      if (pendingSelection.mode === "edit" && pendingSelection.editingCartKey) {
        const updatedItem = buildProductCartItem(
          pendingSelection.product,
          qtyNum,
          pendingSelection.selectedAddons ?? []
        );
        setCart((prev) => {
          const withoutEditing = prev.filter((item) => item.key !== pendingSelection.editingCartKey);
          const existingMatch = withoutEditing.find((item) => item.key === updatedItem.key);
          if (existingMatch) {
            return withoutEditing.map((item) =>
              item.key === updatedItem.key ? { ...item, qty: item.qty + updatedItem.qty } : item
            );
          }
          return [...withoutEditing, updatedItem];
        });
      } else {
        addToCart(
          pendingSelection.product,
          qtyNum,
          pendingSelection.selectedAddons ?? []
        );
      }
    } else if (pendingSelection.type === "combo" && pendingSelection.combo) {
      addComboToCart(pendingSelection.combo, qtyNum);
    }
    if (keepOpen) {
      setPendingQty("1");
      setPendingQtyError("");
      return;
    }
    closeQtyModal();
  };

  const updateQty = (key: string, diff: number) => {
    setCart(prev =>
      prev
        .map(i =>
          i.key === key ? { ...i, qty: i.qty + diff } : i
        )
        .filter(i => i.qty > 0)
    );
  };

  const setQty = (key: string, nextQty: number) => {
    if (!Number.isFinite(nextQty)) return;
    const safeQty = Math.floor(nextQty);
    setCart((prev) =>
      prev
        .map((item) => (item.key === key ? { ...item, qty: safeQty } : item))
        .filter((item) => item.qty > 0)
    );
  };

  const resetCart = () => setCart([]);

  const holdCart = () => {
    if (cart.length === 0) {
      setPosNotice("Nothing to hold.");
      return;
    }
    sessionStorage.setItem(HOLD_CART_KEY, JSON.stringify(cart));
    setHasHeldCart(true);
    setCart([]);
    setPosNotice("Cart held. Use Resume Hold to restore it.");
  };

  const resumeHeldCart = () => {
    const raw = sessionStorage.getItem(HOLD_CART_KEY);
    if (!raw) {
      setHasHeldCart(false);
      setPosNotice("No held cart found.");
      return;
    }
    try {
      const parsed = JSON.parse(raw) as CartItem[];
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setPosNotice("Held cart is empty.");
        return;
      }
      setCart(parsed);
      setPosNotice("Held cart restored.");
    } catch {
      setPosNotice("Held cart data is invalid.");
    }
  };

  /* ================= TOTAL ================= */

  const parseNonNegative = (value: string): number | null => {
    if (!value.trim()) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return parsed;
  };

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const gst = cart.reduce((s, i) => {
    const taxableUnitPrice = i.basePrice ?? i.price;
    return s + (taxableUnitPrice * i.qty * i.gst_percent) / 100;
  }, 0);

  const grossTotal = subtotal + gst;
  const rawDiscountAmount = parseNonNegative(discountAmountInput) ?? 0;
  const manualDiscountAmount = Math.min(rawDiscountAmount, grossTotal);
  const couponDiscountAmount = (() => {
    if (!appliedCoupon) return 0;
    if (grossTotal < Number(appliedCoupon.min_order_amount || 0)) return 0;
    const value = Number(appliedCoupon.value || 0);
    let discount =
      appliedCoupon.discount_type === "PERCENT"
        ? (grossTotal * value) / 100
        : value;
    if (appliedCoupon.max_discount_amount != null) {
      discount = Math.min(discount, Number(appliedCoupon.max_discount_amount));
    }
    return Math.max(0, Math.min(discount, grossTotal));
  })();
  const discountAmount = Math.min(manualDiscountAmount + couponDiscountAmount, grossTotal);
  const total = Math.max(0, grossTotal - discountAmount);
  const cashGivenAmount = Number(cashGiven || 0);
  const cashBalance = Number.isFinite(cashGivenAmount) ? cashGivenAmount - total : 0;
  const manualDiscountDisplayValue =
    discountMode === "percent"
      ? `${Number(discountPercentInput || 0).toFixed(2)}%`
      : `Rs ${manualDiscountAmount.toFixed(2)}`;
  const couponTypeLabel = appliedCoupon
    ? appliedCoupon.discount_type === "PERCENT"
      ? `${Number(appliedCoupon.value || 0).toFixed(2)}%`
      : `Rs ${Number(appliedCoupon.value || 0).toFixed(2)}`
    : "";

  const syncFromPercent = (rawPercent: string, baseTotal: number) => {
    const parsedPercent = parseNonNegative(rawPercent);
    if (parsedPercent === null) {
      setDiscountAmountInput("");
      return;
    }
    const clampedPercent = Math.min(parsedPercent, 100);
    const computedAmount = baseTotal > 0 ? (baseTotal * clampedPercent) / 100 : 0;
    setDiscountAmountInput(computedAmount.toFixed(2));
  };

  const syncFromAmount = (rawAmount: string, baseTotal: number) => {
    const parsedAmount = parseNonNegative(rawAmount);
    if (parsedAmount === null) {
      setDiscountPercentInput("");
      return;
    }
    const clampedAmount = Math.min(parsedAmount, baseTotal);
    const computedPercent = baseTotal > 0 ? (clampedAmount / baseTotal) * 100 : 0;
    setDiscountPercentInput(computedPercent.toFixed(2));
  };

  const switchDiscountMode = (mode: "percent" | "amount") => {
    setDiscountMode(mode);
    if (mode === "percent") {
      syncFromAmount(discountAmountInput, grossTotal);
      return;
    }
    syncFromPercent(discountPercentInput, grossTotal);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError("");
  };

  const applyCoupon = async () => {
    if (!token) return;
    const code = couponCodeInput.trim().toUpperCase();
    if (!code) {
      setCouponError("Enter coupon code.");
      return;
    }
    if (grossTotal <= 0) {
      setCouponError("Add items to cart before applying coupon.");
      return;
    }
    try {
      setApplyingCoupon(true);
      setCouponError("");
      const res = await fetch(`${BASE_URL}/api/orders/coupons/validate/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code,
          order_amount: Number(grossTotal.toFixed(2)),
          customer_phone: orderDetails?.customer_phone || orderDetails?.phone || "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAppliedCoupon(null);
        setCouponError(String(data?.detail ?? data?.error ?? "Invalid coupon."));
        return;
      }
      setAppliedCoupon({
        id: Number(data.id),
        code: String(data.code ?? code),
        discount_type: String(data.discount_type ?? "PERCENT") as "AMOUNT" | "PERCENT",
        value: Number(data.value ?? 0),
        min_order_amount: Number(data.min_order_amount ?? 0),
        max_discount_amount: data.max_discount_amount == null ? null : Number(data.max_discount_amount),
      });
      setCouponCodeInput(String(data.code ?? code));
      setCouponError("");
    } catch (err) {
      console.error("Apply coupon failed:", err);
      setAppliedCoupon(null);
      setCouponError("Could not apply coupon.");
    } finally {
      setApplyingCoupon(false);
    }
  };

  useEffect(() => {
    if (cart.length > 0) return;
    setDiscountPercentInput("");
    setDiscountAmountInput("");
    setDiscountMode("amount");
    setCouponCodeInput("");
    setAppliedCoupon(null);
    setCouponError("");
  }, [cart.length]);

  useEffect(() => {
    if (discountMode === "percent") {
      syncFromPercent(discountPercentInput, grossTotal);
      return;
    }
    syncFromAmount(discountAmountInput, grossTotal);
  }, [grossTotal]); // eslint-disable-line react-hooks/exhaustive-deps

  const getCartPayloadItems = () => {
    return cart.map((item) => {
      if (item.type === "combo") {
        return {
          combo: item.id,
          quantity: item.qty,
        };
      }
      return {
        product: item.id,
        quantity: item.qty,
        addons: (item.selectedAddons ?? []).map((addon) => ({
          addon: addon.id,
          quantity: addon.qty,
        })),
      };
    });
  };

  const syncCartItems = async (resolvedOrderId: string) => {
    const items = getCartPayloadItems();

    const addRes = await fetch(`${BASE_URL}/api/orders/add-items/${resolvedOrderId}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        items,
        ...(manualDiscountAmount > 0 ? { discount_amount: Number(manualDiscountAmount.toFixed(2)) } : {}),
        ...(appliedCoupon ? { coupon_code: appliedCoupon.code } : {}),
      }),
    });
    if (!addRes.ok) {
      const err: unknown = await addRes.json().catch(() => ({}));
      throw new Error(getApiErrorMessage(err, "Failed to add items."));
    }
  };

  /* ================= SEND ================= */

  const handleSend = async () => {
    if (cart.length === 0 || !token || sending) return;

    setSending(true);
    try {
      let resolvedOrderId = effectiveOrderId;

      // Dine-in flow: create order only at send-time when order id doesn't exist yet.
      if (!resolvedOrderId) {
        if (!queryOrderContext) throw new Error("Missing order context for dine-in order creation.");
        if (!queryOrderContext.session) throw new Error("Missing session id for dine-in order creation.");

        const createRes = await fetch(`${BASE_URL}/api/orders/create/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            order_type: "DINE_IN",
            session: queryOrderContext.session,
          }),
        });

        if (!createRes.ok) {
          const err: unknown = await createRes.json().catch(() => ({}));
          throw new Error(getApiErrorMessage(err, "Unable to create dine-in order."));
        }

        const created = await createRes.json();
        const createdId = getCreatedOrderId(created);
        if (!createdId) throw new Error("Order created but id was not returned by API.");

        resolvedOrderId = createdId;
        setRuntimeOrderId(createdId);
        navigate(
          `/staff/pos?order=${encodeURIComponent(createdId)}&session=${encodeURIComponent(queryOrderContext.session ?? "")}&table_number=${encodeURIComponent(queryOrderContext.table_number ?? "")}&token_number=${encodeURIComponent(queryOrderContext.token_number ?? "")}&customer_name=${encodeURIComponent(queryOrderContext.customer_name ?? "")}`,
          { replace: true }
        );
      }

      await syncCartItems(resolvedOrderId);

      await fetch(`${BASE_URL}/api/orders/status/${resolvedOrderId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      });

      window.location.href = "/staff/kitchen";
    } catch (error) {
      console.error(error);
      alert("Failed to send order to kitchen.");
    } finally {
      setSending(false);
    }
  };

  const openPaymentForTakeaway = () => {
    if (!effectiveOrderId) {
      setPosNotice("Start a takeaway/online order first.");
      return;
    }
    if (cart.length === 0) {
      setPosNotice("Cart is empty.");
      return;
    }
    setPaymentMethod("CASH");
    setPaymentReference("");
    setCashGiven("");
    setPaymentError("");
    setShowPaymentModal(true);
  };

  const loadInvoicePreview = async (orderIdToLoad: string) => {
    if (!token) return;
    setInvoiceLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/orders/invoice/${orderIdToLoad}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(String(data?.error ?? data?.detail ?? "Failed to load invoice."));
      }
      setInvoiceData(data as InvoiceData);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const closeInvoicePreview = () => {
    setInvoiceData(null);
    setOrderDetails(null);
    setRuntimeOrderId(null);
    setCart([]);
    setPosNotice("");
    setShowPaymentModal(false);
    setPaymentError("");
    setPaymentReference("");
    setCashGiven("");
    setDiscountPercentInput("");
    setDiscountAmountInput("");
    setDiscountMode("amount");
    setCouponCodeInput("");
    setAppliedCoupon(null);
    setCouponError("");
    setPendingSelection(null);
    setPendingQty("1");
    setPendingQtyError("");
    setPendingAddonSearch("");
    setShowAllAddonsModal(false);
    setPendingAddonEditorId(null);
    setPendingAddonEditorQty("1");
    setPendingAddonEditorError("");
    window.location.replace("/staff/pos");
  };

  const confirmTakeawayPayment = async () => {
    if (!token || !effectiveOrderId || paying) return;
    if (paymentMethod === "CARD" && !paymentReference.trim()) {
      setPaymentError("Card number/reference is required.");
      return;
    }
    if (paymentMethod === "CASH") {
      const parsed = Number(cashGiven);
      if (!Number.isFinite(parsed) || parsed < total) {
        setPaymentError("Cash given must be at least the bill amount.");
        return;
      }
    }

    try {
      setPaying(true);
      setPaymentError("");
      await syncCartItems(effectiveOrderId);

      const payRes = await fetch(`${BASE_URL}/api/orders/pay/${effectiveOrderId}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          method: paymentMethod,
          reference: paymentMethod === "CARD" ? paymentReference.trim() : paymentReference.trim() || null,
          cash_received: paymentMethod === "CASH" ? cashGiven : null,
        }),
      });
      if (!payRes.ok) {
        const raw = await payRes.text().catch(() => "");
        let err: Record<string, unknown> | unknown[] = {};
        try {
          err = raw ? (JSON.parse(raw) as Record<string, unknown> | unknown[]) : {};
        } catch {
          err = { raw };
        }
        const msg = getApiErrorMessage(err, "Payment failed.");
        throw new Error(msg);
      }

      await fetch(`${BASE_URL}/api/orders/status/${effectiveOrderId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "NEW" }),
      });

      setShowPaymentModal(false);
      setCart([]);
      await loadInvoicePreview(effectiveOrderId);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Payment failed.";
      setPaymentError(message);
      setPosNotice(message);
    } finally {
      setPaying(false);
    }
  };

  const markTakeawayPending = async () => {
    if (!token || !effectiveOrderId || markingPending) return;
    if (cart.length === 0) {
      setPaymentError("Cart is empty.");
      return;
    }

    try {
      setMarkingPending(true);
      setPaymentError("");
      await syncCartItems(effectiveOrderId);

      await fetch(`${BASE_URL}/api/orders/status/${effectiveOrderId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "NEW" }),
      });

      setPosNotice("Order marked as Pending Payment. Redirecting to Orders...");
      setShowPaymentModal(false);
      setCart([]);
      window.setTimeout(() => navigate("/staff/orders"), 700);
    } catch (error) {
      console.error(error);
      setPaymentError(error instanceof Error ? error.message : "Could not mark order as pending.");
    } finally {
      setMarkingPending(false);
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const hasCtrl = event.ctrlKey || event.metaKey;

      if (hasCtrl) {
        if (key === "n") {
          event.preventDefault();
          openNewPosBilling();
          return;
        }
        if (key === "s") {
          event.preventDefault();
          if (isDineInContext) {
            void handleSend();
          } else {
            openPaymentForTakeaway();
          }
          return;
        }
        if (key === "p") {
          event.preventDefault();
          window.print();
          return;
        }
        if (key === "f") {
          event.preventDefault();
          searchInputRef.current?.focus();
          return;
        }
        if (key === "d") {
          event.preventDefault();
          setPosNotice("Use the discount % or amount inputs in the cart footer.");
          return;
        }
        if (key === "r") {
          event.preventDefault();
          setPosNotice("Return shortcut captured. Return flow is not available yet.");
          return;
        }
        if (key === "h") {
          event.preventDefault();
          holdCart();
          return;
        }
        if (key === "l") {
          event.preventDefault();
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          localStorage.removeItem("user");
          navigate("/");
          return;
        }
      }

      if (key === "escape") {
        event.preventDefault();
        if (invoiceData) {
          closeInvoicePreview();
          return;
        }
        if (pendingSelection) {
          closeQtyModal();
          return;
        }
        if (showPaymentModal) {
          setShowPaymentModal(false);
          setPaymentError("");
          return;
        }
        if (showTakeawayModal) {
          setShowTakeawayModal(false);
          setTakeawayError("");
          return;
        }
        setPosNotice("");
        return;
      }

      if (key === "enter") {
        if (pendingSelection) return;
        if (showPaymentModal) return;
        if (showTakeawayModal) return;
        if (isEditableTarget(event.target) && event.target !== searchInputRef.current) return;

        const product = filteredProducts.find((p) => p.is_available !== false);
        if (product) {
          event.preventDefault();
          addToCart(product);
          return;
        }

        const combo = filteredCombos.find((c) => c.is_available !== false);
        if (combo) {
          event.preventDefault();
          addComboToCart(combo);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filteredProducts, filteredCombos, navigate, showTakeawayModal, showPaymentModal, cart, creatingTakeaway, hasBillingContext, pendingSelection, isDineInContext]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pendingSelection) return;
    const timer = window.setTimeout(() => {
      pendingQtyInputRef.current?.focus();
      pendingQtyInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pendingSelection]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!searchDropdownRef.current) return;
      if (!searchDropdownRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  /* ================= UI ================= */

  const displayOrder = orderDetails ?? queryOrderContext;

  const isTakeaway =
    displayOrder?.order_type === "TAKEAWAY" ||
    displayOrder?.order_type === "TAKE_AWAY" ||
    displayOrder?.order_type === "SWIGGY" ||
    displayOrder?.order_type === "ZOMATO";

  const isDineIn =
    displayOrder?.order_type === "DINE_IN";

  const productNameById = useMemo(() => {
    const map: Record<string, string> = {};
    products.forEach((p) => {
      map[p.id] = p.name;
    });
    return map;
  }, [products]);

  const invoiceLineItems = useMemo(() => {
    if (!invoiceData) return [];
    const rows =
      Array.isArray(invoiceData.line_items) && invoiceData.line_items.length > 0
        ? invoiceData.line_items
        : Array.isArray(invoiceData.items)
        ? invoiceData.items
        : [];
    return rows.map((li) => ({
      ...li,
      addons: Array.isArray(li.addons) ? li.addons : [],
    }));
  }, [invoiceData]);
  const invoiceManualDiscount = Number(
    invoiceData?.manual_discount ??
      invoiceData?.discount_breakdown?.manual_discount ??
      0
  );
  const invoiceCouponDiscount = Number(
    invoiceData?.coupon_discount ??
      invoiceData?.discount_breakdown?.coupon_discount ??
      0
  );

  return (
    <div className="pos-page min-h-screen p-4 md:p-">
      <style>{`
        @media print {
          .pos-page > * {
            display: none !important;
          }
          .pos-page > .pos-invoice-overlay {
            display: flex !important;
            position: static !important;
            inset: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          .pos-thermal-root {
            width: 80mm !important;
            max-width: 80mm !important;
            max-height: none !important;
            overflow: visible !important;
            border: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .pos-no-print {
            display: none !important;
          }
        }
      `}</style>
      <div className="mx-auto grid max-w-[2200px] grid-cols-1 gap-5 lg:grid-cols-12 xl:gap-8">
        {/* LEFT */}
        <div className="space-y-6 lg:col-span-7">
          <div ref={searchDropdownRef} className="relative max-w-md">
            <Input
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchSuggestions.length > 0) {
                  e.preventDefault();
                  openQtyModalForProduct(searchSuggestions[0]);
                  setSearch("");
                  setIsSearchFocused(false);
                }
                if (e.key === "Escape") {
                  setIsSearchFocused(false);
                }
              }}
              ref={searchInputRef}
              className="h-12 rounded-2xl border-purple-200 bg-white px-4 text-sm text-purple-950 placeholder:text-purple-400 focus-visible:ring-purple-300"
            />
            {showSearchDropdown && (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-80 overflow-auto rounded-2xl border border-purple-200 bg-white p-2 shadow-[0_18px_45px_rgba(91,33,182,0.2)]">
                {searchSuggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      openQtyModalForProduct(item);
                      setSearch("");
                      setIsSearchFocused(false);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-purple-50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-purple-950 break-words">{item.name}</p>
                        <p className="truncate text-xs text-purple-700/70">{item.category_name}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-purple-800">Rs {item.price}</p>
                      <p className="text-[11px] font-semibold text-purple-600">Add</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {categories.map(cat => (
              <Button
                key={cat.id}
                variant={activeCategory === cat.name ? "default" : "outline"}
                onClick={() => setActiveCategory(cat.name)}
                className={
                  activeCategory === cat.name
                    ? "rounded-full bg-[linear-gradient(135deg,#7c3aed_0%,#5b21b6_100%)] px-5 text-white shadow-md hover:opacity-95"
                    : "rounded-full border-purple-200 bg-white text-purple-700 hover:bg-purple-50"
                }
              >
                {cat.name}
              </Button>
            ))}
            <Button
              variant={activeCategory === "Combo" ? "default" : "outline"}
              onClick={() => setActiveCategory("Combo")}
              className={
                activeCategory === "Combo"
                  ? "rounded-full bg-[linear-gradient(135deg,#7c3aed_0%,#5b21b6_100%)] px-5 text-white shadow-md hover:opacity-95"
                  : "rounded-full border-purple-200 bg-white text-purple-700 hover:bg-purple-50"
              }
            >
              Combo
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredProducts.map(product => (
              <Card
                key={product.id}
                onClick={() => openQtyModalForProduct(product)}
                className={`group overflow-hidden rounded-2xl border border-purple-100 bg-white/95 transition duration-200 ${
                  hasBillingContext && product.is_available !== false
                    ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(109,40,217,0.2)]"
                    : "cursor-not-allowed opacity-60"
                }`}
              >
                <img
                  src={product.image}
                  className="h-40 w-full object-cover"
                />
                <CardContent className="p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-purple-950 break-words">
                      {product.name}
                    </h3>
                    <span className="rounded-md bg-purple-100 px-2 py-1 text-[10px] font-semibold text-purple-700">
                      {product.category_name}
                    </span>
                  </div>
                  {product.is_available === false && (
                    <p className="mb-2 text-[11px] font-semibold text-rose-700">
                      {product.availability_reason || "Out of stock"}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-purple-800">
                      Rs {product.price}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-2.5 py-1 text-xs font-semibold text-white transition group-hover:bg-purple-700">
                      <Tag className="h-3 w-3" />
                      Add
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-purple-600/80">GST {product.gst_percent}%</p>
                </CardContent>
              </Card>
            ))}

            {filteredCombos.map((combo) => (
              <Card
                key={combo.id}
                onClick={() => openQtyModalForCombo(combo)}
                className={`group overflow-hidden rounded-2xl border border-purple-100 bg-white/95 transition duration-200 ${
                  hasBillingContext && combo.is_available !== false
                    ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(109,40,217,0.2)]"
                    : "cursor-not-allowed opacity-60"
                }`}
              >
                <img
                  src={combo.image || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80"}
                  className="h-40 w-full object-cover"
                />
                <CardContent className="p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-purple-950 break-words">
                      {combo.name}
                    </h3>
                    <span className="rounded-md bg-purple-100 px-2 py-1 text-[10px] font-semibold text-purple-700">
                      Combo
                    </span>
                  </div>
                  {combo.is_available === false && (
                    <p className="mb-2 text-[11px] font-semibold text-rose-700">
                      {combo.availability_reason || "Out of stock"}
                    </p>
                  )}
                  <p className="text-[11px] text-purple-600/80">
                    {combo.items.length} item{combo.items.length === 1 ? "" : "s"}
                  </p>
                  <div className="mb-2 space-y-0.5">
                    {combo.items.slice(0, 2).map((item) => (
                      <p key={item.id} className="text-[11px] text-purple-700/75 break-words">
                        {(item.product_name || productNameById[item.product] || "Product")} x {item.quantity}
                      </p>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-purple-800">
                      Rs {combo.price}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-2.5 py-1 text-xs font-semibold text-white transition group-hover:bg-purple-700">
                      <Tag className="h-3 w-3" />
                      Add
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-purple-600/80">GST {combo.gst_percent}%</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-5">
          <Card className="sticky top-1 flex min-h-[70vh] flex-col overflow-hidden rounded-[28px] border border-purple-200/70 bg-white shadow-[0_22px_55px_rgba(91,33,182,0.18)] lg:h-[12in]">
            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-purple-100 bg-[linear-gradient(120deg,#f4ecff_0%,#ffffff_100%)] px-5 py-4">
              <h2 className="inline-flex items-center gap-2 text-base font-semibold text-purple-950">
                <ShoppingCart className="h-4 w-4 text-purple-700" />
                Your Cart
              </h2>
              <div className="flex items-center gap-1">
                {hasHeldCart && (
                  <Button variant="ghost" size="sm" onClick={resumeHeldCart} className="text-purple-700 hover:bg-purple-100 hover:text-purple-800">
                    Resume Hold
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={resetCart} className="text-purple-700 hover:bg-purple-100 hover:text-purple-800">
                  Reset
                </Button>
              </div>
            </div>

            {/* ORDER INFO */}
            {displayOrder && (
              <div className="space-y-1 border-b border-purple-100 bg-purple-50/70 px-5 py-3 text-sm">
                {isTakeaway && (
                  <>
                    <p><b>Type:</b> {displayOrder.order_type === "SWIGGY" || displayOrder.order_type === "ZOMATO" ? displayOrder.order_type : "Takeaway"}</p>
                    <p><b>Customer:</b> {displayOrder.customer_name}</p>
                    {displayOrder.phone && (
                      <p className="text-xs text-purple-700/70">
                        {displayOrder.phone}
                      </p>
                    )}
                  </>
                )}

                {isDineIn && (
                  <>
                    <p><b>Table:</b> {displayOrder.table_number || "-"}</p>
                    <p><b>Token:</b> {displayOrder.token_number || "-"}</p>
                    <p><b>Customer:</b> {displayOrder.customer_name || "-"}</p>
                  </>
                )}
              </div>
            )}

            {/* BODY */}
            <div className="flex-1 overflow-auto px-4 py-4 sm:px-5">
              <div className="mb-2 hidden grid-cols-12 border-b border-purple-100 pb-2 text-[11px] font-semibold uppercase tracking-wide text-purple-600 md:grid">
                <div className="col-span-5">Item</div>
                <div className="col-span-3 text-center">Qty</div>
                <div className="col-span-2 text-center">GST</div>
                <div className="col-span-2 text-right">Total</div>
              </div>

              {cart.length === 0 && (
                <div className="py-10 text-center text-sm text-purple-400">
                  Your cart is empty
                </div>
              )}

              {cart.map(item => {
                const rate = Number(item.gst_percent || 0);
                const base = item.price * item.qty;
                const taxableBase = (item.basePrice ?? item.price) * item.qty;
                const final = base + (taxableBase * rate) / 100;
                const selectedAddons = item.selectedAddons ?? [];
                const showAllAddons = Boolean(expandedAddonRows[item.key]);
                const visibleAddons = showAllAddons ? selectedAddons : selectedAddons.slice(0, 1);
                const hiddenAddonCount = Math.max(0, selectedAddons.length - visibleAddons.length);

                return (
                  <div
                    key={item.key}
                    className="mb-3 rounded-2xl border border-purple-100 bg-[linear-gradient(180deg,rgba(250,245,255,0.95)_0%,rgba(255,255,255,0.98)_100%)] px-3.5 py-3.5 text-[12px] shadow-[0_10px_24px_rgba(109,40,217,0.06)]"
                  >
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-center">
                      <div className="flex items-start gap-3 rounded-lg text-left md:col-span-5">
                        <img
                          src={item.image || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=120&q=80"}
                          className="h-12 w-12 rounded-xl object-cover ring-1 ring-purple-100"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold leading-5 text-purple-950 break-words">{item.name}</p>
                          <p className="mt-0.5 text-[11px] text-purple-600/75">
                            Rs {item.price} x {item.qty}
                          </p>
                          {item.type === "product" && (
                            <button
                              type="button"
                              onClick={() => openQtyModalForCartItem(item)}
                              className="mt-1 text-[12px] font-semibold text-purple-700 underline decoration-purple-400 underline-offset-2 hover:text-purple-900"
                              title="Open addons modal"
                            >
                              Edit addons
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5 md:col-span-7 md:mt-0 md:grid-cols-7 md:items-center">
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-purple-100 bg-white/85 px-3 py-2 md:col-span-3 md:justify-center md:border-0 md:bg-transparent md:px-0 md:py-0">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-purple-600 md:hidden">
                            Qty
                          </span>
                          <div className="inline-flex items-center rounded-xl border border-purple-200 bg-white shadow-sm">
                            <button
                              onClick={() => updateQty(item.key, -1)}
                              disabled={item.qty <= 1}
                              className="h-8 w-8 rounded-l-lg text-base font-bold leading-none text-purple-700 transition hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={1}
                              value={item.qty}
                              onChange={(e) => {
                                const parsed = Number(e.target.value);
                                if (Number.isNaN(parsed)) return;
                                setQty(item.key, parsed);
                              }}
                              className="h-8 w-12 border-x border-purple-200 bg-white px-1 text-center text-sm font-semibold text-purple-900 outline-none focus:bg-purple-50"
                            />
                            <button
                              onClick={() => updateQty(item.key, 1)}
                              className="h-8 w-8 rounded-r-lg text-base font-bold leading-none text-purple-700 transition hover:bg-purple-100"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5 md:col-span-2 md:block">
                          <div className="rounded-xl border border-purple-100 bg-white/80 px-3 py-2.5 text-left md:rounded-none md:border-0 md:bg-transparent md:px-0 md:py-0 md:text-center">
                            <span className="block text-[10px] font-semibold uppercase tracking-wide text-purple-600 md:hidden">
                              GST
                            </span>
                            <span className="font-medium text-purple-800">{rate}%</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5 md:col-span-2 md:block">
                          <div className="rounded-xl border border-purple-100 bg-white px-3 py-2.5 text-right shadow-[0_6px_14px_rgba(109,40,217,0.05)] md:rounded-none md:border-0 md:bg-transparent md:px-0 md:py-0 md:shadow-none">
                            <span className="block text-[10px] font-semibold uppercase tracking-wide text-purple-600 md:hidden">
                              Total
                            </span>
                            <span className="font-semibold text-purple-900">Rs {final.toFixed(0)}</span>
                          </div>
                        </div>
                      </div>

                      {selectedAddons.length > 0 && (
                        <div className="border-t border-purple-100/80 pt-2 md:col-span-12 md:ml-[60px] md:border-t-0 md:pt-0">
                          <div className="space-y-0.5 text-[10px] leading-4 text-purple-700/85">
                            {visibleAddons.map((addon) => (
                              <p key={`${item.key}-addon-${addon.id}`}>
                                + {addon.name} x{addon.qty} @ Rs {addon.price.toFixed(2)} = Rs {(addon.qty * addon.price).toFixed(2)} / item
                              </p>
                            ))}
                            {selectedAddons.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedAddonRows((prev) => ({
                                    ...prev,
                                    [item.key]: !prev[item.key],
                                  }))
                                }
                                className="mt-0.5 text-[10px] font-semibold text-purple-700 underline decoration-purple-400 underline-offset-2 hover:text-purple-900"
                              >
                                {showAllAddons
                                  ? "View less addons"
                                  : `View more addons (${hiddenAddonCount})`}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* FOOTER */}
            <div className="space-y-2 border-t border-purple-100 bg-white p-4">
              <div className="flex justify-between text-sm text-purple-800">
                <span>Subtotal</span>
                <span>Rs {subtotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-sm text-purple-800">
                <span>GST</span>
                <span>Rs {gst.toFixed(0)}</span>
              </div>
              <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-purple-700">
                  Discount
                </p>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-purple-700">
                    {discountMode === "percent" ? "Discount Percent (%)" : "Discount Amount (Rs)"}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={discountMode === "percent" ? 100 : undefined}
                      step="0.01"
                      value={discountMode === "percent" ? discountPercentInput : discountAmountInput}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (discountMode === "percent") {
                          setDiscountPercentInput(raw);
                          syncFromPercent(raw, grossTotal);
                          return;
                        }
                        setDiscountAmountInput(raw);
                        syncFromAmount(raw, grossTotal);
                      }}
                      placeholder={discountMode === "percent" ? "Enter percent" : "Enter amount"}
                      className={`h-9 rounded-lg border-purple-200 bg-white text-xs text-purple-950 placeholder:text-purple-400 focus-visible:ring-purple-300 ${
                        discountMode === "amount" ? "pl-8" : "pr-7"
                      }`}
                    />
                    <div className="inline-flex h-9 w-full rounded-lg border border-purple-200 bg-white text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => switchDiscountMode("amount")}
                        className={`w-1/2 rounded-md px-2 py-1 ${discountMode === "amount" ? "bg-purple-600 text-white" : "text-purple-700"}`}
                      >
                        Amt
                      </button>
                      <button
                        type="button"
                        onClick={() => switchDiscountMode("percent")}
                        className={`w-1/2 rounded-md px-2 py-1 ${discountMode === "percent" ? "bg-purple-600 text-white" : "text-purple-700"}`}
                      >
                        %
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-purple-700">
                  Coupon
                </p>
                <div className="space-y-2">
                  <Input
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                    placeholder="Enter coupon code"
                    className="h-9 rounded-lg border-purple-200 bg-white text-xs text-purple-950 placeholder:text-purple-400 focus-visible:ring-purple-300"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      onClick={() => void applyCoupon()}
                      disabled={applyingCoupon}
                      className="h-9 rounded-lg bg-purple-600 px-3 text-xs text-white hover:bg-purple-700"
                    >
                      {applyingCoupon ? "Applying..." : "Apply"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={removeCoupon}
                      disabled={!appliedCoupon}
                      className="h-9 rounded-lg border-purple-200 px-3 text-xs text-purple-700 hover:bg-purple-50"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
                {appliedCoupon && (
                  <p className="mt-2 text-[11px] font-medium text-emerald-700">
                    Applied: {appliedCoupon.code} ({appliedCoupon.discount_type} {couponTypeLabel}) (- Rs {couponDiscountAmount.toFixed(2)})
                  </p>
                )}
                {couponError && (
                  <p className="mt-2 text-[11px] font-medium text-rose-700">{couponError}</p>
                )}
              </div>
              <div className="space-y-1 rounded-lg border border-purple-100 bg-purple-50/30 p-2">
                <div className="flex justify-between text-xs text-purple-800">
                  <span>Discount ({discountMode === "percent" ? "Percent" : "Amount"}: {manualDiscountDisplayValue})</span>
                  <span>- Rs {manualDiscountAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-purple-800">
                  <span>Coupon Discount {appliedCoupon ? `(${appliedCoupon.code} - ${appliedCoupon.discount_type})` : ""}</span>
                  <span>- Rs {couponDiscountAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-purple-900">
                  <span>Total Discount</span>
                  <span>- Rs {discountAmount.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex justify-between text-base font-semibold text-purple-950">
                <span>Total</span>
                <span className="text-purple-700">
                  Rs {total.toFixed(0)}
                </span>
              </div>

              <Button
                className="mt-2 h-11 w-full rounded-xl bg-[linear-gradient(135deg,#7c3aed_0%,#5b21b6_100%)] font-semibold text-white hover:opacity-95"
                onClick={() => {
                  if (isDineInContext) {
                    void handleSend();
                    return;
                  }
                  openPaymentForTakeaway();
                }}
                disabled={
                  cart.length === 0 ||
                  !token ||
                  (isDineInContext ? (!effectiveOrderId && !queryOrderContext?.session) : !effectiveOrderId) ||
                  sending ||
                  paying
                }
              >
                {isDineInContext ? (sending ? "Sending..." : "Send to Kitchen") : (paying ? "Processing..." : "Proceed to Pay")}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {showTakeawayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-purple-200 bg-white p-6 shadow-2xl">
            <h2 className="mb-1 text-xl font-semibold text-purple-950">Take Away Order</h2>
            <p className="mb-5 text-sm text-purple-700">
              Add customer details before opening POS billing.
            </p>

            <Input
              placeholder="Customer Name"
              value={takeawayCustomerName}
              onChange={(e) => setTakeawayCustomerName(e.target.value)}
              className="mb-3 h-11 rounded-xl border-purple-200 bg-white text-purple-950 placeholder:text-purple-400 focus-visible:ring-purple-300"
            />
            <Input
              placeholder="Phone Number"
              value={takeawayPhone}
              onChange={(e) => setTakeawayPhone(e.target.value)}
              className="mb-5 h-11 rounded-xl border-purple-200 bg-white text-purple-950 placeholder:text-purple-400 focus-visible:ring-purple-300"
            />
            {takeawayError && (
              <p className="mb-4 text-sm font-medium text-violet-700">{takeawayError}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowTakeawayModal(false);
                  setPosNotice("");
                  setTakeawayError("");
                }}
                className="border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                Cancel
              </Button>
              <Button
                onClick={() => void startTakeawayFromPos()}
                disabled={creatingTakeaway}
                className="bg-[linear-gradient(135deg,#7c3aed_0%,#5b21b6_100%)] text-white hover:opacity-95 disabled:opacity-60"
              >
                {creatingTakeaway ? "Starting..." : "Continue"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {pendingSelection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-purple-200 bg-white p-6 shadow-2xl">
            <h2 className="mb-1 text-xl font-semibold text-purple-950">
              {pendingSelection.type === "product"
                ? isEditingPendingSelection
                  ? "Edit Item"
                  : "Customize Item"
                : "Add Quantity"}
            </h2>
            <p className="mb-4 text-sm text-purple-700">
              {pendingSelection.type === "product"
                ? pendingSelection.product?.name
                : pendingSelection.combo?.name}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                confirmPendingQty();
              }}
            >
              <Input
                ref={pendingQtyInputRef}
                type="number"
                min={1}
                step={1}
                placeholder="Enter product quantity"
                value={pendingQty}
                onChange={(e) => {
                  setPendingQty(e.target.value);
                  if (pendingQtyError) setPendingQtyError("");
                }}
                className="mb-3 h-11 rounded-xl border-purple-200 bg-white text-purple-950 placeholder:text-purple-400 focus-visible:ring-purple-300"
              />

              {pendingSelection.type === "product" && (
                <div className="mb-4 space-y-3 rounded-2xl border border-purple-100 bg-purple-50/40 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">
                      Addons
                    </p>
                    <p className="text-xs font-semibold text-purple-700">
                      + Rs {pendingAddonUnitTotal.toFixed(2)} / item
                    </p>
                  </div>

                  <div className="relative">
                    
                    <Input
                      value={pendingAddonSearch}
                      onChange={(e) => setPendingAddonSearch(e.target.value)}
                      placeholder="Search addons..."
                      className="h-10 rounded-xl border-purple-200 bg-white pl-9 text-sm text-purple-950 placeholder:text-purple-400 focus-visible:ring-purple-300"
                    />
                  </div>

                  {renderAddonRows(previewPendingAddons)}
                  {filteredPendingAddons.length > 4 && (
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAllAddonsModal(true)}
                        className="h-9 border-purple-200 text-xs text-purple-700 hover:bg-purple-50"
                      >
                        Show More ({filteredPendingAddons.length - 4} more)
                      </Button>
                    </div>
                  )}

                  <div className="rounded-xl border border-purple-200 bg-white px-3 py-2 text-xs text-purple-800">
                    <div className="flex items-center justify-between">
                      <span>Base Price</span>
                      <span>Rs {Number(pendingSelection.product?.price || 0).toFixed(2)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span>Addons / item</span>
                      <span>Rs {pendingAddonUnitTotal.toFixed(2)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between border-t border-purple-100 pt-1.5 font-semibold">
                      <span>Item Total</span>
                      <span>
                        Rs {(pendingProductUnitPrice * Math.max(1, Number(pendingQty) || 1)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {pendingQtyError && (
                <p className="mb-4 text-sm font-medium text-violet-700">{pendingQtyError}</p>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeQtyModal}
                  className="border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[linear-gradient(135deg,#7c3aed_0%,#5b21b6_100%)] text-white hover:opacity-95"
                >
                  {isEditingPendingSelection ? "Update Item" : "Add"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pendingSelection?.type === "product" && showAllAddonsModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-purple-200 bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-purple-950">All Addons</h3>
                <p className="text-xs text-purple-700">Search works across all addons.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAllAddonsModal(false);
                  closePendingAddonQtyEditor();
                }}
                className="border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                Close
              </Button>
            </div>

            <div className="relative mb-3">
              
              <Input
                value={pendingAddonSearch}
                onChange={(e) => setPendingAddonSearch(e.target.value)}
                placeholder="Search addons..."
                className="h-10 rounded-xl border-purple-200 bg-white pl-9 text-sm text-purple-950 placeholder:text-purple-400 focus-visible:ring-purple-300"
              />
            </div>

            {renderAddonRows(filteredPendingAddons)}
          </div>
        </div>
      )}

      {(invoiceLoading || invoiceData) && (
        <div className="pos-invoice-overlay fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="pos-thermal-root w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl border border-purple-200 bg-white shadow-2xl">
            <div className="pos-no-print flex items-center justify-between border-b border-purple-100 px-4 py-3">
              <p className="text-sm font-semibold text-purple-900">Bill Preview</p>
              <button
                onClick={closeInvoicePreview}
                className="rounded-md border border-purple-200 px-3 py-1.5 text-xs text-purple-700 hover:bg-purple-50"
              >
                Close
              </button>
            </div>

            <div className="p-4 text-slate-900">
              {invoiceLoading && !invoiceData ? (
                <p className="text-sm text-purple-700">Loading invoice...</p>
              ) : (
                <div className="mx-auto w-full max-w-md rounded-md border border-dashed border-slate-300 p-3 font-mono text-[10px] leading-tight">
                  <div className="border-b border-dashed border-slate-300 pb-3 text-center">
                    <img src="/logo.png" alt="Logo" className="mx-auto mb-2 h-10 w-auto object-contain" />
                    <p className="text-sm font-bold tracking-wide">Kensei Food & Beverages Private Limited</p>
                    <p className="mt-1 font-semibold">DIP & DASH PERUNGUDI CHENNAI</p>
                    <div className="my-1 border-t border-dashed border-slate-400" />
                    <p className="font-bold tracking-wide">TAX INVOICE</p>
                    <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-left">
                      <p><span className="font-semibold">Bill No:</span> {invoiceData?.bill_number || "-"}</p>
                      <p><span className="font-semibold">Bill Dt:</span> {invoiceData?.date ? new Date(invoiceData.date).toLocaleString() : "-"}</p>
                      <p><span className="font-semibold">Customer:</span> {invoiceData?.customer_name || "-"}</p>
                      <p><span className="font-semibold">Cashier:</span> {invoiceData?.staff || "-"}</p>
                    </div>
                  </div>

                  <div className="border-b border-dashed border-slate-300 py-3">
                    <p className="mb-2 font-semibold">Items List</p>
                    <div className="mb-2 grid grid-cols-12 gap-2 font-semibold">
                      <p className="col-span-5">Item</p>
                      <p className="col-span-2 text-right">Qty</p>
                      <p className="col-span-2 text-right">Price</p>
                      <p className="col-span-3 text-right">Total</p>
                    </div>
                    <div className="space-y-1.5">
                      {invoiceLineItems.length > 0 ? (
                        invoiceLineItems.map((li, idx) => (
                          <div key={`${li.name}-${idx}`} className="space-y-0.5">
                            <div className="grid grid-cols-12 gap-2">
                              <p className="col-span-5 truncate">{li.name}</p>
                              <p className="col-span-2 text-right">{li.quantity}</p>
                              <p className="col-span-2 text-right">{Number(li.base_price || 0).toFixed(0)}</p>
                              <p className="col-span-3 text-right">{Number(li.line_total || 0).toFixed(0)}</p>
                            </div>
                            {(li.addons ?? []).map((addon, addonIdx) => (
                              <div key={`${li.name}-${idx}-addon-${addonIdx}`} className="grid grid-cols-12 gap-2 text-[9px] text-slate-600">
                                <p className="col-span-8 pl-2">
                                  + {addon.name} x{Number(addon.quantity_per_item ?? addon.quantity_total ?? 0)} / item @ Rs {Number(addon.unit_price || 0).toFixed(2)}
                                </p>
                                <p className="col-span-4 text-right">Rs {Number(addon.line_total || 0).toFixed(2)}</p>
                              </div>
                            ))}
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-slate-500">No items available in invoice payload.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-3">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>Rs.{Number(invoiceData?.subtotal || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total GST</span>
                      <span>Rs.{Number(invoiceData?.total_gst || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Discount</span>
                      <span>Rs.{invoiceManualDiscount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>
                        Coupon Discount
                        {invoiceData?.coupon_details?.code
                          ? ` (${invoiceData.coupon_details.code} - ${String(invoiceData.coupon_details.discount_type || "")})`
                          : ""}
                      </span>
                      <span>Rs.{invoiceCouponDiscount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Discount</span>
                      <span>Rs.{Number(invoiceData?.discount || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-dashed border-slate-300 pt-2 text-sm font-bold">
                      <span>Final Amount</span>
                      <span>Rs.{Number(invoiceData?.final_amount || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="mt-4 space-y-1 text-center text-[11px] text-slate-500">
                    <p>Thank you. Visit again.</p>
                    <p className="font-medium text-slate-600">Follow us on Instagram</p>
                    <div className="flex justify-center">
                      <Instagram className="h-4 w-4 text-slate-600" />
                    </div>
                    <p className="text-slate-600">@dip_dash_</p>
                  </div>
                </div>
              )}

              {invoiceData && (
                <div className="pos-no-print mt-4 flex items-center justify-center gap-3">
                  <button
                    onClick={() => window.print()}
                    className="rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-black"
                  >
                    Print
                  </button>
                  <button
                    onClick={closeInvoicePreview}
                    className="rounded-md border border-purple-200 px-4 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!paying) void confirmTakeawayPayment();
            }}
            className="w-full max-w-md rounded-2xl border border-purple-200 bg-white p-6 shadow-2xl"
          >
            <h2 className="mb-1 text-xl font-semibold text-purple-950">Complete Payment</h2>
            <p className="mb-4 text-sm text-purple-700">Pay now to send this takeaway order to kitchen, or mark it pending for later payment.</p>

            <div className="mb-3">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-purple-700">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value as "CASH" | "CARD" | "UPI");
                  setPaymentError("");
                }}
                className="h-11 w-full rounded-xl border border-purple-200 bg-white px-3 text-sm text-purple-900 outline-none focus:border-purple-400"
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="UPI">UPI</option>
              </select>
            </div>

            {paymentMethod === "CASH" && (
              <div className="mb-3">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-purple-700">Cash Given</label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={cashGiven}
                  onChange={(e) => {
                    setCashGiven(e.target.value);
                    setPaymentError("");
                  }}
                  placeholder="Enter cash amount"
                  className="h-11 rounded-xl border-purple-200 bg-white text-purple-950 placeholder:text-purple-400 focus-visible:ring-purple-300"
                />
                <p className={`mt-1 text-xs ${cashBalance >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  Balance: Rs {Number.isFinite(cashBalance) ? cashBalance.toFixed(2) : "0.00"}
                </p>
              </div>
            )}

            {paymentMethod === "CARD" && (
              <div className="mb-3">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-purple-700">Card Number / Ref</label>
                <Input
                  value={paymentReference}
                  onChange={(e) => {
                    setPaymentReference(e.target.value);
                    setPaymentError("");
                  }}
                  placeholder="Enter card number/reference"
                  className="h-11 rounded-xl border-purple-200 bg-white text-purple-950 placeholder:text-purple-400 focus-visible:ring-purple-300"
                />
              </div>
            )}

            {paymentMethod === "UPI" && (
              <div className="mb-3">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-purple-700">UPI ID</label>
                <Input
                  value={paymentReference}
                  onChange={(e) => {
                    setPaymentReference(e.target.value);
                    setPaymentError("");
                  }}
                  placeholder="Enter UPI ID"
                  className="h-11 rounded-xl border-purple-200 bg-white text-purple-950 placeholder:text-purple-400 focus-visible:ring-purple-300"
                />
              </div>
            )}

            {paymentError && <p className="mb-3 text-sm font-medium text-violet-700">{paymentError}</p>}

            <div className="mb-4 rounded-xl border border-purple-100 bg-purple-50/60 px-3 py-2 text-sm text-purple-800">
              Payable Amount: <b>Rs {total.toFixed(2)}</b>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentError("");
                }}
                disabled={paying || markingPending}
                className="h-11 w-full border-purple-200 text-purple-700 hover:bg-purple-50 disabled:opacity-60"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void markTakeawayPending()}
                disabled={paying || markingPending}
                className="h-11 w-full border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-60"
              >
                {markingPending ? "Saving..." : "Pending"}
              </Button>
              <Button
                type="submit"
                disabled={paying || markingPending}
                className="h-11 w-full bg-[linear-gradient(135deg,#7c3aed_0%,#5b21b6_100%)] text-white hover:opacity-95 disabled:opacity-60"
              >
                {paying ? "Processing..." : "Pay"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}



