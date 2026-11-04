import { create } from 'zustand';

import { fetchCatalogue } from '@/services/catalogue';

import type { Catalogue } from './catalogue-model';

type CatalogueState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  catalogue: Catalogue | null;
};

export const useCatalogueStore = create<CatalogueState>(() => ({ status: 'idle', catalogue: null }));

let inFlight: Promise<void> | null = null;

/** Loads (or reloads) the catalogue. A failed reload keeps what was already shown. */
export function loadCatalogue() {
  if (inFlight) return inFlight;
  useCatalogueStore.setState({ status: 'loading' });
  inFlight = fetchCatalogue()
    .then((catalogue) => useCatalogueStore.setState({ status: 'ready', catalogue }))
    .catch((error: unknown) => {
      if (__DEV__) console.warn('Catalogue failed to load', error);
      useCatalogueStore.setState((state) => ({ status: state.catalogue ? 'ready' : 'error' }));
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/** Loads the catalogue once, the first time a screen needs it. */
export function ensureCatalogue() {
  if (useCatalogueStore.getState().status === 'idle') void loadCatalogue();
}
