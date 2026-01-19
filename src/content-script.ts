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

// Get user settings from Chrome storage
async function getSettings(): Promise<Record<string, string>> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(null, (items: Record<string, any>) => {
      resolve(items as Record<string, string>);
    });
  });
}

// Auto-populate form inputs based on URL parameters and settings
async function autoPopulateForm(): Promise<void> {
  // Inject the script file first and wait for it to be ready
  await injectScript();
  
  const queryParams = getQueryParams();
  const settings = await getSettings();
  
  // Merge query parameters and settings (query params take precedence)
  const allParams = { ...settings, ...queryParams };
  
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
  document.addEventListener('DOMContentLoaded', autoPopulateForm);
} else {
  autoPopulateForm();
}
