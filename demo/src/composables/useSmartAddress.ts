import { ref, reactive } from "vue";
import {
  resolveMapUrl,
  isMapUrl,
  detectProvider,
  type SmartAddress,
  type MapProvider,
} from "smart-address";

export interface AddressFields {
  buildingName: string;
  street1: string;
  street2: string;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export function useSmartAddress() {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const provider = ref<MapProvider | null>(null);
  const resolved = ref<SmartAddress | null>(null);
  const fields = reactive<AddressFields>({
    buildingName: "",
    street1: "",
    street2: "",
    neighborhood: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  });

  function clearFields() {
    fields.buildingName = "";
    fields.street1 = "";
    fields.street2 = "";
    fields.neighborhood = "";
    fields.city = "";
    fields.state = "";
    fields.postalCode = "";
    fields.country = "";
    resolved.value = null;
    provider.value = null;
    error.value = null;
  }

  async function handlePaste(text: string): Promise<boolean> {
    const trimmed = text.trim();

    if (!isMapUrl(trimmed)) {
      return false;
    }

    loading.value = true;
    error.value = null;
    provider.value = detectProvider(trimmed);

    try {
      const address = await resolveMapUrl(trimmed);

      resolved.value = address;
      provider.value = address.provider;

      // Fill fields
      fields.buildingName = address.buildingName;
      fields.street1 = address.street1;
      fields.street2 = address.street2;
      fields.neighborhood = address.neighborhood;
      fields.city = address.city;
      fields.state = address.state;
      fields.postalCode = address.postalCode;
      fields.country = address.countryName || address.country;

      loading.value = false;
      return true;
    } catch (err) {
      console.error("[useSmartAddress] Error:", err);
      error.value = (err as Error).message;
      loading.value = false;
      return false;
    }
  }

  return {
    loading,
    error,
    provider,
    resolved,
    fields,
    handlePaste,
    clearFields,
    isMapUrl,
  };
}
