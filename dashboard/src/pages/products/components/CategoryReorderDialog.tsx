import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowUpDown, Loader2, Save } from "lucide-react";
import { productsApi, type ProductRow } from "@/api/products";
import { errorMessage } from "@/api/client";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SortableList } from "@/components/shared/Sortable";
import { Thumb } from "@/components/shared/Thumb";
import { EmptyState } from "@/components/shared/EmptyState";
import { money } from "@/lib/format";
import { tr } from "@/i18n";
import { useProductNameDisplay } from "@/lib/productName";

interface CategoryReorderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  categoryName?: string | null;
}

export function CategoryReorderDialog({
  open,
  onOpenChange,
  categoryId,
  categoryName,
}: CategoryReorderDialogProps) {
  const qc = useQueryClient();
  const { format: formatName } = useProductNameDisplay();
  const [items, setItems] = useState<ProductRow[]>([]);

  // Fetch all products in this category (up to 200 for ordering)
  const { data, isLoading } = useQuery({
    queryKey: ["admin-category-products-reorder", categoryId],
    queryFn: () =>
      productsApi.list({
        categoryId,
        limit: 200,
        sortBy: "newest", // default backend ordering
      }),
    enabled: open && Boolean(categoryId),
  });

  useEffect(() => {
    if (data?.data) {
      // Sort existing items: ranked items first (by displayOrder), unranked follow
      const sorted = [...data.data].sort((a, b) => {
        if (a.displayOrder !== null && b.displayOrder !== null) {
          return a.displayOrder - b.displayOrder;
        }
        if (a.displayOrder !== null) return -1;
        if (b.displayOrder !== null) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setItems(sorted);
    }
  }, [data]);

  const handleReorder = (newIds: string[]) => {
    const map = new Map(items.map((i) => [i.id, i]));
    const next = newIds.map((id) => map.get(id)!).filter(Boolean);
    setItems(next);
  };

  const reorderMutation = useMutation({
    mutationFn: async () => {
      const ids = items.map((i) => i.id);
      return productsApi.reorder(categoryId, ids);
    },
    onSuccess: () => {
      toast.success(tr("Product order saved successfully"));
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["admin-category-products-reorder", categoryId] });
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(errorMessage(err));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpDown className="size-5 text-primary" />
            <span>
              {tr("Reorder Products")}
              {categoryName ? ` — ${categoryName}` : ""}
            </span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {tr("Drag products to arrange their display order on the storefront and app. Position #1 appears first.")}
          </p>
        </DialogHeader>

        <DialogBody className="flex-1 overflow-y-auto min-h-0 pr-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-xs">{tr("Loading products...")}</p>
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={<ArrowUpDown className="size-8 text-muted-foreground" />}
              title={tr("No products in this category")}
              description={tr("Add products to this category before reordering them.")}
            />
          ) : (
            <SortableList items={items} onReorder={handleReorder}>
              {(item) => {
                const rank = items.findIndex((p) => p.id === item.id) + 1;
                const nameInfo = formatName(item);

                return (
                  <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg border bg-card hover:bg-accent/40 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0">
                        {rank}
                      </span>
                      <Thumb src={item.mainImage} alt={nameInfo.primary} className="size-10 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{nameInfo.primary}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {[nameInfo.secondary, item.unit ? `per ${item.unit.shortLabel}` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-primary">
                        {money(Number(item.sellingPrice))}
                      </span>
                      {item.status !== "ACTIVE" && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          {item.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              }}
            </SortableList>
          )}
        </DialogBody>

        <DialogFooter className="border-t pt-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {items.length > 0 && `${items.length} ${tr("products")}`}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={reorderMutation.isPending}>
              {tr("Cancel")}
            </Button>
            <Button
              onClick={() => reorderMutation.mutate()}
              disabled={items.length === 0 || reorderMutation.isPending}
              className="gap-1.5"
            >
              {reorderMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {tr("Save Order")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
