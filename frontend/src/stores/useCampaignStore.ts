import { create } from 'zustand';

export interface Campaign {
  id: string;
  title: string;
  status: 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
  progress: number;
  sent: number;
  total: number;
  delivered: number;
  errors: number;
  timeRemaining?: string;
  scheduledDate?: string;
  completedDate?: string;
  messages: number;
  contacts: number;
}

interface CampaignStore {
  campaigns: Campaign[];
  filter: string;
  addCampaign: (campaign: Campaign) => void;
  updateCampaign: (id: string, data: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;
  setFilter: (filter: string) => void;
}

export const useCampaignStore = create<CampaignStore>((set) => ({
  campaigns: [
    {
      id: '1',
      title: 'Black Friday Sale',
      status: 'active',
      progress: 68,
      sent: 340,
      total: 500,
      delivered: 325,
      errors: 0,
      timeRemaining: '~12 min',
      messages: 2,
      contacts: 500,
    },
    {
      id: '2',
      title: 'Promoção Natal',
      status: 'completed',
      progress: 100,
      sent: 500,
      total: 500,
      delivered: 485,
      errors: 15,
      completedDate: '24/11/2024 14:30',
      messages: 3,
      contacts: 500,
    },
    {
      id: '3',
      title: 'Ano Novo 2025',
      status: 'scheduled',
      progress: 0,
      sent: 0,
      total: 1000,
      delivered: 0,
      errors: 0,
      scheduledDate: '01/01/2025 às 00:00',
      messages: 3,
      contacts: 1000,
    },
  ],
  filter: 'all',
  addCampaign: (campaign) => set((state) => ({ campaigns: [...state.campaigns, campaign] })),
  updateCampaign: (id, data) =>
    set((state) => ({
      campaigns: state.campaigns.map((camp) => (camp.id === id ? { ...camp, ...data } : camp)),
    })),
  deleteCampaign: (id) => set((state) => ({ campaigns: state.campaigns.filter((camp) => camp.id !== id) })),
  setFilter: (filter) => set({ filter }),
}));
