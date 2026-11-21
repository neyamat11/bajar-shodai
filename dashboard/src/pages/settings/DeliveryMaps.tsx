import { lazy, Suspense, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Crosshair, Layers, Loader2, Pencil, Plus, Trash2, Zap } from "lucide-react";
import {
  deliveryOriginsApi,
  settingsApi,
  type DeliveryOrigin,
  type DeliverySettings,
  type DeliverySlot,
  type MapsSettings,
  type MapsTestResult,
} from "@/api/system";
import { errorMessage } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Section } from "@/components/shared/Field";
import { Button } from "@/components/ui/button";
import { Input, Select, Switch } from "@/components/ui/input";
import { useAct } from "@/hooks/useAct";
import { DEFAULT_CENTER } from "@/components/map/types";
import { tr } from "@/i18n";

const AdminMap = lazy(() => import("@/components/map/AdminMap"));

const Toggle = ({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="flex cursor-pointer items-start justify-between gap-4 py-2">
    <span><span className="block text-[13px] font-medium">{label}</span>{hint && <span className="block text-xs text-muted-foreground">{hint}</span>}</span>
    <Switch checked={checked} onCheckedChange={onChange} />
  </label>
);

/** The same rule the server uses: base charge up to baseKm, then a rate for every started step. */
function feeFor(d: DeliverySettings, km: number) {
  const r = Math.round(km * 100) / 100;
  return r <= d.baseKm ? d.baseCharge : d.baseCharge + d.perKmRate * Math.ceil((r - d.baseKm) / d.stepKm);
}

const num = (v: string) => (v.trim() === "" ? NaN : Number(v));

function DeliveryOriginsManager() {
  const qc = useQueryClient();
  const { data: origins = [], isLoading } = useQuery({
    queryKey: ["delivery-origins"],
    queryFn: deliveryOriginsApi.list,
  });

  const [editOrigin, setEditOrigin] = useState<Partial<DeliveryOrigin> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const saveOrigin = useMutation({
    mutationFn: (item: Partial<DeliveryOrigin>) => {
      const { id, createdAt, updatedAt, ...cleanItem } = item;
      if (id) {
        return deliveryOriginsApi.update(id, cleanItem);
      }
      return deliveryOriginsApi.create(cleanItem);
    },
    onSuccess: () => {
      toast.success(tr("Dispatch point saved successfully"));
      setIsDialogOpen(false);
      setEditOrigin(null);
      void qc.invalidateQueries({ queryKey: ["delivery-origins"] });
    },
    onError: (err: unknown) => {
      toast.error(errorMessage(err));
    },
  });

  const setDefault = useMutation({
    mutationFn: (id: string) => deliveryOriginsApi.setDefault(id),
    onSuccess: () => {
      toast.success(tr("Default dispatch point updated"));
      void qc.invalidateQueries({ queryKey: ["delivery-origins"] });
    },
    onError: (err: unknown) => {
      toast.error(errorMessage(err));
    },
  });

  const deleteOrigin = useMutation({
    mutationFn: (id: string) => deliveryOriginsApi.delete(id),
    onSuccess: () => {
      toast.success(tr("Dispatch point deleted"));
      void qc.invalidateQueries({ queryKey: ["delivery-origins"] });
    },
    onError: (err: unknown) => {
      toast.error(errorMessage(err));
    },
  });

  const openNew = () => {
    setEditOrigin({
      name: "",
      nameBn: "",
      latitude: 23.1017,
      longitude: 91.0918,
      isActive: true,
      isDefault: false,
    });
    setIsDialogOpen(true);
  };

  const openEdit = (o: DeliveryOrigin) => {
    setEditOrigin({ ...o });
    setIsDialogOpen(true);
  };

  return (
    <Section
      title={tr("Dispatch & Origin Points (Multi-Origin Delivery)")}
      description={tr(
        "Manage dispatch points (e.g. Kalibari, Chitoshi Bazar). For every customer order, the nearest dispatch point is automatically chosen to calculate distance and delivery fee.",
      )}
      actions={
        <Button type="button" size="sm" variant="brand" onClick={openNew} className="gap-1.5">
          <Plus className="size-4" /> {tr("Add Dispatch Point")}
        </Button>
      }
      className="xl:col-span-2"
    >
      {isLoading ? (
        <div className="flex h-24 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : origins.length === 0 ? (
        <p className="text-xs text-muted-foreground">{tr("No dispatch points configured. Click Add to create one.")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3.5 py-2.5 font-semibold">{tr("Point Name")}</th>
                <th className="px-3.5 py-2.5 font-semibold">{tr("Coordinates (Lat, Lng)")}</th>
                <th className="px-3.5 py-2.5 font-semibold">{tr("Status")}</th>
                <th className="px-3.5 py-2.5 font-semibold">{tr("Default")}</th>
                <th className="px-3.5 py-2.5 text-right font-semibold">{tr("Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {origins.map((o) => (
                <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-3.5 py-2.5">
                    <p className="font-medium text-foreground">{o.name}</p>
                    {o.nameBn && <p className="text-[11px] text-muted-foreground">{o.nameBn}</p>}
                  </td>
                  <td className="px-3.5 py-2.5 font-mono text-[11px] text-muted-foreground">
                    {Number(o.latitude).toFixed(4)}, {Number(o.longitude).toFixed(4)}
                  </td>
                  <td className="px-3.5 py-2.5">
                    {o.isActive ? (
                      <Badge variant="fresh">{tr("Active")}</Badge>
                    ) : (
                      <Badge variant="outline">{tr("Inactive")}</Badge>
                    )}
                  </td>
                  <td className="px-3.5 py-2.5">
                    {o.isDefault ? (
                      <Badge variant="brand">{tr("Default")}</Badge>
                    ) : (
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        onClick={() => setDefault.mutate(o.id)}
                        loading={setDefault.isPending}
                        className="text-[11px] h-6 px-2"
                      >
                        {tr("Make default")}
                      </Button>
                    )}
                  </td>
                  <td className="px-3.5 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => openEdit(o)}
                        className="h-7 w-7 p-0"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      {!o.isDefault && origins.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() => {
                            if (window.confirm(tr("Delete this dispatch point?"))) {
                              deleteOrigin.mutate(o.id);
                            }
                          }}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>
              {editOrigin?.id ? tr("Edit Dispatch Point") : tr("New Dispatch Point")}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3.5 text-xs">
            <Field label={tr("Point Name (English)")} hint={tr("e.g. Chitoshi Bazar, Shahrasti")}>
              <Input
                value={editOrigin?.name ?? ""}
                onChange={(e) => setEditOrigin((s) => ({ ...s, name: e.target.value }))}
                placeholder="Chitoshi Bazar"
              />
            </Field>
            <Field label={tr("Point Name (Bangla)")} hint={tr("e.g. চিতোষী বাজার")}>
              <Input
                value={editOrigin?.nameBn ?? ""}
                onChange={(e) => setEditOrigin((s) => ({ ...s, nameBn: e.target.value }))}
                placeholder="চিতোষী বাজার"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={tr("Latitude")}>
                <Input
                  type="number"
                  step="0.0001"
                  value={editOrigin?.latitude ?? ""}
                  onChange={(e) => setEditOrigin((s) => ({ ...s, latitude: Number(e.target.value) }))}
                  placeholder="23.1017"
                />
              </Field>
              <Field label={tr("Longitude")}>
                <Input
                  type="number"
                  step="0.0001"
                  value={editOrigin?.longitude ?? ""}
                  onChange={(e) => setEditOrigin((s) => ({ ...s, longitude: Number(e.target.value) }))}
                  placeholder="91.0918"
                />
              </Field>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="font-medium text-foreground">{tr("Active point")}</p>
                <p className="text-[11px] text-muted-foreground">{tr("Available for nearest calculation")}</p>
              </div>
              <Switch
                checked={editOrigin?.isActive ?? true}
                onCheckedChange={(isActive) => setEditOrigin((s) => ({ ...s, isActive }))}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              {tr("Cancel")}
            </Button>
            <Button
              type="button"
              variant="brand"
              loading={saveOrigin.isPending}
              onClick={() => {
                if (!editOrigin?.name?.trim()) return toast.error(tr("Enter point name"));
                if (typeof editOrigin.latitude !== "number" || isNaN(editOrigin.latitude)) return toast.error(tr("Enter valid latitude"));
                if (typeof editOrigin.longitude !== "number" || isNaN(editOrigin.longitude)) return toast.error(tr("Enter valid longitude"));
                saveOrigin.mutate(editOrigin);
              }}
            >
              {tr("Save Point")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Section>
  );
}

export function DeliveryForm({ v, tileUrl }: { v: DeliverySettings; tileUrl: string }) {
  const [f, setF] = useState({
    ...v,
    originLat: v.originLat === null ? "" : String(v.originLat),
    originLng: v.originLng === null ? "" : String(v.originLng),
    serviceRadiusKm: String(v.serviceRadiusKm),
    baseKm: String(v.baseKm),
    baseCharge: String(v.baseCharge),
    perKmRate: String(v.perKmRate),
    stepKm: String(v.stepKm),
    minOrderAmount: String(v.minOrderAmount),
    freeDeliveryThreshold: v.freeDeliveryThreshold === null ? "" : String(v.freeDeliveryThreshold),
    routeFactor: String(v.routeFactor),
    restrictToZone: v.restrictToZone ?? true,
    distanceCalculation: v.distanceCalculation ?? "direct",
    defaultDeliveryMinutes: String(v.defaultDeliveryMinutes ?? 90),
    heavyOrderRules: v.heavyOrderRules ?? [{ unit: "kg", threshold: 12, isEnabled: true }],
  });
  const [satellite, setSatellite] = useState(true);
  const [previewKm, setPreviewKm] = useState("6");
  const save = useAct((body: Record<string, unknown>) => settingsApi.save("delivery", body), { success: tr("Delivery settings saved"), invalidate: [["settings"]] });

  const lat = num(f.originLat);
  const lng = num(f.originLng);
  const hasPin = Number.isFinite(lat) && Number.isFinite(lng);
  const origin = hasPin ? { lat, lng } : null;
  const radius = num(f.serviceRadiusKm);

  // the numbers as the server will read them
  const rates: DeliverySettings = { ...v, baseKm: num(f.baseKm), baseCharge: num(f.baseCharge), perKmRate: num(f.perKmRate), stepKm: num(f.stepKm) };
  const ratesOk = [rates.baseKm, rates.baseCharge, rates.perKmRate, rates.stepKm].every((x) => Number.isFinite(x) && x >= 0) && rates.stepKm > 0;
  const prev = num(previewKm);

  const setPin = (p: { lat: number; lng: number }) => setF((s) => ({ ...s, originLat: p.lat.toFixed(6), originLng: p.lng.toFixed(6) }));

  const submit = () => {
    if (!hasPin && f.enabled) return toast.error(tr("Drop the Kalibari Bazar pin on the map first: every distance is measured from it"));
    if (!ratesOk) return toast.error(tr("Check the delivery rates: they must be numbers, and the step above 0"));
    if (!(radius > 0)) return toast.error(tr("Enter the service radius in km"));
    const slotIds = f.slots.map((s) => s.id.trim());
    if (f.slots.some((s) => !s.id.trim() || !s.label.trim() || !s.labelBn.trim())) return toast.error(tr("Each time slot needs an id and both names"));
    if (new Set(slotIds).size !== slotIds.length) return toast.error(tr("Each time slot needs its own id"));
    save.mutate({
      enabled: f.enabled,
      shopOpen: f.shopOpen,
      originLat: hasPin ? lat : null,
      originLng: hasPin ? lng : null,
      originLabel: f.originLabel.trim(),
      originLabelBn: f.originLabelBn.trim(),
      serviceRadiusKm: radius,
      baseKm: rates.baseKm,
      baseCharge: rates.baseCharge,
      perKmRate: rates.perKmRate,
      stepKm: rates.stepKm,
      minOrderAmount: num(f.minOrderAmount) || 0,
      freeDeliveryThreshold: f.freeDeliveryThreshold === "" ? null : Number(f.freeDeliveryThreshold),
      openFrom: f.openFrom,
      openTo: f.openTo,
      routeFactor: Number.isFinite(num(f.routeFactor)) && num(f.routeFactor) >= 1 ? num(f.routeFactor) : 1.3,
      restrictToZone: f.restrictToZone,
      distanceCalculation: f.distanceCalculation ?? "direct",
      defaultDeliveryMinutes: num(f.defaultDeliveryMinutes) || 90,
      slots: f.slots.map((s) => ({ ...s, id: s.id.trim(), label: s.label.trim(), labelBn: s.labelBn.trim() })),
      heavyOrderRules: f.heavyOrderRules,
    });
  };

  const setSlot = (i: number, patch: Partial<DeliverySlot>) => setF((s) => ({ ...s, slots: s.slots.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));

  return (
    <div className="grid items-start gap-4 xl:grid-cols-2 [&>button]:justify-self-start xl:[&>button]:col-span-2">
      <DeliveryOriginsManager />

      {!hasPin && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-[13px] font-medium text-amber-700 dark:text-amber-300 xl:col-span-2">
          {tr("The shop pin is not set yet, so customers cannot check out. Click the map where Kalibari Bazar is (the satellite view helps you find the school field) and press Save.")}
        </p>
      )}

      <Section title={tr("Kalibari Bazar: where distances start")} description={tr("Click the map to drop the pin, or drag it. Every delivery distance and the service area are measured from this point.")} className="xl:col-span-2">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setSatellite((x) => !x)}><Layers /> {satellite ? tr("Street map") : tr("Satellite")}</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => navigator.geolocation?.getCurrentPosition((p) => setPin({ lat: p.coords.latitude, lng: p.coords.longitude }), () => toast.error(tr("Could not read this device's location")), { enableHighAccuracy: true, timeout: 10000 })}><Crosshair />{" "}{tr("Use my location now")}</Button>
        </div>
        <div className="overflow-hidden rounded-md border border-border">
          <Suspense fallback={<div className="h-[380px] animate-pulse bg-muted" />}>
            <AdminMap
              className="h-[380px] w-full"
              tileUrl={tileUrl}
              center={origin ?? DEFAULT_CENTER}
              zoom={origin ? 15 : 13}
              marker={origin}
              draggable
              onMarkerChange={setPin}
              radiusKm={radius > 0 ? radius : null}
              radiusCenter={origin}
              satellite={satellite}
              fitKey="origin"
              ariaLabel="Drop the Kalibari Bazar pin"
            />
          </Suspense>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={tr("Latitude")}><Input value={f.originLat} onChange={(e) => setF({ ...f, originLat: e.target.value })} inputMode="decimal" /></Field>
          <Field label={tr("Longitude")}><Input value={f.originLng} onChange={(e) => setF({ ...f, originLng: e.target.value })} inputMode="decimal" /></Field>
          <Field label={tr("Name (English)")}><Input value={f.originLabel} onChange={(e) => setF({ ...f, originLabel: e.target.value })} /></Field>
          <Field label={tr("Name (Bangla)")}><Input value={f.originLabelBn} onChange={(e) => setF({ ...f, originLabelBn: e.target.value })} /></Field>
        </div>
      </Section>

      <Section title={tr("Delivery charge")} description={tr("Road distance from the shop. Up to the base distance the base charge applies, then a rate for every started step.")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={tr("Service radius (km)")} hint={tr("Straight line from the shop")}><Input type="number" min={1} step="0.5" value={f.serviceRadiusKm} onChange={(e) => setF({ ...f, serviceRadiusKm: e.target.value })} /></Field>
          <Field label={tr("Base distance (km)")}><Input type="number" min={0} step="0.5" value={f.baseKm} onChange={(e) => setF({ ...f, baseKm: e.target.value })} /></Field>
          <Field label={tr("Base charge ৳")}><Input type="number" min={0} value={f.baseCharge} onChange={(e) => setF({ ...f, baseCharge: e.target.value })} /></Field>
          <Field label={tr("Then ৳ per step")}><Input type="number" min={0} value={f.perKmRate} onChange={(e) => setF({ ...f, perKmRate: e.target.value })} /></Field>
          <Field label={tr("Step length (km)")}><Input type="number" min={0.1} step="0.1" value={f.stepKm} onChange={(e) => setF({ ...f, stepKm: e.target.value })} /></Field>
          <Field label={tr("Road distance multiplier (× straight line)")} hint={tr("Multiplies direct distance by this factor (e.g. 1.2 or 1.3 for winding village roads). Set to 1.0 to turn off.")}><Input type="number" min={1} max={3} step="0.05" value={f.routeFactor} onChange={(e) => setF({ ...f, routeFactor: e.target.value })} /></Field>
        </div>
        {ratesOk && (
          <div className="mt-4 rounded-md border border-border bg-muted/40 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr("Preview")}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
              {[1, 2, 3, 5, 10, 15, Math.round(radius) || 20].map((km) => <span key={km}><span className="text-muted-foreground">{km} km</span> <b>৳{feeFor(rates, km)}</b></span>)}
            </div>
            <div className="mt-3 flex items-center gap-2 text-[13px]">
              <span className="text-muted-foreground">{tr("Try")}</span>
              <Input type="number" min={0} step="0.1" value={previewKm} onChange={(e) => setPreviewKm(e.target.value)} className="h-8 w-24" />
              <span className="text-muted-foreground">{tr("km →")}</span>
              <b>{Number.isFinite(prev) ? `৳${feeFor(rates, prev)}` : "—"}</b>
            </div>
          </div>
        )}
      </Section>

      <Section title={tr("Distance calculation mode")} description={tr("Choose how delivery distance and fee are calculated from Kalibari Hub.")}>
        <div className="space-y-3">
          <label className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors ${f.distanceCalculation !== "road" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"}`}>
            <input
              type="radio"
              name="distanceCalculation"
              value="direct"
              checked={f.distanceCalculation !== "road"}
              onChange={() => setF({ ...f, distanceCalculation: "direct" })}
              className="mt-1 accent-primary"
            />
            <div>
              <p className="text-sm font-semibold">{tr("Direct distance from Kalibari Hub (Default)")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tr("Measures straight-line distance directly from Kalibari Bazar. Uses Google Maps for customer pin dropping. 100% Free with 0 routing API costs.")}
              </p>
            </div>
          </label>
          <label className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors ${f.distanceCalculation === "road" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"}`}>
            <input
              type="radio"
              name="distanceCalculation"
              value="road"
              checked={f.distanceCalculation === "road"}
              onChange={() => setF({ ...f, distanceCalculation: "road" })}
              className="mt-1 accent-primary"
            />
            <div>
              <p className="text-sm font-semibold">{tr("Road distance (Driving route)")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tr("Traces actual streets and turns using the active map provider (OpenStreetMap by default or Google Maps).")}
              </p>
            </div>
          </label>
        </div>
      </Section>

      <Section title={tr("Orders")}>
        <div className="space-y-1">
          <Toggle label={tr("Take delivery orders")} hint={tr("Off = checkout is closed for everyone")} checked={f.enabled} onChange={(enabled) => setF({ ...f, enabled })} />
          <Toggle label={tr("Shop is open right now")} hint={tr("A manual switch on top of the opening hours")} checked={f.shopOpen} onChange={(shopOpen) => setF({ ...f, shopOpen })} />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label={tr("Opens (Bangladesh time)")}><Input type="time" value={f.openFrom} onChange={(e) => setF({ ...f, openFrom: e.target.value })} /></Field>
          <Field label={tr("Closes")}><Input type="time" value={f.openTo} onChange={(e) => setF({ ...f, openTo: e.target.value })} /></Field>
          <Field label={tr("Minimum order ৳")}><Input type="number" min={0} value={f.minOrderAmount} onChange={(e) => setF({ ...f, minOrderAmount: e.target.value })} /></Field>
          <Field label={tr("Free delivery from ৳")} hint={tr("Empty = never free")}><Input type="number" min={0} value={f.freeDeliveryThreshold} onChange={(e) => setF({ ...f, freeDeliveryThreshold: e.target.value })} /></Field>
          <Field
            label={tr("Default delivery turnaround (minutes)")}
            hint={tr("Standard estimated delivery turnaround for new orders (e.g. 60 min = 1 hour, 90-120 min = 1.5 to 2 hours)")}
            className="sm:col-span-2"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="number"
                min={15}
                step={15}
                value={f.defaultDeliveryMinutes}
                onChange={(e) => setF({ ...f, defaultDeliveryMinutes: e.target.value })}
                className="max-w-[140px]"
              />
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: "1 hr (60 min)", val: "60" },
                  { label: "1.5 hrs (90 min)", val: "90" },
                  { label: "2 hrs (120 min)", val: "120" },
                  { label: "3 hrs (180 min)", val: "180" },
                ].map((preset) => (
                  <Button
                    key={preset.val}
                    type="button"
                    variant={f.defaultDeliveryMinutes === preset.val ? "default" : "outline"}
                    size="xs"
                    onClick={() => setF({ ...f, defaultDeliveryMinutes: preset.val })}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          </Field>
        </div>
      </Section>

      <Section
        title={tr("Delivery time slots")}
        description={tr("Shown to customers at checkout. Leave empty to deliver at any time.")}
        actions={<Button type="button" size="sm" variant="outline" disabled={f.slots.length >= 10} onClick={() => setF((s) => ({ ...s, slots: [...s.slots, { id: `slot-${s.slots.length + 1}`, label: "", labelBn: "", from: "09:00", to: "12:00" }] }))}><Plus />{" "}{tr("Add slot")}</Button>}
        className="xl:col-span-2"
      >
        {f.slots.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">{tr("No slots: customers get their order any time during opening hours.")}</p>
        ) : (
          <div className="space-y-2">
            {f.slots.map((s, i) => (
              <div key={i} className="grid items-end gap-2 sm:grid-cols-[1fr_1.4fr_1.4fr_7rem_7rem_auto]">
                <Field label={i === 0 ? tr("Id") : undefined}><Input value={s.id} onChange={(e) => setSlot(i, { id: e.target.value })} aria-label={tr("Slot id")} /></Field>
                <Field label={i === 0 ? tr("Name (English)") : undefined}><Input value={s.label} onChange={(e) => setSlot(i, { label: e.target.value })} aria-label={tr("Slot name in English")} /></Field>
                <Field label={i === 0 ? tr("Name (Bangla)") : undefined}><Input value={s.labelBn} onChange={(e) => setSlot(i, { labelBn: e.target.value })} aria-label={tr("Slot name in Bangla")} /></Field>
                <Field label={i === 0 ? tr("From") : undefined}><Input type="time" value={s.from} onChange={(e) => setSlot(i, { from: e.target.value })} aria-label={tr("From")} /></Field>
                <Field label={i === 0 ? tr("To") : undefined}><Input type="time" value={s.to} onChange={(e) => setSlot(i, { to: e.target.value })} aria-label={tr("To")} /></Field>
                <Button type="button" variant="ghost" size="icon" aria-label={tr("Remove slot")} onClick={() => setF((x) => ({ ...x, slots: x.slots.filter((_, j) => j !== i) }))}><Trash2 /></Button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={tr("Delivery zone restriction")} description={tr("Enforce boundaries so only orders within your service territory are accepted.")}>
        <Toggle
          label={tr("Restrict to Shahrasti Upazila zone")}
          hint={tr("Block locations outside the full Shahrasti area and display an out-of-zone notice")}
          checked={f.restrictToZone}
          onChange={(restrictToZone) => setF({ ...f, restrictToZone })}
        />
      </Section>

      <Section
        title={tr("Heavy Order Surcharge & Unit Thresholds")}
        description={tr(
          "Set unit weight/quantity thresholds. When cart exceeds the limit (e.g. >12 kg), a notice informs the customer at checkout, and admin can manually set the extra delivery charge in the order detail.",
        )}
        actions={
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setF((s) => ({
                ...s,
                heavyOrderRules: [
                  ...(s.heavyOrderRules || []),
                  { unit: "packet", threshold: 25, isEnabled: true },
                ],
              }))
            }
          >
            <Plus className="size-4" /> {tr("Add Unit Rule")}
          </Button>
        }
        className="xl:col-span-2"
      >
        <div className="space-y-2.5">
          {(f.heavyOrderRules || []).map((rule, idx) => (
            <div
              key={idx}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <div className="w-32">
                <Field label={idx === 0 ? tr("Unit") : undefined}>
                  <Input
                    value={rule.unit}
                    onChange={(e) => {
                      const val = e.target.value.toLowerCase();
                      setF((s) => ({
                        ...s,
                        heavyOrderRules: s.heavyOrderRules?.map((r, i) =>
                          i === idx ? { ...r, unit: val } : r,
                        ),
                      }));
                    }}
                    placeholder="kg"
                  />
                </Field>
              </div>

              <div className="w-36">
                <Field label={idx === 0 ? tr("Threshold limit") : undefined}>
                  <Input
                    type="number"
                    min={1}
                    value={rule.threshold}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setF((s) => ({
                        ...s,
                        heavyOrderRules: s.heavyOrderRules?.map((r, i) =>
                          i === idx ? { ...r, threshold: val } : r,
                        ),
                      }));
                    }}
                  />
                </Field>
              </div>

              <div className="flex items-center gap-2 pt-2 sm:pt-4">
                <Switch
                  checked={rule.isEnabled}
                  onCheckedChange={(isEnabled) => {
                    setF((s) => ({
                      ...s,
                      heavyOrderRules: s.heavyOrderRules?.map((r, i) =>
                        i === idx ? { ...r, isEnabled } : r,
                      ),
                    }));
                  }}
                />
                <span className="text-xs font-medium">
                  {rule.isEnabled ? tr("Active") : tr("Inactive")}
                </span>
              </div>

              <div className="ml-auto pt-2 sm:pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setF((s) => ({
                      ...s,
                      heavyOrderRules: s.heavyOrderRules?.filter((_, i) => i !== idx),
                    }))
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Button loading={save.isPending} onClick={submit}>{tr("Save delivery settings")}</Button>
    </div>
  );
}

export function MapsForm({ v }: { v: MapsSettings }) {
  const [f, setF] = useState({
    provider: v.provider,
    googleBrowserKey: v.googleBrowserKey ?? "",
    osmTileUrl: v.osmTileUrl,
    contactEmail: v.contactEmail ?? "",
    dailyRequestCap: String(v.dailyRequestCap),
    enableMapSearch: v.enableMapSearch ?? true,
    dynamicPlaceNames: v.dynamicPlaceNames ?? false,
  });
  // secrets are write-only: empty = keep what is stored, "remove" clears it
  const [googleServerKey, setGoogleServerKey] = useState("");
  const [orsApiKey, setOrsApiKey] = useState("");
  const [clear, setClear] = useState({ google: false, ors: false });
  const [result, setResult] = useState<MapsTestResult | null>(null);
  const usage = useQuery({ queryKey: ["maps-usage"], queryFn: settingsApi.mapsUsage, refetchInterval: 60_000 });

  const save = useAct(
    (body: Record<string, unknown>) => settingsApi.save("maps", body),
    { success: tr("Map settings saved"), invalidate: [["settings"], ["maps-usage"]] },
  );
  const test = useAct(() => settingsApi.testMaps().then(setResult), { success: tr("Test finished") });

  const submit = () => {
    const cap = Number(f.dailyRequestCap);
    if (!Number.isInteger(cap) || cap < 0) return toast.error(tr("The daily limit must be a whole number"));
    if (f.provider === "google" && !f.googleBrowserKey.trim()) return toast.error(tr("Add the Google browser key before switching to Google Maps"));
    const body: Record<string, unknown> = {
      provider: f.provider,
      googleBrowserKey: f.googleBrowserKey.trim(),
      osmTileUrl: f.osmTileUrl.trim(),
      contactEmail: f.contactEmail.trim(),
      dailyRequestCap: cap,
      enableMapSearch: f.enableMapSearch,
      dynamicPlaceNames: f.dynamicPlaceNames,
    };
    if (googleServerKey.trim()) body.googleServerKey = googleServerKey.trim();
    else if (clear.google) body.googleServerKey = "";
    if (orsApiKey.trim()) body.orsApiKey = orsApiKey.trim();
    else if (clear.ors) body.orsApiKey = "";
    save.mutate(body, { onSuccess: () => { setGoogleServerKey(""); setOrsApiKey(""); setClear({ google: false, ors: false }); } });
  };

  const keyHint = (isSet: boolean, cleared: boolean) => (cleared ? tr("Will be removed when you save") : isSet ? tr("A key is saved. Type a new one to replace it.") : tr("No key saved"));
  const used = usage.data ? usage.data.route + usage.data.geocode + usage.data.search : 0;

  return (
    <div className="grid items-start gap-4 xl:grid-cols-2 [&>button]:justify-self-start xl:[&>button]:col-span-2">
      <Section title={tr("Which map?")} description="Customers see this map at checkout; routes and place names come from the same service. You can switch at any time.">
        <Field label={tr("Map service")}>
          <Select value={f.provider} onChange={(e) => setF({ ...f, provider: e.target.value as "osm" | "google" })} className="max-w-sm">
            <option value="osm">{tr("OpenStreetMap (free)")}</option>
            <option value="google">{tr("Google Maps (billing account needed)")}</option>
          </Select>
        </Field>
        <p className="mt-3 text-xs text-muted-foreground">
          OpenStreetMap is free and needs no card. Its road distances come from OpenRouteService (a free key); without a key distances are an estimate (straight line × the factor in Delivery). Google gives the best village and lane names and exact road distances; the first 10,000 requests a month of each kind are free, then it is billed.
        </p>
      </Section>

      <Section title={tr("Map options")} description={tr("Control address search and dynamic place name lookup on the customer map.")}>
        <div className="space-y-3">
          <Toggle
            label={tr("Show search option on map")}
            hint={tr("Allow customers to search addresses and places on the map with autocomplete")}
            checked={f.enableMapSearch}
            onChange={(enableMapSearch) => setF({ ...f, enableMapSearch })}
          />
          <Toggle
            label={tr("Dynamic place names from map")}
            hint={tr("When enabled, place names are fetched dynamically from the map; when disabled, the customer fills in their address name manually")}
            checked={f.dynamicPlaceNames}
            onChange={(dynamicPlaceNames) => setF({ ...f, dynamicPlaceNames })}
          />
        </div>
      </Section>

      <Section title={tr("Today's use")} description={tr("Routes, place names and searches. The limit protects you from a runaway bill.")}>
        {usage.data ? (
          <div className="space-y-2 text-[13px]">
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <span><span className="text-muted-foreground">{tr("Routes")}</span> <b>{usage.data.route}</b></span>
              <span><span className="text-muted-foreground">{tr("Place names")}</span> <b>{usage.data.geocode}</b></span>
              <span><span className="text-muted-foreground">{tr("Searches")}</span> <b>{usage.data.search}</b></span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${usage.data.cap ? Math.min(100, (used / usage.data.cap) * 100) : 0}%` }} /></div>
            <p className="text-xs text-muted-foreground">{used} of {usage.data.cap || "no"} limit used today ({usage.data.provider === "google" ? tr("Google") : tr("OpenStreetMap")})</p>
          </div>
        ) : <p className="text-[13px] text-muted-foreground">{tr("Loading…")}</p>}
        <Field label={tr("Daily request limit")} hint="0 = no limit" className="mt-3 max-w-xs"><Input type="number" min={0} value={f.dailyRequestCap} onChange={(e) => setF({ ...f, dailyRequestCap: e.target.value })} /></Field>
      </Section>

      <Section title={tr("OpenStreetMap")}>
        <div className="space-y-3">
          <Field label={tr("Map tile address")} hint="Must be https and contain {z}, {x} and {y}. The public server is for light use: for a busy shop use a hosted tile service (MapTiler, Stadia)."><Input value={f.osmTileUrl} onChange={(e) => setF({ ...f, osmTileUrl: e.target.value })} /></Field>
          <Field label={tr("OpenRouteService key")} hint={keyHint(v.orsApiKeySet, clear.ors)}>
            <div className="flex gap-2"><Input type="password" autoComplete="off" value={orsApiKey} onChange={(e) => setOrsApiKey(e.target.value)} placeholder={v.orsApiKeySet ? "••••••••" : tr("Paste the key")} />{v.orsApiKeySet && <Button type="button" variant="outline" onClick={() => setClear((c) => ({ ...c, ors: !c.ors }))}>{clear.ors ? tr("Keep") : tr("Remove")}</Button>}</div>
          </Field>
          <Field label={tr("Contact email")} hint={tr("The place-name service (Nominatim) asks for a contact in every request")}><Input type="email" value={f.contactEmail} onChange={(e) => setF({ ...f, contactEmail: e.target.value })} /></Field>
        </div>
      </Section>

      <Section title={tr("Google Maps")}>
        <div className="space-y-3">
          <Field label={tr("Browser key")} hint={tr("Shown to customers' browsers to draw the map: restrict it to your website address in Google Cloud.")}><Input value={f.googleBrowserKey} onChange={(e) => setF({ ...f, googleBrowserKey: e.target.value })} autoComplete="off" /></Field>
          <Field label={tr("Server key")} hint={keyHint(v.googleServerKeySet, clear.google)}>
            <div className="flex gap-2"><Input type="password" autoComplete="off" value={googleServerKey} onChange={(e) => setGoogleServerKey(e.target.value)} placeholder={v.googleServerKeySet ? "••••••••" : tr("Paste the key")} />{v.googleServerKeySet && <Button type="button" variant="outline" onClick={() => setClear((c) => ({ ...c, google: !c.google }))}>{clear.google ? tr("Keep") : tr("Remove")}</Button>}</div>
          </Field>
          <p className="text-xs text-muted-foreground">{tr("The server key is used for road distances and place names (Routes and Geocoding APIs). It is stored encrypted and never shown again.")}</p>
        </div>
      </Section>

      <Section title={tr("Test the connection")} description={tr("Saves nothing. Asks the saved service for one real route and one place name.")} className="xl:col-span-2">
        <Button type="button" variant="outline" loading={test.isPending} onClick={() => test.mutate()}><Zap />{" "}{tr("Test connection")}</Button>
        {result && (
          <ul className="mt-3 space-y-1.5 text-[13px]">
            <li className={result.route.ok ? "text-emerald-600" : "text-destructive"}>Road route ({result.provider === "google" ? tr("Google") : tr("OpenRouteService")}): {result.route.ok ? `works (${result.route.km} km test route)` : result.route.error ?? "failed"}</li>
            <li className={result.place.ok ? "text-emerald-600" : "text-destructive"}>Place name: {result.place.ok ? `works (${result.place.name})` : result.place.error ?? "failed"}</li>
            {!result.route.ok && <li className="text-xs text-muted-foreground">{tr("Until the route works, delivery charges are an estimate (flagged on every order).")}</li>}
          </ul>
        )}
      </Section>

      <Button loading={save.isPending} onClick={submit}>{tr("Save map settings")}</Button>
    </div>
  );
}
