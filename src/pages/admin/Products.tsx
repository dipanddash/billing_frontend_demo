import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Edit2,
  Layers,
  Plus,
  
  Trash2,
  Zap,
} from "lucide-react";

import FormModal from "./FormModal";

const API_BASE = "http://192.168.1.18:8000";

interface Product {
  id: string;
  name: string;
  category_name: string;
  category_id: string;
  price: number;
  gst_percent: number;
  image_url: string;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
  image_url?: string;
  image?: string;
}

interface ProductForm {
  name: string;
  categoryId: string;
  price: string;
  gstPercent: string;
  image: File | null;
  isActive: boolean;
}

interface Addon {
  id: string;
  name: string;
  price: number;
  image_url: string;
}

interface AddonForm {
  name: string;
  price: string;
  image: File | null;
}

interface CategoryForm {
  name: string;
  image: File | null;
}

interface Recipe {
  id: number;
  ingredient_name: string;
  product_name?: string;
  product: string;
  ingredient: string;
  quantity: string;
}

interface IngredientOption {
  id: string;
  name: string;
}

interface ComboItem {
  id: string;
  combo: string;
  combo_name?: string;
  product: string;
  product_name: string;
  quantity: number;
}

interface Combo {
  id: string;
  name: string;
  price: number;
  gst_percent: number;
  image_url: string;
  is_active: boolean;
  items: ComboItem[];
}

interface ComboFormItem {
  productId: string;
  quantity: string;
}

interface ComboForm {
  name: string;
  price: string;
  gstPercent: string;
  isActive: boolean;
  image: File | null;
  imageUrl?: string;
  items: ComboFormItem[];
}

type ApiRecord = Record<string, unknown>;
const COMBO_CATEGORY_NAME = "Combo";
const CATALOG_PRODUCTS = "products";
const CATALOG_ADDONS = "addons";

const initialProductForm: ProductForm = {
  name: "",
  categoryId: "",
  price: "",
  gstPercent: "",
  image: null,
  isActive: true,
};

const initialCategoryForm: CategoryForm = {
  name: "",
  image: null,
};

const initialAddonForm: AddonForm = {
  name: "",
  price: "",
  image: null,
};

const initialComboForm: ComboForm = {
  name: "",
  price: "",
  gstPercent: "0",
  isActive: true,
  image: null,
  imageUrl: "",
  items: [{ productId: "", quantity: "1" }],
};

const placeholderCategoryImage =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=200&q=80";

