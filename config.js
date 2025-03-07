// Configuration loader for environment variables
class Config {
  constructor() {
    // Default values - don't use process.env in browser
    this.openaiApiKey = ''; // API key should be set securely
    this.emailAddress = ''; // Email address for sending summaries
    this.emailPassword = ''; // Email password for sending summaries
    this.defaultEmailSubject = 'Meeting Summary and Action Items';
    
    // Try to load API key from localStorage (for browser environment)
    const storedApiKey = localStorage.getItem('openaiApiKey');
    if (storedApiKey) {
      this.openaiApiKey = storedApiKey;
    }
    
    // Try to load email credentials from localStorage
    const storedEmailAddress = localStorage.getItem('emailAddress');
    if (storedEmailAddress) {
      this.emailAddress = storedEmailAddress;
    }
    
    const storedEmailPassword = localStorage.getItem('emailPassword');
    if (storedEmailPassword) {
      this.emailPassword = storedEmailPassword;
    }
    
    // Load from localStorage if available (for persisting between sessions)
    this.loadFromStorage();
  }
  
  loadFromStorage() {
    const savedSettings = localStorage.getItem('meetingRecorderSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      // Only override non-sensitive settings from localStorage
      // API keys should always come from environment variables
      if (settings.defaultEmail) this.defaultEmail = settings.defaultEmail;
      if (settings.defaultSubject) this.defaultEmailSubject = settings.defaultSubject;
    }
  }
  
  // Save user-configurable settings to localStorage
  saveUserSettings(settings) {
    localStorage.setItem('meetingRecorderSettings', JSON.stringify(settings));
  }
  
  // Getter for OpenAI API key
  get apiKey() {
    return this.openaiApiKey;
  }
  
  // Setter for OpenAI API key
  set apiKey(value) {
    this.openaiApiKey = value;
    localStorage.setItem('openaiApiKey', value);
  }
  
  // Getter for email address
  get email() {
    return this.emailAddress;
  }
  
  // Setter for email address
  set email(value) {
    this.emailAddress = value;
    localStorage.setItem('emailAddress', value);
  }
  
  // Getter for email password
  get password() {
    return this.emailPassword;
  }
  
  // Setter for email password
  set password(value) {
    this.emailPassword = value;
    localStorage.setItem('emailPassword', value);
  }
}

// Export a singleton instance
export const config = new Config();