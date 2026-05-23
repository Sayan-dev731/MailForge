import jwt from "jsonwebtoken";

export const JWT_SECRET =
    process.env.JWT_SECRET || "your_jwt_secret_change_this";

export function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Access denied. No token provided.",
        });
    }

    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        res.status(403).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
}

// SSE-friendly auth: EventSource cannot set headers, so allow `?token=` query string.
export function authenticateSSE(req, res, next) {
    const headerToken = req.headers["authorization"]?.split(" ")[1];
    const token = headerToken || req.query.token;

    if (!token) {
        return res.status(401).end("Unauthorized: no token");
    }

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        return res.status(403).end("Unauthorized: invalid token");
    }
}
