// Settings page functionality
interface SettingsMap {
  [key: string]: string;
}

const settingsForm = document.getElementById('settingsForm') as HTMLFormElement;
const addParamButton = document.getElementById('addParamButton');
const settingsContainer = document.getElementById('settingsContainer');
const saveButton = document.getElementById('saveButton');

// Load existing settings
async function loadSettings(): Promise<void> {
  const settings: SettingsMap = await new Promise((resolve) => {
    chrome.storage.sync.get(null, (items: Record<string, any>) => {
      resolve(items as SettingsMap);
    });
  });
  
  if (settingsContainer) {
    Object.entries(settings).forEach(([key, value]) => {
      addSettingInput(key, value);
    });
  }
}

// Add a new setting input field
function addSettingInput(key: string = '', value: string = ''): void {
  if (!settingsContainer) return;
  
  const settingRow = document.createElement('div');
  settingRow.className = 'setting-row';
  
  const keyInput = document.createElement('input');
  keyInput.type = 'text';
  keyInput.placeholder = 'Parameter name';
  keyInput.value = key;
  keyInput.className = 'setting-key';
  
  const valueInput = document.createElement('input');
  valueInput.type = 'text';
  valueInput.placeholder = 'Default value';
  valueInput.value = value;
  valueInput.className = 'setting-value';
  
  const removeButton = document.createElement('button');
  removeButton.textContent = 'Remove';
  removeButton.className = 'remove-btn';
  removeButton.type = 'button';
  removeButton.addEventListener('click', () => {
    settingRow.remove();
  });
  
  settingRow.appendChild(keyInput);
  settingRow.appendChild(valueInput);
  settingRow.appendChild(removeButton);
  settingsContainer.appendChild(settingRow);
}

// Save settings to storage
async function saveSettings(): Promise<void> {
  const settingRows = document.querySelectorAll('.setting-row');
  const settings: SettingsMap = {};
  
  settingRows.forEach((row) => {
    const keyInput = row.querySelector('.setting-key') as HTMLInputElement;
    const valueInput = row.querySelector('.setting-value') as HTMLInputElement;
    
    if (keyInput.value && valueInput.value) {
      settings[keyInput.value] = valueInput.value;
    }
  });
  
  await chrome.storage.sync.set(settings);
  alert('Settings saved!');
}

// Event listeners
addParamButton?.addEventListener('click', () => {
  addSettingInput();
});

saveButton?.addEventListener('click', (e) => {
  e.preventDefault();
  saveSettings();
});

// Load settings on page load
loadSettings();
