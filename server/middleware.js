import jwt from 'jsonwebtoken';
import config from './config.js';
import { getSession } from './database.js';

export function authenticateJWT(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const session = getSession(payload.userId);
    if (!session) return res.status(401).json({ error: 'Session not found' });

    req.user = {
      id: session.user_id,
      username: session.username,
      avatar: session.avatar,
      globalName: session.global_name,
      ageVerified: !!session.age_verified,
      accessToken: session.access_token,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireAgeVerification(req, res, next) {
  if (!req.user?.ageVerified) {
    return res.status(403).json({ error: 'Age verification required' });
  }
  next();
}

// Socket.io auth middleware
export function authenticateSocket(socket, next) {
  const token = socket.handshake.auth?.token || parseCookie(socket.handshake.headers.cookie, 'token');
  if (!token) return next(new Error('Not authenticated'));

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const session = getSession(payload.userId);
    if (!session) return next(new Error('Session not found'));

    socket.user = {
      id: session.user_id,
      username: session.username,
      avatar: session.avatar,
      globalName: session.global_name,
      ageVerified: !!session.age_verified,
    };
    next();
  } catch {
    next(new Error('Invalid token'));
  }
}

function parseCookie(cookieStr, name) {
  if (!cookieStr) return null;
  const match = cookieStr.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : null;
}
