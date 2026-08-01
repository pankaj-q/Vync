const isProd = process.env.NODE_ENV === 'production';

const errorHandler = (err, req, res, next) => {
    if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
        return res.status(400).json({ message: "Invalid JSON payload" });
    }

    const statusCode = err.statusCode || 500;

    if (statusCode >= 500) {
        console.error("Error:", err.stack || err.message);
        return res.status(500).json({ message: "Internal server error" });
    }

    res.status(statusCode).json({ message: err.message });
};

export default errorHandler;