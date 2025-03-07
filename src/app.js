// public/js/app.js

import { config } from './config.js';
import { transcribeAudio } from './transcriber.js';
import './styles.css';
import emailjs from 'emailjs-com';

emailjs.init(import.meta.env.VITE_EMAILJS_USER_ID);

// Audio recording variables
let mediaRecorder;
let audioChunks = [];
let recordingStartTime;
let recordingTimer;
let recordingPaused = false;
let totalPausedTime = 0;
let pauseStartTime;

// Obtén las claves desde las variables de entorno
const serviceID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const templateID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const userID = import.meta.env.VITE_EMAILJS_USER_ID;

// Settings variables
let userSettings = {
    defaultEmail: '',
    defaultSubject: config.defaultEmailSubject
};

// Get DOM elements
const recordButton = document.getElementById('recordButton');
const pauseButton = document.getElementById('pauseButton');
const stopButton = document.getElementById('stopButton');
const statusIndicator = document.getElementById('statusIndicator');
const recordingStatus = document.getElementById('recordingStatus');
const recordingTime = document.getElementById('recordingTime');
const transcriptionContainer = document.getElementById('transcriptionContainer');
const resultsContainer = document.getElementById('resultsContainer');
const processingStatus = document.getElementById('processingStatus');
const keySummary = document.getElementById('keySummary');
const actionItems = document.getElementById('actionItems');
const insights = document.getElementById('insights');
const emailForm = document.getElementById('emailForm');
const notification = document.getElementById('notification');
const settingsHeader = document.getElementById('settingsHeader');
const settingsContent = document.getElementById('settingsContent');
const saveSettingsButton = document.getElementById('saveSettingsButton');
const defaultEmailInput = document.getElementById('defaultEmail');
const defaultSubjectInput = document.getElementById('defaultSubject');
const apiKeyInput = document.getElementById('apiKey');
const emailAddressInput = document.getElementById('emailAddress');
const emailPasswordInput = document.getElementById('emailPassword');

// Event listeners
recordButton.addEventListener('click', startRecording);
pauseButton.addEventListener('click', pauseRecording);
stopButton.addEventListener('click', stopRecording);
emailForm.addEventListener('submit', sendEmail);
settingsHeader.addEventListener('click', toggleSettings);
saveSettingsButton.addEventListener('click', saveSettings);

// Start recording function
async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Verifica que el navegador soporte el formato audio/webm
      if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        console.error("El navegador no soporta audio/webm con códec opus");
        showNotification("El formato audio/webm no es soportado por este navegador", true);
        return;
      }
      
      const options = { mimeType: 'audio/webm;codecs=opus' };
      mediaRecorder = new MediaRecorder(stream, options);
      
      audioChunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log("Fragmento de audio recibido, tamaño:", event.data.size);
          audioChunks.push(event.data);
        } else {
          console.warn("Fragmento de audio vacío recibido");
        }
      };
      
      mediaRecorder.onstart = () => {
        if (!recordingPaused) {
          recordingStartTime = Date.now();
          totalPausedTime = 0;
          updateRecordingTimer();
        } else {
          totalPausedTime += (Date.now() - pauseStartTime);
          recordingPaused = false;
        }
        
        statusIndicator.classList.add('recording');
        recordingStatus.textContent = 'Recording...';
        recordButton.disabled = true;
        pauseButton.disabled = false;
        stopButton.disabled = false;
      };
      
      mediaRecorder.start();
    } catch (error) {
      console.error('Error accessing microphone:', error);
      showNotification('Error accessing microphone. Please ensure you have granted microphone permissions.', true);
    }
  }
  
  

function pauseRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.pause();
        pauseStartTime = Date.now();
        recordingPaused = true;
        clearInterval(recordingTimer);
        
        statusIndicator.classList.remove('recording');
        statusIndicator.classList.add('paused');
        recordingStatus.textContent = 'Paused';
        pauseButton.disabled = true;
        recordButton.disabled = false;
    }
}

