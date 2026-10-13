/// <reference types="vite/client" />

import type { LaguApi } from '@shared/ipc'

declare global {
  interface Window {
    lagu: LaguApi
  }
}

export {}
