// Extract query parameters from URL and return as key-value object
function getQueryParams(): Record<string, string> {
  const params: Record<string, string> = {};
  const searchParams = new URLSearchParams(window.location.search);
  
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  return params;
}

// Parse date parameter in MMDD or MDD format and return day number (1-31)
function parseDateParam(dateStr: string): number | null {
  if (!dateStr) return null;
  
  // Remove leading zeros and parse
  const parsed = parseInt(dateStr, 10);
  
  // For MMDD or MDD format, extract the last 1-2 digits as the day
  let day: number;
  
  if (dateStr.length === 4) {
    // MMDD format - take last 2 digits
    day = parsed % 100;
  } else if (dateStr.length === 3) {
    // MDD format - take last 1-2 digits
    const lastTwo = parsed % 100;
    day = lastTwo;
  } else if (dateStr.length === 2) {
    // DD format - use as is
    day = parsed;
  } else {
    // Invalid format
    return null;
  }
  
  // Validate day is between 1 and 31
  if (day >= 1 && day <= 31) {
    return day;
  }
  
  return null;
}

// Inject the script file into the page context
function injectScript(): void {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('dist/injected.js');
  script.onload = function() { (this as HTMLScriptElement).remove(); };
  (document.head || document.documentElement).appendChild(script);
  
  // Wait for the injected script to signal it's ready
  return new Promise<void>((resolve) => {
    document.addEventListener('__nhBillLinkerScriptReady', () => {
      console.log('[Content Script] Injected script is ready');
      resolve();
    }, { once: true });
  }) as any;
}

// Call __doPostBack through the injected script via CustomEvent
function callDoPostBack(eventTarget: string, eventArgument: string): void {
  document.dispatchEvent(new CustomEvent('__nhBillLinkerCallDoPostBack', {
    detail: { eventTarget, eventArgument }
  }));
}

// Select a committee by name from the committee dropdown
function selectCommittee(committeeName: string): boolean {
  const select = document.getElementById('pageBody_ddlCommittee') as HTMLSelectElement;
  if (!select) {
    console.log('Committee dropdown #pageBody_ddlCommittee not found');
    return false;
  }
  
  const options = select.querySelectorAll('option');
  console.log(`Found ${options.length} committee options`);
  
  let found = false;
  
  // Look for an option that contains the committee name (case-insensitive, partial match)
  options.forEach((option) => {
    const optionText = option.textContent || '';
    if (optionText.toLowerCase().includes(committeeName.toLowerCase())) {
      console.log(`Selecting committee: ${optionText}`);
      select.value = option.value;
      
      // Trigger multiple events to ensure the page processes the change
      select.dispatchEvent(new Event('change', { bubbles: true }));
      select.dispatchEvent(new Event('input', { bubbles: true }));
      
      found = true;
    }
  });
  
  if (!found) {
    console.log(`Committee "${committeeName}" not found`);
  }
  
  return found;
}

// Wait for committee dropdown to be populated with options, then select the committee
// Generic function to wait for a dropdown to be populated and then select an option
async function waitAndSelect(
  selectElementId: string,
  selectFn: (value: string) => boolean,
  value: string,
  maxWaitMs: number = 10000
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    const select = document.getElementById(selectElementId) as HTMLSelectElement;
    if (select) {
      const options = select.querySelectorAll('option');
      if (options.length > 1) {  // More than just the default/empty option
        return selectFn(value);
      }
    }
    
    // Wait 500ms before checking again
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`Timeout waiting for dropdown ${selectElementId} to be populated`);
  return false;
}

