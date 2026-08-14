import api from './api';

export const reviewService = {
  // Lấy reviews theo sản phẩm (public — không cần auth)
  getProductReviews: async (productId, params = {}) => {
    const response = await api.get(`/reviews/product/${productId}`, { params });
    return response.data;
  },

  // Tạo review mới (cần auth — backend yêu cầu user đã mua + status = delivered)
  createReview: async ({ product_id, comment, rating }) => {
    const response = await api.post('/reviews', { product_id, comment, rating });
    return response.data;
  },

  // Cập nhật review của chính user
  updateReview: async (id, { comment, rating }) => {
    const response = await api.put(`/reviews/${id}`, { comment, rating });
    return response.data;
  },

  // Xoá review (admin có thể xoá bất kỳ, user chỉ xoá của mình)
  deleteReview: async (id) => {
    const response = await api.delete(`/reviews/${id}`);
    return response.data;
  }
};

export default reviewService;