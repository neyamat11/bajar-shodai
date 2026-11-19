import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  Baby,
  Check,
  Edit2,
  Layers,
  Loader2,
  PackagePlus,
  Plus,
  Save,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import {
  featuredProductsApi,
  productsApi,
  type FeaturedProductItem,
  type ProductRow,
} from "@/api/products";
import { homeSectionsApi, type HomeSectionData } from "@/api/homeSections";
import { categoriesApi } from "@/api/catalog";
import { errorMessage } from "@/api/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { SortableList } from "@/components/shared/Sortable";
import { Thumb } from "@/components/shared/Thumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { money } from "@/lib/format";
import { tr } from "@/i18n";
import { CardListSkeleton } from "@/components/shared/skeletons";
import { useProductNameDisplay } from "@/lib/productName";
import { useInfiniteList } from "@/hooks/useInfiniteList";

const MAX_FEATURED = 18;

function getSectionIcon(slug: string) {
  switch (slug) {
    case "featured":
      return Sparkles;
    case "grocery":
      return ShoppingBag;
    case "fast-food":
      return Utensils;
    case "baby-care":
      return Baby;
    default:
      return Layers;
  }
}

export default function HomeSections() {
  const qc = useQueryClient();
  const { format: formatName } = useProductNameDisplay();

  // Load featured products (Slot 1 to 18)
  const { data: featuredItems, isLoading: loadingFeatured } = useQuery({
    queryKey: ["featured-products"],
    queryFn: featuredProductsApi.list,
  });

  // Load custom home sections (Grocery, Fast Food, Baby Care, etc.)
  const { data: customSections, isLoading: loadingSections } = useQuery({
    queryKey: ["home-sections"],
    queryFn: homeSectionsApi.list,
  });

  const [activeTab, setActiveTab] = useState<string>("featured");

  // Local state for featured products
  const [localFeatured, setLocalFeatured] = useState<FeaturedProductItem[]>([]);

  // Local state for custom section products keyed by sectionId
  const [localSections, setLocalSections] = useState<Record<string, FeaturedProductItem[]>>({});

  // Sync featured from server
  useEffect(() => {
    if (featuredItems) {
      setLocalFeatured(featuredItems);
    }
  }, [featuredItems]);

  // Sync custom sections from server
  useEffect(() => {
    if (customSections) {
      const map: Record<string, FeaturedProductItem[]> = {};
      customSections.forEach((s) => {
        map[s.id] = s.products;
      });
      setLocalSections(map);
    }
  }, [customSections]);

  // Modal for adding products
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCat, setSelectedCat] = useState("");

  // Modal for editing section settings (title, subtitle, etc.)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editTitleBn, setEditTitleBn] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");
  const [editSubtitleBn, setEditSubtitleBn] = useState("");
  const [editCategorySlug, setEditCategorySlug] = useState("");

  // Current active section metadata
  const currentSection = useMemo(() => {
    if (activeTab === "featured") return null;
    return customSections?.find((s) => s.id === activeTab || s.slug === activeTab) || null;
  }, [activeTab, customSections]);

  // Current working items for active tab
  const currentItems = useMemo(() => {
    if (activeTab === "featured") return localFeatured;
    if (!currentSection) return [];
    return localSections[currentSection.id] || [];
  }, [activeTab, localFeatured, localSections, currentSection]);

  const maxItems = activeTab === "featured" ? MAX_FEATURED : currentSection?.maxProducts || 6;

  // Change detection
  const hasChanges = useMemo(() => {
    if (activeTab === "featured") {
      if (!featuredItems) return false;
      if (featuredItems.length !== localFeatured.length) return true;
      return localFeatured.some((item, idx) => item.id !== featuredItems[idx]?.id);
    }
    if (!currentSection) return false;
    const serverProds = currentSection.products || [];
    const localProds = localSections[currentSection.id] || [];
    if (serverProds.length !== localProds.length) return true;
    return localProds.some((item, idx) => item.id !== serverProds[idx]?.id);
  }, [activeTab, featuredItems, localFeatured, currentSection, localSections]);

  // Save featured mutation
  const saveFeaturedMutation = useMutation({
    mutationFn: (ids: string[]) => featuredProductsApi.update(ids),
    onSuccess: (updated) => {
      setLocalFeatured(updated);
      void qc.invalidateQueries({ queryKey: ["featured-products"] });
      toast.success(tr("আজকের তাজা বাজার (18 Featured items) saved successfully!"));
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  // Save custom section products mutation
  const saveSectionMutation = useMutation({
    mutationFn: ({ sectionId, ids }: { sectionId: string; ids: string[] }) =>
      homeSectionsApi.updateProducts(sectionId, ids),
    onSuccess: (updated) => {
      setLocalSections((prev) => ({ ...prev, [updated.id]: updated.products }));
      void qc.invalidateQueries({ queryKey: ["home-sections"] });
      toast.success(tr(`Section "${updated.titleBn || updated.title}" saved successfully!`));
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  // Save section settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<HomeSectionData> }) =>
      homeSectionsApi.update(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["home-sections"] });
      setSettingsModalOpen(false);
      toast.success(tr("Section settings updated successfully!"));
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  // Reorder handler
  const handleReorder = (newIds: string[]) => {
    const map = new Map(currentItems.map((i) => [i.id, i]));
    const next = newIds.map((id) => map.get(id)!).filter(Boolean);
    if (activeTab === "featured") {
      setLocalFeatured(next);
    } else if (currentSection) {
      setLocalSections((prev) => ({ ...prev, [currentSection.id]: next }));
    }
  };

  // Remove handler
  const handleRemove = (id: string) => {
    if (activeTab === "featured") {
      setLocalFeatured((prev) => prev.filter((p) => p.id !== id));
    } else if (currentSection) {
      setLocalSections((prev) => ({
        ...prev,
        [currentSection.id]: (prev[currentSection.id] || []).filter((p) => p.id !== id),
      }));
    }
  };

  // Add handler
  const handleAdd = (product: ProductRow) => {
    if (currentItems.length >= maxItems) {
      toast.error(
        tr(
          `সর্বোচ্চ ${maxItems}টি পণ্য নির্বাচন করা হয়েছে। নতুন পণ্য যোগ করতে আগে যেকোনো একটি পণ্য সরান।`,
        ),
      );
      return;
    }
    const newItem: FeaturedProductItem = {
      id: product.id,
      name: product.name,
      nameBn: product.nameBn,
      slug: product.slug,
      productCode: product.productCode,
      regularPrice: Number(product.regularPrice),
      sellingPrice: Number(product.sellingPrice),
      stock: Number(product.stock),
      trackStock: product.trackStock,
      status: product.status,
      isFeatured: true,
      categoryName: product.categoryName,
      mainImage: product.mainImage,
      unit: product.unit,
    };
    if (activeTab === "featured") {
      setLocalFeatured((prev) => [...prev, newItem]);
    } else if (currentSection) {
      setLocalSections((prev) => ({
        ...prev,
        [currentSection.id]: [...(prev[currentSection.id] || []), newItem],
      }));
    }
  };

  const handleSave = () => {
    const ids = currentItems.map((i) => i.id);
    if (activeTab === "featured") {
      saveFeaturedMutation.mutate(ids);
    } else if (currentSection) {
      saveSectionMutation.mutate({ sectionId: currentSection.id, ids });
    }
  };

  const sentinelRef = useRef<HTMLDivElement>(null);

  // Modal product search with infinite scrolling (20 products per page)
  const {
    rows: searchRows,
    total: totalSearchCount,
    isLoading: searching,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteList(
    ["home-section-product-search", searchTerm, selectedCat],
    (page) =>
      productsApi.list({
        search: searchTerm,
        categoryId: selectedCat || undefined,
        status: "ACTIVE",
        page,
        limit: 20,
      }),
    { enabled: modalOpen },
  );

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.list,
    enabled: modalOpen,
  });

  // IntersectionObserver for infinite scrolling sentinel
  useEffect(() => {
    if (!modalOpen) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [modalOpen, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Handle scroll event on container as immediate fallback
  const handleModalScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 120) {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }
  };

  const selectedIds = useMemo(() => new Set(currentItems.map((i) => i.id)), [currentItems]);

  const outOfStockCount = useMemo(
    () =>
      currentItems.filter(
        (i) => i.status !== "ACTIVE" || (i.trackStock && i.stock <= 0),
      ).length,
    [currentItems],
  );

  const isSaving = saveFeaturedMutation.isPending || saveSectionMutation.isPending;

  if (loadingFeatured || loadingSections) {
    return (
      <CardListSkeleton
        title={tr("Home Sections (হোমপেজ সেকশন)")}
        text={tr("Loading curated homepage sections...")}
        action=""
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <Sparkles className="size-6 text-brand-fresh" />
            <span>{tr("Homepage Sections (হোমপেজ সেকশন)")}</span>
          </div>
        }
        description={tr(
          "Manage and curate the exact products displayed across homepage sections on Web and Mobile.",
        )}
        actions={
          <div className="flex items-center gap-3">
            {currentSection && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditTitle(currentSection.title);
                  setEditTitleBn(currentSection.titleBn || "");
                  setEditSubtitle(currentSection.subtitle || "");
                  setEditSubtitleBn(currentSection.subtitleBn || "");
                  setEditCategorySlug(currentSection.categorySlug || "");
                  setSettingsModalOpen(true);
                }}
                className="gap-1.5"
              >
                <Edit2 className="size-3.5" />
                {tr("Edit Details")}
              </Button>
            )}

            <Badge
              variant={currentItems.length === maxItems ? "success" : "neutral"}
              className="text-xs px-3 py-1 font-bold"
            >
              {currentItems.length} / {maxItems} {tr("Selected")}
            </Badge>

            <Button
              type="button"
              variant="outline"
              disabled={currentItems.length >= maxItems}
              onClick={() => setModalOpen(true)}
              className="gap-2"
            >
              <Plus className="size-4" />
              {tr("Add Product")}
            </Button>

            <Button
              type="button"
              disabled={!hasChanges || isSaving}
              onClick={handleSave}
              className="gap-2 bg-brand-fresh hover:bg-brand-fresh/90 text-on-fresh font-bold"
            >
              <Save className="size-4" />
              {isSaving ? tr("Saving...") : tr("Save Changes")}
            </Button>
          </div>
        }
      />

      {/* Unified Tab Bar */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("featured")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors shrink-0 ${
            activeTab === "featured"
              ? "bg-brand-fresh text-on-fresh shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Sparkles className="size-4" />
          <span>{tr("আজকের তাজা বাজার")}</span>
          <span className="text-xs opacity-80">({localFeatured.length}/18)</span>
        </button>

        {customSections?.map((sec) => {
          const IconComp = getSectionIcon(sec.slug);
          const count = (localSections[sec.id] || []).length;
          const isActive = activeTab === sec.id || activeTab === sec.slug;

          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveTab(sec.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors shrink-0 ${
                isActive
                  ? "bg-brand-fresh text-on-fresh shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <IconComp className="size-4" />
              <span>{sec.titleBn || sec.title}</span>
              <span className="text-xs opacity-80">({count}/{sec.maxProducts})</span>
            </button>
          );
        })}
      </div>

      {/* Guidance Alert Banner when full */}
      {currentItems.length >= maxItems && (
        <div className="flex items-center gap-3 rounded border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-900 dark:text-blue-200">
          <Sparkles className="size-5 shrink-0 text-blue-600 dark:text-blue-400" />
          <p>
            {tr(
              `সর্বোচ্চ ${maxItems}টি পণ্য নির্বাচন করা হয়েছে। নতুন কোনো পণ্য যোগ করতে চাইলে নিচের তালিকা থেকে যেকোনো একটি পণ্য সরান (Trash আইকনে ক্লিক করুন)।`,
            )}
          </p>
        </div>
      )}

      {/* Out of stock warning banner */}
      {outOfStockCount > 0 && (
        <div className="flex items-center gap-3 rounded border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
          <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p>
            <strong>{outOfStockCount}</strong>{" "}
            {tr(
              "product(s) in this section are currently out of stock or inactive. Consider replacing them with available items.",
            )}
          </p>
        </div>
      )}

      {/* Main Sortable List */}
      {currentItems.length === 0 ? (
        <EmptyState
          icon={<PackagePlus className="size-12 text-muted-foreground" />}
          title={tr("No products added to this section yet")}
          description={tr(
            `Add up to ${maxItems} products to display in "${
              activeTab === "featured"
                ? "আজকের তাজা বাজার"
                : currentSection?.titleBn || currentSection?.title
            }" on the customer homepage.`,
          )}
          action={
            <Button
              type="button"
              onClick={() => setModalOpen(true)}
              className="gap-2 bg-brand-fresh text-on-fresh"
            >
              <Plus className="size-4" />
              {tr("Add First Product")}
            </Button>
          }
        />
      ) : (
        <div className="rounded border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground px-2">
            <span>
              {tr(`Drag rows using the handle to reorder (Slot 1 to ${maxItems})`)}
            </span>
            <span>{tr("Changes take effect immediately on save")}</span>
          </div>

          <SortableList items={currentItems} onReorder={handleReorder}>
            {(item) => {
              const idx = currentItems.findIndex((p) => p.id === item.id) + 1;
              const isOOS = item.status !== "ACTIVE" || (item.trackStock && item.stock <= 0);
              const isDailyFresh = !item.trackStock;
              const nameInfo = formatName(item);

              return (
                <div className="flex items-center justify-between gap-4 p-2 sm:p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Position Number Pill */}
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-black text-foreground">
                      #{idx}
                    </div>

                    <Thumb src={item.mainImage} alt={nameInfo.primary} className="size-12 shrink-0" />

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-sm text-foreground">
                        {nameInfo.primary}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[
                          nameInfo.secondary,
                          item.productCode,
                          item.categoryName,
                          item.unit?.shortLabel ? `per ${item.unit.shortLabel}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {/* Stock Status Badge */}
                    {isOOS ? (
                      <Badge variant="danger" className="gap-1 text-[11px] font-bold">
                        <AlertTriangle className="size-3" />
                        {tr("Out of Stock")}
                      </Badge>
                    ) : isDailyFresh ? (
                      <Badge variant="success" className="text-[11px] font-semibold">
                        {tr("Daily Fresh")}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
                        {item.stock} {tr("in stock")}
                      </span>
                    )}

                    {/* Price */}
                    <div className="text-right min-w-[70px]">
                      <p className="text-sm font-bold text-foreground">
                        {money(item.sellingPrice)}
                      </p>
                      {item.regularPrice > item.sellingPrice && (
                        <p className="text-xs text-muted-foreground line-through">
                          {money(item.regularPrice)}
                        </p>
                      )}
                    </div>

                    {/* Remove Action */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(item.id)}
                      className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title={tr("Remove product")}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            }}
          </SortableList>
        </div>
      )}

      {/* Add Product Modal Dialog */}
      {modalOpen && (
        <Dialog open onOpenChange={(o) => !o && setModalOpen(false)}>
          <DialogContent size="lg">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>
                  {tr("Add Product to ")}
                  <span className="text-brand-fresh">
                    {activeTab === "featured"
                      ? "আজকের তাজা বাজার"
                      : currentSection?.titleBn || currentSection?.title}
                  </span>
                </DialogTitle>
                <Badge variant="neutral" className="mr-6">
                  {currentItems.length} / {maxItems}
                </Badge>
              </div>
            </DialogHeader>

            <DialogBody className="space-y-4">
              {currentItems.length >= maxItems && (
                <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
                  {tr(
                    `সর্বোচ্চ ${maxItems}টি পণ্য নির্বাচন করা হয়েছে। নতুন পণ্য যোগ করতে আগে তালিকা থেকে একটি পণ্য সরান।`,
                  )}
                </div>
              )}

              {/* Search & Filter */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder={tr("Search by product name, barcode or code...")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                    autoFocus
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>

                {categories && categories.length > 0 && (
                  <select
                    value={selectedCat}
                    onChange={(e) => setSelectedCat(e.target.value)}
                    className="h-9 rounded border border-border bg-card px-3 text-xs text-foreground outline-none focus:border-brand-fresh"
                  >
                    <option value="">{tr("All Categories")}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameBn || c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Product Count & Scroll Hint */}
              {!searching && searchRows.length > 0 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>
                    {tr(`Showing ${searchRows.length} of ${totalSearchCount} products`)}
                  </span>
                  {hasNextPage && (
                    <span className="text-[11px] font-medium text-brand-fresh">
                      {tr("Scroll down to load more")}
                    </span>
                  )}
                </div>
              )}

              {/* Product Results with Infinite Scrolling */}
              <div
                onScroll={handleModalScroll}
                className="max-h-[380px] overflow-y-auto space-y-2 pr-1 custom-scrollbar"
              >
                {searching ? (
                  <div className="py-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin text-brand-fresh" />
                    <span>{tr("Searching products...")}</span>
                  </div>
                ) : searchRows.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    {tr("No products found matching your search.")}
                  </div>
                ) : (
                  <>
                    {searchRows.map((prod: ProductRow) => {
                      const isAdded = selectedIds.has(prod.id);
                      const isFull = currentItems.length >= maxItems;
                      const nameInfo = formatName(prod);

                      return (
                        <div
                          key={prod.id}
                          className="flex items-center justify-between gap-3 rounded border border-border p-2.5 transition-colors hover:bg-muted/40"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Thumb src={prod.mainImage} alt={nameInfo.primary} className="size-10 shrink-0" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {nameInfo.primary}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {[
                                  nameInfo.secondary,
                                  prod.productCode,
                                  prod.categoryName,
                                  money(prod.sellingPrice),
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            </div>
                          </div>

                          <div>
                            {isAdded ? (
                              <Badge
                                variant="outline"
                                className="gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                              >
                                <Check className="size-3" />
                                {tr("Added")}
                              </Badge>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isFull}
                                onClick={() => handleAdd(prod)}
                                className="gap-1.5 h-8 text-xs font-semibold hover:border-brand-fresh hover:text-brand-fresh"
                              >
                                <Plus className="size-3.5" />
                                {tr("Add")}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Sentinel for infinite scroll */}
                    <div ref={sentinelRef} className="h-4" />

                    {isFetchingNextPage && (
                      <div className="py-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="size-4 animate-spin text-brand-fresh" />
                        <span>{tr("Loading more products...")}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </DialogBody>

            <DialogFooter>
              <Button type="button" onClick={() => setModalOpen(false)}>
                {tr("Done")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Section Details Modal */}
      {settingsModalOpen && currentSection && (
        <Dialog open onOpenChange={(o) => !o && setSettingsModalOpen(false)}>
          <DialogContent size="md">
            <DialogHeader>
              <DialogTitle>{tr("Edit Section Details")}</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  {tr("Section Title (Bangla)")}
                </label>
                <Input
                  value={editTitleBn}
                  onChange={(e) => setEditTitleBn(e.target.value)}
                  placeholder="e.g. নিত্যপ্রয়োজনীয় মুদি বাজার"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  {tr("Section Title (English)")}
                </label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g. Daily Grocery Essentials"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  {tr("Subtitle (Bangla)")}
                </label>
                <Input
                  value={editSubtitleBn}
                  onChange={(e) => setEditSubtitleBn(e.target.value)}
                  placeholder="e.g. তাজা তেল, চাল, ডাল ও নিত্য সদাই"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  {tr("Subtitle (English)")}
                </label>
                <Input
                  value={editSubtitle}
                  onChange={(e) => setEditSubtitle(e.target.value)}
                  placeholder="e.g. Fresh oil, rice, dal and staples"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  {tr("Category Slug (for 'View All' link)")}
                </label>
                <Input
                  value={editCategorySlug}
                  onChange={(e) => setEditCategorySlug(e.target.value)}
                  placeholder="e.g. grocery, snacks-and-biscuits, baby-care"
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSettingsModalOpen(false)}>
                {tr("Cancel")}
              </Button>
              <Button
                disabled={updateSettingsMutation.isPending}
                onClick={() =>
                  updateSettingsMutation.mutate({
                    id: currentSection.id,
                    data: {
                      title: editTitle,
                      titleBn: editTitleBn,
                      subtitle: editSubtitle,
                      subtitleBn: editSubtitleBn,
                      categorySlug: editCategorySlug,
                    },
                  })
                }
                className="bg-brand-fresh text-on-fresh"
              >
                {updateSettingsMutation.isPending ? tr("Saving...") : tr("Save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
