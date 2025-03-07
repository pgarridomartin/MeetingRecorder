// src/config.js

class Config {
  constructor() {
    // Cargar claves sensibles desde variables de entorno inyectadas por Vite (prefijo VITE_)
    this.openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
    this.emailAddress = import.meta.env.VITE_EMAIL_ADDRESS || '';
    this.emailPassword = import.meta.env.VITE_EMAIL_PASSWORD || '';
    this.defaultEmailSubject = import.meta.env.VITE_DEFAULT_EMAIL_SUBJECT || 'Meeting Summary and Action Items';
    this.defaultEmail = import.meta.env.VITE_DEFAULT_EMAIL || '';

    console.log('API key desde import.meta.env:', this.openaiApiKey);

    // Cargar ajustes no sensibles desde localStorage
    this.loadFromStorage();
  }
  
  loadFromStorage() {
    const savedSettings = localStorage.getItem('meetingRecorderSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.defaultEmail) this.defaultEmail = settings.defaultEmail;
        if (settings.defaultSubject) this.defaultEmailSubject = settings.defaultSubject;
      } catch (error) {
        console.error('Error al parsear la configuración guardada:', error);
      }
    }
  }
  
  saveUserSettings(settings) {
    localStorage.setItem('meetingRecorderSettings', JSON.stringify(settings));
  }
  
  get apiKey() {
    return this.openaiApiKey;
  }
  
  set apiKey(value) {
    this.openaiApiKey = value;
    localStorage.setItem('openaiApiKey', value);
  }
  
  get email() {
    return this.emailAddress;
  }
  
  set email(value) {
    this.emailAddress = value;
    localStorage.setItem('emailAddress', value);
  }
  
  get password() {
    return this.emailPassword;
  }
  
  set password(value) {
    this.emailPassword = value;
    localStorage.setItem('emailPassword', value);
  }
}

export const config = new Config();
