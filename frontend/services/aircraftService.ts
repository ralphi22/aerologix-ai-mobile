import api from './api';

export interface Aircraft {
  _id: string;
  registration: string;
  aircraft_type?: string;
  manufacturer?: string;
  model?: string;
  year?: number;
  serial_number?: string;
  airframe_hours: number;
  engine_hours: number;
  propeller_hours: number;
  photo_url?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface AircraftCreate {
  registration: string;
  aircraft_type?: string;
  manufacturer?: string;
  model?: string;
  year?: number;
  serial_number?: string;
  airframe_hours: number;
  engine_hours: number;
  propeller_hours: number;
  photo_url?: string;
  description?: string;
}

class AircraftService {
  async getAll(): Promise<Aircraft[]> {
    const response = await api.get('/aircraft');
    return response.data;
  }

  async getById(id: string): Promise<Aircraft> {
    const response = await api.get(`/aircraft/${id}`);
    return response.data;
  }

  async create(aircraft: AircraftCreate): Promise<Aircraft> {
    const response = await api.post('/aircraft', aircraft);
    return response.data;
  }

  async update(id: string, aircraft: Partial<AircraftCreate>): Promise<Aircraft> {
    const response = await api.put(`/aircraft/${id}`, aircraft);
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await api.delete(`/aircraft/${id}`);
  }
}

export default new AircraftService();
