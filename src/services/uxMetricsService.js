const STORAGE_KEY = "salesUxMetrics.v1";

const safeParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const loadStore = () => {
  if (typeof window === "undefined") return { counters: {}, gauges: {}, events: [] };
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = safeParse(raw);
  if (!parsed || typeof parsed !== "object") {
    return { counters: {}, gauges: {}, events: [] };
  }
  return {
    counters: parsed.counters || {},
    gauges: parsed.gauges || {},
    events: Array.isArray(parsed.events) ? parsed.events : [],
  };
};

const saveStore = (store) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

export const uxMetricsService = {
  incrementCounter(metric, amount = 1) {
    const store = loadStore();
    store.counters[metric] = (Number(store.counters[metric]) || 0) + amount;
    saveStore(store);
  },

  setGauge(metric, value) {
    const store = loadStore();
    store.gauges[metric] = value;
    saveStore(store);
  },

  trackEvent(eventName, payload = {}) {
    const store = loadStore();
    store.events.push({
      eventName,
      payload,
      at: new Date().toISOString(),
    });
    if (store.events.length > 200) {
      store.events = store.events.slice(-200);
    }
    saveStore(store);
  },

  getMetricsSnapshot() {
    return loadStore();
  },
};