const AdminProducts = () => {
  const [search, setSearch] = useState("");
  const [catalogMode, setCatalogMode] = useState(CATALOG_PRODUCTS);
  const [activeCategory, setActiveCategory] = useState("All");

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [comboLoading, setComboLoading] = useState(false);
  const [showComboModal, setShowComboModal] = useState(false);
  const [showDeleteComboModal, setShowDeleteComboModal] = useState(false);
  const [editCombo, setEditCombo] = useState<Combo | null>(null);
  const [comboForm, setComboForm] = useState<ComboForm>(initialComboForm);
  const [isSavingCombo, setIsSavingCombo] = useState(false);

  const [showProductModal, setShowProductModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>(initialProductForm);
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [editAddon, setEditAddon] = useState<Addon | null>(null);
  const [addonForm, setAddonForm] = useState<AddonForm>(initialAddonForm);
  const [isSavingAddon, setIsSavingAddon] = useState(false);
  const [showDeleteAddonModal, setShowDeleteAddonModal] = useState(false);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(initialCategoryForm);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [selectedRecipeProduct, setSelectedRecipeProduct] = useState<Product | null>(null);
  const [recipeMode, setRecipeMode] = useState<"view" | "edit">("view");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<IngredientOption[]>([]);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeSaving, setRecipeSaving] = useState(false);
  const [newRecipeIngredient, setNewRecipeIngredient] = useState("");
  const [newRecipeQuantity, setNewRecipeQuantity] = useState("");
  const [showRecipeSubmitConfirm, setShowRecipeSubmitConfirm] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("access");
    return {
      Authorization: `Bearer ${token}`,
    };
  };

  useEffect(() => {
    void fetchProducts();
    void fetchCategories();
    void fetchAddons();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/products/products/`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) return;

      const data = await res.json();
      const list: ApiRecord[] = Array.isArray(data) ? data : [];

      const formatted: Product[] = list.map((item) => ({
        id: String(item.id),
        name: String(item.name ?? ""),
        category_name:
          typeof item.category_name === "string"
            ? item.category_name
            : typeof (item.category as ApiRecord | undefined)?.name === "string"
            ? String((item.category as ApiRecord).name)
            : "Uncategorized",
        category_id: String(item.category ?? item.category_id ?? ""),
        price: Number(item.price ?? 0),
        gst_percent: Number(item.gst_percent ?? 0),
        image_url: String(item.image_url ?? item.image ?? ""),
        is_active: Boolean(item.is_active),
      }));

      setProducts(formatted);
    } catch (err) {
      console.error("Fetch products error:", err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/products/categories/`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) return;

      const data = await res.json();
      const list: ApiRecord[] = Array.isArray(data) ? data : [];

      const mapped: Category[] = list.map((c) => ({
        id: String(c.id),
        name: String(c.name ?? ""),
        image_url: String(c.image_url ?? c.image ?? ""),
      }));

      setCategories([
        { id: "all", name: "All", image_url: placeholderCategoryImage },
        ...mapped,
      ]);
    } catch (err) {
      console.error("Fetch categories error:", err);
    }
  };

  const fetchAddons = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/products/addons/`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        setAddons([]);
        return;
      }

      const data = await res.json();
      const list: ApiRecord[] = Array.isArray(data) ? data : [];

      const mapped: Addon[] = list.map((item) => ({
        id: String(item.id ?? ""),
        name: String(item.name ?? ""),
        price: Number(item.price ?? 0),
        image_url: String(item.image_url ?? item.image ?? ""),
      }));
      setAddons(mapped);
    } catch (err) {
      console.error("Fetch addons error:", err);
      setAddons([]);
    }
  };

  const fetchIngredients = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/inventory/ingredients/`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      const list: ApiRecord[] =
        Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      const mapped: IngredientOption[] = list.map((item) => ({
        id: String(item.id),
        name: String(item.name ?? item.ingredient_name ?? item.id),
      }));
      setIngredients(mapped);
    } catch (err) {
      console.error("Fetch ingredients error:", err);
    }
  };

  const fetchCombos = async () => {
    setComboLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/products/combos/`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        setCombos([]);
        return;
      }
      const data = await res.json();
      const list: ApiRecord[] =
        Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

      const mapped: Combo[] = list.map((row) => {
        const itemsRaw: ApiRecord[] = Array.isArray(row.items)
          ? (row.items as ApiRecord[])
          : [];
        return {
          id: String(row.id),
          name: String(row.name ?? ""),
          price: Number(row.price ?? 0),
          gst_percent: Number(row.gst_percent ?? 0),
          image_url: String(row.image_url ?? row.image ?? ""),
          is_active: Boolean(row.is_active),
          items: itemsRaw.map((item) => ({
            id: String(item.id),
            combo: String(item.combo ?? row.id ?? ""),
            combo_name: item.combo_name ? String(item.combo_name) : undefined,
            product: String(item.product ?? ""),
            product_name: String(item.product_name ?? ""),
            quantity: Number(item.quantity ?? 0),
          })),
        };
      });
      setCombos(mapped);
    } catch (err) {
      console.error("Fetch combos error:", err);
      setCombos([]);
    } finally {
      setComboLoading(false);
    }
  };

  const fetchProductRecipes = async (productId: string) => {
    setRecipeLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/products/recipes/?product=${productId}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        setRecipes([]);
        return;
      }
      const data = await res.json();
      const list: ApiRecord[] =
        Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      const mapped: Recipe[] = list.map((item) => ({
        id: Number(item.id),
        ingredient_name: String(item.ingredient_name ?? ""),
        product_name: item.product_name ? String(item.product_name) : undefined,
        product: String(item.product),
        ingredient: String(item.ingredient),
        quantity: String(item.quantity ?? "0"),
      }));
      setRecipes(mapped);
      setRecipeMode(mapped.length ? "view" : "edit");
    } catch (err) {
      console.error("Fetch recipes error:", err);
      setRecipes([]);
    } finally {
      setRecipeLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory =
        activeCategory === "All" || p.category_name === activeCategory;
      return matchSearch && matchCategory;
    });
  }, [products, search, activeCategory]);

  const filteredCombos = useMemo(() => {
    return combos.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  }, [combos, search]);

  const filteredAddons = useMemo(() => {
    return addons.filter((addon) =>
      addon.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [addons, search]);

  const selectedCategoryObj = useMemo(
    () => categories.find((c) => c.id === productForm.categoryId),
    [categories, productForm.categoryId]
  );

  const setEditMode = (product: Product | null) => {
    setEditProduct(product);

    if (!product) {
      setProductForm({ ...initialProductForm, categoryId: categories[1]?.id ?? "" });
      return;
    }

    const categoryMatch =
      categories.find((c) => c.id === product.category_id) ||
      categories.find((c) => c.name === product.category_name);

    setProductForm({
      name: product.name,
      categoryId: categoryMatch?.id ?? "",
      price: String(product.price),
      gstPercent: String(product.gst_percent),
      image: null,
      isActive: product.is_active,
    });
  };

  const openAddProductModal = () => {
    setEditMode(null);
    setShowProductModal(true);
  };

  const openEditProductModal = (product: Product) => {
    setEditMode(product);
    setShowProductModal(true);
  };

  const openAddAddonModal = () => {
    setEditAddon(null);
    setAddonForm(initialAddonForm);
    setShowAddonModal(true);
  };

  const openEditAddonModal = (addon: Addon) => {
    setEditAddon(addon);
    setAddonForm({
      name: addon.name,
      price: String(addon.price),
      image: null,
    });
    setShowAddonModal(true);
  };

  const openRecipeModal = async (product: Product) => {
    setSelectedRecipeProduct(product);
    setNewRecipeIngredient("");
    setNewRecipeQuantity("");
    setShowRecipeModal(true);
    if (!ingredients.length) {
      await fetchIngredients();
    }
    await fetchProductRecipes(product.id);
  };

  const handleSelectCategory = async (categoryName: string) => {
    setActiveCategory(categoryName);
    if (categoryName === COMBO_CATEGORY_NAME) {
      await fetchCombos();
    }
  };

  const openAddComboModal = () => {
    setEditCombo(null);
    setComboForm(initialComboForm);
    setShowComboModal(true);
  };

  const openEditComboModal = (combo: Combo) => {
    setEditCombo(combo);
    setComboForm({
      name: combo.name,
      price: String(combo.price),
      gstPercent: String(combo.gst_percent ?? 0),
      isActive: combo.is_active,
      image: null,
      imageUrl: combo.image_url ?? "",
      items:
        combo.items.length > 0
          ? combo.items.map((item) => ({
              productId: item.product,
              quantity: String(item.quantity),
            }))
          : [{ productId: "", quantity: "1" }],
    });
    setShowComboModal(true);
  };

  const closeComboModal = () => {
    setShowComboModal(false);
    setEditCombo(null);
    setComboForm(initialComboForm);
  };

  const addComboFormItem = () => {
    setComboForm((prev) => ({
      ...prev,
      items: [...prev.items, { productId: "", quantity: "1" }],
    }));
  };

  const removeComboFormItem = (idx: number) => {
    setComboForm((prev) => {
      const next = prev.items.filter((_, i) => i !== idx);
      return {
        ...prev,
        items: next.length > 0 ? next : [{ productId: "", quantity: "1" }],
      };
    });
  };

  const updateComboFormItem = (
    idx: number,
    key: keyof ComboFormItem,
    value: string
  ) => {
    setComboForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === idx ? { ...item, [key]: value } : item
      ),
    }));
  };

  const closeRecipeModal = () => {
    setShowRecipeModal(false);
    setSelectedRecipeProduct(null);
    setRecipes([]);
    setRecipeMode("view");
    setNewRecipeIngredient("");
    setNewRecipeQuantity("");
    setShowRecipeSubmitConfirm(false);
  };

  const submitRecipeList = async () => {
    if (!selectedRecipeProduct) return;
    await fetchProductRecipes(selectedRecipeProduct.id);
    setStatusText("Recipe submitted successfully.");
    closeRecipeModal();
  };

  const closeProductModal = () => {
    setShowProductModal(false);
    setEditProduct(null);
    setProductForm(initialProductForm);
  };

  const closeAddonModal = () => {
    setShowAddonModal(false);
    setEditAddon(null);
    setAddonForm(initialAddonForm);
  };

  const openAddCategoryModal = () => {
    setEditCategory(null);
    setCategoryForm(initialCategoryForm);
    setShowCategoryModal(true);
  };

  const closeAddCategoryModal = () => {
    setEditCategory(null);
    setShowCategoryModal(false);
    setCategoryForm(initialCategoryForm);
  };

  const openEditCategoryModal = (category: Category) => {
    if (category.id === "all") return;
    setEditCategory(category);
    setCategoryForm({ name: category.name, image: null });
    setShowCategoryModal(true);
  };

  const openDeleteCategoryModal = (category: Category) => {
    if (category.id === "all") return;
    setEditCategory(category);
    setShowDeleteCategoryModal(true);
  };

  const saveProduct = async () => {
    if (!productForm.name.trim() || !productForm.price || !productForm.categoryId) {
      setStatusText("Name, category, and price are required.");
      return;
    }

    setIsSavingProduct(true);

    const formData = new FormData();
    formData.append("name", productForm.name.trim());
    formData.append("price", productForm.price);
    formData.append("gst_percent", productForm.gstPercent || "0");
    formData.append("is_active", String(productForm.isActive));

    if (productForm.categoryId !== "all") {
      formData.append("category", productForm.categoryId);
      if (selectedCategoryObj?.name) {
        formData.append("category_name", selectedCategoryObj.name);
      }
    }

    if (productForm.image) {
      formData.append("image", productForm.image);
    }

    try {
      const url = editProduct
        ? `${API_BASE}/api/products/products/${editProduct.id}/`
        : `${API_BASE}/api/products/products/`;

      const res = await fetch(url, {
        method: editProduct ? "PUT" : "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!res.ok) {
        setStatusText("Could not save product. Please verify backend fields.");
        return;
      }

      await fetchProducts();
      setStatusText(editProduct ? "Product updated." : "Product created.");
      closeProductModal();
    } catch (err) {
      console.error("Save product error:", err);
      setStatusText("Could not save product.");
    } finally {
      setIsSavingProduct(false);
    }
  };

  const saveAddon = async () => {
    if (!addonForm.name.trim() || !addonForm.price) {
      setStatusText("Addon name and price are required.");
      return;
    }

    setIsSavingAddon(true);
    const formData = new FormData();
    formData.append("name", addonForm.name.trim());
    formData.append("price", addonForm.price);
    if (addonForm.image) {
      formData.append("image", addonForm.image);
    }

    try {
      const url = editAddon
        ? `${API_BASE}/api/products/addons/${editAddon.id}/`
        : `${API_BASE}/api/products/addons/`;

      const res = await fetch(url, {
        method: editAddon ? "PUT" : "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!res.ok) {
        setStatusText(editAddon ? "Could not update addon." : "Could not create addon.");
        return;
      }

      await fetchAddons();
      setStatusText(editAddon ? "Addon updated." : "Addon created.");
      closeAddonModal();
    } catch (err) {
      console.error("Save addon error:", err);
      setStatusText(editAddon ? "Could not update addon." : "Could not create addon.");
    } finally {
      setIsSavingAddon(false);
    }
  };

  const saveCategory = async () => {
    if (!categoryForm.name.trim()) {
      setStatusText("Category name is required.");
      return;
    }

    setIsSavingCategory(true);

    const formData = new FormData();
    formData.append("name", categoryForm.name.trim());
    if (categoryForm.image) {
      formData.append("image", categoryForm.image);
    }

    try {
      const previousName = editCategory?.name ?? "";
      const url = editCategory
        ? `${API_BASE}/api/products/categories/${editCategory.id}/`
        : `${API_BASE}/api/products/categories/`;

      const res = await fetch(url, {
        method: editCategory ? "PUT" : "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!res.ok) {
        setStatusText(
          editCategory
            ? "Could not update category. Please verify backend category fields."
            : "Could not create category. Please verify backend category fields."
        );
        return;
      }

      await fetchCategories();
      if (!editCategory || activeCategory === previousName) {
        setActiveCategory(categoryForm.name.trim());
      }
      setStatusText(editCategory ? "Category updated." : "Category created.");
      closeAddCategoryModal();
    } catch (err) {
      console.error("Save category error:", err);
      setStatusText(editCategory ? "Could not update category." : "Could not create category.");
    } finally {
      setIsSavingCategory(false);
    }
  };

  const deleteCategory = async () => {
    if (!editCategory || editCategory.id === "all") return;

    try {
      const res = await fetch(`${API_BASE}/api/products/categories/${editCategory.id}/`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        setStatusText("Failed to delete category.");
        return;
      }

      await fetchCategories();
      if (activeCategory === editCategory.name) {
        setActiveCategory("All");
      }
      setStatusText("Category deleted.");
      setShowDeleteCategoryModal(false);
      setEditCategory(null);
    } catch (err) {
      console.error("Delete category failed:", err);
      setStatusText("Failed to delete category.");
    }
  };

  const deleteProduct = async () => {
    if (!editProduct) return;

    try {
      const res = await fetch(`${API_BASE}/api/products/products/${editProduct.id}/`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        setStatusText("Failed to delete product.");
        return;
      }

      await fetchProducts();
      setStatusText("Product deleted.");
      setEditProduct(null);
      setShowDeleteModal(false);
    } catch (err) {
      console.error("Delete failed:", err);
      setStatusText("Failed to delete product.");
    }
  };

  const deleteAddon = async () => {
    if (!editAddon) return;

    try {
      const res = await fetch(`${API_BASE}/api/products/addons/${editAddon.id}/`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        setStatusText("Failed to delete addon.");
        return;
      }

      await fetchAddons();
      setStatusText("Addon deleted.");
      setShowDeleteAddonModal(false);
      setEditAddon(null);
    } catch (err) {
      console.error("Delete addon failed:", err);
      setStatusText("Failed to delete addon.");
    }
  };

  const toggleAvailability = async (id: string) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;

    try {
      await fetch(`${API_BASE}/api/products/products/${id}/`, {
        method: "PATCH",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_active: !product.is_active,
        }),
      });

      await fetchProducts();
    } catch (err) {
      console.error("Toggle failed:", err);
    }
  };

  const updateRecipeQuantity = async (recipe: Recipe, quantity: string) => {
    if (!selectedRecipeProduct || !quantity) return;
    setRecipeSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/products/recipes/${recipe.id}/`, {
        method: "PATCH",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product: selectedRecipeProduct.id,
          ingredient: recipe.ingredient,
          quantity,
        }),
      });
      if (!res.ok) {
        setStatusText("Failed to update recipe quantity.");
        return;
      }
      await fetchProductRecipes(selectedRecipeProduct.id);
      setStatusText("Recipe updated.");
    } catch (err) {
      console.error("Update recipe failed:", err);
      setStatusText("Failed to update recipe quantity.");
    } finally {
      setRecipeSaving(false);
    }
  };

  const deleteRecipeItem = async (recipeId: number) => {
    if (!selectedRecipeProduct) return;
    setRecipeSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/products/recipes/${recipeId}/`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        setStatusText("Failed to delete recipe item.");
        return;
      }
      await fetchProductRecipes(selectedRecipeProduct.id);
      setStatusText("Recipe item deleted.");
    } catch (err) {
      console.error("Delete recipe item failed:", err);
      setStatusText("Failed to delete recipe item.");
    } finally {
      setRecipeSaving(false);
    }
  };

  const addRecipeItem = async () => {
    if (!selectedRecipeProduct || !newRecipeIngredient || !newRecipeQuantity) {
      setStatusText("Select ingredient and quantity.");
      return;
    }
    setRecipeSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/products/recipes/`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product: selectedRecipeProduct.id,
          ingredient: newRecipeIngredient,
          quantity: newRecipeQuantity,
        }),
      });
      if (!res.ok) {
        setStatusText("Failed to add recipe item.");
        return;
      }
      setNewRecipeIngredient("");
      setNewRecipeQuantity("");
      await fetchProductRecipes(selectedRecipeProduct.id);
      setStatusText("Recipe item added.");
    } catch (err) {
      console.error("Add recipe item failed:", err);
      setStatusText("Failed to add recipe item.");
    } finally {
      setRecipeSaving(false);
    }
  };

