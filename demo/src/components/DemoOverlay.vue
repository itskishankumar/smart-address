<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";

const props = withDefaults(
  defineProps<{
    demoUrl?: string;
  }>(),
  {
    demoUrl:
      "https://www.google.com/maps/place/Gateway+of+India/@18.9219841,72.8346543,17z",
  },
);

const emit = defineEmits<{
  "trigger-resolve": [url: string];
  "reset-form": [];
  "animation-ended": [];
}>();

type Phase =
  | "idle"
  | "cursor-moving"
  | "clicking"
  | "pasting"
  | "resolving"
  | "done";

const phase = ref<Phase>("idle");
const cursorX = ref(0);
const cursorY = ref(0);
const cursorStartX = ref(0);
const cursorStartY = ref(0);
const showKeystroke = ref(false);
const inputFlash = ref(false);
const cursorFading = ref(false);

const showCursor = computed(
  () =>
    phase.value === "cursor-moving" ||
    phase.value === "clicking" ||
    phase.value === "pasting" ||
    phase.value === "resolving",
);

const isMac =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);
const keystrokeLabel = isMac ? "\u2318V" : "Ctrl+V";

const fieldIds = [
  "buildingName",
  "street1",
  "street2",
  "neighborhood",
  "city",
  "state",
  "postalCode",
  "country",
];

let targetFieldId = "";

function pickRandomField(): string {
  return fieldIds[Math.floor(Math.random() * fieldIds.length)];
}

// Cancellation
let cancelled = false;
let timeoutIds: ReturnType<typeof setTimeout>[] = [];

function delay(ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => {
      if (cancelled) return reject(new Error("cancelled"));
      resolve();
    }, ms);
    timeoutIds.push(id);
  });
}

function cleanup() {
  cancelled = true;
  timeoutIds.forEach(clearTimeout);
  timeoutIds = [];
  showKeystroke.value = false;
  inputFlash.value = false;
  cursorFading.value = false;

  // Clear any partially-pasted URL from the input
  const input = targetFieldId
    ? (document.getElementById(targetFieldId) as HTMLInputElement | null)
    : null;
  if (input && input.value && phase.value !== "resolving" && phase.value !== "done") {
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.blur();
  }
}

function getTargetPosition(wrapperEl: Element): { x: number; y: number } | null {
  const input = document.getElementById(targetFieldId);
  if (!input) return null;
  const wrapperRect = wrapperEl.getBoundingClientRect();
  const inputRect = input.getBoundingClientRect();
  return {
    x: inputRect.left - wrapperRect.left + inputRect.width * 0.3,
    y: inputRect.top - wrapperRect.top + inputRect.height / 2,
  };
}

async function start() {
  cleanup();
  cancelled = false;
  targetFieldId = pickRandomField();
  phase.value = "idle";

  await nextTick();

  const wrapper = document.querySelector(".form-demo-wrapper");
  if (!wrapper) return;

  const target = getTargetPosition(wrapper);
  if (!target) return;

  // Start cursor offset above-right of target
  cursorStartX.value = target.x + 120;
  cursorStartY.value = target.y - 60;
  cursorX.value = cursorStartX.value;
  cursorY.value = cursorStartY.value;

  // Phase 1: Move cursor
  phase.value = "cursor-moving";
  await nextTick();

  // Trigger CSS transition by updating target position
  await delay(80);
  if (cancelled) return;
  cursorX.value = target.x;
  cursorY.value = target.y;

  // Wait for cursor movement transition
  await delay(900);
  if (cancelled) return;

  // Phase 2: Click — focus the input
  phase.value = "clicking";
  const input = document.getElementById(targetFieldId) as HTMLInputElement | null;
  if (input) input.focus();

  await delay(550);
  if (cancelled) return;

  // Phase 3: Paste — show keystroke hint, flash input, paste URL
  phase.value = "pasting";
  showKeystroke.value = true;

  await delay(450);
  if (cancelled) return;

  // Paste the URL into the input
  if (input) {
    input.value = props.demoUrl;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    inputFlash.value = true;
  }

  await delay(800);
  if (cancelled) return;

  showKeystroke.value = false;
  inputFlash.value = false;

  // Phase 4: Resolve — trigger the actual flow
  phase.value = "resolving";
  cursorFading.value = true;

  await delay(550);
  if (cancelled) return;

  emit("trigger-resolve", props.demoUrl);

  // Wait for fields to fill — poll instead of blind wait so we don't hang on slow network
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    await delay(300);
    if (cancelled) return;
    const filled = document.getElementById("city") as HTMLInputElement | null;
    if (filled?.value) break;
  }

  await delay(600);
  if (cancelled) return;

  phase.value = "done";
  emit("animation-ended");
}

function stop() {
  if (phase.value === "idle" || phase.value === "done") return;
  cleanup();
  phase.value = "done";
  emit("animation-ended");
}

onBeforeUnmount(() => {
  cleanup();
});

defineExpose({ start, stop });
</script>

<template>
  <div class="demo-overlay" aria-hidden="true">
    <!-- Fake cursor -->
    <div
      v-if="showCursor"
      class="demo-cursor"
      :class="{ fading: cursorFading }"
      :style="{ transform: `translate(${cursorX}px, ${cursorY}px)` }"
    >
      <div :class="{ clicking: phase === 'clicking' }">
      <!-- Cursor SVG -->
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M5.65 1.15L21.75 12.85L13.35 13.85L17.35 22.15L14.15 23.55L10.15 15.25L5.15 19.65L5.65 1.15Z"
          fill="#111"
          stroke="#fff"
          stroke-width="1.5"
          stroke-linejoin="round"
        />
      </svg>

      <!-- Keystroke hint -->
      <Transition name="keystroke">
        <span v-if="showKeystroke" class="keystroke-hint">{{ keystrokeLabel }}</span>
      </Transition>
      </div>
    </div>

    <!-- Input flash overlay (positioned over #street1 dynamically) -->

  </div>
</template>

<style scoped>
.demo-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}

.demo-cursor {
  position: absolute;
  top: 0;
  left: 0;
  transition:
    transform 0.85s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.4s ease;
  will-change: transform;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.15));
}

.demo-cursor.fading {
  opacity: 0;
}

.clicking {
  animation: click-bounce 0.15s ease;
}

@keyframes click-bounce {
  0% { transform: scale(1); }
  50% { transform: scale(0.8); }
  100% { transform: scale(1); }
}

.keystroke-hint {
  position: absolute;
  left: 1rem;
  top: 1.25rem;
  background: #111;
  color: #fff;
  font-size: 0.625rem;
  font-weight: 600;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  white-space: nowrap;
  letter-spacing: 0.02rem;
}

.keystroke-enter-active {
  transition: all 0.15s ease;
}

.keystroke-leave-active {
  transition: all 0.2s ease;
}

.keystroke-enter-from,
.keystroke-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

</style>
