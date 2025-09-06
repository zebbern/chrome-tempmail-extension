// TempMail Pro - Popup JavaScript

// Constants
const SERVICES = {
    'guerrillamail': {
      name: 'Guerrilla Mail',
      domains: ['grr.la', 'sharklasers.com', 'guerrillamail.net', 'guerrillamail.com'],
      expiry: 3600 // 1 hour
    },
    'mailgw': {
      name: 'Mail.gw',
      domains: ['mail.gw'],
      expiry: 600 // 10 minutes
    },
    'dropmail': {
      name: 'DropMail.me',
      domains: ['dropmail.me'],
      expiry: 600 // 10 minutes
    },
    'mailtm': {
      name: 'Mail.tm',
      domains: ['mail.tm'],
      expiry: 604800 // 7 days
    },
    'tempmaillol': {
      name: 'TempMail.lol',
      domains: ['tempmail.lol'],
      expiry: 3600 // 1 hour
    }
  };
  
// State
let state = {
    addresses: {},
    currentAddress: null,
    currentService: 'guerrillamail', // Default to guerrillamail
    currentDomain: null,
    refreshInterval: 5, // Set to 5 seconds
    recentlyUpdated: [],
    currentPage: 0, // 0: addresses, 1: inbox, 2: message
    currentMessageId: null
  };
  
  // DOM Elements
  const elements = {};
  
  // Initialize the popup
  document.addEventListener('DOMContentLoaded', async () => {
    // Cache DOM elements
    cacheElements();
    
    // Load state from storage
    await loadState();
    
    // Set up event listeners
    setupEventListeners();
    
    // Set up UI based on state
    updateUI();
    
    // Start auto-refresh timer
    startAutoRefresh();
  });
  
  // Cache DOM elements for quick access
  function cacheElements() {
    elements.serviceSelector = document.getElementById('service-selector');
    elements.domainSelector = document.getElementById('domain-selector');
    elements.refreshSelector = document.getElementById('refresh-selector');
    elements.createBtn = document.getElementById('create-btn');
    // Remove the closeBtn reference
    
    elements.addrPage = document.getElementById('addr-page');
    elements.inboxPage = document.getElementById('inbox-page');
    elements.messagePage = document.getElementById('message-page');
    
    elements.addrList = document.getElementById('addr-list');
    elements.msgList = document.getElementById('msg-list');
    
    elements.backToHome = document.getElementById('back-to-home');
    elements.refreshInbox = document.getElementById('refresh-inbox');
    elements.backToInbox = document.getElementById('back-to-inbox');
    
    elements.htmlView = document.getElementById('html-view');
    elements.rawView = document.getElementById('raw-view');
    elements.htmlTabBtn = document.getElementById('html-tab-btn');
    elements.rawTabBtn = document.getElementById('raw-tab-btn');
    
    elements.statusBar = document.getElementById('status-bar');
  }
  
  // Load state from Chrome storage
  async function loadState() {
    const data = await chrome.storage.local.get([
      'addresses', 
      'currentAddress', 
      'currentService', 
      'currentDomain', 
      'refreshInterval',
      'recentlyUpdated'
    ]);
    
    state.addresses = data.addresses || {};
    state.currentAddress = data.currentAddress || null;
    state.currentService = data.currentService || 'guerrillamail';
    state.currentDomain = data.currentDomain || null;
    state.refreshInterval = data.refreshInterval || 3;
    state.recentlyUpdated = data.recentlyUpdated || [];
    
    // Set service selector to current service
    elements.serviceSelector.value = state.currentService;
    
    // Set refresh interval selector
    elements.refreshSelector.value = state.refreshInterval.toString();
    
    // Update domains for current service
    updateDomainOptions();
    
    // Set domain selector if we have a current domain
    if (state.currentDomain) {
      // Only set if it exists in the dropdown
      const domainExists = Array.from(elements.domainSelector.options).some(
        option => option.value === state.currentDomain
      );
      
      if (domainExists) {
        elements.domainSelector.value = state.currentDomain;
      } else if (elements.domainSelector.options.length > 0) {
        // If current domain doesn't exist in dropdown, set to first option
        state.currentDomain = elements.domainSelector.options[0].value;
      }
    } else if (elements.domainSelector.options.length > 0) {
      // If no current domain, set to first option
      state.currentDomain = elements.domainSelector.options[0].value;
    }
  }
  
  // Save state to Chrome storage
  async function saveState() {
    await chrome.storage.local.set({
      addresses: state.addresses,
      currentAddress: state.currentAddress,
      currentService: state.currentService,
      currentDomain: state.currentDomain,
      refreshInterval: state.refreshInterval,
      recentlyUpdated: state.recentlyUpdated
    });
  }
  
  // Set up event listeners
  function setupEventListeners() {
    // Toolbar elements
    elements.serviceSelector.addEventListener('change', handleServiceChange);
    elements.domainSelector.addEventListener('change', handleDomainChange);
    elements.refreshSelector.addEventListener('change', handleRefreshChange);
    elements.createBtn.addEventListener('click', handleCreateAddress);
    
    // Navigation buttons
    elements.backToHome.addEventListener('click', () => showPage(0));
    elements.refreshInbox.addEventListener('click', refreshCurrentMessages);
    elements.backToInbox.addEventListener('click', () => showPage(1));
    
    // Tab buttons
    elements.htmlTabBtn.addEventListener('click', () => setActiveTab('html'));
    elements.rawTabBtn.addEventListener('click', () => setActiveTab('raw'));
    
    // Refresh on focus - useful when popup reopens
    window.addEventListener('focus', refreshAllMailboxes);
  }
  
  // Update UI based on current state
  function updateUI() {
    // Show the current page
    showPage(state.currentPage);
    
    // Update address list
    updateAddressList();
    
    // If on inbox page, update message list
    if (state.currentPage === 1 && state.currentAddress) {
      updateMessageList();
    }
    
    // If on message page, load message
    if (state.currentPage === 2 && state.currentMessageId) {
      loadMessage(state.currentMessageId);
    }
  }
  
  // Show a specific page
  function showPage(pageIndex) {
    state.currentPage = pageIndex;
    
    // Hide all pages
    elements.addrPage.classList.add('hidden');
    elements.inboxPage.classList.add('hidden');
    elements.messagePage.classList.add('hidden');
    
    // Show requested page
    switch (pageIndex) {
      case 0:
        elements.addrPage.classList.remove('hidden');
        break;
      case 1:
        elements.inboxPage.classList.remove('hidden');
        break;
      case 2:
        elements.messagePage.classList.remove('hidden');
        break;
    }
  }
  
  // Handle service change
  function handleServiceChange() {
    state.currentService = elements.serviceSelector.value;
    
    // Update domain options for new service
    updateDomainOptions();
    
    // Save state
    saveState();
  }
  
  // Handle domain change
  function handleDomainChange() {
    state.currentDomain = elements.domainSelector.value;
    saveState();
  }
  
  // Handle refresh interval change
  function handleRefreshChange() {
    state.refreshInterval = parseInt(elements.refreshSelector.value);
    
    // Update refresh interval in background script
    chrome.runtime.sendMessage({
      action: 'updateRefreshInterval',
      interval: state.refreshInterval
    });
    
    // Save state
    saveState();
    
    // Show status message
    const intervalText = state.refreshInterval === 1 
      ? `${state.refreshInterval} second` 
      : `${state.refreshInterval} seconds`;
    showStatus(`Refresh: ${intervalText}`);
  }
  
  // Update domain options in dropdown
  function updateDomainOptions() {
    // Clear current options
    elements.domainSelector.innerHTML = '';
    
    // Get domains for current service
    const domains = SERVICES[state.currentService]?.domains || [];
    
    // Add options for each domain
    domains.forEach(domain => {
      const option = document.createElement('option');
      option.value = domain;
      option.textContent = domain;
      elements.domainSelector.appendChild(option);
    });
    
    // Select current domain or first one
    if (state.currentDomain && domains.includes(state.currentDomain)) {
      elements.domainSelector.value = state.currentDomain;
    } else if (domains.length > 0) {
      elements.domainSelector.value = domains[0];
      state.currentDomain = domains[0];
    }
  }
  
  // Handle create address button click
  async function handleCreateAddress() {
    try {
      showStatus('Creating address...');
      
      const response = await chrome.runtime.sendMessage({
        action: 'createAddress',
        service: state.currentService,
        domain: state.currentDomain
      });
      
      console.log('Create address response:', response);
    
      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to create address');
      }
      
      const { email, token } = response.data;
      
    // Store the new address
    state.addresses[email] = {
        token,
        service: state.currentService,
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        messages: []
      };
      
      state.currentAddress = email;
      await saveState();
      
      updateAddressList();
      showStatus(`✓ Created ${SERVICES[state.currentService].name}: ${email}`);
      
      // Switch to inbox and refresh messages
      showPage(1);
      refreshCurrentMessages();
      
    } catch (error) {
      console.error('Error creating address:', error);
      showStatus(`Error creating address: ${error.message}`);
    }
  }
  

  // Refresh messages for current address
