import { Router } from 'express';
import jwt from 'jsonwebtoken';
import config from './config.js';
import { upsertSession, getSession, setAgeVerified } from './database.js';

const router = Router();

const DISCORD_API = 'https://discord.com/api/v10';
const SCOPES = 'identify guilds';

// Derive base URL from the incoming request
function getBaseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

// Redirect to Discord OAuth2
router.get('/discord', (req, res) => {
  const baseUrl = getBaseUrl(req);
  const params = new URLSearchParams({
    client_id: config.discord.clientId,
    redirect_uri: `${baseUrl}/api/auth/callback`,
    response_type: 'code',
    scope: SCOPES,
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

// OAuth2 callback
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  const baseUrl = getBaseUrl(req);
  if (!code) return res.redirect(`${baseUrl}/login?error=no_code`);

  try {
    // Exchange code for tokens
    const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.discord.clientId,
        client_secret: config.discord.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${baseUrl}/api/auth/callback`,
      }),
    });

    if (!tokenRes.ok) {
      console.error('Token exchange failed:', await tokenRes.text());
      return res.redirect(`${baseUrl}/login?error=token_failed`);
    }

    const tokens = await tokenRes.json();

    // Fetch user info
    const userRes = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userRes.ok) {
      return res.redirect(`${baseUrl}/login?error=user_fetch_failed`);
    }

    const user = await userRes.json();

    // Save session to DB
    upsertSession({
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      globalName: user.global_name,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: Date.now() + tokens.expires_in * 1000,
    });

    // Create JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    // Set as httpOnly cookie and redirect
    res.cookie('token', token, {
      httpOnly: true,
      secure: baseUrl.startsWith('https'),
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(`${baseUrl}/`);
  } catch (err) {
    console.error('OAuth2 callback error:', err);
    res.redirect(`${baseUrl}/login?error=unknown`);
  }
});

// Get current user
router.get('/me', (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const session = getSession(payload.userId);
    if (!session) return res.status(401).json({ error: 'Session not found' });

    res.json({
      id: session.user_id,
      username: session.username,
      discriminator: session.discriminator,
      avatar: session.avatar,
      globalName: session.global_name,
      ageVerified: !!session.age_verified,
    });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Age verification
router.post('/age-verify', (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    setAgeVerified(payload.userId);
    res.json({ success: true });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

// Refresh Discord token helper (used internally)
export async function refreshDiscordToken(userId) {
  const session = getSession(userId);
  if (!session?.refresh_token) return null;

  const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.discord.clientId,
      client_secret: config.discord.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: session.refresh_token,
    }),
  });

  if (!tokenRes.ok) return null;

  const tokens = await tokenRes.json();
  upsertSession({
    id: userId,
    username: session.username,
    discriminator: session.discriminator,
    avatar: session.avatar,
    globalName: session.global_name,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    tokenExpiresAt: Date.now() + tokens.expires_in * 1000,
  });

  return tokens.access_token;
}

export default router;
