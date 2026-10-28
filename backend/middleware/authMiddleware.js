const jwt = require('jsonwebtoken')

const authMiddleware = (req, res, next) => {
  try {
    // Read the Authorization header
    const authHeader = req.headers.authorization

    // Check whether a Bearer token was provided
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Please log in.'
      })
    }

    // Extract the token
    const token = authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is missing.'
      })
    }

    // Verify the token using the secret from .env
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Attach the verified student's information to the request
    req.student = {
      id: decoded.id,
      email: decoded.email
    }

    // Continue to the protected route
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please log in again.'
    })
  }
}

module.exports = authMiddleware
