export interface ProviderMeta {
  name: string;
}

export const providers: Record<string, ProviderMeta> = {
  google: { name: "Google Maps" },
  apple: { name: "Apple Maps" },
  osm: { name: "OpenStreetMap" },
  bing: { name: "Bing Maps" },
  here: { name: "HERE Maps" },
  yandex: { name: "Yandex Maps" },
};
