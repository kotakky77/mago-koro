// まごころおくりもの アプリケーション JavaScript

document.addEventListener('DOMContentLoaded', function() {
  // ハンバーガーメニューの制御
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', function() {
      navLinks.classList.toggle('active');
      
      // アリア属性の更新（アクセシビリティ）
      const isExpanded = navLinks.classList.contains('active');
      menuToggle.setAttribute('aria-expanded', isExpanded);
    });
    
    // メニュー外をクリックした時にメニューを閉じる
    document.addEventListener('click', function(event) {
      if (!menuToggle.contains(event.target) && !navLinks.contains(event.target)) {
        navLinks.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
  
  // ログアウトボタンの確認ダイアログをより親しみやすく
  const logoutButtons = document.querySelectorAll('.logout-button');
  logoutButtons.forEach(button => {
    button.addEventListener('click', function(event) {
      const confirmMessage = 'ログアウトしますか？\n\n※保存されていない変更は失われます。';
      if (!confirm(confirmMessage)) {
        event.preventDefault();
      }
    });
  });
  
  // ナビゲーションリンクのアクティブ状態の管理
  const currentPath = window.location.pathname;
  const navLinkElements = document.querySelectorAll('.nav-links a');
  
  navLinkElements.forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('current-page');
    }
  });
});

// フラッシュメッセージの自動非表示
document.addEventListener('DOMContentLoaded', function() {
  const alerts = document.querySelectorAll('.alert');
  alerts.forEach(alert => {
    // 5秒後に自動的にフラッシュメッセージを非表示にする
    setTimeout(() => {
      alert.style.opacity = '0';
      setTimeout(() => {
        alert.remove();
      }, 300);
    }, 5000);
    
    // クリックで手動で閉じることも可能
    alert.addEventListener('click', function() {
      this.style.opacity = '0';
      setTimeout(() => {
        this.remove();
      }, 300);
    });
  });
});
