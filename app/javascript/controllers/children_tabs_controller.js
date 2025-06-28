import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="children-tabs"
export default class extends Controller {
  static targets = ["tabButton", "content", "mobileSelect"]

  connect() {
    this.showActiveTab()
    this.setupKeyboardNavigation()
  }

  switchTab(event) {
    const clickedButton = event.currentTarget
    const childId = clickedButton.dataset.childId
    
    // 新規追加ボタンの場合は何もしない
    if (clickedButton.classList.contains('add-child')) {
      return
    }
    
    // タブボタンのアクティブ状態更新
    this.tabButtonTargets.forEach(button => {
      button.classList.remove("active")
      button.setAttribute("aria-selected", "false")
    })
    clickedButton.classList.add("active")
    clickedButton.setAttribute("aria-selected", "true")
    
    // コンテンツの表示切り替え
    this.contentTargets.forEach(content => {
      content.classList.remove("active")
      content.setAttribute("aria-hidden", "true")
      if (content.dataset.childId === childId) {
        content.classList.add("active")
        content.setAttribute("aria-hidden", "false")
      }
    })
    
    // モバイルセレクトの値も同期
    if (this.hasMobileSelectTarget) {
      this.mobileSelectTarget.value = childId
    }
    
    // URLハッシュを更新（ブラウザの戻る/進むに対応）
    window.history.replaceState(null, null, `#child-${childId}`)
  }

  switchTabMobile(event) {
    const childId = event.target.value
    
    // 対応するタブボタンをクリック
    const targetButton = this.tabButtonTargets.find(button => 
      button.dataset.childId === childId
    )
    
    if (targetButton) {
      targetButton.click()
    }
  }

  setupKeyboardNavigation() {
    this.tabButtonTargets.forEach((button, index) => {
      // ARIA属性の設定
      button.setAttribute("role", "tab")
      button.setAttribute("aria-selected", button.classList.contains('active') ? "true" : "false")
      button.setAttribute("tabindex", button.classList.contains('active') ? "0" : "-1")
      
      // キーボードイベントの追加
      button.addEventListener("keydown", (event) => {
        this.handleKeyDown(event, index)
      })
    })
    
    // コンテンツエリアのARIA属性設定
    this.contentTargets.forEach(content => {
      content.setAttribute("role", "tabpanel")
      content.setAttribute("aria-hidden", content.classList.contains('active') ? "false" : "true")
    })
  }

  handleKeyDown(event, currentIndex) {
    const validButtons = this.tabButtonTargets.filter(btn => !btn.classList.contains('add-child'))
    let targetIndex = currentIndex
    
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault()
        targetIndex = currentIndex > 0 ? currentIndex - 1 : validButtons.length - 1
        break
      case "ArrowRight":
        event.preventDefault()
        targetIndex = currentIndex < validButtons.length - 1 ? currentIndex + 1 : 0
        break
      case "Home":
        event.preventDefault()
        targetIndex = 0
        break
      case "End":
        event.preventDefault()
        targetIndex = validButtons.length - 1
        break
      default:
        return
    }
    
    // 新しいタブにフォーカスして選択
    const targetButton = validButtons[targetIndex]
    if (targetButton) {
      this.focusTab(targetButton)
      targetButton.click()
    }
  }

  focusTab(button) {
    // 全てのタブのtabindexを-1に
    this.tabButtonTargets.forEach(btn => {
      btn.setAttribute("tabindex", "-1")
    })
    
    // アクティブなタブのtabindexを0に
    button.setAttribute("tabindex", "0")
    button.focus()
  }

  showActiveTab() {
    // URLハッシュから初期表示する孫を決定
    const hash = window.location.hash
    let activeChildId = null
    
    if (hash.startsWith('#child-')) {
      activeChildId = hash.replace('#child-', '')
    }
    
    // 指定された孫のタブがない場合は最初のタブを使用
    const validButtons = this.tabButtonTargets.filter(btn => !btn.classList.contains('add-child'))
    if (!activeChildId || !validButtons.find(btn => btn.dataset.childId === activeChildId)) {
      if (validButtons.length > 0) {
        activeChildId = validButtons[0].dataset.childId
      }
    }
    
    if (activeChildId) {
      const targetButton = validButtons.find(button => 
        button.dataset.childId === activeChildId
      )
      
      if (targetButton) {
        targetButton.click()
      }
    }
  }
}
