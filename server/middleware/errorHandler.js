const errorHandler = (err, req, res, next) => {
  console.error('SERVER ERROR:', err);

  const statusCode = res.statusCode !== 200 ? res.statusCode : (err.statusCode || 500);

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;
