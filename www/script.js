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
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function startQrScanner() {
    const qrCodeSuccessCallback = (decodedText, decodedResult) => {
        console.log('QR Code Scanned:', decodedText);
        // Remove any spaces and convert URL to Spotify URI if needed:
        const cleanedText = decodedText.replace(/\s/g, '');
        const match = cleanedText.match(/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?track\/([a-zA-Z0-9]+)/);
        if (match && match[1]) {
            const trackUri = `spotify:track:${match[1]}`;
            // Optionally, store it for later or directly start playback:
            window.lastScannedTrackUri = trackUri;
            alert("Track loaded: " + trackUri);
            // You can auto-start playback if desired:
            window.playTrack(trackUri);
        } else {
            console.error("Invalid QR Code scanned: " + cleanedText);
            alert("Invalid Spotify QR Code. Please scan a valid track URL.");
        }
    };

    const qrConfig = { fps: 10, qrbox: 250 };

    // Initialize the HTML5 QR code scanner inside the #qr-reader container:
    const html5QrCode = new Html5Qrcode("qr-reader");
    html5QrCode.start(
        { facingMode: "environment" },
        qrConfig,
        qrCodeSuccessCallback
    ).catch(err => {
        console.error("QR code scanning failed:", err);
    });
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
    sessionStorage.clear();
    localStorage.clear();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    sessionStorage.setItem('code_verifier', codeVerifier);
    
    const authUrl = `${AUTH_URL}?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}&code_challenge_method=S256&code_challenge=${codeChallenge}`;
    window.location.href = authUrl;
}

// === Token Exchange & UI Toggling ===
function toggleUIAfterLogin() {
    document.getElementById('login-area').style.display = 'none';
    document.getElementById('player-area').style.display = 'block';
    startQrScanner();  // Start the QR scanner now that the player area is visible.
}

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
            body
        });
        const data = await response.json();

        if (data.access_token) {
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
            window.history.replaceState({}, document.title, '/');
            toggleUIAfterLogin();
        } else {
            console.error('Invalid token response:', data);
        }
    } catch (error) {
        console.error('Error fetching token:', error);
    }
}

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
        console.error('Error refreshing token:', error);
    }
}

window.onload = () => {
    getToken();
    const token = localStorage.getItem('access_token');
    if (token) {
        toggleUIAfterLogin();
    }
};

setInterval(refreshToken, 30 * 60 * 1000);

// === Spotify Web Playback SDK Integration ===
window.deviceId = null;
window.onSpotifyWebPlaybackSDKReady = () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    
    const player = new Spotify.Player({
        name: 'Web Player',
        getOAuthToken: cb => { cb(token); }
    });
    
    player.addListener('ready', ({ device_id }) => {
        window.deviceId = device_id;
    });
    player.connect();

    window.playTrack = function(trackUri) {
        fetch(`https://api.spotify.com/v1/me/player/play?device_id=${window.deviceId}`, {
            method: 'PUT',
            body: JSON.stringify({ uris: [trackUri] }),
            headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        });
    };

    window.stopPlayback = function() {
        fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${window.deviceId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        });
    };
};

document.addEventListener('swiped-left', () => {
    location.reload();
});

document.addEventListener('DOMContentLoaded', () => {
    const stopButton = document.getElementById('stop-button');
    if (stopButton) {
        stopButton.addEventListener('click', stopPlayback);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const playButton = document.getElementById('start-playback');
    if (playButton) {
        playButton.addEventListener('click', () => {
            if (window.lastScannedTrackUri) {
                window.playTrack(window.lastScannedTrackUri);
            } else {
                alert("No track loaded. Please scan a QR code first.");
            }
        });
    }
});

function detectSwipe(element, callback) {
    let touchStartX = 0;
    let touchEndX = 0;
    let mouseStartX = 0;
    let mouseEndX = 0;
    let isMouseDown = false;

    // Mobile swipe detection
    element.addEventListener('touchstart', event => {
        touchStartX = event.changedTouches[0].screenX;
    });

    element.addEventListener('touchend', event => {
        touchEndX = event.changedTouches[0].screenX;
        if (touchStartX - touchEndX > 50) { // Swiped left
            callback();
        }
    });

    // Desktop swipe detection
    element.addEventListener('mousedown', event => {
        isMouseDown = true;
        mouseStartX = event.screenX;
    });

    element.addEventListener('mouseup', event => {
        if (isMouseDown) {
            mouseEndX = event.screenX;
            if (mouseStartX - mouseEndX > 50) { // Swiped left with mouse
                callback();
            }
        }
        isMouseDown = false;
    });
}

// Attach swipe detection to the whole document
detectSwipe(document, () => {
    location.reload(); // Reload page to scan a new song
});