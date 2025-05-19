// まごころおくりもの アプリ共通スクリプト

document.addEventListener('DOMContentLoaded', function() {
  // トグルメニュー（モバイル用）
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  
  if (menuToggle) {
    menuToggle.addEventListener('click', function() {
      navLinks.classList.toggle('active');
    });
  }

  // ほしいものリスト関連の機能
  setupWishlistButtons();
  
  // 写真アップロード関連の機能
  setupPhotoUpload();
  
  // フォームバリデーション
  setupFormValidation();
});

// ほしいものリスト関連のボタン設定
function setupWishlistButtons() {
  // 購入ボタンのクリックイベント
  const purchaseButtons = document.querySelectorAll('.btn-purchase');
  if (purchaseButtons) {
    purchaseButtons.forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        const itemId = this.dataset.itemId;
        
        // モックアップなので実際の購入処理は行わずに表示を変更するだけ
        this.textContent = '購入手続き中...';
        
        // 購入確認モーダルを表示する（実際のアプリ開発時に実装）
        showModal(`商品ID: ${itemId}の購入手続きを行います。こちらは外部サイトに移動します。`);
        
        // 外部サイトへのリンクを開く代わりにモックではアラートを表示
        setTimeout(() => {
          this.textContent = '購入済み';
          this.classList.remove('btn-primary');
          this.classList.add('btn-secondary');
          this.disabled = true;
          
          // 親に購入通知を送る（実際のアプリでは非同期処理で行う）
          showAlert('購入操作が完了しました。孫の親に通知されました。', 'success');
        }, 1500);
      });
    });
  }
  
  // 編集ボタンのクリックイベント
  const editButtons = document.querySelectorAll('.btn-edit-item');
  if (editButtons) {
    editButtons.forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        const itemId = this.dataset.itemId;
        showModal(`商品ID: ${itemId}の編集画面に移動します。（モックアップのため機能しません）`);
      });
    });
  }
  
  // 削除ボタンのクリックイベント
  const deleteButtons = document.querySelectorAll('.btn-delete-item');
  if (deleteButtons) {
    deleteButtons.forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        const itemId = this.dataset.itemId;
        
        if (confirm('本当にこのアイテムを削除しますか？')) {
          // モックアップなので実際の削除は行わずに要素を非表示にするだけ
          const itemElement = this.closest('.item-card');
          itemElement.style.opacity = '0';
          setTimeout(() => {
            itemElement.remove();
            showAlert('アイテムが削除されました。', 'success');
          }, 300);
        }
      });
    });
  }
}

// 写真アップロード関連の設定
function setupPhotoUpload() {
  const photoUploadForm = document.getElementById('photo-upload-form');
  const photoPreview = document.getElementById('photo-preview');
  const fileInput = document.querySelector('input[type="file"]');
  
  if (fileInput) {
    fileInput.addEventListener('change', function(e) {
      if (this.files && this.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
          if (photoPreview) {
            photoPreview.src = e.target.result;
            photoPreview.style.display = 'block';
          }
        }
        
        reader.readAsDataURL(this.files[0]);
      }
    });
  }
  
  if (photoUploadForm) {
    photoUploadForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // モックアップなので実際のアップロードは行わない
      showAlert('写真がアップロードされました（モックアップのため実際には保存されていません）', 'success');
      
      // 写真の一覧に新しい写真を追加するモック処理
      if (photoPreview && photoPreview.src) {
        const photoGrid = document.querySelector('.photo-grid');
        if (photoGrid) {
          const newPhotoItem = document.createElement('div');
          newPhotoItem.className = 'photo-item';
          
          const newImg = document.createElement('img');
          newImg.src = photoPreview.src;
          newImg.alt = '孫の写真';
          
          const photoActions = document.createElement('div');
          photoActions.className = 'photo-actions';
          
          const deleteBtn = document.createElement('button');
          deleteBtn.textContent = '削除';
          deleteBtn.className = 'btn-delete-photo';
          
          photoActions.appendChild(deleteBtn);
          newPhotoItem.appendChild(newImg);
          newPhotoItem.appendChild(photoActions);
          
          photoGrid.appendChild(newPhotoItem);
          
          // 削除ボタンにイベントリスナーを追加
          deleteBtn.addEventListener('click', function() {
            if (confirm('この写真を削除しますか？')) {
              newPhotoItem.remove();
              showAlert('写真が削除されました。', 'success');
            }
          });
        }
      }
      
      // フォームをリセット
      this.reset();
      if (photoPreview) {
        photoPreview.src = '';
        photoPreview.style.display = 'none';
      }
    });
  }
  
  // 写真削除ボタンのイベントリスナー
  const deletePhotoButtons = document.querySelectorAll('.btn-delete-photo');
  if (deletePhotoButtons) {
    deletePhotoButtons.forEach(button => {
      button.addEventListener('click', function() {
        if (confirm('この写真を削除しますか？')) {
          const photoItem = this.closest('.photo-item');
          photoItem.remove();
          showAlert('写真が削除されました。', 'success');
        }
      });
    });
  }
}

