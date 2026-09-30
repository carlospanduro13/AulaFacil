const menuButton = document.querySelector('.menu-button');
const mainNav = document.querySelector('.main-nav');

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  menuButton.setAttribute('aria-label', isOpen ? 'Abrir menú' : 'Cerrar menú');
  mainNav.classList.toggle('open', !isOpen);
  document.body.classList.toggle('menu-open', !isOpen);
});

mainNav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    menuButton?.setAttribute('aria-expanded', 'false');
    mainNav.classList.remove('open');
    document.body.classList.remove('menu-open');
  });
});

document.querySelectorAll('.module-toggle').forEach((toggle) => {
  toggle.addEventListener('click', () => {
    const module = toggle.closest('.module');
    const wasOpen = module.classList.contains('open');

    document.querySelectorAll('.module').forEach((item) => {
      item.classList.remove('open');
      item.querySelector('.module-toggle').setAttribute('aria-expanded', 'false');
      item.querySelector('.module-toggle i').textContent = '+';
    });

    if (!wasOpen) {
      module.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.querySelector('i').textContent = '−';
    }
  });
});

document.querySelectorAll('.answers button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.answers button').forEach((answer) => answer.classList.remove('correct'));
    if (button.hasAttribute('data-correct')) {
      button.classList.add('correct');
      button.textContent = '✓ 5';
    } else {
      button.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(0)' }],
        { duration: 250 }
      );
    }
  });
});

document.querySelector('.video-play')?.addEventListener('click', (event) => {
  const button = event.currentTarget;
  const icon = button.querySelector('span');
  const isPlaying = icon.textContent === 'Ⅱ';
  icon.textContent = isPlaying ? '▶' : 'Ⅱ';
  button.setAttribute('aria-label', isPlaying ? 'Reproducir demostración' : 'Pausar demostración');
});

const form = document.querySelector('#lead-form');
const surveyForm = document.querySelector('#survey-form');
const googleSheetsUrl = document.querySelector('meta[name="google-sheets-web-app-url"]')?.content.trim() || '';

function setSubmitting(isSubmitting) {
  const submitButton = form?.querySelector('button[type="submit"]');
  form?.classList.toggle('is-submitting', isSubmitting);
  if (submitButton) {
    submitButton.disabled = isSubmitting;
    submitButton.querySelector('.button-label').textContent = isSubmitting
      ? 'Enviando tus datos...'
      : 'Quiero probar la lección gratis';
  }
}

async function sendLeadToGoogleSheets(lead) {
  if (!googleSheetsUrl || !/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(googleSheetsUrl)) {
    throw new Error('Google Sheets todavía no está configurado.');
  }

  const payload = new URLSearchParams({
    nombre: lead.nombre,
    contacto: lead.contacto,
    nivel: lead.nivel,
    website: lead.website || '',
    origen: window.location.href
  });

  // Apps Script redirige la respuesta; no-cors permite el envío desde un sitio estático.
  await fetch(googleSheetsUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: payload.toString()
  });
}

async function sendSurveyToGoogleSheets(answers) {
  if (!googleSheetsUrl || !/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(googleSheetsUrl)) {
    throw new Error('Google Sheets todavía no está configurado.');
  }
  const payload = new URLSearchParams({
    tipo: 'encuesta',
    ...answers,
    website: answers.website || '',
    origen: window.location.href
  });
  await fetch(googleSheetsUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: payload.toString()
  });
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const fields = ['nombre', 'contacto', 'nivel'];
  let valid = true;
  const submitError = form.querySelector('.form-submit-error');
  submitError.classList.remove('visible');
  submitError.textContent = '';

  fields.forEach((fieldName) => {
    const field = form.elements[fieldName];
    const wrapper = field.closest('.input-wrap');
    const error = form.querySelector(`[data-error="${fieldName}"]`);
    wrapper.classList.remove('invalid');
    error.textContent = '';

    if (!field.value.trim()) {
      valid = false;
      wrapper.classList.add('invalid');
      error.textContent = fieldName === 'nivel' ? 'Selecciona tu nivel académico.' : 'Este campo es obligatorio.';
      return;
    }

    if (fieldName === 'contacto') {
      const value = field.value.trim();
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      const isPhone = /^[+\d][\d\s()-]{7,}$/.test(value);
      if (!isEmail && !isPhone) {
        valid = false;
        wrapper.classList.add('invalid');
        error.textContent = 'Ingresa un correo o número de WhatsApp válido.';
      }
    }
  });

  if (!valid) {
    form.querySelector('.input-wrap.invalid input, .input-wrap.invalid select')?.focus();
    return;
  }

  const lead = Object.fromEntries(new FormData(form).entries());
  setSubmitting(true);

  try {
    await sendLeadToGoogleSheets(lead);
    form.querySelector('.form-success').classList.add('visible');
    form.reset();
  } catch (error) {
    submitError.textContent = error.message === 'Google Sheets todavía no está configurado.'
      ? 'El formulario está en preparación. Inténtalo nuevamente en unos minutos.'
      : 'No pudimos enviar tus datos. Revisa tu conexión e inténtalo nuevamente.';
    submitError.classList.add('visible');
  } finally {
    setSubmitting(false);
  }
});

surveyForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const requiredFields = ['nivel', 'area', 'tema', 'dificultad', 'formato', 'dispositivo', 'precio'];
  let valid = true;
  const submitError = surveyForm.querySelector('.form-submit-error');
  submitError.classList.remove('visible');
  submitError.textContent = '';

  requiredFields.forEach((fieldName) => {
    const field = surveyForm.elements[fieldName];
    const wrapper = field.closest('.input-wrap');
    const error = surveyForm.querySelector(`[data-error="${fieldName}"]`);
    wrapper.classList.remove('invalid');
    error.textContent = '';
    if (!field.value.trim()) {
      valid = false;
      wrapper.classList.add('invalid');
      error.textContent = 'Completa esta respuesta.';
    }
  });
  if (!valid) {
    surveyForm.querySelector('.input-wrap.invalid input, .input-wrap.invalid select')?.focus();
    return;
  }

  const button = surveyForm.querySelector('button[type="submit"]');
  const label = button.querySelector('.button-label');
  button.disabled = true;
  surveyForm.classList.add('is-submitting');
  label.textContent = 'Enviando respuestas...';
  try {
    const answers = Object.fromEntries(new FormData(surveyForm).entries());
    await sendSurveyToGoogleSheets(answers);
    surveyForm.querySelector('.form-success').classList.add('visible');
    surveyForm.reset();
  } catch (error) {
    submitError.textContent = 'No pudimos enviar la encuesta. Revisa tu conexión e inténtalo nuevamente.';
    submitError.classList.add('visible');
  } finally {
    button.disabled = false;
    surveyForm.classList.remove('is-submitting');
    label.textContent = 'Enviar mis respuestas';
  }
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

document.querySelector('#year').textContent = new Date().getFullYear();
