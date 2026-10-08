import { CONTENT, getContactApiUrl } from './content.js';

export class ContactController {
  constructor() {
    this.form = document.querySelector('[data-contact-form]');
    this.status = document.querySelector('[data-form-status]');
    this.submitButton = this.form.querySelector('button[type="submit"]');
    this.form.addEventListener('submit', (event) => this.submit(event));
  }

  setStatus(message, state = '') {
    this.status.textContent = message;
    this.status.dataset.state = state;
  }

  async submit(event) {
    event.preventDefault();
    this.setStatus('');

    if (!this.form.reportValidity()) return;
    const apiUrl = getContactApiUrl();
    if (!apiUrl) {
      this.setStatus(`The form API is not deployed yet. Email ${CONTENT.contact.email} instead.`, 'error');
      return;
    }

    const formData = new FormData(this.form);
    const payload = Object.fromEntries(formData.entries());
    this.submitButton.disabled = true;
    this.setStatus('Sending...');

    try {
      const response = await fetch(`${apiUrl}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Your message could not be sent.');
      this.form.reset();
      this.setStatus('Message received. Thank you.', 'success');
    } catch (error) {
      this.setStatus(error.message || 'The server is unavailable. Please email me directly.', 'error');
    } finally {
      this.submitButton.disabled = false;
    }
  }
}
