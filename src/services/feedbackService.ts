// Feedback Service with offline support
import { supabase } from '../lib/supabase';
import { getOfflineDB } from '../lib/database';
import { isOnline } from './syncService';
import uuid from 'react-native-uuid';

export type Feedback = {
  feedback_id: string;
  user_id: string | null;
  type: 'bug' | 'feature' | 'improvement' | 'other';
  subject: string;
  message: string;
  status: 'open' | 'reviewed' | 'resolved';
  created_at: string;
  synced: boolean;
};

function generateId(): string {
  return uuid.v4() as string;
}

// Create feedback
export async function createFeedback(feedbackData: {
  user_id: string | null;
  type: 'bug' | 'feature' | 'improvement' | 'other';
  subject: string;
  message: string;
  userName?: string;
  userEmail?: string;
}): Promise<Feedback> {
  const online = await isOnline();
  const db = getOfflineDB();
  const feedbackId = generateId();
  const now = new Date().toISOString();

  const feedback: Feedback = {
    feedback_id: feedbackId,
    user_id: feedbackData.user_id,
    type: feedbackData.type,
    subject: feedbackData.subject.trim(),
    message: feedbackData.message.trim(),
    status: 'open',
    created_at: now,
    synced: false,
  };

  if (online) {
    try {
      const feedbackToInsert = {
        id: feedback.feedback_id,
        user_id: feedback.user_id,
        type: feedback.type,
        subject: feedback.subject,
        message: feedback.message,
        created_at: feedback.created_at,
      };

      let { data, error } = await supabase
        .from('feedback')
        .insert(feedbackToInsert)
        .select()
        .single();

      // Fallback: If user_id causes FK error (23503), try as anonymous
      if (error && error.code === '23503') {
        console.warn('Feedback FK violation (user not synced), retrying anonymously...');
        const { data: anonData, error: anonError } = await supabase
          .from('feedback')
          .insert({
            ...feedbackToInsert,
            user_id: null,
          })
          .select()
          .single();

        data = anonData;
        error = anonError;
      }

      if (error) throw error;

      // Send email notification to developer via Supabase Edge Function (non-blocking)
      supabase.functions.invoke('send-feedback-email', {
        body: {
          type: feedback.type,
          subject: feedback.subject,
          message: feedback.message,
          userName: feedbackData.userName,
          userEmail: feedbackData.userEmail,
        }
      }).then(({ error: emailError }) => {
        if (emailError) {
          console.warn('📧 Failed to send feedback email:', emailError);
        } else {
          console.log('📧 Feedback email sent successfully');
        }
      }).catch((err) => {
        console.warn('📧 Failed to send feedback email:', err);
      });

      // Save to local (skip if no database on web)
      if (db) {
        await db.runAsync(`
          INSERT INTO feedback (
            feedback_id, user_id, type, subject, message, status, created_at, synced
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `, [
          data.feedback_id, data.user_id, data.type, data.subject,
          data.message, data.status, data.created_at,
        ]);
      }

      return data;
    } catch (error) {
      console.log('Error creating feedback online:', error);
      // Fall through to offline save
    }
  }

  // Offline: Save locally
  if (db) {
    await db.runAsync(`
      INSERT INTO feedback (
        feedback_id, user_id, type, subject, message, status, created_at, synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `, [
      feedback.feedback_id, feedback.user_id, feedback.type, feedback.subject,
      feedback.message, feedback.status, feedback.created_at,
    ]);
  }

  return feedback;
}

