import { Application } from "@hotwired/stimulus"

const application = Application.start()

// Configure Stimulus development experience
application.debug = true  // デバッグを有効にする
window.Stimulus = application

export { application }
