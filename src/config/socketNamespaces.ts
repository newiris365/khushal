import { Namespace } from 'socket.io';

// Shared references to Socket.io namespaces.
// server.ts populates these after initialization.
// Controllers import from here instead of requiring '../server' (avoiding circular deps).

export let transitNs: Namespace | null = null;
export let notificationsNs: Namespace | null = null;
export let canteenNs: Namespace | null = null;
export let gateNs: Namespace | null = null;
export let directorNs: Namespace | null = null;
export let eventsNs: Namespace | null = null;

export function setTransitNs(ns: Namespace) { transitNs = ns; }
export function setNotificationsNs(ns: Namespace) { notificationsNs = ns; }
export function setCanteenNs(ns: Namespace) { canteenNs = ns; }
export function setGateNs(ns: Namespace) { gateNs = ns; }
export function setDirectorNs(ns: Namespace) { directorNs = ns; }
export function setEventsNs(ns: Namespace) { eventsNs = ns; }
