export const success = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
  });
};

export const error = (res, message, statusCode = 500) => {
  const errorMessage = typeof message === 'string' ? message : message?.message || 'Internal Server Error';
  return res.status(statusCode).json({
    success: false,
    error: errorMessage,
  });
};

export const paginated = (res, data, total, page = 1, limit = 10) => {
  const currentPage = parseInt(page, 10) || 1;
  const currentLimit = parseInt(limit, 10) || 10;
  const totalCount = parseInt(total, 10) || 0;
  const totalPages = Math.ceil(totalCount / currentLimit) || 1;

  return res.status(200).json({
    success: true,
    data,
    pagination: {
      total: totalCount,
      page: currentPage,
      limit: currentLimit,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
    },
  });
};

export default {
  success,
  error,
  paginated,
};