function stopRecording() {
    if (mediaRecorder && (mediaRecorder.state === 'recording' || mediaRecorder.state === 'paused')) {
      // Asigna un callback para cuando se detenga la grabación
      mediaRecorder.onstop = () => {
        // Ahora que se han recibido todos los fragmentos, procesa la grabación
        processRecording();
      };
  
      mediaRecorder.stop();
      clearInterval(recordingTimer);
      
      // Detén las pistas del stream
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      
      // Actualiza la UI
      statusIndicator.classList.remove('recording', 'paused');
      recordingStatus.textContent = 'Ready to record';
      recordButton.disabled = false;
      pauseButton.disabled = true;
      stopButton.disabled = true;
      
      transcriptionContainer.classList.remove('hidden');
    }
  }
  

function updateRecordingTimer() {
    recordingTimer = setInterval(() => {
        const elapsedMs = Date.now() - recordingStartTime - totalPausedTime;
        const seconds = Math.floor((elapsedMs / 1000) % 60);
        const minutes = Math.floor((elapsedMs / (1000 * 60)) % 60);
        const hours = Math.floor(elapsedMs / (1000 * 60 * 60));
        
        recordingTime.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

async function processRecording() {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

    processingStatus.textContent = 'Transcribing audio...';

    try {
        const transcription = await transcribeAudio(audioBlob);
        console.log("Transcription text:", transcription.text);
        if (!transcription.text || transcription.text.trim() === "") {
            console.error("La transcripción está vacía.");
            showNotification("Error: La transcripción está vacía.", true);
            return;
        }
        

        const analysis = await analyzeTranscription(transcription.text);
        processingStatus.textContent = 'Generating summary...';
        
        displayResults(analysis);
        
        transcriptionContainer.classList.add('hidden');
        resultsContainer.classList.remove('hidden');
    } catch (error) {
        console.error('Error processing recording:', error);
        showNotification('Error processing recording. Please try again.', true);
        transcriptionContainer.classList.add('hidden');
    }
}

async function analyzeTranscription(transcription) {
    const prompt = `You are an AI assistant that analyzes meeting transcripts. For each transcript:
    1. Create a concise summary of key points.
    2. Identify actionable items and next steps.
    3. Extract valuable insights and recommendations.
    If the transcript is very short or appears to be a test, provide a summary indicating that it is a test transcript and list any obvious key points.
    Format the response in clear sections.`;
  
    const requestBody = {
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: transcription }
      ]
    };
  
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error en analyzeTranscription:", errorData);
        throw new Error(`Transcription analysis failed: ${response.status} - ${errorData.error?.message || ''}`);
      }
  
      const data = await response.json();
      // Suponiendo que la respuesta tenga una estructura similar a:
      // { choices: [ { message: { content: "tu respuesta" } } ], ... }
      return data.choices[0].message.content;
    } catch (error) {
      console.error("Error al analizar la transcripción:", error);
      showNotification('Error al analizar la transcripción. Inténtalo de nuevo.', true);
      throw error;
    }
  }
  

