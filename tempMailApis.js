/**
 * TempMail Pro API - Chrome Extension
 * Ported from Python temp_mail_apis.py to JavaScript
 */

console.log('Loading tempMailApis.js');

// Service registry
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

// Cache for domains
const domainsCache = {};

// Cache for TempMail.lol messages
const tempMailLolCache = {};

// Create a new email address
async function createAddress(service, domain = null) {
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
  }
  
  // Get messages for an address - Expose as global function
  async function getMessages(service, token) {
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
  }
  
  // Fetch a specific message - Expose as global function
  async function fetchMessage(service, token, messageId) {
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
  }
  
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
  // Mail.gw API implementation
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
    
    domainsCache.mailgw = domains;
    return domains;
  }
  
  async function createMailGwAddress(domain = null) {
    if (!domain) {
      // Get available domains
      const domains = await getMailGwDomains();
      domain = domains[Math.floor(Math.random() * domains.length)];
    }
    
    const local = generateRandomString();
    const email = `${local}@${domain}`;
    const password = generateRandomString(12);
    
    // Create account
    const createResponse = await fetch(`${MAILGW_API_URL}/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        address: email,
        password: password
      })
    });
    
    if (!createResponse.ok) {
      throw new Error(`HTTP error: ${createResponse.status}`);
    }
    
    // Get token
    const tokenResponse = await fetch(`${MAILGW_API_URL}/token`, {
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
      throw new Error(`HTTP error: ${tokenResponse.status}`);
    }
    
    const tokenData = await tokenResponse.json();
    return {
      email: email,
      token: tokenData.token
    };
  }
  
  async function getMailGwMessages(token) {
    const response = await fetch(`${MAILGW_API_URL}/messages`, {
      headers: {
        'Authorization': `Bearer ${token}`
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
          'Authorization': `Bearer ${token}`
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
      console.error('MailGwAPI fetch_message error:', error);
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
  // Mail.tm API implementation
  // ==============================
  const MAILTM_API_URL = 'https://api.mail.tm';
  
  async function getMailTmDomains() {
    if (domainsCache.mailtm) {
      return domainsCache.mailtm;
    }
    
    const response = await fetch(`${MAILTM_API_URL}/domains`);
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const data = await response.json();
    const domains = data['hydra:member'].map(d => d.domain);
    
    domainsCache.mailtm = domains;
    return domains;
  }
  
  async function createMailTmAddress(domain = null) {
    if (!domain) {
      // Get available domains
      const domains = await getMailTmDomains();
      if (!domains || domains.length === 0) {
        throw new Error("No domains available");
      }
      domain = domains[Math.floor(Math.random() * domains.length)];
    }
    
    const local = generateRandomString(10);
    const email = `${local}@${domain}`;
    const password = generateRandomString(12);
    
    // Create account
    const payload = { address: email, password };
    const createResponse = await fetch(`${MAILTM_API_URL}/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!createResponse.ok) {
      throw new Error(`HTTP error: ${createResponse.status}`);
    }
    
    // Get token
    const tokenResponse = await fetch(`${MAILTM_API_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!tokenResponse.ok) {
      throw new Error(`HTTP error: ${tokenResponse.status}`);
    }
    
    const tokenData = await tokenResponse.json();
    return {
      email,
      token: tokenData.token
    };
  }
  
  async function getMailTmMessages(token) {
    const response = await fetch(`${MAILTM_API_URL}/messages`, {
      headers: {
        'Authorization': `Bearer ${token}`
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
  
  async function fetchMailTmMessage(token, messageId) {
    try {
      const response = await fetch(`${MAILTM_API_URL}/messages/${messageId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
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
      console.error('MailTmAPI fetch_message error:', error);
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