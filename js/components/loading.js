/**
 * loading.js - Loading 状态管理
 *
 * 功能：
 * 1. 全局 Loading 遮罩
 * 2. 局部 Loading 状态
 * 3. 骨架屏支持
 */

class LoadingManager {
  static activeLoaders = new Set();

  /**
   * 显示全局 Loading
   */
  static showGlobal(message = '加载中...') {
    let overlay = document.querySelector('.loading-overlay');

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'loading-overlay';
      overlay.innerHTML = `
        <div class="loading-spinner">
          <div class="spinner"></div>
          <p class="loading-message">${message}</p>
        </div>
      `;
      document.body.appendChild(overlay);
    } else {
      overlay.querySelector('.loading-message').textContent = message;
    }

    requestAnimationFrame(() => {
      overlay.classList.add('loading-show');
    });

    return overlay;
  }

  /**
   * 隐藏全局 Loading
   */
  static hideGlobal() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
      overlay.classList.remove('loading-show');
      setTimeout(() => overlay.remove(), 300);
    }
  }

  /**
   * 显示局部 Loading
   * @param {HTMLElement} target - 目标元素
   * @param {string} size - 尺寸：small, medium, large
   */
  static show(target, size = 'medium') {
    if (!target) return null;

    const loader = document.createElement('div');
    loader.className = `loading-local loading-${size}`;
    loader.innerHTML = '<div class="spinner"></div>';

    // 保存原始内容
    loader.dataset.originalContent = target.innerHTML;

    target.classList.add('loading-active');
    target.appendChild(loader);

    this.activeLoaders.add(loader);

    return loader;
  }

  /**
   * 隐藏局部 Loading
   */
  static hide(loader) {
    if (!loader) return;

    loader.classList.add('loading-hide');

    setTimeout(() => {
      const target = loader.parentElement;
      if (target) {
        target.classList.remove('loading-active');
      }
      loader.remove();
      this.activeLoaders.delete(loader);
    }, 200);
  }

  /**
   * 显示骨架屏
   * @param {HTMLElement} target - 目标元素
   * @param {string} type - 类型：card, list, text
   */
  static showSkeleton(target, type = 'card') {
    if (!target) return null;

    const skeleton = document.createElement('div');
    skeleton.className = `skeleton skeleton-${type}`;

    if (type === 'card') {
      skeleton.innerHTML = `
        <div class="skeleton-image"></div>
        <div class="skeleton-text"></div>
        <div class="skeleton-text short"></div>
      `;
    } else if (type === 'list') {
      skeleton.innerHTML = Array(5).fill(`
        <div class="skeleton-item">
          <div class="skeleton-text"></div>
          <div class="skeleton-text short"></div>
        </div>
      `).join('');
    } else {
      skeleton.innerHTML = `
        <div class="skeleton-text"></div>
        <div class="skeleton-text"></div>
        <div class="skeleton-text short"></div>
      `;
    }

    target.innerHTML = '';
    target.appendChild(skeleton);

    return skeleton;
  }

  /**
   * 隐藏骨架屏
   */
  static hideSkeleton(skeleton) {
    if (!skeleton) return;
    skeleton.remove();
  }

  /**
   * 清理所有 Loading
   */
  static clearAll() {
    this.hideGlobal();
    this.activeLoaders.forEach(loader => this.hide(loader));
  }
}

// 导出到全局
window.LoadingManager = LoadingManager;

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
  LoadingManager.clearAll();
});
