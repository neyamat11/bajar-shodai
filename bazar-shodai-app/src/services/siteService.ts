import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';

export interface DeliverySlot {
  id: string;
  label: string;
  labelBn: string;
  from: string;
  to: string;
}

export interface DeliveryConfig {
  enabled: boolean;
  shopOpen: boolean;
  openFrom?: string;
  openTo?: string;
  originSet?: boolean;
  origin?: {
    lat: number;
    lng: number;
    label?: string | null;
    labelBn?: string | null;
  } | null;
  serviceRadiusKm?: number;
  baseKm?: number;
  baseCharge?: number;
  perKmRate?: number;
  stepKm?: number;
  minOrderAmount?: number;
  freeDeliveryThreshold?: number;
  slots?: DeliverySlot[];
  restrictToZone?: boolean;
  distanceCalculation?: 'direct' | 'road';
}

export interface MapsConfig {
  provider: 'osm' | 'google';
  distanceCalculation?: 'direct' | 'road';
  googleBrowserKey?: string | null;
  osmTileUrl?: string;
  enableMapSearch?: boolean;
  dynamicPlaceNames?: boolean;
}

export interface MobileSiteSettings {
  site?: {
    storeName?: string;
    tagline?: string;
    logoUrl?: string | null;
    faviconUrl?: string | null;
    hotline?: string | null;
    whatsapp?: string | null;
    whatsappOrderTemplate?: string | null;
    messenger?: string | null;
    messengerEnabled?: boolean;
    messengerOrderTemplate?: string | null;
    socialLinks?: {
      facebook?: string | null;
      instagram?: string | null;
      youtube?: string | null;
      twitter?: string | null;
    };
    contactEmail?: string | null;
    address?: string | null;
  };
  delivery?: DeliveryConfig;
  maps?: MapsConfig;
}

export async function fetchSiteSettingsApi(): Promise<MobileSiteSettings> {
  try {
    return await api.get<MobileSiteSettings>('/customer/settings');
  } catch {
    return {};
  }
}

export function useSiteSettings() {
  return useQuery({
    queryKey: ['site-settings'],
    queryFn: fetchSiteSettingsApi,
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  });
}