const saveCombo = async () => {
  if (!comboForm.name.trim() || !comboForm.price) {
    setStatusText("Combo name and price are required.");
    return;
  }

  const validItems = comboForm.items
    .filter((item) => item.productId && Number(item.quantity) > 0)
    .map((item) => ({
      product: item.productId,
      quantity: Number(item.quantity),
    }));

  if (!validItems.length) {
    setStatusText("Add at least one valid combo item.");
    return;
  }

  // optional but recommended: block duplicate product rows
  const productIds = validItems.map((i) => i.product);
  if (new Set(productIds).size !== productIds.length) {
    setStatusText("Same product cannot be added twice in one combo.");
    return;
  }

  setIsSavingCombo(true);
  try {
    const payload = {
      name: comboForm.name.trim(),
      price: comboForm.price,
      gst_percent: comboForm.gstPercent || "0",
      is_active: comboForm.isActive,
      items: validItems,
    };

    const url = editCombo
      ? `${API_BASE}/api/products/combos/${editCombo.id}/`
      : `${API_BASE}/api/products/combos/`;

    const res = await fetch(url, {
      method: editCombo ? "PUT" : "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const msg =
        data?.detail ||
        data?.error ||
        data?.name?.[0] ||
        data?.price?.[0] ||
        data?.items?.[0]?.product?.[0] ||
        data?.items?.[0]?.quantity?.[0] ||
        JSON.stringify(data) ||
        `Failed (${res.status})`;

      setStatusText(msg);
      return;
    }

    const comboId = String(data?.id ?? editCombo?.id ?? "");
    if (comboForm.image && comboId) {
      const imageForm = new FormData();
      imageForm.append("image", comboForm.image);
      await fetch(`${API_BASE}/api/products/combos/${comboId}/`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: imageForm,
      });
    }

    await fetchCombos();
    setStatusText(editCombo ? "Combo updated." : "Combo created.");
    closeComboModal();
  } catch (err) {
    console.error("Save combo error:", err);
    setStatusText("Could not save combo.");
  } finally {
    setIsSavingCombo(false);
  }
};


  const deleteCombo = async () => {
    if (!editCombo) return;
    try {
      const res = await fetch(`${API_BASE}/api/products/combos/${editCombo.id}/`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        setStatusText("Failed to delete combo.");
        return;
      }
      await fetchCombos();
      setShowDeleteComboModal(false);
      setStatusText("Combo deleted.");
      setEditCombo(null);
    } catch (err) {
      console.error("Delete combo failed:", err);
      setStatusText("Failed to delete combo.");
    }
  };

  const toggleComboAvailability = async (comboId: string) => {
    const combo = combos.find((c) => c.id === comboId);
    if (!combo) return;
    try {
      const res = await fetch(`${API_BASE}/api/products/combos/${comboId}/`, {
        method: "PATCH",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: !combo.is_active }),
      });
      if (!res.ok) return;
      await fetchCombos();
    } catch (err) {
      console.error("Toggle combo failed:", err);
    }
  };

  return (
    <div className="w-full">
      <style>{`
        .category-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .category-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="rounded-2xl border border-border bg-gradient-to-br from-white via-violet-50 to-purple-50 p-4 md:p-5 mb-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Products</h1>
            <p className="text-xs text-muted-foreground mt-1">Design, manage, and publish your full cafe menu.</p>
            <div className="mt-3 inline-flex rounded-full border border-violet-200 bg-white p-1 text-xs font-semibold">
              <button
                onClick={() => setCatalogMode(CATALOG_PRODUCTS)}
                className={`rounded-full px-3 py-1 ${catalogMode === CATALOG_PRODUCTS ? "bg-violet-600 text-white" : "text-violet-700"}`}
              >
                Products
              </button>
              <button
                onClick={() => {
                  setCatalogMode(CATALOG_ADDONS);
                  void fetchAddons();
                }}
                className={`rounded-full px-3 py-1 ${catalogMode === CATALOG_ADDONS ? "bg-violet-600 text-white" : "text-violet-700"}`}
              >
                Addons
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {catalogMode === CATALOG_PRODUCTS && (
              <button
                onClick={openAddCategoryModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-full border border-purple-300 bg-white hover:bg-purple-50 transition"
              >
                <Layers className="w-3.5 h-3.5" />
                Add Category
              </button>
            )}

            <button
              onClick={openAddAddonModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-full bg-purple-600 text-white hover:bg-purple-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Addon
            </button>

            {catalogMode === CATALOG_PRODUCTS && (
              <button
                onClick={activeCategory === COMBO_CATEGORY_NAME ? openAddComboModal : openAddProductModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-full bg-purple-600 text-white hover:bg-purple-700 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                {activeCategory === COMBO_CATEGORY_NAME ? "Add Combo" : "Add Product"}
              </button>
            )}
          </div>
        </div>

        
      </div>

      {statusText && (
        <div className="mb-4 rounded-xl border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs text-purple-900">
          {statusText}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {catalogMode === CATALOG_PRODUCTS && (
        <aside className="lg:col-span-3 xl:col-span-3 h-fit rounded-2xl border border-purple-100 bg-gradient-to-b from-white to-violet-50/60 p-3 shadow-sm">
          <div className="mb-3 rounded-xl border border-purple-100 bg-white/90 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-purple-700">
              Category Control
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Filter products by menu groups instantly.</p>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-medium text-violet-700">
              <Layers className="h-3.5 w-3.5" />
              {categories.length + 1} categories
            </div>
          </div>

          <div className="category-scroll max-h-[560px] overflow-y-auto space-y-2 pr-0">
            {categories.map((cat) => {
              const active = activeCategory === cat.name;
              const img = cat.image_url || cat.image || placeholderCategoryImage;
              const countForCategory =
                cat.name === "All"
                  ? products.length
                  : products.filter((p) => p.category_name === cat.name).length;

              return (
                <div
                  key={cat.id}
                  className={`group w-full rounded-xl border p-2.5 text-left transition ${
                    active
                      ? "border-purple-500 bg-purple-50 shadow-[0_6px_18px_rgba(124,58,237,0.14)]"
                      : "border-purple-100 bg-white/80 hover:border-purple-300 hover:bg-purple-50/60"
                  }`}
                >
                  <button onClick={() => void handleSelectCategory(cat.name)} className="w-full text-left">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-xl ring-2 ring-white shadow-sm">
                        <img src={img} alt={cat.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-xs font-semibold ${
                            active ? "text-purple-800" : "text-foreground"
                          }`}
                        >
                          {cat.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {countForCategory} item{countForCategory === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                  </button>

                  {cat.id !== "all" && (
                    <div className="mt-2 flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditCategoryModal(cat)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-purple-200 bg-white text-purple-700 hover:bg-purple-50"
                        title={`Edit ${cat.name}`}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => openDeleteCategoryModal(cat)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
                        title={`Delete ${cat.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            <div
              className={`group w-full rounded-xl border p-2.5 text-left transition ${
                activeCategory === COMBO_CATEGORY_NAME
                  ? "border-purple-500 bg-purple-50 shadow-[0_6px_18px_rgba(124,58,237,0.14)]"
                  : "border-purple-100 bg-white/80 hover:border-purple-300 hover:bg-purple-50/60"
              }`}
            >
              <button
                onClick={() => void handleSelectCategory(COMBO_CATEGORY_NAME)}
                className="w-full text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-xl ring-2 ring-white shadow-sm">
                    <img
                      src={placeholderCategoryImage}
                      alt={COMBO_CATEGORY_NAME}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-xs font-semibold ${
                        activeCategory === COMBO_CATEGORY_NAME
                          ? "text-purple-800"
                          : "text-foreground"
                      }`}
                    >
                      {COMBO_CATEGORY_NAME}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {combos.length} combo{combos.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </aside>
        )}

        <section className={catalogMode === CATALOG_PRODUCTS ? "lg:col-span-9 xl:col-span-9" : "lg:col-span-12 xl:col-span-12"}>
          <div className="relative mb-4 flex items-center justify-between gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                catalogMode === CATALOG_ADDONS
                  ? "Search addons..."
                  : activeCategory === COMBO_CATEGORY_NAME
                  ? "Search combos..."
                  : "Search products..."
              }
              className="w-full md:w-[360px] rounded-xl border border-purple-200 bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm outline-none focus:border-purple-400"
            />
           
            <span className="hidden rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-700 md:inline-flex">
              {catalogMode === CATALOG_ADDONS
                ? "All Addons"
                : activeCategory === "All"
                ? "All Categories"
                : activeCategory}
            </span>
          </div>

          <div
            className={
              catalogMode === CATALOG_ADDONS
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-5 gap-4"
                : "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4"
            }
          >
            {catalogMode === CATALOG_ADDONS &&
              filteredAddons.map((addon, idx) => (
              <motion.div
                key={addon.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition"
              >
                <div className="h-36 bg-purple-50 relative">
                  {addon.image_url ? (
                    <img src={addon.image_url} alt={addon.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="h-full flex items-center justify-center text-xl">Addon</div>
                  )}
                </div>

                <div className="p-3">
                  <h3 className="font-semibold text-sm leading-tight">{addon.name}</h3>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-base font-bold">Rs.{addon.price.toFixed(2)}</p>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditAddonModal(addon)}
                        className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-purple-50"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditAddon(addon);
                          setShowDeleteAddonModal(true);
                        }}
                        className="w-7 h-7 rounded-full border border-rose-200 text-rose-600 flex items-center justify-center hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {catalogMode === CATALOG_PRODUCTS && activeCategory !== COMBO_CATEGORY_NAME &&
              filteredProducts.map((product, idx) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition"
              >
                <div className="h-36 bg-purple-50 relative">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="h-full flex items-center justify-center text-xl">?</div>
                  )}

                  <button
                    onClick={() => toggleAvailability(product.id)}
                    className={`absolute top-2 right-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      product.is_active
                        ? "bg-purple-100 text-purple-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Zap className="w-3 h-3" />
                    {product.is_active ? "Active" : "Inactive"}
                  </button>
                </div>

                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-sm leading-tight">{product.name}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{product.category_name}</p>
                    </div>
                    <button
                      onClick={() => openRecipeModal(product)}
                      className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700 hover:bg-violet-100"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      Recipe
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="text-base font-bold">Rs.{product.price.toFixed(2)}</p>
                      <p className="text-[11px] text-muted-foreground">GST {product.gst_percent}%</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditProductModal(product)}
                        className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-purple-50"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          setEditProduct(product);
                          setShowDeleteModal(true);
                        }}
                        className="w-7 h-7 rounded-full border border-rose-200 text-rose-600 flex items-center justify-center hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {catalogMode === CATALOG_PRODUCTS && activeCategory === COMBO_CATEGORY_NAME &&
              (comboLoading ? (
                <div className="col-span-full rounded-xl border border-dashed border-violet-200 bg-violet-50 p-5 text-sm text-violet-700">
                  Loading combos...
                </div>
              ) : (
                filteredCombos.map((combo, idx) => (
                  <motion.div
                    key={combo.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition"
                  >
                    <div className="h-36 bg-violet-50 relative">
                      {combo.image_url ? (
                        <img src={combo.image_url} alt={combo.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="h-full flex items-center justify-center text-xl">Combo</div>
                      )}
                      <button
                        onClick={() => void toggleComboAvailability(combo.id)}
                        className={`absolute top-2 right-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          combo.is_active ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <Zap className="w-3 h-3" />
                        {combo.is_active ? "Active" : "Inactive"}
                      </button>
                    </div>

                    <div className="p-3">
                      <h3 className="font-semibold text-sm leading-tight">{combo.name}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {combo.items.length} item{combo.items.length === 1 ? "" : "s"}
                      </p>
                      <div className="mt-2 space-y-0.5">
                        {combo.items.slice(0, 2).map((item) => (
                          <p key={item.id} className="text-[11px] text-muted-foreground truncate">
                            {item.product_name} x {item.quantity}
                          </p>
                        ))}
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-base font-bold">Rs.{combo.price.toFixed(2)}</p>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEditComboModal(combo)}
                            className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-purple-50"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditCombo(combo);
                              setShowDeleteComboModal(true);
                            }}
                            className="w-7 h-7 rounded-full border border-rose-200 text-rose-600 flex items-center justify-center hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">GST {combo.gst_percent}%</p>
                    </div>
                  </motion.div>
                ))
              ))}
          </div>
        </section>
      </div>

      <FormModal
        open={showProductModal}
        title={editProduct ? "Edit Product" : "Add Product"}
        onClose={closeProductModal}
      >
        <div className="space-y-4">
          <input
            value={productForm.name}
            onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Product name"
            className="w-full border p-2.5 rounded-lg"
          />

          <select
            value={productForm.categoryId}
            onChange={(e) => setProductForm((prev) => ({ ...prev, categoryId: e.target.value }))}
            className="w-full border p-2.5 rounded-lg"
          >
            <option value="">Select category</option>
            {categories
              .filter((c) => c.id !== "all")
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>

          <div className="grid grid-cols-2 gap-3">
            <input
              value={productForm.price}
              onChange={(e) => setProductForm((prev) => ({ ...prev, price: e.target.value }))}
              placeholder="Price"
              type="number"
              className="w-full border p-2.5 rounded-lg"
            />

            <input
              value={productForm.gstPercent}
              onChange={(e) => setProductForm((prev) => ({ ...prev, gstPercent: e.target.value }))}
              placeholder="GST %"
              type="number"
              className="w-full border p-2.5 rounded-lg"
            />
          </div>

          <input
            type="file"
            onChange={(e) =>
              setProductForm((prev) => ({
                ...prev,
                image: e.target.files?.[0] ?? null,
              }))
            }
          />

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={productForm.isActive}
              onChange={(e) =>
                setProductForm((prev) => ({
                  ...prev,
                  isActive: e.target.checked,
                }))
              }
            />
            Product is active
          </label>

          <button
            onClick={saveProduct}
            disabled={isSavingProduct}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white py-2.5 rounded-lg"
          >
            {isSavingProduct ? "Saving..." : "Save Product"}
          </button>
        </div>
      </FormModal>

      <FormModal
        open={showCategoryModal}
        title={editCategory ? "Edit Category" : "Add Category"}
        onClose={closeAddCategoryModal}
      >
        <div className="space-y-4">
          <input
            value={categoryForm.name}
            onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Category name"
            className="w-full border p-2.5 rounded-lg"
          />

          <input
            type="file"
            onChange={(e) =>
              setCategoryForm((prev) => ({
                ...prev,
                image: e.target.files?.[0] ?? null,
              }))
            }
          />

          <button
            onClick={saveCategory}
            disabled={isSavingCategory}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white py-2.5 rounded-lg"
          >
            {isSavingCategory ? "Saving..." : editCategory ? "Update Category" : "Save Category"}
          </button>
        </div>
      </FormModal>

      <FormModal
        open={showAddonModal}
        title={editAddon ? "Edit Addon" : "Add Addon"}
        onClose={closeAddonModal}
      >
        <div className="space-y-4">
          <input
            value={addonForm.name}
            onChange={(e) => setAddonForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Addon name"
            className="w-full border p-2.5 rounded-lg"
          />

          <input
            value={addonForm.price}
            onChange={(e) => setAddonForm((prev) => ({ ...prev, price: e.target.value }))}
            placeholder="Price"
            type="number"
            className="w-full border p-2.5 rounded-lg"
          />

          <input
            type="file"
            onChange={(e) =>
              setAddonForm((prev) => ({
                ...prev,
                image: e.target.files?.[0] ?? null,
              }))
            }
          />

          <button
            onClick={saveAddon}
            disabled={isSavingAddon}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white py-2.5 rounded-lg"
          >
            {isSavingAddon ? "Saving..." : editAddon ? "Update Addon" : "Save Addon"}
          </button>
        </div>
      </FormModal>

      <FormModal
        open={showDeleteCategoryModal}
        title="Delete Category"
        onClose={() => {
          setShowDeleteCategoryModal(false);
          setEditCategory(null);
        }}
      >
        <div className="space-y-4">
          <p>Delete category "{editCategory?.name}"?</p>
          <button
            onClick={deleteCategory}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg"
          >
            Delete Category
          </button>
        </div>
      </FormModal>

      <FormModal open={showDeleteModal} title="Delete Product" onClose={() => setShowDeleteModal(false)}>
        <div className="space-y-4">
          <p>Delete this product?</p>
          <button
            onClick={deleteProduct}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg"
          >
            Delete
          </button>
        </div>
      </FormModal>

      <FormModal
        open={showDeleteAddonModal}
        title="Delete Addon"
        onClose={() => {
          setShowDeleteAddonModal(false);
          setEditAddon(null);
        }}
      >
        <div className="space-y-4">
          <p>Delete addon "{editAddon?.name}"?</p>
          <button
            onClick={deleteAddon}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg"
          >
            Delete Addon
          </button>
        </div>
      </FormModal>

      <FormModal
        open={showComboModal}
        title={editCombo ? "Edit Combo" : "Add Combo"}
        onClose={closeComboModal}
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-violet-800">Combo Name</label>
            <input
              value={comboForm.name}
              onChange={(e) => setComboForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter combo name"
              className="w-full border p-2.5 rounded-lg"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-violet-800">Price</label>
            <input
              value={comboForm.price}
              onChange={(e) => setComboForm((prev) => ({ ...prev, price: e.target.value }))}
              placeholder="Enter combo price"
              type="number"
              className="w-full border p-2.5 rounded-lg"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-violet-800">GST Percent</label>
            <input
              value={comboForm.gstPercent}
              onChange={(e) => setComboForm((prev) => ({ ...prev, gstPercent: e.target.value }))}
              placeholder="Enter GST %"
              type="number"
              className="w-full border p-2.5 rounded-lg"
            />
          </div>

          {(comboForm.imageUrl || comboForm.image) && (
            <div className="rounded-lg border border-violet-100 bg-violet-50/40 p-2">
              <img
                src={comboForm.image ? URL.createObjectURL(comboForm.image) : comboForm.imageUrl}
                alt="Combo preview"
                className="h-28 w-full rounded-md object-cover"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-violet-800">Combo Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setComboForm((prev) => ({
                  ...prev,
                  image: e.target.files?.[0] ?? null,
                }))
              }
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={comboForm.isActive}
              onChange={(e) => setComboForm((prev) => ({ ...prev, isActive: e.target.checked }))}
            />
            Combo is active
          </label>

          <div className="space-y-2 rounded-lg border border-violet-100 bg-violet-50/40 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                Combo Items
              </p>
              <button
                onClick={addComboFormItem}
                className="rounded-md border border-violet-200 px-2 py-1 text-[11px] font-medium text-violet-700 hover:bg-violet-100"
              >
                Add Item
              </button>
            </div>

            {comboForm.items.map((item, idx) => (
              <div key={`${idx}-${item.productId}`} className="grid grid-cols-12 gap-2">
                <select
                  value={item.productId}
                  onChange={(e) => updateComboFormItem(idx, "productId", e.target.value)}
                  className="col-span-7 rounded-lg border p-2 text-sm"
                >
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <input
                  value={item.quantity}
                  onChange={(e) => updateComboFormItem(idx, "quantity", e.target.value)}
                  type="number"
                  min="1"
                  placeholder="Qty"
                  className="col-span-3 rounded-lg border p-2 text-sm"
                />
                <button
                  onClick={() => removeComboFormItem(idx)}
                  className="col-span-2 inline-flex items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                  title="Remove item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={saveCombo}
            disabled={isSavingCombo}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white py-2.5 rounded-lg"
          >
            {isSavingCombo ? "Saving..." : editCombo ? "Update Combo" : "Save Combo"}
          </button>
        </div>
      </FormModal>

      <FormModal
        open={showDeleteComboModal}
        title="Delete Combo"
        onClose={() => {
          setShowDeleteComboModal(false);
          setEditCombo(null);
        }}
      >
        <div className="space-y-4">
          <p>Delete combo "{editCombo?.name}"?</p>
          <button
            onClick={deleteCombo}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg"
          >
            Delete Combo
          </button>
        </div>
      </FormModal>

      <FormModal
        open={showRecipeModal}
        title={selectedRecipeProduct ? `Recipe - ${selectedRecipeProduct.name}` : "Recipe"}
        onClose={closeRecipeModal}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex rounded-full border border-violet-200 bg-violet-50 p-1 text-xs font-semibold">
              <button
                onClick={() => setRecipeMode("view")}
                className={`rounded-full px-3 py-1 ${recipeMode === "view" ? "bg-violet-600 text-white" : "text-violet-700"}`}
              >
                View Mode
              </button>
              <button
                onClick={() => setRecipeMode("edit")}
                className={`rounded-full px-3 py-1 ${recipeMode === "edit" ? "bg-violet-600 text-white" : "text-violet-700"}`}
              >
                Edit Mode
              </button>
            </div>
          </div>

          {recipeLoading ? (
            <p className="text-sm text-muted-foreground">Loading recipe...</p>
          ) : (
            <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
              {!recipes.length ? (
                <div className="rounded-lg border border-dashed border-violet-200 bg-violet-50 px-3 py-4 text-sm text-violet-700">
                  No recipe items found. Add ingredients in Edit Mode.
                </div>
              ) : (
                recipes.map((recipe) => (
                  <div key={recipe.id} className="rounded-lg border border-border p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{recipe.ingredient_name || recipe.ingredient}</p>
                      {recipeMode === "view" ? (
                        <span className="rounded-md bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700">
                          Qty: {recipe.quantity}
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.001"
                            defaultValue={recipe.quantity}
                            onBlur={(e) => void updateRecipeQuantity(recipe, e.target.value)}
                            className="w-24 rounded-md border p-1.5 text-xs"
                          />
                          <button
                            onClick={() => void deleteRecipeItem(recipe.id)}
                            disabled={recipeSaving}
                            className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {recipeMode === "edit" && (
            <div className="space-y-2 rounded-lg border border-violet-100 bg-violet-50/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Add Ingredient</p>
              <select
                value={newRecipeIngredient}
                onChange={(e) => setNewRecipeIngredient(e.target.value)}
                className="w-full rounded-lg border p-2 text-sm"
              >
                <option value="">Select ingredient</option>
                {ingredients.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.001"
                value={newRecipeQuantity}
                onChange={(e) => setNewRecipeQuantity(e.target.value)}
                placeholder="Quantity (e.g. 0.250)"
                className="w-full rounded-lg border p-2 text-sm"
              />
              <button
                onClick={addRecipeItem}
                disabled={recipeSaving}
                className="w-full rounded-lg bg-violet-600 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
              >
                {recipeSaving ? "Saving..." : "Add Line"}
              </button>
            </div>
          )}

          {recipeMode === "view" && recipes.length > 0 && (
            <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
              {!showRecipeSubmitConfirm ? (
                <button
                  onClick={() => setShowRecipeSubmitConfirm(true)}
                  className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Submit Recipe
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-emerald-800">
                    Confirm submit this recipe list?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowRecipeSubmitConfirm(false)}
                      className="w-1/2 rounded-lg border border-emerald-300 bg-white py-2 text-xs font-medium text-emerald-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => void submitRecipeList()}
                      className="w-1/2 rounded-lg bg-emerald-600 py-2 text-xs font-medium text-white hover:bg-emerald-700"
                    >
                      Confirm Submit
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </FormModal>
    </div>
  );
};

export default AdminProducts;
