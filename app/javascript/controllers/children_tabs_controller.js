import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="children-tabs"
export default class extends Controller {
  static targets = ["tabButton", "content", "mobileSelect"]

  connect() {
    console.log("🚀 STIMULUS CONTROLLER CONNECTED!")
    console.log("📊 Number of tab buttons:", this.tabButtonTargets.length)
    console.log("📄 Number of content areas:", this.contentTargets.length)
    console.log("🔧 Element:", this.element)
    
    // DOM内のdata-children-tabs-target="content"を手動で検索
    const manualContentSearch = this.element.querySelectorAll('[data-children-tabs-target="content"]')
    console.log("🔍 Manual search for content targets:", manualContentSearch.length)
    manualContentSearch.forEach((content, index) => {
      console.log(`Manual content ${index}:`, {
        element: content,
        childId: content.dataset.childId,
        hasTarget: content.hasAttribute('data-children-tabs-target')
      })
    })
    
    // 各タブボタンの詳細を出力
    this.tabButtonTargets.forEach((button, index) => {
      console.log(`🏷️ Tab ${index}:`, {
        element: button,
        childId: button.dataset.childId,
        classes: button.className,
        hasAddChildClass: button.classList.contains('add-child'),
        hasDataAction: button.hasAttribute('data-action')
      })
    })
    
    this.showActiveTab()
    this.setupKeyboardNavigation()
  }

  switchTab(event) {
    console.log("🔥 SWITCH TAB CALLED - Child ID:", event.currentTarget.dataset.childId)
    
    try {
      const clickedButton = event.currentTarget
      const childId = clickedButton.dataset.childId
      
      console.log("📋 All contentTargets found:", this.contentTargets.length)
      this.contentTargets.forEach((content, index) => {
        console.log(`Content ${index}:`, {
          element: content,
          childId: content.dataset.childId,
          hasActiveClass: content.classList.contains('active'),
          display: getComputedStyle(content).display
        })
      })
      
      // 新規追加ボタンの場合は何もしない
      if (clickedButton.classList.contains('add-child')) {
        console.log("Add child button clicked, returning")
        return
      }
      
      console.log("Processing tab switch for child:", childId)
      
      // タブボタンのアクティブ状態更新
      this.tabButtonTargets.forEach(button => {
        button.classList.remove("active")
        button.setAttribute("aria-selected", "false")
      })
      clickedButton.classList.add("active")
      clickedButton.setAttribute("aria-selected", "true")
      
      console.log("🔄 Starting content switch...")
      // コンテンツの表示切り替え
      this.contentTargets.forEach(content => {
        console.log(`Checking content with childId: ${content.dataset.childId} vs ${childId}`)
        content.classList.remove("active")
        content.setAttribute("aria-hidden", "true")
        if (content.dataset.childId === childId) {
          console.log("✅ Showing content for child:", childId)
          content.classList.add("active")
          content.setAttribute("aria-hidden", "false")
        } else {
          console.log("❌ Hiding content for child:", content.dataset.childId)
        }
      })
      
      // モバイルセレクトの値も同期
      if (this.hasMobileSelectTarget) {
        this.mobileSelectTarget.value = childId
      }
      
      // URLハッシュを更新（ブラウザの戻る/進むに対応）
      window.history.replaceState(null, null, `#child-${childId}`)
      
      console.log("✅ Tab switch completed successfully")
    } catch (error) {
      console.error("❌ Error in switchTab:", error)
    }
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
    console.log("🎯 SHOW ACTIVE TAB CALLED")
    try {
      // URLハッシュから初期表示する孫を決定
      const hash = window.location.hash
      let activeChildId = null
      
      if (hash.startsWith('#child-')) {
        activeChildId = hash.replace('#child-', '')
      }
      
      // 指定された孫のタブがない場合は最初のタブを使用
      const validButtons = this.tabButtonTargets.filter(btn => !btn.classList.contains('add-child'))
      console.log("Valid buttons found:", validButtons.length)
      
      if (!activeChildId || !validButtons.find(btn => btn.dataset.childId === activeChildId)) {
        if (validButtons.length > 0) {
          activeChildId = validButtons[0].dataset.childId
          console.log("Using first child ID:", activeChildId)
        }
      }
      
      if (activeChildId) {
        const targetButton = validButtons.find(button => 
          button.dataset.childId === activeChildId
        )
        
        console.log("Target button found:", targetButton)
        if (targetButton) {
          console.log("Clicking target button")
          targetButton.click()
        }
      }
    } catch (error) {
      console.error("Error in showActiveTab:", error)
    }
  }
}