// Select a bill by bill number from the bill dropdown
function selectBill(billNumber: string): boolean {
  const select = document.getElementById('pageBody_ddlBills') as HTMLSelectElement;
  if (!select) {
    console.log('Bill dropdown #pageBody_ddlBills not found');
    return false;
  }
  
  const options = select.querySelectorAll('option');
  console.log(`Found ${options.length} bill options`);
  
  let found = false;
  
  // Extract just the digits from the search term to allow flexible matching
  // e.g., "HB1234", "hb1234", "1234" all become "1234"
  const searchDigits = billNumber.replace(/\D/g, '');
  console.log(`Searching for bill matching digits: ${searchDigits}`);
  
  // Look for an option that ends with the bill number (case-insensitive)
  options.forEach((option) => {
    const optionText = option.textContent || '';
    // Extract just the digits from the option text
    // e.g., "HB 1234" becomes "1234"
    const optionDigits = optionText.replace(/\D/g, '');
    
    // Match if option digits end with search digits
    // This allows "1234" to match "HB1234" but prevents "HB1234" from matching "SB1234"
    if (optionDigits.endsWith(searchDigits)) {
      console.log(`Selecting bill: ${optionText}`);
      select.value = option.value;
      
      // Trigger multiple events to ensure the page processes the change
      select.dispatchEvent(new Event('change', { bubbles: true }));
      select.dispatchEvent(new Event('input', { bubbles: true }));
      
      found = true;
    }
  });
  
  if (!found) {
    console.log(`Bill "${billNumber}" not found (searched for digits: ${searchDigits})`);
  }
  
  return found;
}



// Select a date by calling __doPostBack through the injected script
function selectDate(dayNumber: number): boolean {
  const calendar = document.getElementById('dvSelectDate');
  if (!calendar) {
    console.log('Calendar element #dvSelectDate not found');
    return false;
  }
  
  // Find all links in the calendar
  const links = calendar.querySelectorAll('a');
  let found = false;
  
  // Look for a link with text content matching the day number
  links.forEach((link) => {
    if (link.textContent?.trim() === dayNumber.toString()) {
      const href = link.getAttribute('href');
      // Extract the __doPostBack call from href like: javascript:__doPostBack('ctl00$pageBody$calHearingDate','9494')
      if (href && href.includes('__doPostBack')) {
        const match = href.match(/__doPostBack\('([^']+)','([^']+)'\)/);
        if (match) {
          const eventTarget = match[1];
          const eventArgument = match[2];
          console.log(`Calling __doPostBack('${eventTarget}', '${eventArgument}') for day ${dayNumber}`);
          // Send the message to the injected script
          callDoPostBack(eventTarget, eventArgument);
          found = true;
        }
      }
    }
  });
  
  if (!found) {
    console.log(`Date link for day ${dayNumber} not found in calendar`);
  }
  
  return found;
}

// Select role as "A Member of the Public"
function selectRole(_unused: string = ''): boolean {
  const select = document.getElementById('pageBody_ddlWho') as HTMLSelectElement;
  if (!select) {
    console.log('Role dropdown #pageBody_ddlWho not found');
    return false;
  }
  
  // Find the option with value "4" for "A Member of the Public"
  const options = select.querySelectorAll('option');
  let found = false;
  
  options.forEach((option) => {
    if (option.value === '4') {
      console.log(`Selecting role: ${option.textContent}`);
      select.value = option.value;
      
      // Trigger multiple events to ensure the page processes the change
      select.dispatchEvent(new Event('change', { bubbles: true }));
      select.dispatchEvent(new Event('input', { bubbles: true }));
      
      found = true;
    }
  });
  
  if (!found) {
    console.log('Role option with value "4" not found');
  }
  
  return found;
}

// Select support position for the bill
function selectSupport(supportValue: string): boolean {
  const supportLower = supportValue.toLowerCase();

  // Determine which radio button to select based on the support value
  let radioId: string | null = null;

  // Positive cases: "for", "pro", "1"
  if (['for', 'pro', '1'].includes(supportLower)) {
    radioId = 'pageBody_rdoPosition_0';
  }
  // Negative cases: "against", "anti", "0"
  else if (['against', 'anti', '0'].includes(supportLower)) {
    radioId = 'pageBody_rdoPosition_1';
  }

  if (!radioId) {
    console.log(`Support value "${supportValue}" not recognized (use 'for', 'pro', '1', 'against', 'anti', or '0')`);
    return false;
  }

  const radio = document.getElementById(radioId) as HTMLInputElement;
  if (!radio) {
    console.log(`Support radio button #${radioId} not found`);
    return false;
  }

  console.log(`Selecting support position: ${supportLower}`);
  radio.checked = true;
  radio.dispatchEvent(new Event('change', { bubbles: true }));
  radio.dispatchEvent(new Event('input', { bubbles: true }));

  return true;
}

// ============================================================================
// URL BUILDER MODULE
// ============================================================================

interface FormState {
  date: string | null;      // MMDD format
  committee: string | null; // Full name
  bill: string | null;      // Digits only
  support: string | null;   // 'for' or 'against'
}

