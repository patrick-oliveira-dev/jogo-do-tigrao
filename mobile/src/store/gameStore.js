import { create } from 'zustand';

export const useGameStore = create((set) => ({
  playerName: '',
  setPlayerName: (name) => set({ playerName: name }),
  
  playerId: null,
  setPlayerId: (id) => set({ playerId: id }),
  
  room: null,
  setRoom: (room) => set({ room }),
  
  backendIp: '192.168.1.100',
  setBackendIp: (ip) => set({ backendIp: ip }),

  lastEvent: null,
  setLastEvent: (event) => set({ lastEvent: event }),
}));
