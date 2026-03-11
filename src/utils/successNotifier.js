// src/utils/successNotifier.js
// A tiny pub/sub/dispatcher that allows non-component code to trigger a UI success modal.

let _handler = () => {};

export function registerSuccessHandler(handler) {
  _handler = typeof handler === 'function' ? handler : () => {};
}

export function clearSuccessHandler() {
  _handler = () => {};
}

export function notifySuccess(message) {
  if (typeof _handler === 'function') {
    _handler(message);
  }
}
