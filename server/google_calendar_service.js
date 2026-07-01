import pool from './db.js';

/**
 * Get Client ID and Secret for Google OAuth.
 * Prioritizes values set in user's record, falls back to server env.
 */
export async function getGoogleClientCredentials(userId) {
    let clientId = process.env.GOOGLE_CLIENT_ID || '';
    let clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    
    if (userId) {
        try {
            const res = await pool.query(
                "SELECT google_client_id, google_client_secret FROM public.users WHERE id = $1",
                [userId]
            );
            if (res.rows.length > 0) {
                const u = res.rows[0];
                if (u.google_client_id) clientId = u.google_client_id.trim();
                if (u.google_client_secret) clientSecret = u.google_client_secret.trim();
            }
        } catch (e) {
            console.error("[Google Service] Error getting user credentials:", e.message);
        }
    }
    return { clientId, clientSecret };
}

/**
 * Exchange auth code for tokens.
 */
export async function exchangeCodeForTokens(code, redirectUri, credentials) {
    const { clientId, clientSecret } = credentials;
    if (!clientId || !clientSecret) {
        throw new Error("Google Client ID or Client Secret is not configured.");
    }

    console.log("[Google Service] Exchanging code for tokens...");
    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code"
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Google token exchange error: ${errText}`);
    }

    const tokens = await response.json();
    return tokens; // contains access_token, refresh_token, expires_in, scope
}

/**
 * Refresh access token if expired.
 */
export async function refreshAccessToken(userId, credentials) {
    // 1. Fetch tokens
    const tokenRes = await pool.query(
        "SELECT google_access_token, google_refresh_token, google_token_expiry FROM public.users WHERE id = $1",
        [userId]
    );
    if (tokenRes.rows.length === 0) {
        throw new Error("User record not found");
    }

    const { google_access_token, google_refresh_token, google_token_expiry } = tokenRes.rows[0];
    if (!google_refresh_token) {
        throw new Error("Google Calendar integration is not connected for this user (missing refresh token).");
    }

    const now = new Date();
    // Refresh token if it's expired or expires in less than 5 minutes
    if (google_access_token && google_token_expiry && new Date(google_token_expiry).getTime() - now.getTime() > 5 * 60 * 1000) {
        console.log("[Google Service] Access token is still valid.");
        return google_access_token;
    }

    const { clientId, clientSecret } = credentials;
    if (!clientId || !clientSecret) {
        throw new Error("Google Client ID or Client Secret is not configured.");
    }

    console.log("[Google Service] Access token expired or close to expiry. Refreshing...");
    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: google_refresh_token,
            grant_type: "refresh_token"
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Google token refresh error: ${errText}`);
    }

    const data = await response.json();
    const expiryDate = new Date(Date.now() + data.expires_in * 1000);

    // Save back to db
    await pool.query(
        `UPDATE public.users 
         SET google_access_token = $1, google_token_expiry = $2 
         WHERE id = $3`,
        [data.access_token, expiryDate.toISOString(), userId]
    );

    console.log("[Google Service] Access token refreshed successfully.");
    return data.access_token;
}

/**
 * Create a Google Calendar Event and generate a unique Google Meet link.
 */
export async function createGoogleCalendarEvent(userId, bookingData) {
    console.log(`[Google Service] Creating calendar event for ${bookingData.name}...`);
    
    // 1. Fetch user credentials (custom or env)
    const credentials = await getGoogleClientCredentials(userId);

    // 2. Refresh/get valid access token
    const accessToken = await refreshAccessToken(userId, credentials);

    // 3. Create the Google Calendar Event with Meet conferenceData enabled
    const startDateTime = new Date(bookingData.start);
    const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000); // 30 minutes duration

    const payload = {
        summary: `Strategy Meeting with ${bookingData.name}`,
        description: `Strategy session booked automatically by Aria. Phone: ${bookingData.phone || 'N/A'}. Email: ${bookingData.email || 'N/A'}`,
        start: {
            dateTime: startDateTime.toISOString(),
            timeZone: 'Asia/Kolkata'
        },
        end: {
            dateTime: endDateTime.toISOString(),
            timeZone: 'Asia/Kolkata'
        },
        attendees: bookingData.email ? [{ email: bookingData.email }] : [],
        conferenceData: {
            createRequest: {
                requestId: `Eleveto-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                conferenceSolutionKey: {
                    type: "hangoutsMeet"
                }
            }
        }
    };

    const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1";
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Google Calendar API Error: ${errText}`);
    }

    const event = await response.json();
    console.log(`[Google Service] Event created: ${event.htmlLink}`);

    // Extract the Google Meet link from the entry points
    let meetLink = '';
    if (event.conferenceData && event.conferenceData.entryPoints) {
        const videoEntryPoint = event.conferenceData.entryPoints.find(ep => ep.entryPointType === 'video');
        if (videoEntryPoint) {
            meetLink = videoEntryPoint.uri;
            console.log(`[Google Service] Successfully generated unique Google Meet link: ${meetLink}`);
        }
    }

    if (!meetLink) {
        // Fallback if somehow Meet link is not generated
        meetLink = event.htmlLink || '';
        console.warn(`[Google Service] Google Meet link not found, using calendar event link: ${meetLink}`);
    }

    return {
        id: event.id,
        meetLink: meetLink
    };
}
