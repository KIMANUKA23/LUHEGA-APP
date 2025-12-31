// Unauthorized Spares Service - Fetch incidents from database
import { supabase } from '../lib/supabase';
import { getOfflineDB } from '../lib/database';
import { isOnline } from './syncService';
import uuid from 'react-native-uuid';

export type UnauthorizedSpare = {
  incident_id: string;
  part_id: string | null;
  reported_by: string | null;
  description: string;
  photo_url: string | null;
  action_taken: string | null;
  status: 'open' | 'in_progress' | 'resolved';
  date_reported: string;
  synced: boolean;
};

// Get all unauthorized spares incidents
export async function getUnauthorizedSpares(): Promise<UnauthorizedSpare[]> {
  const online = await isOnline();
  const db = getOfflineDB();

  if (online && db) {
    try {
      const { data, error } = await supabase
        .from('unauthorizedspares')
        .select('*')
        .order('date_reported', { ascending: false });

      if (error) throw error;

      // Cache in local DB
      for (const incident of data || []) {
        await db.runAsync(`
          INSERT OR REPLACE INTO unauthorizedspares (
            incident_id, part_id, reported_by, description, photo_url,
            action_taken, status, date_reported, synced
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          incident.incident_id, incident.part_id, incident.reported_by,
          incident.description, incident.photo_url, incident.action_taken,
          incident.status, incident.date_reported, incident.synced ? 1 : 0,
        ]);
      }

      return data || [];
    } catch (error) {
      console.log('Error fetching unauthorized spares online:', error);
    }
  }

  // Offline: Read from local
  if (db) {
    const incidents = await db.getAllAsync<any>(
      'SELECT * FROM unauthorizedspares ORDER BY date_reported DESC'
    );

    return incidents.map((i: any) => ({
      incident_id: i.incident_id,
      part_id: i.part_id,
      reported_by: i.reported_by,
      description: i.description,
      photo_url: i.photo_url,
      action_taken: i.action_taken,
      status: i.status,
      date_reported: i.date_reported,
      synced: i.synced === 1,
    }));
  }

  return [];
}

// Get single incident
export async function getUnauthorizedSpare(incidentId: string): Promise<UnauthorizedSpare | null> {
  const online = await isOnline();
  const db = getOfflineDB();

  if (online) {
    try {
      const { data, error } = await supabase
        .from('unauthorizedspares')
        .select('*')
        .eq('incident_id', incidentId)
        .single();

      if (!error && data) {
        // Cache locally
        if (db) {
          await db.runAsync(`
            INSERT OR REPLACE INTO unauthorizedspares (
              incident_id, part_id, reported_by, description, photo_url,
              action_taken, status, date_reported, synced
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            data.incident_id, data.part_id, data.reported_by,
            data.description, data.photo_url, data.action_taken,
            data.status, data.date_reported, data.synced ? 1 : 0,
          ]);
        }
        return data;
      }
    } catch (error) {
      console.log('Error fetching incident online:', error);
    }
  }

  // Offline: Read from local
  if (db) {
    const incident = await db.getFirstAsync<any>(
      'SELECT * FROM unauthorizedspares WHERE incident_id = ?',
      [incidentId]
    );

    if (incident) {
      return {
        incident_id: incident.incident_id,
        part_id: incident.part_id,
        reported_by: incident.reported_by,
        description: incident.description,
        photo_url: incident.photo_url,
        action_taken: incident.action_taken,
        status: incident.status,
        date_reported: incident.date_reported,
        synced: incident.synced === 1,
      };
    }
  }

  return null;
}

// Create unauthorized spare incident
export async function createUnauthorizedSpare(incidentData: {
  part_id?: string | null;
  reported_by: string | null;
  description: string;
  photo_url?: string | null;
}): Promise<UnauthorizedSpare> {
  const online = await isOnline();
  const db = getOfflineDB();
  const incidentId = uuid.v4() as string;
  const now = new Date().toISOString();

  const incident: UnauthorizedSpare = {
    incident_id: incidentId,
    part_id: incidentData.part_id || null,
    reported_by: incidentData.reported_by,
    description: incidentData.description,
    photo_url: incidentData.photo_url || null,
    action_taken: null,
    status: 'open',
    date_reported: now,
    synced: false,
  };

  if (online && db) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated. Please log in to report incidents.');
      }

      const { data, error } = await supabase
        .from('unauthorizedspares')
        .insert({
          ...incident,
          synced: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Save to local
      await db.runAsync(`
        INSERT INTO unauthorizedspares (
          incident_id, part_id, reported_by, description, photo_url,
          action_taken, status, date_reported, synced
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `, [
        data.incident_id, data.part_id, data.reported_by,
        data.description, data.photo_url, data.action_taken,
        data.status, data.date_reported,
      ]);

      return data;
    } catch (error) {
      console.log('Error creating incident online:', error);
      // Fall through to offline save
    }
  }

  // Offline: Save locally
  if (db) {
    await db.runAsync(`
      INSERT INTO unauthorizedspares (
        incident_id, part_id, reported_by, description, photo_url,
        action_taken, status, date_reported, synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `, [
      incident.incident_id, incident.part_id, incident.reported_by,
      incident.description, incident.photo_url, incident.action_taken,
      incident.status, incident.date_reported,
    ]);
  }

  return incident;
}

// Update unauthorized spare status
export async function updateUnauthorizedSpareStatus(
  incidentId: string,
  status: 'open' | 'in_progress' | 'resolved',
  actionTaken?: string
): Promise<UnauthorizedSpare | null> {
  const online = await isOnline();
  const db = getOfflineDB();
  const now = new Date().toISOString();

  if (online && db) {
    try {
      const { data, error } = await supabase
        .from('unauthorizedspares')
        .update({
          status,
          action_taken: actionTaken,
          synced: true, // Assuming online update implies sync
        })
        .eq('incident_id', incidentId)
        .select()
        .single();

      if (error) throw error;

      // Update local cache
      await db.runAsync(`
        UPDATE unauthorizedspares
        SET status = ?, action_taken = ?, synced = 1
        WHERE incident_id = ?
      `, [status, actionTaken || null, incidentId]);

      return data;
    } catch (error) {
      console.log('Error updating incident online:', error);
      // Fall through to offline update
    }
  }

  // Offline: Update locally
  if (db) {
    await db.runAsync(`
      UPDATE unauthorizedspares
      SET status = ?, action_taken = ?, synced = 0
      WHERE incident_id = ?
    `, [status, actionTaken || null, incidentId]);

    // Return the updated local object manually constructed or fetched
    return getUnauthorizedSpare(incidentId);
  }

  return null;
}

