/**
 * Shares Service - Owner ↔ TEA/AMO sharing
 * TC-SAFE: Information only - owner and certified maintenance personnel remain responsible
 */

import api from './api';

export type ShareRole = 'viewer' | 'contributor';
export type ShareStatus = 'pending' | 'active' | 'revoked';

export interface ShareInvite {
  aircraft_id: string;
  mechanic_email: string;
  role: ShareRole;
}

export interface AircraftShareInfo {
  share_id: string;
  mechanic_email: string;
  role: ShareRole;
  status: ShareStatus;
  created_at: string;
  accepted_at: string | null;
}

export interface SharedAircraft {
  aircraft_id: string;
  registration: string;
  manufacturer: string | null;
  model: string | null;
  owner_name: string;
  owner_email: string;
  role: ShareRole;
  share_id: string;
  shared_since: string;
}

export interface PendingInvitation {
  share_id: string;
  aircraft_registration: string;
  aircraft_model: string;
  owner_name: string;
  owner_email: string;
  role: ShareRole;
  invited_at: string;
}

/**
 * Invite a TEA/AMO to access an aircraft
 */
export const inviteMechanic = async (data: ShareInvite): Promise<{ message: string; share_id: string }> => {
  const response = await api.post('/api/shares/invite', data);
  return response.data;
};

/**
 * Accept a share invitation
 */
export const acceptShare = async (shareId: string): Promise<{ message: string; status: string }> => {
  const response = await api.post('/api/shares/accept', { share_id: shareId });
  return response.data;
};

/**
 * Revoke access to an aircraft
 */
export const revokeShare = async (shareId: string): Promise<{ message: string; status: string }> => {
  const response = await api.post('/api/shares/revoke', { share_id: shareId });
  return response.data;
};

/**
 * Get aircraft shared with the current user (mechanic view - Fleet)
 */
export const getSharedAircraft = async (): Promise<SharedAircraft[]> => {
  const response = await api.get('/api/shares/my-aircraft');
  return response.data;
};

/**
 * Get pending invitations for the current user
 */
export const getPendingInvitations = async (): Promise<PendingInvitation[]> => {
  const response = await api.get('/api/shares/pending');
  return response.data;
};

/**
 * Get all shares for an aircraft (owner view)
 */
export const getAircraftShares = async (aircraftId: string): Promise<AircraftShareInfo[]> => {
  const response = await api.get(`/api/shares/aircraft/${aircraftId}`);
  return response.data;
};
