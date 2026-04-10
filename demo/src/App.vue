<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import AddressForm from "./components/AddressForm.vue";
import DemoOverlay from "./components/DemoOverlay.vue";
import { providers } from "./providers";

const formKey = ref(0);
const demoOverlayRef = ref<InstanceType<typeof DemoOverlay> | null>(null);
const demoActive = ref(false);
const showReplay = ref(false);
const DEMO_SEEN_KEY = "smart-address-demo-seen";
const demoSeen = localStorage.getItem(DEMO_SEEN_KEY) === "1";

const samples = [
  {
    url: "https://www.google.com/maps/place/Gateway+of+India/@18.9219841,72.8346543,17z",
    provider: "google",
    note: "Place name + viewport coordinates (landmark)",
  },
  {
    url: "https://maps.apple.com/?q=Westfield+Valley+Fair&ll=37.2487,-121.9440",
    provider: "apple",
    note: "Place name + pin coordinates (shopping mall)",
  },
  {
    url: "https://www.openstreetmap.org/#map=18/34.0536/-118.2427",
    provider: "osm",
    note: "Coordinates only — residential area in LA",
  },
  {
    url: "https://www.bing.com/maps?cp=52.5163~13.3777&lvl=17",
    provider: "bing",
    note: "CP param with tilde separator (street in Berlin)",
  },
  {
    url: "https://maps.app.goo.gl/TUgLTcyjfzxtz9tm9",
    provider: "google",
    note: "Shortened URL",
    shortUrl: true,
  },
];

const activeUrl = ref("");
const demoUrl = ref(samples[Math.floor(Math.random() * samples.length)].url);

function pickRandomDemoUrl() {
  demoUrl.value = samples[Math.floor(Math.random() * samples.length)].url;
}

function trySample(url: string) {
  demoActive.value = false;
  showReplay.value = true;
  activeUrl.value = url;
  formKey.value++;
}

function onDemoTrigger(url: string) {
  activeUrl.value = url;
  formKey.value++;
}

function onDemoReset() {
  activeUrl.value = "";
  formKey.value++;
}


function replayDemo() {
  showReplay.value = false;
  demoActive.value = true;
  pickRandomDemoUrl();
  activeUrl.value = "";
  formKey.value++;
  document
    .getElementById("address")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
  nextTick(() => {
    demoOverlayRef.value?.start();
  });
}

function scrollTo(id: string) {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

onMounted(() => {
  if (demoSeen) {
    showReplay.value = true;
    return;
  }
  setTimeout(async () => {
    demoActive.value = true;
    await nextTick();
    demoOverlayRef.value?.start();
    localStorage.setItem(DEMO_SEEN_KEY, "1");
  }, 800);
});
</script>

<template>
  <div class="page">
    <!-- Hero -->
    <div class="hero">
      <div class="hero-row">
        <h1>Smart Address</h1>
        <button v-if="showReplay" class="replay-btn" @click="replayDemo">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          Replay demo
        </button>
      </div>
      <p class="tagline">
        Turns
        <a href="#supported" @click.prevent="scrollTo('supported')">
          <b>ANY</b></a
        >* Maps URL into a structured Form ready Address.
      </p>
    </div>

    <!-- Try it -->
    <section id="try-it" class="section">
      <h2>Try it</h2>
      <p class="hint">Click a sample or paste your own URL into any field.</p>

      <div class="samples">
        <div
          v-for="s in samples"
          :key="s.url"
          class="sample-row"
          @click="trySample(s.url)"
        >
          <div class="sample-main">
            <span class="sample-url" :title="s.url">{{ s.url }}</span>
            <span class="sample-note">{{ s.note }}</span>
          </div>
          <span class="sample-provider">
            {{ providers[s.provider]?.name || s.provider }}
          </span>
          <a
            v-if="s.shortUrl"
            class="sample-icon"
            href="#short-urls"
            @click.stop.prevent="scrollTo('short-urls')"
            title="Requires server-side proxy — see Note on short URLs"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <circle cx="12" cy="8" r="0.5" fill="currentColor" />
            </svg>
          </a>
          <a
            class="sample-icon"
            :href="s.url"
            target="_blank"
            rel="noopener"
            @click.stop
            title="Open in maps"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
              />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      </div>
    </section>

    <!-- Form -->
    <section id="address" class="section">
      <h2>Address</h2>
      <div class="form-demo-wrapper">
        <AddressForm :key="formKey" :initial-url="activeUrl" />
        <DemoOverlay
          ref="demoOverlayRef"
          :demo-url="demoUrl"
          @trigger-resolve="onDemoTrigger"
          @reset-form="onDemoReset"
          @animation-ended="
            demoActive = false;
            showReplay = true;
          "
        />
      </div>
    </section>

    <!-- How it works -->
    <section id="how-it-works" class="section">
      <h2>How it works</h2>
      <div class="steps">
        <div class="step">
          <div class="step-num">1</div>
          <div>
            <strong>Parse</strong>
            <p>
              Detects the provider from the URL. Extracts embedded address, pin
              coordinates, and place name from the data param.
            </p>
          </div>
        </div>
        <div class="step">
          <div class="step-num">2</div>
          <div>
            <strong>Geocode</strong>
            <p>
              Calls the provider's geocoding API (or Nominatim as fallback) to
              get structured address components.
            </p>
          </div>
        </div>
        <div class="step">
          <div class="step-num">3</div>
          <div>
            <strong>Normalize</strong>
            <p>
              Maps the raw response into a standard address object — same shape
              regardless of provider.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Short URL note -->
    <section id="short-urls" class="section">
      <h2>Note on short URLs</h2>
      <div class="info-box">
        <p>
          Shortened links (<code>maps.app.goo.gl</code>, <code>binged.it</code>,
          etc.) require a server-side proxy to expand — browsers block
          cross-origin redirect following due to CORS. This demo includes a
          built-in proxy. When using the library standalone, provide your own
          expansion logic via the <code>expandUrl</code> config callback.
        </p>
      </div>
    </section>

    <!-- Supported -->
    <section id="supported" class="section" style="margin-bottom: 0">
      <p class="hint" style="margin-bottom: 0">
        See
        <a href="../../SUPPORTED_FORMATS.md" target="_blank"
          >SUPPORTED_FORMATS.md</a
        >
        for every vendor and URL format.
      </p>
    </section>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

a {
  color: initial;
}

body {
  background: #fafafa;
  scroll-behavior: smooth;
}

.page {
  max-width: 37.5rem;
  margin: 0 auto;
  padding: 3rem 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #111;
}

/* Hero */
.hero {
  margin-bottom: 2.5rem;
}

.hero h1 {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.025rem;
  margin-bottom: 0.5rem;
}

.tagline {
  font-size: 0.9375rem;
  line-height: 1.5;
  color: #666;
}

/* Section nav */
.section-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 1rem;
}

