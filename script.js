// === Spotify Authentication & PKCE Setup ===
const CLIENT_ID = '85528d9ddff344ebba781615c218d339';
const REDIRECT_URI = 'https://balura95.github.io'; // Must match exactly in your Spotify Developer Dashboard
const SCOPES = 'user-read-playback-state user-modify-playback-state streaming user-read-email user-read-private';
const AUTH_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';

// Attach event listener for the login button after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const loginButton = document.getElementById('spotify-login');
  if (loginButton) {
    loginButton.addEventListener('click', authenticateSpotify);
  }
});

// Generate a code verifier (random string) for PKCE
function generateCodeVerifier() {
  const randomBytes = new Uint8Array(32);
  window.crypto.getRandomValues(randomBytes);
  return base64URLEncode(randomBytes);
}

// Helper: Base64 URL-encode a buffer
function base64URLEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Generate the code challenge from the code verifier
async function generateCodeChallenge(verifier) {
  if (!verifier) {
    console.error('Error: Code verifier is missing.');
    return;
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  try {
    const digest = await crypto.subtle.digest('SHA-256', data);
    return base64URLEncode(digest);
  } catch (error) {
    console.error('Error generating code challenge:', error);
  }
}

// Start the Spotify authentication process
async function authenticateSpotify() {
  // Clear any previous data
  sessionStorage.clear();
  localStorage.clear();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  sessionStorage.setItem('code_verifier', codeVerifier);

  const authUrl = `${AUTH_URL}?client_id=${CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&code_challenge_method=S256` +
    `&code_challenge=${codeChallenge}`;
    
  window.location.href = authUrl;
}

// === Token Exchange ===
// This function exchanges the authorization code for tokens.
// Upon success, it stores the tokens and then redirects to player.html.
async function getToken() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const codeVerifier = sessionStorage.getItem('code_verifier');
  if (!code || !codeVerifier) return;
  
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier
  });
  
  try {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body // Alternativ: body.toString()
    });
    const data = await response.json();
    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      // Clear the URL query parameters for a cleaner URL.
      window.history.replaceState({}, document.title, '/');
      // Redirect to the player page
      window.location.href = 'player.html';
    } else {
      console.error('Invalid token response:', data);
    }
  } catch (error) {
    console.error('Error fetching token:', error);
  }
}

// Refresh token (if needed)
async function refreshToken() {
  const refreshTokenVal = localStorage.getItem('refresh_token');
  if (!refreshTokenVal) return;
  
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: refreshTokenVal
  });
  
  try {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body // Alternativ: body.toString()
    });
    const data = await response.json();
    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token);
      console.log('Access Token wurde erfolgreich erneuert.');
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
  }
}

// On page load, try to exchange the code for a token.
// If a token already exists, redirect immediately.
window.onload = () => {
  getToken();
  if (localStorage.getItem('access_token')) {
    window.location.href = 'player.html';
  }
};

setInterval(refreshToken, 30 * 60 * 1000);
