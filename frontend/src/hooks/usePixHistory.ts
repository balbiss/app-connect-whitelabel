import { useState, useEffect, useCallback } from 'react';

export interface PixHistoryItem {
  id: string;
  billingId: string;
  clientName: string;
  amount: number;
  pixId: string | null;
  pixCopyPaste: string | null;
  pixQrCode: string | null;
  status: 'generated' | 'paid' | 'expired';
  createdAt: string;
  paidAt?: string;
}

const STORAGE_KEY = 'pix_history';
const MAX_HISTORY_ITEMS = 50; // Limitar a 50 itens mais recentes

export function usePixHistory() {
  const [history, setHistory] = useState<PixHistoryItem[]>([]);

  // Carregar histórico do LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setHistory(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico de PIX:', error);
      setHistory([]);
    }
  }, []);

  // Salvar histórico no LocalStorage
  const saveHistory = useCallback((newHistory: PixHistoryItem[]) => {
    try {
      // Limitar a quantidade de itens
      const limited = newHistory.slice(0, MAX_HISTORY_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
      setHistory(limited);
    } catch (error) {
      console.error('Erro ao salvar histórico de PIX:', error);
      // Se der erro (ex: quota excedida), remover itens mais antigos
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        const reduced = newHistory.slice(0, Math.floor(MAX_HISTORY_ITEMS / 2));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reduced));
        setHistory(reduced);
      }
    }
  }, []);

  // Adicionar item ao histórico
  const addToHistory = useCallback((item: Omit<PixHistoryItem, 'id' | 'createdAt'>) => {
    const newItem: PixHistoryItem = {
      ...item,
      id: `pix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };

    setHistory(prev => {
      const updated = [newItem, ...prev];
      saveHistory(updated);
      return updated;
    });

    return newItem.id;
  }, [saveHistory]);

  // Atualizar status de um item
  const updateStatus = useCallback((id: string, status: PixHistoryItem['status'], paidAt?: string) => {
    setHistory(prev => {
      const updated = prev.map(item => 
        item.id === id 
          ? { ...item, status, paidAt }
          : item
      );
      saveHistory(updated);
      return updated;
    });
  }, [saveHistory]);

  // Limpar histórico
  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  }, []);

  // Remover item específico
  const removeItem = useCallback((id: string) => {
    setHistory(prev => {
      const updated = prev.filter(item => item.id !== id);
      saveHistory(updated);
      return updated;
    });
  }, [saveHistory]);

  return {
    history,
    addToHistory,
    updateStatus,
    clearHistory,
    removeItem,
  };
}