function displayResults(analysisText) {
    const sections = analysisText.split(/#+\s+/);
    
    let keySummaryContent = '';
    let actionItemsContent = '';
    let insightsContent = '';
    
    for (const section of sections) {
        if (!section.trim()) continue;
        
        if (section.toLowerCase().includes('key point') || section.toLowerCase().includes('summary')) {
            keySummaryContent = section;
        } else if (section.toLowerCase().includes('action') || section.toLowerCase().includes('next step')) {
            actionItemsContent = section;
        } else if (section.toLowerCase().includes('insight') || section.toLowerCase().includes('recommendation')) {
            insightsContent = section;
        }
    }
    
    if (!keySummaryContent && !actionItemsContent && !insightsContent) {
        keySummaryContent = analysisText;
    }
    
    keySummary.innerHTML = keySummaryContent || '<p>No key points extracted</p>';
    actionItems.innerHTML = actionItemsContent || '<p>No action items identified</p>';
    insights.innerHTML = insightsContent || '<p>No insights provided</p>';
}

function toggleSettings() {
    settingsHeader.classList.toggle('open');
    settingsContent.classList.toggle('open');
}

function saveSettings() {
    // Solo actualizamos los valores que siguen presentes
    userSettings.defaultEmail = defaultEmailInput.value;
    userSettings.defaultSubject = defaultSubjectInput.value;
  
    // Guarda solo los ajustes no sensibles en localStorage
    config.saveUserSettings(userSettings);
    
    // Actualiza los campos del formulario de email, si es que se usan para enviar
    const emailToField = document.getElementById('emailTo');
    const emailSubjectField = document.getElementById('emailSubject');
    if (emailToField) emailToField.value = userSettings.defaultEmail;
    if (emailSubjectField) emailSubjectField.value = userSettings.defaultSubject;
    
    showNotification('Settings saved successfully');
    toggleSettings();
  }
  
  function sendEmail(event) {
    event.preventDefault();
  
    const emailTo = document.getElementById('emailTo').value.trim();
    const emailSubject = document.getElementById('emailSubject').value;
  
    // Verifica que se haya ingresado una dirección de email
    if (!emailTo) {
      showNotification("Please enter a recipient email address.", true);
      return;
    }
  
    const meetingSummary = document.getElementById('keySummary').innerText || "No summary available";
    const actionItems = document.getElementById('actionItems').innerText || "No action items identified";
    const insights = document.getElementById('insights').innerText || "No insights provided";
  
    const templateParams = {
      to_email: emailTo,  // Este campo es el que debe contener la dirección del destinatario
      from_name: "Meeting Recorder",
      meeting_date: new Date().toLocaleDateString(),
      meeting_summary: meetingSummary,
      action_items: actionItems,
      insights: insights,
      subject: emailSubject
    };
  
    emailjs.send(
      import.meta.env.VITE_EMAILJS_SERVICE_ID,
      import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
      templateParams,
      import.meta.env.VITE_EMAILJS_USER_ID
    )
      .then((response) => {
        console.log('Email enviado correctamente:', response.status, response.text);
        showNotification(`Summary sent to ${emailTo}`);
      }, (error) => {
        console.error('Error al enviar email:', error);
        showNotification('Error sending email. Please try again.', true);
      });
  
    // Restablece el campo del asunto al valor por defecto
    document.getElementById('emailSubject').value = userSettings.defaultSubject;
  }
  


function showNotification(message, isError = false) {
    notification.textContent = message;
    notification.classList.remove('hidden', 'error');
    
    if (isError) {
        notification.classList.add('error');
    }
    
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 300);
    }, 3000);
}

function init() {
    if (defaultSubjectInput) {
      defaultSubjectInput.value = userSettings.defaultSubject;
    }
    if (document.getElementById('emailSubject')) {
      document.getElementById('emailSubject').value = userSettings.defaultSubject;
    }
    
    const savedSettings = localStorage.getItem('meetingRecorderSettings');
    if (savedSettings) {
      userSettings = JSON.parse(savedSettings);
      if (defaultEmailInput) defaultEmailInput.value = userSettings.defaultEmail;
      if (defaultSubjectInput) defaultSubjectInput.value = userSettings.defaultSubject;
      if (document.getElementById('emailTo')) document.getElementById('emailTo').value = userSettings.defaultEmail;
      if (document.getElementById('emailSubject')) document.getElementById('emailSubject').value = userSettings.defaultSubject;
    }
    
    // Elimina la actualización de placeholders para API key, email y password
    // if (apiKeyInput && config.apiKey) { ... }
    // if (emailAddressInput && config.email) { ... }
    // if (emailPasswordInput && config.password) { ... }
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showNotification('Your browser does not support audio recording. Please try a modern browser like Chrome, Firefox, or Safari.', true);
      recordButton.disabled = true;
    }
  }
  // Registro del Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('Service Worker registrado con éxito'))
      .catch(err => console.error('Error al registrar el Service Worker:', err));
  }
  init();
  