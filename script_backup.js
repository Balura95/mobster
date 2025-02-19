const CLIENT_ID = '85528d9ddff344ebba781615c218d339';
const REDIRECT_URI = 'http://127.0.0.1:5500/'; // Stelle sicher, dass dieser in Spotify exakt so hinterlegt ist
const SCOPES = 'user-read-playback-state user-modify-playback-state streaming user-read-email user-read-private';
const AUTH_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';


document.addEventListener('DOMContentLoaded', () => {
    const loginButton = document.getElementById('spotify-login');
    if (loginButton) {
        loginButton.addEventListener('click', authenticateSpotify);
    }
});

// Funktion zum Generieren eines zufälligen Code Verifier für PKCE
function generateCodeVerifier() {
    let array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, array))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Funktion zum Hashen des Code Verifier für den Code Challenge
function base64URLEncode(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return base64URLEncode(digest);
}

// Authentifizierungsprozess starten
async function authenticateSpotify() {
    const codeVerifier = generateCodeVerifier();
    console.log('Generated Code Verifier:', codeVerifier); // Debugging
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    
    // Store code_verifier in sessionStorage instead of localStorage:
    sessionStorage.setItem('code_verifier', codeVerifier);
   
    const authUrl = `${AUTH_URL}?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}&code_challenge_method=S256&code_challenge=${codeChallenge}`;
    
    window.location.href = authUrl;
}

// Token mit dem Code abrufen
function toggleUIAfterLogin() {
    document.getElementById('login-area').style.display = 'none';
    document.getElementById('player-area').style.display = 'block';
}

async function getToken() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    // Retrieve from sessionStorage, not localStorage:
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
            body
        });
        const data = await response.json();

        if (data.access_token) {
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
            window.history.replaceState({}, document.title, '/'); // Remove query parameters
            toggleUIAfterLogin(); // Update UI after successful login
        } else {
            console.error('Token-Antwort ungültig:', data);
        }
    } catch (error) {
        console.error('Fehler beim Token-Abruf:', error);
    }
}

// Check authentication state on page load
window.onload = () => {
    getToken();
    const token = localStorage.getItem('access_token');
    if (token) {
        toggleUIAfterLogin(); // If user is already logged in, show the player area
    }
};

// Token automatisch erneuern
async function refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return;

    const body = new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
    });

    try {
        const response = await fetch(TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body
        });
        const data = await response.json();

        if (data.access_token) {
            localStorage.setItem('access_token', data.access_token);
        }
    } catch (error) {
        console.error('Fehler beim Erneuern des Tokens:', error);
    }
}

// Spotify Web Playback SDK initialisieren
window.onSpotifyWebPlaybackSDKReady = () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const player = new Spotify.Player({
        name: 'Web Player',
        getOAuthToken: cb => { cb(token); }
    });

    player.addListener('ready', ({ device_id }) => {
        console.log('Gerät bereit:', device_id);
    });

    player.addListener('not_ready', ({ device_id }) => {
        console.log('Gerät nicht bereit:', device_id);
    });

    player.addListener('authentication_error', ({ message }) => {
        console.error('Authentifizierungsfehler:', message);
    });

    player.connect();
};

// Automatische Token-Erneuerung alle 30 Minuten
setInterval(refreshToken, 30 * 60 * 1000);

// Prüfe auf Token-Abruf beim Laden der Seite
window.onload = getToken;
