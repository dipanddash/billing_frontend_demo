import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShoppingCart, Tag } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const BASE_URL = "http://192.168.1.18:8000";
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

interface CartItem {
  key: string;
  type: "product" | "combo";
  id: string;
  name: string;
  price: number;
  qty: number;
  image?: string;
  gst_percent: number;
  comboItems?: ComboItem[];
}

interface OrderDetails {
  id: string;
  order_type: string;
  customer_name: string;
  phone?: string;
  table_number?: string;
  token_number?: string;
  session?: string;
}

interface PendingSelection {
  type: "product" | "combo";
  product?: Product;
  combo?: Combo;
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
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "UPI">("CASH");
  const [paymentReference, setPaymentReference] = useState("");
  const [cashGiven, setCashGiven] = useState("");
  const [discountPercentInput, setDiscountPercentInput] = useState("");
  const [discountAmountInput, setDiscountAmountInput] = useState("");
  const [discountMode, setDiscountMode] = useState<"percent" | "amount">("amount");
  const [paymentError, setPaymentError] = useState("");
  const [paying, setPaying] = useState(false);
  const [markingPending, setMarkingPending] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
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

        const err = await res.json().catch(() => ({}));
        lastError = String(
          err?.detail ?? err?.error ?? err?.message ?? `Take Away failed (HTTP ${res.status}).`
        );
      }

      if (!data) throw new Error(lastError);
      const createdId = String(data?.id ?? data?.order_id ?? data?.order?.id ?? "");
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

        const err = await res.json().catch(() => ({}));
        lastError = String(
          err?.detail ?? err?.error ?? err?.message ?? `${partner} failed (HTTP ${res.status}).`
        );
      }

      if (!data) throw new Error(lastError);
      const createdId = String(data?.id ?? data?.order_id ?? data?.order?.id ?? "");
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
  }, [quickStartOrderType, token]);

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

  /* ================= CART ================= */

  const addToCart = (p: Product, qty = 1) => {
    if (!hasBillingContext) {
      setPosNotice(getContextError());
      return;
    }
    setCart(prev => {
      const key = `product:${p.id}`;
      const ex = prev.find(i => i.key === key);
      if (ex) {
        return prev.map(i =>
          i.key === key ? { ...i, qty: i.qty + qty } : i
        );
      }
      return [
        ...prev,
        {
          key,
          type: "product",
          id: p.id,
          name: p.name,
          price: parseFloat(p.price),
          qty,
          image: p.image,
          gst_percent: Number(p.gst_percent || 0),
        },
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
    setPendingSelection({ type: "product", product });
    setPendingQty("1");
    setPendingQtyError("");
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
    setPendingSelection({ type: "combo", combo });
    setPendingQty("1");
    setPendingQtyError("");
  };

  const closeQtyModal = () => {
    setPendingSelection(null);
    setPendingQty("1");
    setPendingQtyError("");
  };

  const confirmPendingQty = () => {
    if (!pendingSelection) return;
    const qtyNum = Number(pendingQty);
    if (!Number.isInteger(qtyNum) || qtyNum <= 0) {
      setPendingQtyError("Enter a valid quantity greater than 0.");
      return;
    }

    if (pendingSelection.type === "product" && pendingSelection.product) {
      addToCart(pendingSelection.product, qtyNum);
    } else if (pendingSelection.type === "combo" && pendingSelection.combo) {
      addComboToCart(pendingSelection.combo, qtyNum);
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

  const gst = cart.reduce((s, i) => s + (i.price * i.qty * i.gst_percent) / 100, 0);

  const grossTotal = subtotal + gst;
  const rawDiscountAmount = parseNonNegative(discountAmountInput) ?? 0;
  const discountAmount = Math.min(rawDiscountAmount, grossTotal);
  const total = Math.max(0, grossTotal - discountAmount);
  const cashGivenAmount = Number(cashGiven || 0);
  const cashBalance = Number.isFinite(cashGivenAmount) ? cashGivenAmount - total : 0;

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

  useEffect(() => {
    if (cart.length > 0) return;
    setDiscountPercentInput("");
    setDiscountAmountInput("");
    setDiscountMode("amount");
  }, [cart.length]);

  useEffect(() => {
    if (discountMode === "percent") {
      syncFromPercent(discountPercentInput, grossTotal);
      return;
    }
    syncFromAmount(discountAmountInput, grossTotal);
  }, [grossTotal]); // eslint-disable-line react-hooks/exhaustive-deps

  const getExpandedItems = () => {
    const expandedItems: Array<{ product: string; quantity: number }> = [];
    cart.forEach((c) => {
      if (c.type === "product") {
        expandedItems.push({ product: c.id, quantity: c.qty });
        return;
      }
      (c.comboItems ?? []).forEach((comboItem) => {
        if (!comboItem.product) return;
        expandedItems.push({
          product: comboItem.product,
          quantity: Number(comboItem.quantity || 0) * c.qty,
        });
      });
    });
    return expandedItems;
  };

  const syncCartItems = async (resolvedOrderId: string) => {
    const expandedItems = getExpandedItems();
    const mergedByProduct = expandedItems.reduce<Record<string, number>>((acc, item) => {
      if (!item.product || item.quantity <= 0) return acc;
      acc[item.product] = (acc[item.product] ?? 0) + item.quantity;
      return acc;
    }, {});

    const addRes = await fetch(`${BASE_URL}/api/orders/add-items/${resolvedOrderId}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        items: Object.entries(mergedByProduct).map(([product, quantity]) => ({
          product,
          quantity,
        })),
        ...(discountAmount > 0 ? { discount_amount: Number(discountAmount.toFixed(2)) } : {}),
      }),
    });
    if (!addRes.ok) {
      const err = await addRes.json().catch(() => ({}));
      throw new Error(String(err?.detail ?? err?.error ?? "Failed to add items."));
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
          const err = await createRes.json().catch(() => ({}));
          throw new Error(String(err?.error ?? err?.detail ?? "Unable to create dine-in order."));
        }

        const created = await createRes.json();
        const createdId = String(created?.id ?? created?.order_id ?? created?.order?.id ?? "");
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
        let err: any = {};
        try {
          err = raw ? JSON.parse(raw) : {};
        } catch {
          err = { raw };
        }
        const msg =
          (Array.isArray(err) && err.length > 0 ? String(err[0]) : "") ||
          (Array.isArray(err?.detail) && err.detail.length > 0 ? String(err.detail[0]) : "") ||
          String(err?.detail ?? err?.error ?? err?.message ?? err?.raw ?? "Payment failed.");
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
      navigate("/staff/kitchen");
    } catch (error) {
      console.error(error);
      setPaymentError(error instanceof Error ? error.message : "Payment failed.");
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
  }, [filteredProducts, filteredCombos, navigate, showTakeawayModal, showPaymentModal, cart, creatingTakeaway, hasBillingContext, pendingSelection, isDineInContext]);

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

  return (
    <div className="min-h-screen bg-[linear-gradient(145deg,#f6f0ff_0%,#f9f7ff_45%,#efe6ff_100%)] p-4 md:p-6">
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 lg:grid-cols-12">
        {/* LEFT */}
        <div className="space-y-6 lg:col-span-8">
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
        <div className="lg:col-span-4">
          <Card className="sticky top-1 flex h-[12in] flex-col overflow-hidden rounded-3xl border border-purple-200/70 bg-white shadow-[0_22px_55px_rgba(91,33,182,0.18)]">
            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-purple-100 bg-[linear-gradient(120deg,#f4ecff_0%,#ffffff_100%)] p-4">
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
              <div className="space-y-1 border-b border-purple-100 bg-purple-50/70 px-4 py-3 text-sm">
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
            <div className="flex-1 overflow-auto p-3">
              <div className="mb-2 grid grid-cols-12 border-b border-purple-100 pb-2 text-[11px] font-semibold uppercase tracking-wide text-purple-600">
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
                const final = base + (base * rate) / 100;

                return (
                  <div
                    key={item.key}
                    className="mb-2 grid grid-cols-12 items-center rounded-xl border border-purple-100 bg-purple-50/40 px-2 py-2 text-[12px]"
                  >
                    <div className="col-span-5 flex items-center gap-2">
                      <img
                        src={item.image || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=120&q=80"}
                        className="h-9 w-9 rounded-md object-cover"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-purple-950 break-words">{item.name}</p>
                        <p className="text-[11px] text-purple-600/75">
                          Rs {item.price} x {item.qty}
                        </p>
                      </div>
                    </div>

                    <div className="col-span-3 flex items-center justify-center gap-1">
                      <button
                        onClick={() => updateQty(item.key, -1)}
                        className="h-6 w-6 rounded-md bg-white text-sm font-bold text-purple-700 shadow-sm hover:bg-purple-100"
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
                        className="h-6 w-12 rounded-md border border-purple-200 bg-white px-1 text-center font-semibold text-purple-900 outline-none focus:border-purple-400"
                      />
                      <button
                        onClick={() => updateQty(item.key, 1)}
                        className="h-6 w-6 rounded-md bg-white text-sm font-bold text-purple-700 shadow-sm hover:bg-purple-100"
                      >
                        +
                      </button>
                    </div>
                    <div className="col-span-2 text-center font-medium text-purple-800">{rate}%</div>
                    <div className="col-span-2 text-right font-semibold text-purple-900">
                      Rs {final.toFixed(0)}
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
                <div className="space-y-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-purple-700">Discount Percent (%)</label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={discountPercentInput}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setDiscountMode("percent");
                          setDiscountPercentInput(raw);
                          syncFromPercent(raw, grossTotal);
                        }}
                        placeholder="Enter percent"
                        className="h-9 rounded-lg border-purple-200 bg-white pr-7 text-xs text-purple-950 placeholder:text-purple-400 focus-visible:ring-purple-300"
                      />
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-purple-600">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-purple-700">Discount Amount (Rs)</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-purple-600">Rs</span>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={discountAmountInput}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setDiscountMode("amount");
                          setDiscountAmountInput(raw);
                          syncFromAmount(raw, grossTotal);
                        }}
                        placeholder="Enter amount"
                        className="h-9 rounded-lg border-purple-200 bg-white pl-8 text-xs text-purple-950 placeholder:text-purple-400 focus-visible:ring-purple-300"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between text-sm text-purple-800">
                <span>Discount</span>
                <span>- Rs {discountAmount.toFixed(2)}</span>
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
          <div className="w-full max-w-sm rounded-2xl border border-purple-200 bg-white p-6 shadow-2xl">
            <h2 className="mb-1 text-xl font-semibold text-purple-950">Add Quantity</h2>
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
                placeholder="Enter quantity"
                value={pendingQty}
                onChange={(e) => {
                  setPendingQty(e.target.value);
                  if (pendingQtyError) setPendingQtyError("");
                }}
                className="mb-3 h-11 rounded-xl border-purple-200 bg-white text-purple-950 placeholder:text-purple-400 focus-visible:ring-purple-300"
              />
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
                  Add
                </Button>
              </div>
            </form>
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
