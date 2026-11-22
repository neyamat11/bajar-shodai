import { useEffect, useRef, useState, useMemo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  GripVertical,
  Image as ImageIcon,
  ImagePlus,
  Loader2,
  Star,
  Trash2,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { assetUrl, errorMessage } from "@/api/client";
import { productsApi, type ProductImage } from "@/api/products";
import { useAct } from "@/hooks/useAct";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { UploadProgressBar } from "@/components/shared/UploadProgressBar";
import { tr } from "@/i18n";
import { cn } from "@/lib/utils";

// create mode: files are only collected (`staged`) and uploaded after the product exists.
export function PhotosEditor({
  productId,
  images,
  staged,
  onStage,
  stagedProgress,
}: {
  productId?: string;
  images?: ProductImage[];
  staged: File[];
  onStage: (f: File[]) => void;
  stagedProgress?: number | null;
}) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [del, setDel] = useState<ProductImage | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<ProductImage | null>(null);
  const [selectedStagedIndex, setSelectedStagedIndex] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadCount, setUploadCount] = useState<number>(0);

  // Local state for smooth instantaneous drag-and-drop feedback
  const [orderedImages, setOrderedImages] = useState<ProductImage[]>(images ?? []);
  useEffect(() => {
    setOrderedImages(images ?? []);
  }, [images]);

  const inv = [["product", productId], ["products"]];
  const main = useAct((id: string) => productsApi.updateImage(productId!, id, { isMain: true }), { invalidate: inv });
  const order = useAct((ids: string[]) => productsApi.reorderImages(productId!, ids), { invalidate: inv });
  const remove = useAct((id: string) => productsApi.removeImage(productId!, id), {
    success: tr("Photo removed"),
    invalidate: inv,
    onSuccess: () => setDel(null),
  });

  const activeProgress = uploadProgress !== null ? uploadProgress : stagedProgress ?? null;
  const isUploading = activeProgress !== null;

  // Dnd sensors: distance 8px on pointer, 150ms hold on touch to allow quick taps to open modal
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const isDraggingRef = useRef(false);

  const handleDragStart = (event: DragStartEvent) => {
    isDraggingRef.current = true;
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 120);

    if (!over || active.id === over.id) return;

    if (productId) {
      const oldIndex = orderedImages.findIndex((item) => item.id === active.id);
      const newIndex = orderedImages.findIndex((item) => item.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const next = arrayMove(orderedImages, oldIndex, newIndex);
        setOrderedImages(next);
        order.mutate(next.map((item) => item.id));
      }
    } else {
      const oldIndex = parseInt(String(active.id).replace("staged-", ""), 10);
      const newIndex = parseInt(String(over.id).replace("staged-", ""), 10);
      if (!isNaN(oldIndex) && !isNaN(newIndex) && oldIndex !== newIndex) {
        const next = arrayMove(staged, oldIndex, newIndex);
        onStage(next);
      }
    }
  };

  const pick = async (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    if (productId) {
      setUploadCount(files.length);
      setUploadProgress(0);
      try {
        await productsApi.uploadImages(productId, files, undefined, (pct) => setUploadProgress(pct));
        toast.success(tr("Photos added"));
        qc.invalidateQueries({ queryKey: ["product", productId] });
        qc.invalidateQueries({ queryKey: ["products"] });
      } catch (e) {
        toast.error(errorMessage(e, "Upload failed"));
      } finally {
        setUploadProgress(null);
        setUploadCount(0);
        if (input.current) input.current.value = "";
      }
    } else {
      onStage([...staged, ...files].slice(0, 10));
      if (input.current) input.current.value = "";
    }
  };

  const move = (i: number, d: number) => {
    if (productId) {
      const j = i + d;
      if (j < 0 || j >= orderedImages.length) return;
      const next = arrayMove(orderedImages, i, j);
      setOrderedImages(next);
      order.mutate(next.map((x) => x.id));
    } else {
      const j = i + d;
      if (j < 0 || j >= staged.length) return;
      const next = arrayMove(staged, i, j);
      onStage(next);
    }
  };

  // Find dragged item for DragOverlay preview
  const activeSavedPhoto = useMemo(
    () => (activeId ? orderedImages.find((im) => im.id === activeId) : null),
    [orderedImages, activeId]
  );
  const activeStagedFile = useMemo(() => {
    if (!activeId || !activeId.startsWith("staged-")) return null;
    const idx = parseInt(activeId.replace("staged-", ""), 10);
    return staged[idx] ?? null;
  }, [staged, activeId]);

  const stagedIds = useMemo(() => staged.map((_, i) => `staged-${i}`), [staged]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1 text-[13px] text-muted-foreground">
        <p>{tr("JPG, PNG, WebP or GIF, up to 10 MB each. The first (starred) photo is the one shown in lists.")}</p>
        <p className="text-xs text-fresh-700 dark:text-fresh-400 font-medium">
          {tr("Drag to reorder photos left or right. Tap any photo to manage or make it main.")}
        </p>
      </div>

      {activeProgress !== null && (
        <UploadProgressBar
          progress={activeProgress}
          label={
            uploadCount > 1
              ? tr("Uploading {{count}} photos…", { count: uploadCount })
              : tr("Uploading photo…")
          }
          processingLabel={tr("Optimizing photos & saving to storage…")}
        />
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {/* Saved Images */}
          {productId && (
            <SortableContext items={orderedImages.map((im) => im.id)} strategy={rectSortingStrategy}>
              {orderedImages.map((im, i) => (
                <SortableSavedPhoto
                  key={im.id}
                  image={im}
                  index={i}
                  total={orderedImages.length}
                  isUploading={isUploading}
                  onTap={(photo) => {
                    if (isDraggingRef.current) return;
                    setSelectedPhoto(photo);
                  }}
                  onMove={move}
                  onMakeMain={(id) => main.mutate(id)}
                  onDeletePrompt={(photo) => setDel(photo)}
                />
              ))}
            </SortableContext>
          )}

          {/* Staged Images (Create Mode) */}
          {!productId && staged.length > 0 && (
            <SortableContext items={stagedIds} strategy={rectSortingStrategy}>
              {staged.map((f, i) => (
                <SortableStagedPhoto
                  key={`staged-${i}-${f.name}`}
                  id={`staged-${i}`}
                  file={f}
                  index={i}
                  total={staged.length}
                  isUploading={isUploading}
                  onTap={(idx) => {
                    if (isDraggingRef.current) return;
                    setSelectedStagedIndex(idx);
                  }}
                  onMove={move}
                  onRemove={(idx) => onStage(staged.filter((_, j) => j !== idx))}
                />
              ))}
            </SortableContext>
          )}

          {/* Upload Progress Tile */}
          {isUploading && (
            <div className="relative flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-fresh-400 bg-fresh-500/5 p-2 text-center">
              <Loader2 className="size-6 animate-spin text-fresh-600 dark:text-fresh-400" />
              <span className="font-mono text-xs font-bold text-fresh-600 dark:text-fresh-400">
                {activeProgress}%
              </span>
              <span className="text-[10px] text-muted-foreground truncate max-w-full">
                {activeProgress < 100 ? tr("Uploading…") : tr("Processing…")}
              </span>
            </div>
          )}

          {/* Add Photos Button */}
          <button
            type="button"
            disabled={isUploading}
            onClick={() => input.current?.click()}
            className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded border-2 border-dashed border-border text-xs font-medium text-muted-foreground hover:border-fresh-400 hover:text-fresh-600 disabled:pointer-events-none disabled:opacity-50"
          >
            <ImagePlus className="size-6" />
            {isUploading ? tr("Uploading…") : tr("Add photos")}
          </button>
        </div>

        {/* Floating Drag Overlay */}
        <DragOverlay>
          {activeSavedPhoto ? (
            <div className="relative aspect-square w-28 overflow-hidden rounded-lg border-2 border-fresh-500 bg-muted shadow-2xl opacity-90 scale-105 cursor-grabbing">
              <img
                src={assetUrl(activeSavedPhoto.url)}
                alt=""
                className="aspect-square w-full object-cover"
              />
              {activeSavedPhoto.isMain && (
                <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded bg-fresh-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                  <Star className="size-2.5 fill-white" />
                  {tr("MAIN")}
                </span>
              )}
            </div>
          ) : activeStagedFile ? (
            <div className="relative aspect-square w-28 overflow-hidden rounded-lg border-2 border-fresh-500 bg-muted shadow-2xl opacity-90 scale-105 cursor-grabbing">
              <img
                src={URL.createObjectURL(activeStagedFile)}
                alt=""
                className="aspect-square w-full object-cover"
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        hidden
        onChange={(e) => void pick(e.target.files)}
      />

      {/* Tap Action Dialog / Bottom Sheet for Saved Photos */}
      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{tr("Product photo")}</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <DialogBody className="space-y-4 py-4">
              <div className="flex flex-col items-center gap-2">
                <div className="relative aspect-square w-36 overflow-hidden rounded-lg border border-border bg-muted shadow-sm">
                  <img
                    src={assetUrl(selectedPhoto.url)}
                    alt={selectedPhoto.alt ?? ""}
                    className="aspect-square w-full object-cover"
                  />
                </div>
                {selectedPhoto.isMain ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-fresh-100 px-3 py-1 text-xs font-semibold text-fresh-700 dark:bg-fresh-950 dark:text-fresh-400">
                    <Star className="size-3.5 fill-current text-amber-500" />
                    {tr("Main photo")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                    <ImageIcon className="size-3.5" />
                    {tr("Gallery photo")}
                  </span>
                )}
              </div>

              <div className="space-y-2.5 pt-2">
                {!selectedPhoto.isMain ? (
                  <div className="space-y-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start gap-2.5 py-5 text-sm font-semibold border-fresh-300 text-fresh-700 hover:bg-fresh-50 hover:text-fresh-800 dark:border-fresh-800 dark:hover:bg-fresh-950/50"
                      disabled={isUploading}
                      onClick={() => {
                        const id = selectedPhoto.id;
                        setSelectedPhoto(null);
                        main.mutate(id);
                      }}
                    >
                      <Star className="size-4 text-amber-500 fill-amber-500" />
                      {tr("Set as main photo")}
                    </Button>
                    <p className="text-[11px] text-muted-foreground px-1">
                      {tr("This photo will be displayed first in search and store listings.")}
                    </p>
                  </div>
                ) : (
                  <p className="rounded border border-fresh-200 bg-fresh-50/70 p-2.5 text-center text-xs text-fresh-700 dark:border-fresh-900 dark:bg-fresh-950/40 dark:text-fresh-300">
                    {tr("This is currently the main photo shown in lists and catalog.")}
                  </p>
                )}

                <Button
                  type="button"
                  variant="destructive"
                  className="w-full justify-start gap-2.5 py-5 text-sm font-semibold"
                  disabled={isUploading}
                  onClick={() => {
                    const photo = selectedPhoto;
                    setSelectedPhoto(null);
                    setDel(photo);
                  }}
                >
                  <Trash2 className="size-4" />
                  {tr("Delete photo")}
                </Button>

                <p className="flex items-center justify-center gap-1.5 pt-2 text-center text-[11px] text-muted-foreground">
                  <GripVertical className="size-3.5" />
                  {tr("Tip: Press and drag any photo to reorder left or right.")}
                </p>
              </div>
            </DialogBody>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setSelectedPhoto(null)}
            >
              {tr("Cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tap Action Dialog / Bottom Sheet for Staged Photos (Create Mode) */}
      <Dialog
        open={selectedStagedIndex !== null}
        onOpenChange={(open) => !open && setSelectedStagedIndex(null)}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{tr("Product photo")}</DialogTitle>
          </DialogHeader>
          {selectedStagedIndex !== null && staged[selectedStagedIndex] && (
            <DialogBody className="space-y-4 py-4">
              <div className="flex flex-col items-center gap-2">
                <div className="relative aspect-square w-36 overflow-hidden rounded-lg border border-border bg-muted shadow-sm">
                  <img
                    src={URL.createObjectURL(staged[selectedStagedIndex])}
                    alt=""
                    className="aspect-square w-full object-cover"
                  />
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-800 px-3 py-1 text-xs font-semibold text-white">
                  {selectedStagedIndex === 0 ? "MAIN · " : ""}{tr("Uploads on save")}
                </span>
              </div>

              <div className="space-y-2.5 pt-2">
                {selectedStagedIndex > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start gap-2.5 py-5 text-sm font-semibold border-fresh-300 text-fresh-700 hover:bg-fresh-50"
                    onClick={() => {
                      const idx = selectedStagedIndex;
                      setSelectedStagedIndex(null);
                      const next = [staged[idx], ...staged.filter((_, j) => j !== idx)];
                      onStage(next);
                    }}
                  >
                    <Star className="size-4 text-amber-500 fill-amber-500" />
                    {tr("Set as first (main)")}
                  </Button>
                )}

                <Button
                  type="button"
                  variant="destructive"
                  className="w-full justify-start gap-2.5 py-5 text-sm font-semibold"
                  onClick={() => {
                    const idx = selectedStagedIndex;
                    setSelectedStagedIndex(null);
                    onStage(staged.filter((_, j) => j !== idx));
                  }}
                >
                  <Trash2 className="size-4" />
                  {tr("Remove photo")}
                </Button>

                <p className="flex items-center justify-center gap-1.5 pt-2 text-center text-[11px] text-muted-foreground">
                  <GripVertical className="size-3.5" />
                  {tr("Tip: Press and drag any photo to reorder left or right.")}
                </p>
              </div>
            </DialogBody>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setSelectedStagedIndex(null)}
            >
              {tr("Cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        title={tr("Delete this photo?")}
        confirmLabel={tr("Delete")}
        destructive
        loading={remove.isPending}
        onConfirm={() => del && remove.mutate(del.id)}
      />
    </div>
  );
}

// Subcomponent: Draggable Saved Photo Card
function SortableSavedPhoto({
  image,
  index,
  total,
  isUploading,
  onTap,
  onMove,
  onMakeMain,
  onDeletePrompt,
}: {
  image: ProductImage;
  index: number;
  total: number;
  isUploading: boolean;
  onTap: (image: ProductImage) => void;
  onMove: (index: number, delta: number) => void;
  onMakeMain: (id: string) => void;
  onDeletePrompt: (image: ProductImage) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id, disabled: isUploading });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (isDragging) return;
        onTap(image);
      }}
      className={cn(
        "group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted cursor-pointer select-none transition-shadow touch-manipulation",
        isDragging && "opacity-30 ring-2 ring-fresh-500 shadow-lg"
      )}
    >
      <img
        src={assetUrl(image.url)}
        alt={image.alt ?? ""}
        className="aspect-square w-full object-cover pointer-events-none"
        loading="lazy"
      />

      {/* Main Photo Badge (Always visible, clean, unobtrusive) */}
      {image.isMain && (
        <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded bg-fresh-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm pointer-events-none">
          <Star className="size-2.5 fill-white" />
          {tr("MAIN")}
        </span>
      )}

      {/* Desktop Hover Quick Action Bar (Hidden on Mobile screens via max-sm:hidden so mobile photos stay completely clean and unobstructed) */}
      <div
        className="absolute inset-x-0 bottom-0 max-sm:hidden flex justify-between gap-1 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-1">
          <Button
            type="button"
            size="icon-xs"
            variant="secondary"
            aria-label={tr("Move left")}
            disabled={index === 0 || isUploading}
            onClick={() => onMove(index, -1)}
          >
            <ArrowLeft />
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="secondary"
            aria-label={tr("Move right")}
            disabled={index === total - 1 || isUploading}
            onClick={() => onMove(index, 1)}
          >
            <ArrowRight />
          </Button>
        </div>
        <div className="flex gap-1">
          {!image.isMain && (
            <Button
              type="button"
              size="icon-xs"
              variant="secondary"
              aria-label={tr("Make main")}
              disabled={isUploading}
              onClick={() => onMakeMain(image.id)}
            >
              <Star />
            </Button>
          )}
          <Button
            type="button"
            size="icon-xs"
            variant="destructive"
            aria-label={tr("Delete")}
            disabled={isUploading}
            onClick={() => onDeletePrompt(image)}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Subcomponent: Draggable Staged Photo Card (Create Mode)
function SortableStagedPhoto({
  id,
  file,
  index,
  total,
  isUploading,
  onTap,
  onMove,
  onRemove,
}: {
  id: string;
  file: File;
  index: number;
  total: number;
  isUploading: boolean;
  onTap: (index: number) => void;
  onMove: (index: number, delta: number) => void;
  onRemove: (index: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: isUploading });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (isDragging) return;
        onTap(index);
      }}
      className={cn(
        "group relative aspect-square overflow-hidden rounded-lg border border-dashed border-fresh-400 bg-muted cursor-pointer select-none transition-shadow touch-manipulation",
        isDragging && "opacity-30 ring-2 ring-fresh-500 shadow-lg"
      )}
    >
      <img
        src={previewUrl}
        alt=""
        className="aspect-square w-full object-cover pointer-events-none"
      />

      <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded bg-forest-800 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm pointer-events-none">
        {index === 0 ? <Star className="size-2.5 fill-white" /> : null}
        {index === 0 ? "MAIN · " : ""}{tr("Uploads on save")}
      </span>

      {/* Desktop Hover Quick Action Bar (Hidden on Mobile screens via max-sm:hidden) */}
      <div
        className="absolute inset-x-0 bottom-0 max-sm:hidden flex justify-between gap-1 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-1">
          <Button
            type="button"
            size="icon-xs"
            variant="secondary"
            aria-label={tr("Move left")}
            disabled={index === 0 || isUploading}
            onClick={() => onMove(index, -1)}
          >
            <ArrowLeft />
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="secondary"
            aria-label={tr("Move right")}
            disabled={index === total - 1 || isUploading}
            onClick={() => onMove(index, 1)}
          >
            <ArrowRight />
          </Button>
        </div>
        <Button
          type="button"
          size="icon-xs"
          variant="destructive"
          aria-label={tr("Remove")}
          disabled={isUploading}
          onClick={() => onRemove(index)}
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}
