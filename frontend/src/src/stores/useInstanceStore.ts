import { create } from 'zustand';

export interface Instance {
  id: string;
  name: string;
  phone: string;
  status: 'online' | 'offline' | 'connecting';
  emoji: string;
  messagesSent: number;
  activeDays: number;
  lastConnected?: string;
}

interface InstanceStore {
  instances: Instance[];
  selectedInstance: Instance | null;
  setSelectedInstance: (instance: Instance | null) => void;
  addInstance: (instance: Instance) => void;
  updateInstance: (id: string, data: Partial<Instance>) => void;
  deleteInstance: (id: string) => void;
}

export const useInstanceStore = create<InstanceStore>((set) => ({
  instances: [
    {
      id: '1',
      name: 'Vendas',
      phone: '+55 11 99999-9999',
      status: 'online',
      emoji: '📁',
      messagesSent: 1200,
      activeDays: 3,
    },
    {
      id: '2',
      name: 'Marketing',
      phone: '+55 11 98888-8888',
      status: 'offline',
      emoji: '🎯',
      messagesSent: 0,
      activeDays: 0,
      lastConnected: '2h',
    },
    {
      id: '3',
      name: 'Suporte',
      phone: '+55 11 97777-7777',
      status: 'connecting',
      emoji: '💬',
      messagesSent: 450,
      activeDays: 1,
    },
  ],
  selectedInstance: null,
  setSelectedInstance: (instance) => set({ selectedInstance: instance }),
  addInstance: (instance) => set((state) => ({ instances: [...state.instances, instance] })),
  updateInstance: (id, data) =>
    set((state) => ({
      instances: state.instances.map((inst) => (inst.id === id ? { ...inst, ...data } : inst)),
    })),
  deleteInstance: (id) => set((state) => ({ instances: state.instances.filter((inst) => inst.id !== id) })),
}));