async function refreshCurrentMessages() {
    if (!state.currentAddress) return;
    
    try {
      showStatus('📬 Refreshing inbox...');
      
      try {
        await refreshAllMailboxes();
      } catch (error) {
        console.error('Error refreshing mailboxes:', error);
        showStatus(`Error refreshing mailboxes: ${error.message || 'Unknown error'}`);
        return;
      }
      
      // Update message list
      updateMessageList();
      
      showStatus('📬 Inbox refreshed');
    } catch (error) {
      console.error('Error refreshing messages:', error);
      showStatus(`Error refreshing: ${error.message}`);
    }
  }
  
  // Refresh all mailboxes
  async function refreshAllMailboxes() {
    try {
      console.log('Sending refreshMailboxes message');
      const response = await chrome.runtime.sendMessage({
        action: 'refreshMailboxes'
      });
      
      console.log('Refresh response:', response);
      
      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to refresh mailboxes');
      }
      
      // Reload state to get updated data
      await loadState();
      
      // Update address list to reflect any changes
      updateAddressList();
      
      return response;
    } catch (error) {
      console.error('Error refreshing mailboxes:', error);
      throw error;
    }
  }

  // Update address list
  function updateAddressList() {
    // Clear current list
    elements.addrList.innerHTML = '';
    
    // Get addresses and sort them
    // Recently updated addresses first, then by lastUpdated timestamp
    const addresses = Object.keys(state.addresses);
    if (addresses.length === 0) {
      const emptyEl = document.createElement('div');
      emptyEl.textContent = 'No email addresses. Click "+" to create one.';
      emptyEl.style.padding = '12px';
      emptyEl.style.textAlign = 'center';
      emptyEl.style.color = 'rgba(255, 255, 255, 0.7)';
      elements.addrList.appendChild(emptyEl);
      return;
    }
    
    // Sort addresses - recently updated first, then by lastUpdated time
    addresses.sort((a, b) => {
      // First check if in recently updated list
      const aRecent = state.recentlyUpdated.includes(a);
      const bRecent = state.recentlyUpdated.includes(b);
      
      if (aRecent && !bRecent) return -1;
      if (!aRecent && bRecent) return 1;
      
      // If both are recently updated or both are not, sort by lastUpdated
      return state.addresses[b].lastUpdated - state.addresses[a].lastUpdated;
    });
    
    // Add each address to the list
    addresses.forEach(email => {
      const data = state.addresses[email];
      const messageCount = data.messages ? data.messages.length : 0;
      
      // Create email item element
      const item = document.createElement('div');
      item.className = 'email-item';
      
      // Get service info
      const serviceKey = data.service || 'guerrillamail';
      const serviceName = SERVICES[serviceKey]?.name || serviceKey;
      const expirySeconds = SERVICES[serviceKey]?.expiry || 3600;
      
      // Calculate remaining time
      const elapsed = (Date.now() - data.createdAt) / 1000;
      const remaining = Math.max(0, expirySeconds - elapsed);
      
      // Format the timer text
      const days = Math.floor(remaining / 86400);
      const hours = Math.floor((remaining % 86400) / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      const seconds = Math.floor(remaining % 60);
      const timerText = `${days > 0 ? days + 'd ' : ''}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      // Get timer style class
      let timerClass = 'timer';
      if (remaining <= 300) { // Less than 5 minutes
        timerClass += ' danger';
      } else if (remaining <= 900) { // Less than 15 minutes
        timerClass += ' warning';
      }
      
      // Create HTML for email item
      item.innerHTML = `
        <div class="email-item-text">
          <div class="email-header">
            <span class="email-address">${email}</span>
            <span class="service-badge">${serviceName}</span>
          </div>
          <div class="email-info">
            <span class="count-badge ${messageCount > 0 ? 'has-mail' : ''}">
              ${messageCount} ${messageCount === 1 ? 'mail' : 'mails'}
            </span>
            <span class="${timerClass}">${timerText}</span>
          </div>
        </div>
        <button class="copy-btn">Copy</button>
        <button class="delete-btn">🗑️</button>
      `;
      
      // Add click event for the whole item (opens inbox)
      item.addEventListener('click', (e) => {
        // Don't trigger if clicking buttons
        if (e.target.tagName !== 'BUTTON') {
          state.currentAddress = email;
          saveState();
          showPage(1);
          updateMessageList();
        }
      });
      
      // Add button events
      const copyBtn = item.querySelector('.copy-btn');
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(email);
        showStatus(`🗐 Copied: ${email}`);
      });
      
      const deleteBtn = item.querySelector('.delete-btn');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteAddress(email);
      });
      
      elements.addrList.appendChild(item);
    });
  }
  
  // Delete an address
  async function deleteAddress(email) {
    // Remove from addresses
    delete state.addresses[email];
    
    // If this was the current address, reset it
    if (state.currentAddress === email) {
      state.currentAddress = Object.keys(state.addresses)[0] || null;
      
      // If we deleted the last address, go back to address list
      if (!state.currentAddress) {
        showPage(0);
      }
    }
    
    // Remove from recently updated
    state.recentlyUpdated = state.recentlyUpdated.filter(addr => addr !== email);
    
    // Save state
    await saveState();
    
    // Update UI
    updateAddressList();
    
    // Show status
    showStatus(`Deleted: ${email}`);
  }
  
  // Update message list for current address
  function updateMessageList() {
    // Clear current list
    elements.msgList.innerHTML = '';
    
    // Check if we have a current address
    if (!state.currentAddress || !state.addresses[state.currentAddress]) {
      showPage(0);
      return;
    }
    
    // Get messages for current address
    const data = state.addresses[state.currentAddress];
    const messages = data.messages || [];
    
    if (messages.length === 0) {
      const emptyEl = document.createElement('div');
      emptyEl.textContent = 'No messages received yet. Try refreshing.';
      emptyEl.style.padding = '12px';
      emptyEl.style.textAlign = 'center';
      emptyEl.style.color = 'rgba(255, 255, 255, 0.7)';
      elements.msgList.appendChild(emptyEl);
      return;
    }
    
    // Add messages in reverse order (newest first)
    messages.slice().reverse().forEach(msg => {
      const item = document.createElement('div');
      item.className = 'message-item';
      item.dataset.id = msg.mail_id;
      
      const subject = msg.subject || 'No Subject';
      const sender = msg.mail_from || 'Unknown';
      const date = formatDate(msg.mail_date);
      
      item.innerHTML = `
        <div class="message-subject">${subject}</div>
        <div class="message-meta">From: ${sender} • ${date}</div>
      `;
      
      // Add click event to view message
      item.addEventListener('click', () => {
        state.currentMessageId = msg.mail_id;
        showPage(2);
        loadMessage(msg.mail_id);
      });
      
      elements.msgList.appendChild(item);
    });
  }
  
// Load and display a specific message
async function loadMessage(messageId) {
    try {
      // Clear views
      elements.htmlView.innerHTML = '';
      elements.rawView.textContent = '';
      
      // Show loading indicator
      elements.htmlView.innerHTML = '<div style="text-align: center; padding: 20px;">Loading message...</div>';
      
      const data = state.addresses[state.currentAddress];
      if (!data) {
        throw new Error('Address not found');
      }
      
      // Check if message is in cache first
      let cachedMsg = null;
      if (data.messages) {
        cachedMsg = data.messages.find(m => m.mail_id === messageId);
      }
      
      // If message is not cached or doesn't have body, fetch it
      if (!cachedMsg || !cachedMsg.mail_body) {
        const response = await chrome.runtime.sendMessage({
          action: 'fetchMessage',
          service: data.service,
          token: data.token,
          messageId
        });
        
        if (!response || !response.success) {
          throw new Error(response?.error || 'Failed to load message');
        }
        
        // Update the message in cache
        const fullMsg = response.data;
        
        if (cachedMsg) {
          // Update existing message
          Object.assign(cachedMsg, fullMsg);
        } else if (data.messages) {
          // Add to cache
          data.messages.push(fullMsg);
        } else {
          // Initialize messages array
          data.messages = [fullMsg];
        }
        
        // Use the full message
        cachedMsg = fullMsg;
        
        // Save updated state
        await saveState();
      }
      
      // Display message
      displayMessage(cachedMsg);
      
    } catch (error) {
      console.error('Error loading message:', error);
      elements.htmlView.innerHTML = `
        <div style="color: #dc3545; padding: 20px;">
          Error loading message: ${error.message}
        </div>
      `;
    }
  }
  
  // Display a message in the message view
  function displayMessage(msg) {
    // Set default tab to HTML
    setActiveTab('html');
    
    // Prepare HTML content
    let html = msg.mail_body || '';
    
    // Ensure HTML is a string
    if (typeof html !== 'string') {
      if (Array.isArray(html) && html.length > 0) {
        html = html.join('\n');
      } else {
        html = String(html || '');
      }
    }
    
    // Make links clickable by ensuring proper URL formatting
    html = html.replace(/href="\/\//g, 'href="https://');
    html = html.replace(/href="www\./g, 'href="http://www.');
    
    // Add target="_blank" to all links to open in new tab
    html = html.replace(/<a(.*?)>/g, '<a$1 target="_blank" rel="noopener noreferrer">');
    
    // Format metadata for message display
    const metaHtml = `
      <div class="message-header">
        <h3>📧 ${msg.subject || 'No Subject'}</h3>
        <p>
          <strong>From:</strong> ${msg.mail_from || 'Unknown'}<br>
          <strong>Date:</strong> ${formatDate(msg.mail_date)}<br>
          <strong>Size:</strong> ${formatSize(msg.mail_size)}<br>
          <strong>Service:</strong> ${SERVICES[state.addresses[state.currentAddress].service]?.name || 'Unknown'}
        </p>
        <hr>
      </div>
    `;
    
    // Add dark mode styling
    const styleTag = `
      <style>
        body { color: white; background: transparent; }
        a { color: #1f97b6; }
        a:hover { color: #17a2d8; }
        pre, code { background-color: #202428; padding: 4px; border-radius: 3px; }
      </style>
    `;
    
    // Set HTML content
    elements.htmlView.innerHTML = metaHtml + styleTag + html;
    
    // Set raw content
    elements.rawView.textContent = JSON.stringify(msg, null, 2);
  }
  
  // Set active tab in message view
  function setActiveTab(tab) {
    // Remove active class from all tabs and panes
    elements.htmlTabBtn.classList.remove('active');
    elements.rawTabBtn.classList.remove('active');
    elements.htmlView.classList.remove('active');
    elements.rawView.classList.remove('active');
    
    // Add active class to selected tab and pane
    if (tab === 'html') {
      elements.htmlTabBtn.classList.add('active');
      elements.htmlView.classList.add('active');
    } else {
      elements.rawTabBtn.classList.add('active');
      elements.rawView.classList.add('active');
    }
  }
  
  // Refresh messages for current address
  async function refreshCurrentMessages() {
    if (!state.currentAddress) return;
    
    try {
      showStatus('📬 Refreshing inbox...');
      
      await refreshAllMailboxes();
      
      // Update message list
      updateMessageList();
      
      showStatus('📬 Inbox refreshed');
    } catch (error) {
      console.error('Error refreshing messages:', error);
      showStatus(`Error refreshing: ${error.message}`);
    }
  }
  
  // Refresh all mailboxes
  async function refreshAllMailboxes() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'refreshMailboxes'
      });
      
      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to refresh mailboxes');
      }
      
      // Reload state to get updated data
      await loadState();
      
      // Update address list to reflect any changes
      updateAddressList();
      
      return response;
    } catch (error) {
      console.error('Error refreshing mailboxes:', error);
      throw error;
    }
  }
  
  // Start auto-refresh timer
  function startAutoRefresh() {
    setInterval(() => {
      // If we're currently viewing a mailbox, refresh it
      if (state.currentPage === 1 && state.currentAddress) {
        refreshCurrentMessages();
      }
      
      // Update all email item timers
      updateTimers();
    }, 1000);
  }
  
  // Update all email timers
  function updateTimers() {
    const items = elements.addrList.querySelectorAll('.email-item');
    
    items.forEach(item => {
      const emailText = item.querySelector('.email-address').textContent;
      const timerEl = item.querySelector('.timer');
      const data = state.addresses[emailText];
      
      if (data && timerEl) {
        const serviceKey = data.service || 'guerrillamail';
        const expirySeconds = SERVICES[serviceKey]?.expiry || 3600;
        
        // Calculate remaining time
        const elapsed = (Date.now() - data.createdAt) / 1000;
        const remaining = Math.max(0, expirySeconds - elapsed);
        
        // Format the timer text
        const days = Math.floor(remaining / 86400);
        const hours = Math.floor((remaining % 86400) / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const seconds = Math.floor(remaining % 60);
        const timerText = `${days > 0 ? days + 'd ' : ''}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Update timer text
        timerEl.textContent = timerText;
        
        // Update timer style
        timerEl.className = 'timer';
        if (remaining <= 300) { // Less than 5 minutes
          timerEl.classList.add('danger');
        } else if (remaining <= 900) { // Less than 15 minutes
          timerEl.classList.add('warning');
        }
      }
    });
  }
  
  // Show status message
  function showStatus(message, duration = 3000) {
    elements.statusBar.textContent = message;
    
    // Auto-clear after duration
    if (duration > 0) {
      setTimeout(() => {
        if (elements.statusBar.textContent === message) {
          elements.statusBar.textContent = '';
        }
      }, duration);
    }
  }
  
  // Format date
  function formatDate(timestamp) {
    if (!timestamp) return '';
    
    try {
      let date;
      
      // Handle string timestamps
      if (typeof timestamp === 'string') {
        // Try to parse as integer timestamp first
        if (/^\d+$/.test(timestamp)) {
          date = new Date(parseInt(timestamp) * 1000);
        } else {
          date = new Date(timestamp);
        }
      } else if (typeof timestamp === 'number') {
        // Handle numeric timestamps
        // Check if timestamp is in seconds (most API return Unix timestamps)
        if (timestamp < 10000000000) {
          date = new Date(timestamp * 1000);
        } else {
          date = new Date(timestamp);
        }
      } else {
        return '';
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return String(timestamp);
      }
      
      return date.toLocaleString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return String(timestamp);
    }
  }
  
  // Format file size
  function formatSize(size) {
    if (size === undefined || size === null) return '0 B';
    
    try {
      if (typeof size === 'string') {
        size = parseInt(size);
      }
      
      if (isNaN(size)) return '0 B';
      
      if (size < 1024) {
        return `${size} B`;
      } else if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(1)} KB`;
      } else {
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
      }
    } catch (error) {
      console.error('Error formatting size:', error);
      return '0 B';
    }
  }