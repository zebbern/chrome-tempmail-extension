// Background service worker for TempMail Pro
console.log("Service worker starting");

// Define the API functions
var createAddress;
var getMessages;
var fetchMessage;

// Global service registry to be used directly
const SERVICES = {
  'guerrillamail': {
    name: 'Guerrilla Mail',
    domains: ['grr.la', 'sharklasers.com', 'guerrillamail.net', 'guerrillamail.com'],
    expirySeconds: 3600 // 1 hour
  },
  'mailgw': {
    name: 'Mail.gw',
    domains: ['mail.gw'],
    expirySeconds: 600 // 10 minutes
  },
  'dropmail': {
    name: 'DropMail.me',
    domains: ['dropmail.me'],
    expirySeconds: 600 // 10 minutes
  },
  'mailtm': {
    name: 'Mail.tm',
    domains: ['mail.tm'],
    expirySeconds: 604800 // 7 days
  },
  'tempmaillol': {
    name: 'TempMail.lol',
    domains: ['tempmail.lol'],
    expirySeconds: 3600 // 1 hour
  }
};

// Import everything directly in the service worker
// Include all necessary code here instead of using importScripts
function initializeAPI() {
  console.log("Initializing API functions");
  
  // Cache for domains and messages
  const domainsCache = {};
  const tempMailLolCache = {};

  // Utility functions
  function generateRandomString(length = 10) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => 
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('');
  }

  // Create a new email address
  createAddress = async function(service, domain = null) {
    console.log('createAddress called with:', service, domain);
    
    switch (service) {
      case 'guerrillamail':
        return createGuerrillaMailAddress(domain);
      case 'mailgw':
        return createMailGwAddress(domain);
      case 'dropmail':
        return createDropMailAddress(domain);
      case 'mailtm':
        return createMailTmAddress(domain);
      case 'tempmaillol':
        return createTempMailLolAddress(domain);
      default:
        throw new Error(`Unknown service: ${service}`);
    }
  };

  // Get messages for an address
  getMessages = async function(service, token) {
    console.log('getMessages called with:', service);
    
    switch (service) {
      case 'guerrillamail':
        return getGuerrillaMailMessages(token);
      case 'mailgw':
        return getMailGwMessages(token);
      case 'dropmail':
        return getDropMailMessages(token);
      case 'mailtm':
        return getMailTmMessages(token);
      case 'tempmaillol':
        return getTempMailLolMessages(token);
      default:
        throw new Error(`Unknown service: ${service}`);
    }
  };

  // Fetch a specific message
  fetchMessage = async function(service, token, messageId) {
    console.log('fetchMessage called with:', service, messageId);
    
    switch (service) {
      case 'guerrillamail':
        return fetchGuerrillaMailMessage(token, messageId);
      case 'mailgw':
        return fetchMailGwMessage(token, messageId);
      case 'dropmail':
        return fetchDropMailMessage(token, messageId);
      case 'mailtm':
        return fetchMailTmMessage(token, messageId);
      case 'tempmaillol':
        return fetchTempMailLolMessage(token, messageId);
      default:
        throw new Error(`Unknown service: ${service}`);
    }
  };

  // ==============================
  // Guerrilla Mail API implementation
  // ==============================
  const GUERRILLA_API_URL = 'https://api.guerrillamail.com/ajax.php';

  async function createGuerrillaMailAddress(domain = null) {
    if (!domain) {
      domain = SERVICES.guerrillamail.domains[0];
    }
    
    const salt = Date.now();
    const params = new URLSearchParams({
      'f': 'get_email_address',
      't': salt.toString()
    });
    
    const headers = {
      'User-Agent': 'TempMailPro/3.0',
      'Accept': 'application/json',
      'Referer': 'https://guerrillamail.com/'
    };
    
    try {
      const response = await fetch(`${GUERRILLA_API_URL}?${params}`, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        email: data.email_addr,
        token: data.sid_token
      };
    } catch (error) {
      // Fallback if the first attempt fails
      const fallbackParams = new URLSearchParams({ 'f': 'get_email_address' });
      const fallbackResponse = await fetch(`${GUERRILLA_API_URL}?${fallbackParams}`, {
        method: 'GET',
        headers
      });
      
      if (!fallbackResponse.ok) {
        throw new Error(`HTTP error: ${fallbackResponse.status}`);
      }
      
      const fallbackData = await fallbackResponse.json();
      return {
        email: fallbackData.email_addr,
        token: fallbackData.sid_token
      };
    }
  }

  async function getGuerrillaMailMessages(token) {
    const params = new URLSearchParams({
      'f': 'get_email_list',
      'sid_token': token,
      'offset': '0'
    });
    
    const headers = {
      'User-Agent': 'TempMailPro/3.0',
      'Accept': 'application/json',
      'Referer': 'https://guerrillamail.com/'
    };
    
    const response = await fetch(`${GUERRILLA_API_URL}?${params}`, {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const data = await response.json();
    const messages = data.list || [];
    
    // Normalize message format
    return messages.map(msg => ({
      mail_id: msg.mail_id || '',
      subject: msg.mail_subject || 'No Subject',
      mail_from: msg.mail_from || 'Unknown',
      mail_date: msg.mail_date || '',
      receive_time: Date.now()
    }));
  }

  async function fetchGuerrillaMailMessage(token, messageId) {
    const params = new URLSearchParams({
      'f': 'fetch_email',
      'sid_token': token,
      'email_id': messageId
    });
    
    const headers = {
      'User-Agent': 'TempMailPro/3.0',
      'Accept': 'application/json',
      'Referer': 'https://guerrillamail.com/'
    };
    
    try {
      const response = await fetch(`${GUERRILLA_API_URL}?${params}`, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Get the mail body from all possible locations
      let mailBody = data.mail_body || '';
      if (!mailBody) {
        mailBody = data.body || '';
      }
      
      // Check for HTML body
      const mailBodyHtml = data.body_html || '';
      if (mailBodyHtml && !mailBody) {
        mailBody = mailBodyHtml;
      }
      
      return {
        mail_body: mailBody,
        mail_from: data.mail_from || 'Unknown',
        subject: data.mail_subject || 'No Subject',
        mail_date: data.mail_timestamp || '',
        mail_size: data.mail_size || 0,
        receive_time: Date.now()
      };
    } catch (error) {
      console.error('GuerrillaMailAPI fetch_message error:', error);
      return {
        mail_body: `Error loading message: ${error.message}`,
        mail_from: 'Unknown',
        subject: 'Error retrieving message',
        mail_date: '',
        mail_size: 0,
        receive_time: Date.now()
      };
    }
  }

// ==============================
// Mail.gw API implementation - FULL UPDATED VERSION
// ==============================
const MAILGW_API_URL = 'https://api.mail.gw';

async function getMailGwDomains() {
  if (domainsCache.mailgw) {
    return domainsCache.mailgw;
  }
  
  const response = await fetch(`${MAILGW_API_URL}/domains`);
  
  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }
  
  const data = await response.json();
  const domains = data['hydra:member'].map(d => d.domain);
  
  // Cache the domains
  domainsCache.mailgw = domains;
  return domains;
}

async function createMailGwAddress(domain = null) {
  try {
    // Always get fresh domains from the API rather than using the provided domain
    const domains = await getMailGwDomains();
    if (!domains || domains.length === 0) {
      throw new Error("No domains available for Mail.gw");
    }
    
    // Use the first domain from the API instead of what was provided
    const validDomain = domains[0];
    
    const local = generateRandomString(12);
    const email = `${local}@${validDomain}`;
    const password = generateRandomString(16);
    
    console.log(`Creating Mail.gw account with domain: ${validDomain}`);
    
    // Create account
    const createResponse = await fetch(`${MAILGW_API_URL}/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        address: email,
        password: password
      })
    });
    
    // Handle potential errors
    if (!createResponse.ok) {
      let errorText;
      try {
        const errorJson = await createResponse.json();
        errorText = JSON.stringify(errorJson);
      } catch {
        errorText = await createResponse.text();
      }
      console.error('Mail.gw account creation failed:', errorText);
      throw new Error(`Mail.gw HTTP error: ${createResponse.status} - ${errorText.substring(0, 100)}`);
    }
    
    // Wait a bit for account to propagate
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Get token
    const tokenResponse = await fetch(`${MAILGW_API_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        address: email,
        password: password
      })
    });
    
    if (!tokenResponse.ok) {
      let errorText;
      try {
        const errorJson = await tokenResponse.json();
        errorText = JSON.stringify(errorJson);
      } catch {
        errorText = await tokenResponse.text();
      }
      console.error('Mail.gw token fetch failed:', errorText);
      throw new Error(`Mail.gw HTTP error: ${tokenResponse.status} - ${errorText.substring(0, 100)}`);
    }
    
    const tokenData = await tokenResponse.json();
    return {
      email: email,
      token: tokenData.token
    };
  } catch (error) {
    console.error('Mail.gw address creation error:', error);
    throw error;
  }
}

