// Import config
import { config } from './config.js';

// Audio recording variables
let mediaRecorder;
let audioChunks = [];
let recordingStartTime;
let recordingTimer;
let recordingPaused = false;
let totalPausedTime = 0;
let pauseStartTime;

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

// Add event listeners
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
        
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        // When recording starts
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
        
        // Start recording
        mediaRecorder.start();
    } catch (error) {
        console.error('Error accessing microphone:', error);
        showNotification('Error accessing microphone. Please ensure you have granted microphone permissions.', true);
    }
}

// Pause recording function
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

// Stop recording function
function stopRecording() {
    if (mediaRecorder && (mediaRecorder.state === 'recording' || mediaRecorder.state === 'paused')) {
        mediaRecorder.stop();
        clearInterval(recordingTimer);
        
        // Clean up media stream tracks
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        
        // Reset UI
        statusIndicator.classList.remove('recording', 'paused');
        recordingStatus.textContent = 'Ready to record';
        recordButton.disabled = false;
        pauseButton.disabled = true;
        stopButton.disabled = true;
        
        // Show processing UI
        transcriptionContainer.classList.remove('hidden');
        
        // Process the recording (transcribe and analyze)
        processRecording();
    }
}

// Update recording timer display
function updateRecordingTimer() {
    recordingTimer = setInterval(() => {
        const elapsedMs = Date.now() - recordingStartTime - totalPausedTime;
        const seconds = Math.floor((elapsedMs / 1000) % 60);
        const minutes = Math.floor((elapsedMs / (1000 * 60)) % 60);
        const hours = Math.floor(elapsedMs / (1000 * 60 * 60));
        
        recordingTime.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

// Process the recording (in a real app, this would send to a server for processing)
async function processRecording() {
    // Create an audio blob from the recorded chunks
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    
    // Show processing UI
    processingStatus.textContent = 'Transcribing audio...';
    
    try {
        // Step 1: Transcribe audio using Whisper API
        const transcription = await transcribeAudio(audioBlob);
        processingStatus.textContent = 'Analyzing content...';
        
        // Step 2: Analyze transcription using OpenAI GPT
        const analysis = await analyzeTranscription(transcription.text);
        processingStatus.textContent = 'Generating summary...';
        
        // Step 3: Process and display results
        displayResults(analysis);
        
        // Hide processing UI and show results
        transcriptionContainer.classList.add('hidden');
        resultsContainer.classList.remove('hidden');
    } catch (error) {
        console.error('Error processing recording:', error);
        showNotification('Error processing recording. Please try again.', true);
        transcriptionContainer.classList.add('hidden');
    }
}

// Transcribe audio using OpenAI's Whisper API
async function transcribeAudio(audioBlob) {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model', 'whisper-1');
    
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config.apiKey}`
        },
        body: formData
    });
    
    if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`);
    }
    
    return await response.json();
}

// Analyze transcription using OpenAI's GPT
async function analyzeTranscription(transcription) {
    const prompt = `You are an AI assistant that analyzes meeting transcripts. For each transcript:
1. Create a concise summary of key points
2. Identify actionable items and next steps
3. Extract valuable insights and recommendations
Format the response in clear sections.`;

    const completion = await websim.chat.completions.create({
        messages: [
            {
                role: 'system',
                content: prompt
            },
            {
                role: 'user',
                content: transcription
            }
        ]
    });
    
    return completion.content;
}