.section-nav a {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03rem;
  color: #777;
  text-decoration: none;
  padding: 0.25rem 0.5rem;
  border: 1px solid #ccc;
  border-radius: 0.25rem;
  transition: all 0.15s;
}

.section-nav a:hover {
  color: #333;
  border-color: #bbb;
  background: #f0f0f0;
}

/* Sections */
.section {
  margin-bottom: 2.5rem;
  padding-top: 2rem;
  border-top: 1px solid #ddd;
  scroll-margin-top: 1rem;
}

.section h2 {
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03125rem;
  color: #777;
  margin-bottom: 0.75rem;
}

.hint {
  font-size: 0.8125rem;
  color: #777;
  margin-bottom: 0.75rem;
}

.hint code {
  background: #f0f0f0;
  padding: 0.0625rem 0.3125rem;
  border-radius: 0.1875rem;
  font-size: 0.75rem;
}

/* Samples */
.samples {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sample-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d5d5d5;
  border-radius: 0.5rem;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.15s;
}

.sample-row:hover {
  border-color: #aaa;
}

.sample-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.sample-url {
  font-size: 0.6875rem;
  font-family: "SF Mono", "Fira Code", monospace;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sample-note {
  font-size: 0.625rem;
  color: #999;
}

.sample-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.25rem;
  color: #999;
  transition: all 0.15s;
  text-decoration: none;
}

.sample-icon:hover {
  color: #333;
  background: #f0f0f0;
}

.sample-provider {
  flex-shrink: 0;
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
  white-space: nowrap;
}

/* Hero row */
.hero-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.replay-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #888;
  background: none;
  border: 1px solid #ddd;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.15s;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.replay-btn:hover {
  color: #333;
  border-color: #999;
  background: #f5f5f5;
}

/* Demo wrapper */
.form-demo-wrapper {
  position: relative;
}

/* Steps */
.steps {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.step {
  display: flex;
  gap: 0.875rem;
  align-items: flex-start;
}

.step-num {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  background: #111;
  color: #fff;
  font-size: 0.8125rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step strong {
  font-size: 0.875rem;
  display: block;
  margin-bottom: 0.125rem;
}

.step p {
  font-size: 0.8125rem;
  color: #666;
  line-height: 1.4;
}

/* Info box */
.info-box {
  padding: 0.75rem 1rem;
  background: #f8f8f8;
  border-left: 3px solid #aaa;
  border-radius: 0.25rem;
  font-size: 0.8125rem;
  color: #555;
  line-height: 1.5;
}

.info-box code {
  background: #eee;
  padding: 0.0625rem 0.3125rem;
  border-radius: 0.1875rem;
  font-size: 0.75rem;
}

.info-box p {
  margin: 0;
}

@media (max-width: 30rem) {
  .page {
    padding: 1.5rem 1.5rem;
  }

  .hero h1 {
    font-size: 1.625rem;
  }

  .sample-provider {
    display: none;
  }
}
</style>