async function getMailGwMessages(token) {
  const response = await fetch(`${MAILGW_API_URL}/messages`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }
  
  const data = await response.json();
  const messages = data['hydra:member'] || [];
  
  // Normalize message format
  return messages.map(msg => ({
    mail_id: msg.id,
    subject: msg.subject || 'No Subject',
    mail_from: msg.from?.address || 'Unknown',
    mail_date: msg.createdAt || '',
    receive_time: Date.now()
  }));
}

async function fetchMailGwMessage(token, messageId) {
  try {
    const response = await fetch(`${MAILGW_API_URL}/messages/${messageId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const msg = await response.json();
    
    // Prioritize HTML content if available
    let htmlContent = msg.html || '';
    let textContent = msg.text || '';
    
    // Check alternate locations
    if (!htmlContent && !textContent) {
      if (msg.payload) {
        htmlContent = msg.payload.html || '';
        textContent = msg.payload.text || '';
      }
    }
    
    // Ensure content is a string
    if (Array.isArray(htmlContent)) {
      htmlContent = htmlContent.join('\n');
    }
    if (Array.isArray(textContent)) {
      textContent = textContent.join('\n');
    }
    
    // Use HTML if available, else text
    const finalContent = htmlContent || textContent;
    
    // Calculate size based on content length
    const messageSize = new TextEncoder().encode(finalContent).length;
    
    return {
      mail_body: finalContent,
      mail_from: msg.from?.address || 'Unknown',
      subject: msg.subject || 'No Subject',
      mail_date: msg.createdAt || new Date().toISOString(),
      mail_size: messageSize,
      receive_time: Date.now()
    };
  } catch (error) {
    console.error('Mail.gw fetch_message error:', error);
    return {
      mail_body: `Error loading message: ${error.message}`,
      mail_from: 'Unknown',
      subject: 'Error retrieving message',
      mail_date: new Date().toISOString(),
      mail_size: 0,
      receive_time: Date.now()
    };
  }
}

  // ==============================
  // DropMail.me API implementation 
  // ==============================
  const DROPMAIL_API_URL = 'https://dropmail.me/api/graphql';

  async function createDropMailAddress(domain = null) {
    const token = generateRandomString(12);
    const query = `
      mutation {
        introduceSession {
          id
          expiresAt
          addresses {
            address
          }
        }
      }
    `;
    
    try {
      const response = await fetch(`${DROPMAIL_API_URL}/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      const data = await response.json();
      const sess = data.data.introduceSession;
      const sessionId = sess.id;
      const address = sess.addresses[0].address;
      
      // Return combined token that includes both API token and session ID
      return {
        email: address,
        token: `${token}|${sessionId}`
      };
    } catch (error) {
      console.error('Error creating DropMail address:', error);
      throw error;
    }
  }

  async function getDropMailMessages(token) {
    const [apiToken, sessionId] = token.split('|');
    const query = `
      query($id: ID!){
        session(id: $id){
          mails{
            id
            fromAddr
            headerSubject
            text
            receivedAt
          }
        }
      }
    `;
    
    try {
      const response = await fetch(`${DROPMAIL_API_URL}/${apiToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          variables: { id: sessionId }
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      const data = await response.json();
      const session = data.data.session;
      
      if (!session) {
        return [];
      }
      
      const messages = session.mails || [];
      
      // Normalize message format
      return messages.map(m => ({
        mail_id: m.id,
        subject: m.headerSubject || 'No Subject',
        mail_from: m.fromAddr || 'Unknown',
        mail_date: m.receivedAt || '',
        receive_time: Date.now()
      }));
    } catch (error) {
      console.error('Error getting DropMail messages:', error);
      throw error;
    }
  }

  async function fetchDropMailMessage(token, messageId) {
    try {
      const [apiToken, sessionId] = token.split('|');
      
      // First try the more precise query for a single mail
      const query = `
        query($id: ID!, $mailId: ID!){
          session(id: $id){
            mail(id: $mailId){
              id
              fromAddr
              headerSubject
              text
              html
              receivedAt
              size
            }
          }
        }
      `;
      
      const response = await fetch(`${DROPMAIL_API_URL}/${apiToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          variables: { id: sessionId, mailId: messageId }
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      const data = await response.json();
      const mail = data.data?.session?.mail;
      
      // If we got data, use it
      if (mail && (mail.text || mail.html)) {
        // Prioritize HTML content if available
        const htmlContent = mail.html || '';
        const textContent = mail.text || '';
        
        // Get the better content
        const finalContent = htmlContent || textContent;
        
        // Calculate size if not provided
        const mailSize = mail.size || new TextEncoder().encode(finalContent).length;
        
        return {
          mail_body: finalContent,
          mail_from: mail.fromAddr || 'Unknown',
          subject: mail.headerSubject || 'No Subject',
          mail_date: mail.receivedAt || new Date().toISOString(),
          mail_size: mailSize,
          receive_time: Date.now()
        };
      }
      
      // If direct mail query failed, fall back to full mail list
      const fallbackQuery = `
        query($id: ID!){
          session(id: $id){
            mails{
              id
              fromAddr
              headerSubject
              text
              html
              receivedAt
            }
          }
        }
      `;
      
      const fallbackResponse = await fetch(`${DROPMAIL_API_URL}/${apiToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: fallbackQuery,
          variables: { id: sessionId }
        })
      });
      
      if (!fallbackResponse.ok) {
        throw new Error(`HTTP error: ${fallbackResponse.status}`);
      }
      
      const fallbackData = await fallbackResponse.json();
      
      // Find the specific message in the list
      let targetMail = null;
      if (fallbackData.data?.session?.mails) {
        for (const m of fallbackData.data.session.mails) {
          if (m.id === messageId) {
            targetMail = m;
            break;
          }
        }
      }
      
      if (!targetMail) {
        throw new Error("Message not found in session");
      }
      
      // Prioritize HTML content
      const html = targetMail.html || '';
      const text = targetMail.text || '';
      
      // Get the better content
      const content = html || text;
      
      // Calculate size based on content
      const size = new TextEncoder().encode(content).length;
      
      return {
        mail_body: content,
        mail_from: targetMail.fromAddr || 'Unknown',
        subject: targetMail.headerSubject || 'No Subject',
        mail_date: targetMail.receivedAt || new Date().toISOString(),
        mail_size: size,
        receive_time: Date.now()
      };
    } catch (error) {
      console.error('DropMailAPI fetch_message error:', error);
      return {
        mail_body: `Error loading message: ${error.message}`,
        mail_from: 'Unknown',
        subject: 'Error retrieving message',
        mail_date: new Date().toISOString(),
        mail_size: 0,
        receive_time: Date.now()
      };
    }
  }

// ==============================
// Mail.tm API implementation - FULL UPDATED VERSION
// ==============================
const MAILTM_API_URL = 'https://api.mail.tm';

async function getMailTmDomains() {
  if (domainsCache.mailtm) {
    return domainsCache.mailtm;
  }
  
  try {
    const response = await fetch(`${MAILTM_API_URL}/domains`);
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const data = await response.json();
    const domains = data['hydra:member'].map(d => d.domain);
    
    // Cache the domains
    domainsCache.mailtm = domains;
    return domains;
  } catch (error) {
    console.error('Error getting Mail.tm domains:', error);
    // Return a fallback domain list that's known to work
    return ['greencafe24.com', 'daymailonline.com', 'bay0.org'];
  }
}

async function createMailTmAddress(domain = null) {
  try {
    // Always get fresh domains from the API
    const domains = await getMailTmDomains();
    if (!domains || domains.length === 0) {
      throw new Error("No domains available for Mail.tm");
    }
    
    // Use the first valid domain from the API
    const validDomain = domains[0]; 
    
    const local = generateRandomString(12);
    const email = `${local}@${validDomain}`;
    const password = generateRandomString(20);
    
    console.log(`Creating Mail.tm account with domain: ${validDomain}`);
    
    // Create account with proper content type and handling
    const createResponse = await fetch(`${MAILTM_API_URL}/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        address: email,
        password: password
      })
    });
    
    // Handle errors properly - don't read the body twice
    if (!createResponse.ok) {
      const status = createResponse.status;
      throw new Error(`Mail.tm HTTP error: ${status}`);
    }
    
    // Wait a bit for account to propagate
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Get token - reuse the same credentials
    const tokenResponse = await fetch(`${MAILTM_API_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        address: email,
        password: password
      })
    });
    
    if (!tokenResponse.ok) {
      const status = tokenResponse.status;
      throw new Error(`Mail.tm token HTTP error: ${status}`);
    }
    
    const tokenData = await tokenResponse.json();
    return {
      email,
      token: tokenData.token
    };
  } catch (error) {
    console.error('Mail.tm address creation error:', error);
    throw error;
  }
}

async function getMailTmMessages(token) {
  try {
    const response = await fetch(`${MAILTM_API_URL}/messages`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const data = await response.json();
    const messages = data['hydra:member'] || [];
    
    // Normalize message format
    return messages.map(msg => ({
      mail_id: msg.id,
      subject: msg.subject || 'No Subject',
      mail_from: msg.from?.address || 'Unknown',
      mail_date: msg.createdAt || '',
      receive_time: Date.now()
    }));
  } catch (error) {
    console.error('Error getting Mail.tm messages:', error);
    throw error;
  }
}

async function fetchMailTmMessage(token, messageId) {
  try {
    const response = await fetch(`${MAILTM_API_URL}/messages/${messageId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const msg = await response.json();
    
    // Prioritize HTML content if available
    let htmlContent = msg.html || '';
    let textContent = msg.text || '';
    
    // Check if content exists at alternate locations
    if (!htmlContent && !textContent && msg.intro) {
      textContent = msg.intro;
    }
    
    // Ensure content is a string
    if (Array.isArray(htmlContent)) {
      htmlContent = htmlContent.join('\n');
    }
    if (Array.isArray(textContent)) {
      textContent = textContent.join('\n');
    }
    
    // Use HTML if available, else text
    const finalContent = htmlContent || textContent;
    
    // Calculate size based on content length
    const messageSize = new TextEncoder().encode(finalContent).length;
    
    return {
      mail_body: finalContent,
      mail_from: msg.from?.address || 'Unknown',
      subject: msg.subject || 'No Subject',
      mail_date: msg.createdAt || new Date().toISOString(),
      mail_size: messageSize,
      receive_time: Date.now()
    };
  } catch (error) {
    console.error('Mail.tm fetch_message error:', error);
    return {
      mail_body: `Error loading message: ${error.message}`,
      mail_from: 'Unknown',
      subject: 'Error retrieving message',
      mail_date: new Date().toISOString(),
      mail_size: 0,
      receive_time: Date.now()
    };
  }
}

  // ==============================
  // TempMail.lol API implementation
  // ==============================
  const TEMPMAIL_LOL_API_URL = 'https://api.tempmail.lol';

  async function createTempMailLolAddress(domain = null) {
    // Use the /generate/rush endpoint (faster)
    const url = `${TEMPMAIL_LOL_API_URL}/generate/rush`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Initialize cache for this token
    const token = data.token;
    tempMailLolCache[token] = [];
    
    return {
      email: data.address,
      token: token
    };
  }

  async function getTempMailLolMessages(token) {
    const url = `${TEMPMAIL_LOL_API_URL}/auth/${token}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const data = await response.json();
    const messages = data.email || [];
    
    // Initialize cache if not exists
    if (!tempMailLolCache[token]) {
      tempMailLolCache[token] = [];
    }
    
    // Get existing message IDs from cache
    const existingIds = new Set(tempMailLolCache[token].map(msg => msg.mail_id));
    
    const normalized = [];
    
    // Process messages and add new ones to cache
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const msgId = i.toString();
      
      if (!existingIds.has(msgId)) {
        // New message - save to cache
        const receivedTime = Date.now();
        const body = msg.body || msg.html || '';
        
        const normalizedMsg = {
          mail_id: msgId,
          subject: msg.subject || 'No Subject',
          mail_from: msg.from || 'Unknown',
          mail_date: new Date().toISOString(),
          mail_body: body,
          mail_size: new TextEncoder().encode(body).length,
          cached: false,
          receive_time: receivedTime
        };
        
        tempMailLolCache[token].push(normalizedMsg);
        normalized.push(normalizedMsg);
      }
    }
    
    // Also return cached messages not in current response
    for (const cachedMsg of tempMailLolCache[token]) {
      if (!normalized.some(msg => msg.mail_id === cachedMsg.mail_id)) {
        const cachedCopy = { ...cachedMsg, cached: true };
        normalized.push(cachedCopy);
      }
    }
    
    return normalized.map(msg => ({
      mail_id: msg.mail_id,
      subject: msg.subject,
      mail_from: msg.mail_from,
      mail_date: msg.mail_date,
      receive_time: msg.receive_time
    }));
  }

  async function fetchTempMailLolMessage(token, messageId) {
    try {
      // First try to get from cache
      if (tempMailLolCache[token]) {
        for (const msg of tempMailLolCache[token]) {
          if (msg.mail_id === messageId) {
            // Ensure we have date and size
            if (!msg.mail_date) {
              msg.mail_date = new Date().toISOString();
            }
            
            const bodyContent = msg.mail_body || '';
            if (!msg.mail_size) {
              msg.mail_size = new TextEncoder().encode(bodyContent).length;
            }
            
            return {
              mail_body: bodyContent,
              mail_from: msg.mail_from || 'Unknown',
              subject: msg.subject || 'No Subject',
              mail_date: msg.mail_date,
              mail_size: msg.mail_size,
              receive_time: msg.receive_time || Date.now()
            };
          }
        }
      }
      
      // If not in cache, fetch fresh
      const url = `${TEMPMAIL_LOL_API_URL}/auth/${token}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      const data = await response.json();
      const messages = data.email || [];
      
      try {
        const index = parseInt(messageId);
        if (index >= 0 && index < messages.length) {
          const msg = messages[index];
          const bodyContent = msg.body || msg.html || '';
          
          // Calculate size based on content length
          const size = new TextEncoder().encode(bodyContent).length;
          
          const newMessage = {
            mail_body: bodyContent,
            mail_from: msg.from || 'Unknown',
            subject: msg.subject || 'No Subject',
            mail_date: new Date().toISOString(),
            mail_size: size,
            receive_time: Date.now()
          };
          
          // Update cache
          if (!tempMailLolCache[token]) {
            tempMailLolCache[token] = [];
          }
          
          // Update cached message if exists, otherwise add
          const existingIndex = tempMailLolCache[token].findIndex(m => m.mail_id === messageId);
          if (existingIndex >= 0) {
            tempMailLolCache[token][existingIndex] = { 
              ...tempMailLolCache[token][existingIndex],
              ...newMessage,
              mail_id: messageId 
            };
          } else {
            tempMailLolCache[token].push({ ...newMessage, mail_id: messageId });
          }
          
          return newMessage;
        }
      } catch (error) {
        console.error('Error parsing message ID:', error);
      }
      
      // Return a default message if not found
      return {
        mail_body: 'Message not found',
        mail_from: 'Unknown',
        subject: 'Not found',
        mail_date: new Date().toISOString(),
        mail_size: 0,
        receive_time: Date.now()
      };
    } catch (error) {
      console.error('TempMailLolAPI fetch_message error:', error);
      return {
        mail_body: `Error loading message: ${error.message}`,
        mail_from: 'Unknown',
        subject: 'Error retrieving message',
        mail_date: new Date().toISOString(),
        mail_size: 0,
        receive_time: Date.now()
      };
    }
  }

  // Log that API is initialized
  console.log("API functions initialized:", {
    createAddress: typeof createAddress,
    getMessages: typeof getMessages,
    fetchMessage: typeof fetchMessage
  });
}

