const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateContact(input) {
  const contact = {
    name: clean(input?.name),
    email: clean(input?.email).toLowerCase(),
    message: clean(input?.message),
    website: clean(input?.website),
  };
  const errors = {};

  if (contact.name.length < 2 || contact.name.length > 80) {
    errors.name = 'Name must be between 2 and 80 characters.';
  }
  if (contact.email.length > 254 || !EMAIL_PATTERN.test(contact.email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (contact.message.length < 10 || contact.message.length > 2000) {
    errors.message = 'Message must be between 10 and 2,000 characters.';
  }

  return { contact, errors, valid: Object.keys(errors).length === 0 };
}
