// src/transcriber.js
import { config } from './config.js';

export async function transcribeAudio(audioBlob) {
  console.log("audioBlob size:", audioBlob.size, "type:", audioBlob.type);
  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');
  formData.append('model', 'whisper-1');

  try {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Respuesta de OpenAI:', errorData);
      throw new Error(`Transcription failed: ${response.status} - ${errorData.error?.message || ''}`);
    }
    
    
    return await response.json();
  } catch (error) {
    console.error("Error en la transcripción:", error);
    throw error;
  }
}
