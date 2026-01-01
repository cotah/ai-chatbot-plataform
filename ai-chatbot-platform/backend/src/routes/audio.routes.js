/**
 * Audio Routes
 * Handle speech-to-text processing
 */

import express from 'express';
import { transcribeAudio } from '../services/openai.service.js';
import { apiRateLimiter } from '../middleware/rateLimiter.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/chat/audio
 * Transcribe audio to text
 */
router.post('/', apiRateLimiter, async (req, res, next) => {
  try {
    // In production, you'd receive the audio file
    // For now, this is a placeholder that expects base64 audio or file upload
    const { audio, language = 'en' } = req.body;

    if (!audio) {
      return res.status(400).json({
        error: 'Audio data is required',
      });
    }

    // Convert base64 to buffer if needed
    let audioBuffer;
    if (typeof audio === 'string') {
      // Assume base64 encoded
      audioBuffer = Buffer.from(audio, 'base64');
    } else {
      audioBuffer = audio;
    }

    // Transcribe audio
    const transcription = await transcribeAudio(audioBuffer, language);

    logger.info('Audio transcribed', {
      sessionId: req.sessionId,
      language,
      transcriptionLength: transcription.length,
    });

    res.json({
      success: true,
      transcription,
    });
  } catch (error) {
    logger.error('Audio transcription failed', {
      error: error.message,
      sessionId: req.sessionId,
    });
    next(error);
  }
});

export default router;

