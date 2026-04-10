<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useSmartAddress } from "../composables/useSmartAddress";
import { providers } from "../providers";

const props = defineProps<{
  initialUrl?: string;
}>();

const {
  loading,
  error,
  provider,
  resolved,
  fields,
  handlePaste,
  clearFields,
  isMapUrl,
} = useSmartAddress();

onMounted(() => {
  if (props.initialUrl) {
    handlePaste(props.initialUrl);
  }
});

const filledFields = ref(new Set<string>());
const hasAddress = computed(() => resolved.value !== null);

watch(resolved, async (val) => {
  if (!val) {
    filledFields.value.clear();
    return;
  }
  const order = [
    "buildingName",
    "street1",
    "street2",
    "neighborhood",
    "city",
    "state",
    "postalCode",
    "country",
  ];
  for (const f of order) {
    await new Promise((r) => setTimeout(r, 60));
    filledFields.value.add(f);
  }
});

function onPaste(e: ClipboardEvent) {
  const text = e.clipboardData?.getData("text") || "";
  if (text && isMapUrl(text.trim())) {
    e.preventDefault();
    filledFields.value.clear();
    handlePaste(text);
  }
}

function onReset() {
  clearFields();
  filledFields.value.clear();
}

const providerMeta = computed(() =>
  provider.value ? providers[provider.value] : null,
);

const geocoderLabel = computed(() => {
  if (!resolved.value) return "";
  const g = resolved.value.geocoder;
  return g === "nominatim"
    ? "Nominatim (OSM)"
    : `${g.charAt(0).toUpperCase() + g.slice(1)} API`;
});

function isFilled(field: string, value: string) {
  return filledFields.value.has(field) && value;
}
</script>

<template>
  <div>
    <!-- Status -->
    <div class="status-bar">
      <div>
        <span v-if="providerMeta" class="provider-pill">
          {{ providerMeta.name }}
          <span v-if="loading" class="loading-spinner" />
        </span>
      </div>
      <button v-if="hasAddress" class="clear-btn" @click="onReset">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        Clear
      </button>
    </div>

    <!-- Error -->
    <div v-if="error" class="error-msg">{{ error }}</div>

    <!-- Form -->
    <form @submit.prevent>
      <div class="field">
        <label for="buildingName">Building / Place Name</label>
        <input
          id="buildingName"
          v-model="fields.buildingName"
          :class="{ filled: isFilled('buildingName', fields.buildingName) }"
          autocomplete="organization"
          @paste="onPaste"
        />
      </div>

      <div class="field">
        <label for="street1">Street Address</label>
        <input
          id="street1"
          v-model="fields.street1"
          :class="{ filled: isFilled('street1', fields.street1) }"
          autocomplete="address-line1"
          @paste="onPaste"
        />
      </div>

      <div class="field">
        <label for="street2">Apt / Suite / Unit</label>
        <input
          id="street2"
          v-model="fields.street2"
          :class="{ filled: isFilled('street2', fields.street2) }"
          autocomplete="address-line2"
          @paste="onPaste"
        />
      </div>

      <div class="field">
        <label for="neighborhood">Neighborhood</label>
        <input
          id="neighborhood"
          v-model="fields.neighborhood"
          :class="{ filled: isFilled('neighborhood', fields.neighborhood) }"
          autocomplete="address-level3"
          @paste="onPaste"
        />
      </div>

      <div class="row">
        <div class="field">
          <label for="city">City</label>
          <input
            id="city"
            v-model="fields.city"
            :class="{ filled: isFilled('city', fields.city) }"
            autocomplete="address-level2"
            @paste="onPaste"
          />
        </div>
        <div class="field">
          <label for="state">State / Province</label>
          <input
            id="state"
            v-model="fields.state"
            :class="{ filled: isFilled('state', fields.state) }"
            autocomplete="address-level1"
            @paste="onPaste"
          />
        </div>
      </div>

      <div class="row">
        <div class="field">
          <label for="postalCode">Postal Code</label>
          <input
            id="postalCode"
            v-model="fields.postalCode"
            :class="{ filled: isFilled('postalCode', fields.postalCode) }"
            autocomplete="postal-code"
            @paste="onPaste"
          />
        </div>
        <div class="field">
          <label for="country">Country</label>
          <input
            id="country"
            v-model="fields.country"
            :class="{ filled: isFilled('country', fields.country) }"
            autocomplete="country-name"
            @paste="onPaste"
          />
        </div>
      </div>
    </form>

    <!-- Geocoder info -->
    <div v-if="resolved" class="geocoder-info">
      Resolved via {{ geocoderLabel }}
    </div>
  </div>
</template>

<style scoped>
h3 {
  font-size: 0.8125rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03125rem;
  color: #333;
  margin: 0 0 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 0.125rem solid #111;
}

.field {
  margin-bottom: 1rem;
}

.field label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: #555;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.02rem;
}

.field input {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 0.375rem;
  font-size: 0.9375rem;
  color: #111;
  background: #fff;
  outline: none;
  transition: border-color 0.15s;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.field input:focus {
  border-color: #111;
}

.field input.filled {
  border-color: #c5c5c5;
  background: #f7f7f7;
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

@media (max-width: 30rem) {
  .row {
    grid-template-columns: 1fr;
  }
}

.provider-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03125rem;
  color: #666;
  background: #efefef;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
}

.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  min-height: 1.75rem;
}

.clear-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8125rem;
  color: #888;
  background: none;
  border: 1px solid #ddd;
  border-radius: 0.375rem;
  padding: 0.375rem 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
}

.clear-btn:hover {
  color: #333;
  border-color: #999;
  background: #f5f5f5;
}

.error-msg {
  padding: 0.625rem 0.875rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.375rem;
  color: #dc2626;
  font-size: 0.8125rem;
  margin-bottom: 1rem;
}

.geocoder-info {
  margin-top: 1rem;
  font-size: 0.6875rem;
  color: #999;
}

.loading-spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 0.125rem solid #ddd;
  border-top-color: #111;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin-left: 0.375rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
