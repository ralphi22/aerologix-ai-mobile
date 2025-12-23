import { create } from 'zustand';
import aircraftService, { Aircraft } from '../services/aircraftService';

interface AircraftState {
  aircraft: Aircraft[];
  selectedAircraft: Aircraft | null;
  isLoading: boolean;
  fetchAircraft: () => Promise<void>;
  refreshAircraftById: (id: string) => Promise<void>;
  selectAircraft: (aircraft: Aircraft | null) => void;
  addAircraft: (aircraft: any) => Promise<Aircraft>;
  updateAircraft: (id: string, aircraft: any) => Promise<void>;
  deleteAircraft: (id: string) => Promise<void>;
}

export const useAircraftStore = create<AircraftState>((set, get) => ({
  aircraft: [],
  selectedAircraft: null,
  isLoading: false,

  fetchAircraft: async () => {
    set({ isLoading: true });
    try {
      const aircraft = await aircraftService.getAll();
      set({ aircraft, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // Rafraîchir un avion spécifique et mettre à jour le store
  refreshAircraftById: async (id: string) => {
    try {
      const updated = await aircraftService.getById(id);
      set({
        aircraft: get().aircraft.map((a) => (a._id === id ? updated : a)),
        selectedAircraft: get().selectedAircraft?._id === id ? updated : get().selectedAircraft,
      });
    } catch (error) {
      console.error('Error refreshing aircraft:', error);
      throw error;
    }
  },

  selectAircraft: (aircraft: Aircraft | null) => {
    set({ selectedAircraft: aircraft });
  },

  addAircraft: async (aircraftData: any) => {
    const newAircraft = await aircraftService.create(aircraftData);
    set({ aircraft: [newAircraft, ...get().aircraft] });
    return newAircraft;
  },

  updateAircraft: async (id: string, aircraftData: any) => {
    const updated = await aircraftService.update(id, aircraftData);
    set({
      aircraft: get().aircraft.map((a) => (a._id === id ? updated : a)),
      selectedAircraft: updated,
    });
  },

  deleteAircraft: async (id: string) => {
    await aircraftService.delete(id);
    set({
      aircraft: get().aircraft.filter((a) => a._id !== id),
      selectedAircraft: null,
    });
  },
}));
