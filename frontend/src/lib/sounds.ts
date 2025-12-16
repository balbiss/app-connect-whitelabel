/**
 * Sistema de sons para feedback de ações
 */

let soundsEnabled = true;

// Carregar preferência de sons
if (typeof window !== 'undefined') {
  const savedSettings = localStorage.getItem('user_settings');
  if (savedSettings) {
    try {
      const settings = JSON.parse(savedSettings);
      soundsEnabled = settings.sounds !== false;
    } catch (e) {
      // Ignorar erro
    }
  }
}

// Criar contexto de áudio
const audioContext = typeof window !== 'undefined' && 'AudioContext' in window
  ? new (window.AudioContext || (window as any).webkitAudioContext)()
  : null;

// Função para tocar um tom
const playTone = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
  if (!soundsEnabled || !audioContext) return;

  try {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch (error) {
    // Ignorar erros de áudio
  }
};

// Sons pré-definidos
export const sounds = {
  success: () => playTone(523.25, 0.1, 'sine'), // C5
  error: () => playTone(220, 0.2, 'sawtooth'), // A3
  click: () => playTone(800, 0.05, 'square'),
  notification: () => playTone(659.25, 0.15, 'sine'), // E5
  delete: () => {
    playTone(220, 0.1, 'sawtooth');
    setTimeout(() => playTone(165, 0.1, 'sawtooth'), 100);
  },
};

// Atualizar preferência de sons
export const setSoundsEnabled = (enabled: boolean) => {
  soundsEnabled = enabled;
};





