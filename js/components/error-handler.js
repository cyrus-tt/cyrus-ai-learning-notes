/**
 * error-handler.js - 全局错误处理器
 *
 * 功能：
 * 1. 统一的错误提示（Toast 替代 alert）
 * 2. API 错误处理
 * 3. 网络错误处理
 */

class ErrorHandler {
  static toastContainer = null;

  static init() {
    if (!this.toastContainer) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.className = 'toast-container';
      this.toastContainer.setAttribute('aria-live', 'polite');
      this.toastContainer.setAttribute('aria-atomic', 'true');
      document.body.appendChild(this.toastContainer);
    }
  }

  /**
   * 显示 Toast 提示
   * @param {string} message - 提示消息
   * @param {string} type - 类型：success, error, warning, info
   * @param {number} duration - 显示时长（毫秒）
   */
  static show(message, type = 'error', duration = 3000) {
    this.init();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icon = this.getIcon(type);
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${this.escapeHtml(message)}</span>
    `;

    this.toastContainer.appendChild(toast);

    // 动画进入
    requestAnimationFrame(() => {
      toast.classList.add('toast-show');
    });

    // 自动移除
    setTimeout(() => {
      toast.classList.remove('toast-show');
      setTimeout(() => toast.remove(), 300);
    }, duration);

    return toast;
  }

  static getIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || icons.info;
  }

  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 处理 API 错误
   */
  static handleApiError(error, context = '') {
    console.error(`[API Error${context ? ' - ' + context : ''}]`, error);

    let message = '网络请求失败，请稍后重试';

    if (error.message) {
      if (error.message.includes('Failed to fetch')) {
        message = '网络连接失败，请检查网络';
      } else if (error.message.includes('timeout')) {
        message = '请求超时，请稍后重试';
      }
    }

    this.show(message, 'error');
  }

  /**
   * 处理认证错误
   */
  static handleAuthError(error) {
    console.error('[Auth Error]', error);
    this.show('登录失败，请稍后再试', 'error');
  }

  /**
   * 成功提示
   */
  static success(message) {
    this.show(message, 'success');
  }

  /**
   * 警告提示
   */
  static warning(message) {
    this.show(message, 'warning');
  }

  /**
   * 信息提示
   */
  static info(message) {
    this.show(message, 'info');
  }
}

// 导出到全局
window.ErrorHandler = ErrorHandler;
