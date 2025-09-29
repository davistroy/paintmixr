// Cypress E2E support file

import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Hide fetch/XHR requests from command log
Cypress.on('window:before:load', (win) => {
  // Disable service workers
  // @ts-ignore - suppressing readonly property delete error
  delete win.navigator.serviceWorker
})

// Ignore uncaught exceptions that might occur during development
Cypress.on('uncaught:exception', (err, runnable) => {
  // Return false to prevent the test from failing
  return false
})