let urlBuilderIcon: HTMLElement | null = null;
let formState: FormState = {
  date: null,
  committee: null,
  bill: null,
  support: null
};

// Build URL from current form state
function buildUrlFromFormState(): string {
  const baseUrl = 'https://gc.nh.gov/house/committees/remotetestimony/default.aspx';
  const params = new URLSearchParams();

  if (formState.date) {
    params.append('date', formState.date);
  }

  if (formState.committee) {
    params.append('committee', formState.committee);
  }

  if (formState.bill) {
    params.append('bill', formState.bill);
  }

  if (formState.support) {
    params.append('support', formState.support);
  }

  if (params.toString()) {
    return `${baseUrl}?${params.toString()}`;
  }

  return baseUrl;
}

// Check if any form field has a value
function hasAnyFormValue(): boolean {
  return Object.values(formState).some(value => value !== null && value !== '');
}

// Update icon enabled/disabled state
function updateIconState(): void {
  if (!urlBuilderIcon) return;

  if (hasAnyFormValue()) {
    urlBuilderIcon.classList.remove('disabled');
    urlBuilderIcon.classList.add('enabled');
  } else {
    urlBuilderIcon.classList.remove('enabled');
    urlBuilderIcon.classList.add('disabled');
  }
}

// Extract selected date from calendar
function extractSelectedDate(): string | null {
  const calendar = document.getElementById('dvSelectDate');
  if (!calendar) return null;

  // Look for the selected date (usually has a different style or class)
  const selectedLink = calendar.querySelector('a[style*="font-weight:bold"]') ||
                       calendar.querySelector('a.selected') ||
                       calendar.querySelector('td.selected a');

  if (selectedLink && selectedLink.textContent) {
    const day = parseInt(selectedLink.textContent.trim(), 10);

    // Validate day
    if (day < 1 || day > 31) return null;

    // Get month from calendar header
    const header = calendar.querySelector('td.CalendarHeader')?.textContent || '';
    const monthMatch = header.match(/(\d{1,2})\/\d{4}/);

    if (monthMatch) {
      const month = parseInt(monthMatch[1], 10);
      // Format as MMDD with leading zeros
      return `${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;
    }
  }

  return null;
}

// Extract selected committee name
function extractSelectedCommittee(): string | null {
  const select = document.getElementById('pageBody_ddlCommittee') as HTMLSelectElement;
  if (!select || select.selectedIndex <= 0) return null;

  const selectedOption = select.options[select.selectedIndex];
  return selectedOption.textContent?.trim() || null;
}

// Extract selected bill number (digits only)
function extractSelectedBill(): string | null {
  const select = document.getElementById('pageBody_ddlBills') as HTMLSelectElement;
  if (!select || select.selectedIndex <= 0) return null;

  const selectedOption = select.options[select.selectedIndex];
  const billText = selectedOption.textContent?.trim() || '';

  // Extract just the digits from the bill text
  const digits = billText.replace(/\D/g, '');
  return digits || null;
}

// Extract selected support position
function extractSupportPosition(): string | null {
  const forRadio = document.getElementById('pageBody_rdoPosition_0') as HTMLInputElement;
  const againstRadio = document.getElementById('pageBody_rdoPosition_1') as HTMLInputElement;

  if (forRadio && forRadio.checked) {
    return 'for';
  } else if (againstRadio && againstRadio.checked) {
    return 'against';
  }

  return null;
}

// Update form state by reading current form values
function updateFormState(): void {
  formState.date = extractSelectedDate();
  formState.committee = extractSelectedCommittee();
  formState.bill = extractSelectedBill();
  formState.support = extractSupportPosition();

  updateIconState();
}

// Copy URL to clipboard and show feedback
async function copyUrlToClipboard(): Promise<void> {
  if (!hasAnyFormValue()) return;

  const url = buildUrlFromFormState();

  try {
    await navigator.clipboard.writeText(url);

    // Show pulse animation
    if (urlBuilderIcon) {
      urlBuilderIcon.classList.add('pulse');
      setTimeout(() => {
        urlBuilderIcon?.classList.remove('pulse');
      }, 500);
    }

    console.log('[URL Builder] URL copied to clipboard:', url);
  } catch (error) {
    console.error('[URL Builder] Failed to copy URL to clipboard:', error);
  }
}

// Inject the URL builder icon into the page
function injectUrlBuilderIcon(): void {
  // Only inject on remotetestimony page
  if (!window.location.pathname.includes('remotetestimony')) {
    return;
  }

  // Don't inject if already exists
  if (document.getElementById('nhBillLinkerUrlBuilder')) {
    return;
  }

  // Create container div
  const container = document.createElement('div');
  container.id = 'nhBillLinkerUrlBuilder';
  container.className = 'disabled';
  container.title = 'Copy shareable link';

  // Inject SVG inline
  container.innerHTML = `
    <svg viewBox="0 0 491.521 491.521" xmlns="http://www.w3.org/2000/svg">
      <polygon style="fill:#3A556A;" points="314.147,339.386 152.136,177.375 287.611,0.001 491.521,203.911 "/>
      <polygon style="fill:#2F4859;" points="452.292,185.593 313.918,291.281 185.096,162.46 177.767,172.056 312.923,307.211 460.894,194.194 "/>
      <polygon style="fill:#FCD462;" points="180.552,205.79 161.697,215.27 47.982,272.445 0,491.521 219.077,443.538 276.251,329.825 285.732,310.97 "/>
      <g>
        <path style="fill:#F6C358;" d="M13.604,488.541l115.93-115.93c8.69,4.253,19.443,2.865,26.666-4.358c9.094-9.094,9.095-23.839,0.001-32.933c-9.094-9.094-23.839-9.093-32.933,0.001c-7.223,7.224-8.611,17.977-4.358,26.666L2.979,477.916L0,491.521L13.604,488.541z"/>
        <polygon style="fill:#F6C358;" points="180.551,205.79 161.696,215.27 276.251,329.826 285.732,310.97"/>
      </g>
    </svg>
  `;

  // Add click handler
  container.addEventListener('click', copyUrlToClipboard);

  // Append to body
  document.body.appendChild(container);
  urlBuilderIcon = container;

  console.log('[URL Builder] Icon injected');
}

// Set up event listeners for form changes
function setupFormChangeListeners(): void {
  const selectors = [
    'pageBody_ddlCommittee',
    'pageBody_ddlBills',
    'pageBody_ddlWho',
    'pageBody_rdoPosition_0',
    'pageBody_rdoPosition_1'
  ];

  selectors.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('change', updateFormState);
    }
  });

  // Calendar clicks (date selection triggers page reload, capture before)
  const calendar = document.getElementById('dvSelectDate');
  if (calendar) {
    calendar.addEventListener('click', () => {
      setTimeout(updateFormState, 100);
    });
  }

  console.log('[URL Builder] Event listeners attached');
}

// Initialize URL builder on page load
function initializeUrlBuilder(): void {
  // Only run on remotetestimony page
  if (!window.location.pathname.includes('remotetestimony')) {
    return;
  }

  // Inject icon
  injectUrlBuilderIcon();

  // Set up event listeners
  setupFormChangeListeners();

  // Initial state update
  updateFormState();

  console.log('[URL Builder] Initialized');
}

// ============================================================================
// END URL BUILDER MODULE
// ============================================================================

// Auto-populate form inputs based on URL parameters
async function autoPopulateForm(): Promise<void> {
  // Inject the script file first and wait for it to be ready
  await injectScript();

  const allParams = getQueryParams();
  
  if (Object.keys(allParams).length === 0) {
    console.log('No parameters to populate');
    return;
  }

  // Handle date selection if date parameter is provided
  if (allParams.date) {
    const dayNumber = parseDateParam(allParams.date);
    if (dayNumber !== null) {
      selectDate(dayNumber);
    }
  }

  // Handle committee selection if committee parameter is provided
  if (allParams.committee) {
    await waitAndSelect('pageBody_ddlCommittee', selectCommittee, allParams.committee);
  }

  // Handle bill selection if bill parameter is provided
  if (allParams.bill) {
    await waitAndSelect('pageBody_ddlBills', selectBill, allParams.bill);
  }

  // Select role as "A Member of the Public" (wait for dropdown to be populated)
  await waitAndSelect('pageBody_ddlWho', selectRole, '');

  // Handle support position if support parameter is provided
  if (allParams.support) {
    selectSupport(allParams.support);
  }
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    autoPopulateForm();
    initializeUrlBuilder();
  });
} else {
  autoPopulateForm();
  initializeUrlBuilder();
}
