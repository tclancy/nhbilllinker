// This script runs in the page context and can access page globals like __doPostBack
// Declare __doPostBack as it exists on the page
declare function __doPostBack(eventTarget: string, eventArgument: string): void;

// Listen for messages from the content script
document.addEventListener('__nhBillLinkerCallDoPostBack', (event: any) => {
  const { eventTarget, eventArgument } = event.detail;
  
  if (typeof __doPostBack === 'function') {
    console.log(`[Injected Script] Calling __doPostBack('${eventTarget}', '${eventArgument}')`);
    __doPostBack(eventTarget, eventArgument);
  } else {
    console.log('[Injected Script] __doPostBack not found on page');
  }
});

// Signal that this script is loaded
document.dispatchEvent(new CustomEvent('__nhBillLinkerScriptReady'));
