"use client";

import * as React from "react";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

type ToastInput = Omit<Toast, "id">;

interface ToastState {
  toasts: Toast[];
}

const listeners: Array<(state: ToastState) => void> = [];
let memoryState: ToastState = { toasts: [] };

function dispatch(action: { type: "ADD" | "REMOVE"; toast?: Toast; id?: string }) {
  if (action.type === "ADD" && action.toast) {
    memoryState = { toasts: [action.toast, ...memoryState.toasts].slice(0, 5) };
  } else if (action.type === "REMOVE") {
    memoryState = { toasts: memoryState.toasts.filter((t) => t.id !== action.id) };
  }
  listeners.forEach((l) => l(memoryState));
}

export function toast(input: ToastInput) {
  const id = crypto.randomUUID();
  dispatch({ type: "ADD", toast: { ...input, id } });
  setTimeout(() => dispatch({ type: "REMOVE", id }), 4000);
  return id;
}

export function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const idx = listeners.indexOf(setState);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  return { toasts: state.toasts, toast };
}
