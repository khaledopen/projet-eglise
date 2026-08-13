const jwt = require('jsonwebtoken');

// Middleware d'authentification globale
const authentifier = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Accès refusé. Aucun jeton fourni.' });
  }

  try {
    const decodé = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decodé;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Jeton invalide ou expiré.' });
  }
};

// Middleware d'autorisation par rôles
const autoriser = (rolesAutorises) => {
  return (req, res, next) => {
    if (!req.user || !rolesAutorises.includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès refusé. Rôle insuffisant.' });
    }
    next();
  };
};

module.exports = {
  authentifier,
  autoriser,
};