// Display analysis results in the UI
function displayResults(analysisText) {
    // Split the analysis into sections
    // For a more robust solution, you could have GPT return structured JSON
    const sections = analysisText.split(/#+\s+/);
    
    // Extract the sections for key points, action items, and insights
    let keySummaryContent = '';
    let actionItemsContent = '';
    let insightsContent = '';
    
    // Simple parsing logic - in a real app, you might want a more robust solution
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
    
    // If sections weren't clearly identified, use the whole text
    if (!keySummaryContent && !actionItemsContent && !insightsContent) {
        keySummaryContent = analysisText;
    }
    
    // Update the UI with the analysis
    keySummary.innerHTML = keySummaryContent ? keySummaryContent : '<p>No key points extracted</p>';
    actionItems.innerHTML = actionItemsContent ? actionItemsContent : '<p>No action items identified</p>';
    insights.innerHTML = insightsContent ? insightsContent : '<p>No insights provided</p>';
}

// Toggle settings panel
function toggleSettings() {
    settingsHeader.classList.toggle('open');
    settingsContent.classList.toggle('open');
}

// Save user settings
function saveSettings() {
    userSettings.defaultEmail = defaultEmailInput.value;
    userSettings.defaultSubject = defaultSubjectInput.value;
    
    // Save API key
    if (apiKeyInput.value) {
        config.apiKey = apiKeyInput.value;
    }
    
    // Save email credentials
    if (emailAddressInput.value) {
        config.email = emailAddressInput.value;
    }
    
    if (emailPasswordInput.value) {
        config.password = emailPasswordInput.value;
    }
    
    // Save settings via config
    config.saveUserSettings(userSettings);
    
    // Update email form with new defaults
    document.getElementById('emailTo').value = userSettings.defaultEmail;
    document.getElementById('emailSubject').value = userSettings.defaultSubject;
    
    // Show confirmation and close settings
    showNotification('Settings saved successfully');
    toggleSettings();
}

// Send email with meeting summary
function sendEmail(event) {
    event.preventDefault();
    
    const emailTo = document.getElementById('emailTo').value;
    const emailSubject = document.getElementById('emailSubject').value;
    
    // Save the email as default if it's different from the current default
    if (emailTo !== userSettings.defaultEmail) {
        userSettings.defaultEmail = emailTo;
        // Save settings via config
        config.saveUserSettings(userSettings);
    }
    
    // In a real implementation, this would call a server endpoint to send an email
    // For demo purposes, we'll just show a success notification
    
    // Simulate sending email
    showNotification(`Summary sent to ${emailTo}`);
    
    // Reset form (but keep the default email)
    document.getElementById('emailSubject').value = userSettings.defaultSubject;
}

// Show notification
function showNotification(message, isError = false) {
    notification.textContent = message;
    notification.classList.remove('hidden', 'error');
    
    if (isError) {
        notification.classList.add('error');
    }
    
    notification.classList.add('show');
    
    // Hide notification after a few seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 300);
    }, 3000);
}

// Initialize the app
function init() {
    // Make sure elements exist before trying to use them
    if (defaultEmailInput) {
        defaultEmailInput.value = userSettings.defaultEmail || '';
    }
    
    if (defaultSubjectInput) {
        // Default subject comes from config
        defaultSubjectInput.value = userSettings.defaultSubject || config.defaultEmailSubject;
    }
    
    if (document.getElementById('emailTo')) {
        document.getElementById('emailTo').value = userSettings.defaultEmail || '';
    }
    
    if (document.getElementById('emailSubject')) {
        document.getElementById('emailSubject').value = userSettings.defaultSubject || config.defaultEmailSubject;
    }
    
    // Load settings from local storage via config
    const savedSettings = localStorage.getItem('meetingRecorderSettings');
    if (savedSettings) {
        userSettings = JSON.parse(savedSettings);
        
        // Populate settings form with saved values
        if (defaultEmailInput) defaultEmailInput.value = userSettings.defaultEmail || '';
        if (defaultSubjectInput) defaultSubjectInput.value = userSettings.defaultSubject || config.defaultEmailSubject;
        
        // Also populate the email form
        if (document.getElementById('emailTo')) document.getElementById('emailTo').value = userSettings.defaultEmail || '';
        if (document.getElementById('emailSubject')) document.getElementById('emailSubject').value = userSettings.defaultSubject || config.defaultEmailSubject;
    }
    
    // Populate API key field with asterisks if one is stored
    if (apiKeyInput && config.apiKey) {
        apiKeyInput.placeholder = '••••••••••••••••••••••••••';
    }
    
    // Populate email address field with value if one is stored
    if (emailAddressInput && config.email) {
        emailAddressInput.placeholder = config.email;
    }
    
    // Populate email password field with asterisks if one is stored
    if (emailPasswordInput && config.password) {
        emailPasswordInput.placeholder = '••••••••••••';
    }
    
    // Check if user's browser supports required APIs
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showNotification('Your browser does not support audio recording. Please try a modern browser like Chrome, Firefox, or Safari.', true);
        recordButton.disabled = true;
    }
}

// Run initialization
init();