// Call the initialization function
initializeAPI();

const ALARM_NAME = 'refresh-emails';
let refreshInterval = 5; // Default 5 seconds

// Initialize when the extension loads
chrome.runtime.onInstalled.addListener(() => {
  // Load settings and set up initial alarm
  chrome.storage.local.get(['refreshInterval'], (result) => {
    if (result.refreshInterval) {
      refreshInterval = result.refreshInterval;
    }
    setupRefreshAlarm(refreshInterval);
  });
  
  console.log('Service worker initialized');
});

// Listen for alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    refreshAllMailboxes();
  }
});

// Setup the refresh alarm with the given interval in seconds
function setupRefreshAlarm(seconds) {
  chrome.alarms.clear(ALARM_NAME, () => {
    chrome.alarms.create(ALARM_NAME, {
      periodInMinutes: seconds / 60 // Convert seconds to minutes
    });
  });
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message.action);
  
  if (message.action === 'updateRefreshInterval') {
    refreshInterval = message.interval;
    chrome.storage.local.set({ refreshInterval });
    setupRefreshAlarm(refreshInterval);
    sendResponse({ success: true });
    return false;
  }
  
  if (message.action === 'refreshMailboxes') {
    refreshAllMailboxes()
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  }
  
  if (message.action === 'createAddress') {
    try {
      if (typeof createAddress !== 'function') {
        console.error('createAddress function is not defined');
        sendResponse({ 
          success: false, 
          error: 'createAddress is not defined'
        });
        return false;
      }
      
      createAddress(message.service, message.domain)
        .then(data => {
          console.log('Address created:', data);
          sendResponse({ success: true, data });
        })
        .catch(error => {
          console.error('Error creating address:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep the message channel open for async response
    } catch (error) {
      console.error('Exception creating address:', error);
      sendResponse({ success: false, error: error.message });
      return false;
    }
  }
  
  if (message.action === 'getMessages') {
    try {
      if (typeof getMessages !== 'function') {
        console.error('getMessages function is not defined');
        sendResponse({ 
          success: false, 
          error: 'getMessages is not defined' 
        });
        return false;
      }
      
      getMessages(message.service, message.token)
        .then(data => sendResponse({ success: true, data }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep the message channel open for async response
    } catch (error) {
      sendResponse({ success: false, error: error.message });
      return false;
    }
  }
  
  if (message.action === 'fetchMessage') {
    try {
      if (typeof fetchMessage !== 'function') {
        console.error('fetchMessage function is not defined');
        sendResponse({ 
          success: false, 
          error: 'fetchMessage is not defined' 
        });
        return false;
      }
      
      fetchMessage(message.service, message.token, message.messageId)
        .then(data => sendResponse({ success: true, data }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep the message channel open for async response
    } catch (error) {
      sendResponse({ success: false, error: error.message });
      return false;
    }
  }
});

// Refresh all mailboxes
async function refreshAllMailboxes() {
  try {
    if (typeof getMessages !== 'function') {
      throw new Error('getMessages function is not defined');
    }
    
    // Get all saved addresses
    const { addresses = {} } = await chrome.storage.local.get('addresses');
    if (Object.keys(addresses).length === 0) return { success: true, message: 'No addresses to refresh' };
    
    const results = {};
    const recentlyUpdated = new Set();
    
    // Process each address
    for (const [email, data] of Object.entries(addresses)) {
      const { service, token, messages = [] } = data;
      
      try {
        // Get new messages
        const newMessages = await getMessages(service, token);
        
        // Check if there are new messages
        if (newMessages.length > messages.length) {
          recentlyUpdated.add(email);
          
          // Send notification for new messages
          const numNewMessages = newMessages.length - messages.length;
          chrome.notifications.create(`new-mail-${Date.now()}`, {
            type: 'basic',
            iconUrl: '/assets/icon128.png',
            title: 'New Email Received',
            message: `You have ${numNewMessages} new message${numNewMessages > 1 ? 's' : ''} in ${email}`
          });
        }
        
        // Save updated messages
        addresses[email].messages = newMessages;
        addresses[email].lastUpdated = Date.now();
        
        results[email] = { 
          success: true, 
          count: newMessages.length 
        };
      } catch (error) {
        console.error(`Error refreshing messages for ${email}:`, error);
        results[email] = { 
          success: false, 
          error: error.message 
        };
      }
    }
    
    // Save updated addresses
    await chrome.storage.local.set({ 
      addresses,
      recentlyUpdated: Array.from(recentlyUpdated)
    });
    
    return { success: true, results };
  } catch (error) {
    console.error('Error in refreshAllMailboxes:', error);
    return { success: false, error: error.message };
  }
}