// フォームバリデーション
function setupFormValidation() {
  const forms = document.querySelectorAll('form[data-validate="true"]');
  
  if (forms) {
    forms.forEach(form => {
      form.addEventListener('submit', function(e) {
        let isValid = true;
        
        // 必須フィールドのチェック
        const requiredFields = form.querySelectorAll('[required]');
        requiredFields.forEach(field => {
          if (!field.value.trim()) {
            isValid = false;
            field.classList.add('is-invalid');
            
            // エラーメッセージがない場合は追加
            let errorMsg = field.nextElementSibling;
            if (!errorMsg || !errorMsg.classList.contains('error-message')) {
              errorMsg = document.createElement('div');
              errorMsg.className = 'error-message';
              errorMsg.textContent = 'このフィールドは必須です';
              field.parentNode.insertBefore(errorMsg, field.nextSibling);
            }
          } else {
            field.classList.remove('is-invalid');
            
            // エラーメッセージを削除
            const errorMsg = field.nextElementSibling;
            if (errorMsg && errorMsg.classList.contains('error-message')) {
              errorMsg.remove();
            }
          }
        });
        
        // バリデーションエラーがある場合は送信をキャンセル
        if (!isValid) {
          e.preventDefault();
          showAlert('入力エラーがあります。必須フィールドを確認してください。', 'danger');
        } else if (form.id === 'login-form' || form.id === 'register-form') {
          // ログインフォームと登録フォームは実際にはサーバーに送信されるが、
          // モックアップではリダイレクトを模倣する
          e.preventDefault();
          showAlert('処理中...', 'success');
          
          // ユーザータイプに基づいて適切なダッシュボードにリダイレクト
          setTimeout(() => {
            if (form.id === 'login-form') {
              const email = document.getElementById('email').value.toLowerCase();
              
              // メールアドレスに基づいてユーザータイプを判断（実際のシステムではサーバー側で処理）
              if (email.includes('admin')) {
                window.location.href = 'admin-dashboard.html';
              } else if (email.includes('grandparent') || email.includes('ojiichan') || email.includes('obaachan')) {
                window.location.href = 'grandparent-dashboard.html';
              } else {
                window.location.href = 'parent-dashboard.html';
              }
            } else {
              // 登録フォームの場合は親ダッシュボードに移動
              window.location.href = 'parent-dashboard.html';
            }
          }, 1500);
        }
      });
    });
  }
}

// アラートメッセージを表示する関数
function showAlert(message, type = 'info') {
  const alertsContainer = document.getElementById('alerts-container');
  if (!alertsContainer) {
    // アラートコンテナがない場合は作成
    const container = document.createElement('div');
    container.id = 'alerts-container';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '1000';
    document.body.appendChild(container);
  }
  
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  
  // 閉じるボタン
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'close';
  closeBtn.innerHTML = '&times;';
  closeBtn.style.marginLeft = '10px';
  closeBtn.style.float = 'right';
  closeBtn.addEventListener('click', function() {
    alert.remove();
  });
  
  alert.appendChild(closeBtn);
  document.getElementById('alerts-container').appendChild(alert);
  
  // 5秒後に自動的に消える
  setTimeout(() => {
    alert.remove();
  }, 5000);
}

// 簡易モーダルを表示する関数
function showModal(content) {
  // すでにモーダルがある場合は削除
  const existingModal = document.querySelector('.modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // モーダル要素を作成
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '2000';
  
  // モーダルコンテンツ
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';
  modalContent.style.backgroundColor = 'white';
  modalContent.style.padding = '30px';
  modalContent.style.borderRadius = '8px';
  modalContent.style.maxWidth = '500px';
  modalContent.style.width = '90%';
  modalContent.style.position = 'relative';
  
  // 閉じるボタン
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.innerHTML = '&times;';
  closeBtn.style.position = 'absolute';
  closeBtn.style.top = '10px';
  closeBtn.style.right = '15px';
  closeBtn.style.fontSize = '24px';
  closeBtn.style.background = 'none';
  closeBtn.style.border = 'none';
  closeBtn.style.cursor = 'pointer';
  
  // コンテンツをモーダルに追加
  modalContent.innerHTML += content;
  modalContent.appendChild(closeBtn);
  modal.appendChild(modalContent);
  
  // 閉じるイベント
  closeBtn.addEventListener('click', function() {
    modal.remove();
  });
  
  // 背景クリックでも閉じる
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  // モーダルをDOMに追加
  document.body.appendChild(modal);
}
