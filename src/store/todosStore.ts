import { create } from "zustand";

interface TodosOverlayState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const useTodosOverlayStore = create<TodosOverlayState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
