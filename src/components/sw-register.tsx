"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { strings } from "@/lib/strings";

/** Registers the service worker (production only) and offers updates; never auto-reloads. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    let reloading = false;
    const onControllerChange = () => {
      // Only reload when the user asked for the update (SKIP_WAITING below).
      if (reloading) window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const offerUpdate = (worker: ServiceWorker) => {
      toast(strings.updateAvailable, {
        id: "sw-update",
        duration: Infinity,
        action: {
          label: strings.reload,
          onClick: () => {
            reloading = true;
            worker.postMessage({ type: "SKIP_WAITING" });
          },
        },
      });
    };

    let registration: ServiceWorkerRegistration | undefined;
    const checkForUpdate = () => {
      if (document.visibilityState === "visible") void registration?.update().catch(() => {});
    };

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        registration = reg;
        // An update that finished installing while the app was closed.
        if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          // Decide now: with no active worker yet this is the first install, not an update.
          // (Checking `controller` later is racy: clients.claim() can set it before "installed".)
          const isUpdate = !!reg.active;
          installing?.addEventListener("statechange", () => {
            if (isUpdate && installing.state === "installed") offerUpdate(installing);
          });
        });
      })
      .catch((error: unknown) => console.error("Service worker registration failed", error));

    // Look for a new version whenever the app comes back to the foreground.
    document.addEventListener("visibilitychange", checkForUpdate);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", checkForUpdate);
    };
  }, []);

  return null;
}
