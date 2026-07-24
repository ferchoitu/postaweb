/* ============================================================================
   DASHBOX · Wizard de contacto
   ----------------------------------------------------------------------------
   Convierte el clic "Quiero DASHBOX" en una encuesta corta de 4 pasos y termina
   abriendo WhatsApp con el mensaje ya escrito. No hay backend: el mensaje ES el
   lead. Por eso el último paso muestra el resumen antes de mandar.

   Mejora progresiva: los CTA del HTML siguen siendo <a href="wa.me/...">, así
   que sin JS (o si este archivo falla) el botón sigue llevando a WhatsApp.

   Se auto-inyecta en cualquier página que tenga #precio .tiers, así que sirve
   para index y las 3 landings por rubro sin duplicar markup.
   ========================================================================== */
(function () {
  'use strict';

  var WA = '5492226482316';
  var PRECIO_PROGRAMA = 120000;
  var PRECIO_NUBE = 19990;

  /* Etiqueta de conversión de Google Ads. Cuando crees la acción
     "Clic en WhatsApp" en Ads te va a dar algo como
     'AW-18345697254/AbCdEfGh1234'. Pegala acá y listo. */
  var CONVERSION_SEND_TO = null;

  var PROVINCIAS = [
    'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
    'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
    'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
    'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
    'Tierra del Fuego', 'Tucumán'
  ];

  var TOTAL_PASOS = 4;

  var estado = {
    nube: null, rubro: null, locales: null, cuando: null,
    nombre: '', tel: '', email: '', provincia: '', ciudad: '', consent: false
  };
  var paso = 1;

  // ── persistencia (que un refresh no borre lo cargado) ────────────────────
  try {
    var guardado = JSON.parse(localStorage.getItem('dashbox_wiz') || 'null');
    if (guardado) for (var k in estado) if (k in guardado) estado[k] = guardado[k];
  } catch (e) { /* localStorage bloqueado: seguimos sin persistir */ }

  function guardar() {
    try { localStorage.setItem('dashbox_wiz', JSON.stringify(estado)); } catch (e) {}
  }

  function pesos(n) { return '$' + n.toLocaleString('es-AR'); }

  // ── markup ───────────────────────────────────────────────────────────────
  function chips(campo, opciones) {
    return opciones.map(function (o) {
      return '<button type="button" class="chip-b" data-campo="' + campo + '" ' +
             'data-val="' + o + '" aria-pressed="false">' + o + '</button>';
    }).join('');
  }

  var HTML =
  '<div class="wiz" id="wiz">' +
    '<div class="wiz-top">' +
      '<button type="button" class="wiz-back" hidden>← Volver</button>' +
      '<div class="wiz-prog" role="presentation"><i></i></div>' +
      '<span class="wiz-count">Paso 1 de ' + TOTAL_PASOS + '</span>' +
    '</div>' +
    '<p class="sr-only" aria-live="polite" id="wiz-live"></p>' +
    '<div class="wiz-body">' +

      /* 1 · dashboard */
      '<section class="wiz-slide" data-paso="1">' +
        '<h3 tabindex="-1">¿Le sumás el dashboard en la nube?</h3>' +
        '<p class="q">Para mirar las ventas desde el celular sin estar en el local. ' +
          'Son ' + pesos(PRECIO_NUBE) + '/mes y lo sacás cuando quieras.</p>' +
        '<div class="wiz-opts">' +
          '<button type="button" class="wiz-opt" data-nube="1">' +
            '<b>Sí, lo quiero</b><span>' + pesos(PRECIO_NUBE) + ' por mes, opcional</span></button>' +
          '<button type="button" class="wiz-opt" data-nube="0">' +
            '<b>Ahora no</b><span>Lo podés sumar más adelante</span></button>' +
        '</div>' +
      '</section>' +

      /* 2 · negocio */
      '<section class="wiz-slide" data-paso="2">' +
        '<h3 tabindex="-1">Contanos de tu negocio</h3>' +
        '<p class="q">Tres toques. Nos sirve para prepararte el sistema con tus productos.</p>' +
        '<div class="wiz-group"><p>¿Qué tenés?</p><div class="chips">' +
          chips('rubro', ['Kiosco', 'Maxikiosco', 'Panadería', 'Almacén', 'Verdulería', 'Otro']) +
        '</div></div>' +
        '<div class="wiz-group"><p>¿Cuántos locales?</p><div class="chips">' +
          chips('locales', ['1', '2', '3 o más']) +
        '</div></div>' +
        '<div class="wiz-group"><p>¿Para cuándo lo necesitás?</p><div class="chips">' +
          chips('cuando', ['Ya, esta semana', 'Este mes', 'Estoy averiguando']) +
        '</div></div>' +
        '<p class="wiz-err" data-err="2"></p>' +
        '<div class="wiz-foot"><button type="button" class="btn amber" data-next="3">Continuar</button></div>' +
      '</section>' +

      /* 3 · datos */
      '<section class="wiz-slide" data-paso="3">' +
        '<h3 tabindex="-1">¿Cómo te contactamos?</h3>' +
        '<p class="q">Te escribimos por WhatsApp. Sin compromiso y sin llamados de la nada.</p>' +
        '<div class="wiz-fields">' +
          '<div class="f-full"><label for="w-nom">Nombre y apellido</label>' +
            '<input id="w-nom" name="nombre" type="text" autocomplete="name" placeholder="Juan Pérez"></div>' +
          '<div><label for="w-tel">WhatsApp</label>' +
            '<input id="w-tel" name="tel" type="tel" inputmode="tel" autocomplete="tel" ' +
            'placeholder="11 2345 6789"></div>' +
          '<div><label for="w-mail">Email <span style="font-weight:500;color:var(--ink-faint)">(opcional)</span></label>' +
            '<input id="w-mail" name="email" type="email" autocomplete="email" placeholder="juan@mail.com"></div>' +
          '<div><label for="w-prov">Provincia</label><select id="w-prov" name="provincia">' +
            '<option value="">Elegí…</option>' +
            PROVINCIAS.map(function (p) { return '<option>' + p + '</option>'; }).join('') +
          '</select></div>' +
          '<div><label for="w-ciu">Ciudad</label>' +
            '<input id="w-ciu" name="ciudad" type="text" autocomplete="address-level2" placeholder="Cañuelas"></div>' +
          '<div class="f-full"><label class="consent">' +
            '<input type="checkbox" name="consent"> ' +
            '<span>Acepto que me contacten por WhatsApp o email por esta consulta.</span></label></div>' +
        '</div>' +
        '<p class="wiz-err" data-err="3"></p>' +
        '<div class="wiz-foot"><button type="button" class="btn amber" data-next="4">Ver resumen</button></div>' +
      '</section>' +

      /* 4 · resumen */
      '<section class="wiz-slide" data-paso="4">' +
        '<h3 tabindex="-1">Listo. ¿Confirmamos?</h3>' +
        '<p class="q">Al enviar se abre WhatsApp con este mensaje ya escrito. Solo tocás enviar.</p>' +
        '<div class="wiz-sum"><dl id="wiz-dl"></dl>' +
          '<div class="wiz-total"><span class="l">Total</span><span class="v" id="wiz-total"></span></div>' +
        '</div>' +
        '<div class="wiz-foot">' +
          '<button type="button" class="btn amber" id="wiz-send">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 00-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1012 2zm5.5 14c-.2.6-1.2 1.2-1.7 1.2-.4 0-1 .1-3-.8-2.5-1-4.1-3.6-4.2-3.8-.1-.2-1-1.3-1-2.5s.6-1.7.8-2c.2-.2.5-.3.6-.3h.5c.2 0 .4 0 .6.5l.7 1.7c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.7-.9c.2-.2.4-.2.6-.1l1.6.8c.2.1.4.2.4.3.1.1.1.6-.1 1.2z"/></svg>' +
            'Enviar por WhatsApp</button>' +
          '<p class="wiz-esc"><a href="#" data-cancelar>Volver a los precios</a></p>' +
        '</div>' +
      '</section>' +

      /* 5 · gracias (fuera del contador) */
      '<section class="wiz-slide" data-paso="5">' +
        '<div class="wiz-ok">' +
          '<div class="tick"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg></div>' +
          '<h3 tabindex="-1">¡Listo! Te esperamos en WhatsApp</h3>' +
          '<p class="q" style="margin-inline:auto">Si no se abrió solo, tocá el botón. ' +
            'Te respondemos todos los días del año.</p>' +
          '<div class="wiz-foot"><a class="btn amber" id="wiz-again" target="_blank" rel="noopener">Abrir WhatsApp</a>' +
            '<p class="wiz-esc"><a href="#" data-cancelar>Volver a los precios</a></p></div>' +
        '</div>' +
      '</section>' +

    '</div>' +
  '</div>';

  // ── montaje ──────────────────────────────────────────────────────────────
  var tiers = document.querySelector('#precio .tiers');
  if (!tiers) return;                       // página sin sección de precios
  if (document.getElementById('wiz')) return;  // ya montado (script incluido 2 veces)
  var host = tiers.parentNode;

  var cont = document.createElement('div');
  cont.innerHTML = HTML;
  var wiz = cont.firstChild;
  host.insertBefore(wiz, tiers.nextSibling);

  // Lo que se oculta mientras el wizard está abierto
  var aOcultar = [tiers,
    host.querySelector('.tiers-note'),
    host.querySelector('.price-wrap')].filter(Boolean);

  var slides = wiz.querySelectorAll('.wiz-slide');
  var barra = wiz.querySelector('.wiz-prog i');
  var cuenta = wiz.querySelector('.wiz-count');
  var btnBack = wiz.querySelector('.wiz-back');
  var live = wiz.querySelector('#wiz-live');

  function mostrar(n, atras) {
    wiz.classList.toggle('rev', !!atras);
    paso = n;
    for (var i = 0; i < slides.length; i++) {
      slides[i].classList.toggle('on', +slides[i].dataset.paso === n);
    }
    var visible = Math.min(n, TOTAL_PASOS);
    barra.style.width = (visible / TOTAL_PASOS * 100) + '%';
    cuenta.textContent = n > TOTAL_PASOS ? '¡Gracias!' : 'Paso ' + n + ' de ' + TOTAL_PASOS;
    cuenta.hidden = false;
    btnBack.hidden = (n === 1 || n > TOTAL_PASOS);
    live.textContent = cuenta.textContent;
    if (n === 4) pintarResumen();
    var h = slides[n - 1] && slides[n - 1].querySelector('h3');
    if (h) h.focus({ preventScroll: true });
  }

  function abrir(conNube) {
    aOcultar.forEach(function (el) { el.classList.add('wiz-hidden'); });
    wiz.classList.add('on');
    if (conNube) { estado.nube = true; guardar(); mostrar(2); }
    else { mostrar(1); }
    wiz.scrollIntoView({ behavior: 'smooth', block: 'center' });
    pintarChips();
  }

  function cerrar() {
    wiz.classList.remove('on');
    aOcultar.forEach(function (el) { el.classList.remove('wiz-hidden'); });
    document.getElementById('precio').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function pintarChips() {
    var cs = wiz.querySelectorAll('.chip-b');
    for (var i = 0; i < cs.length; i++) {
      cs[i].setAttribute('aria-pressed', String(estado[cs[i].dataset.campo] === cs[i].dataset.val));
    }
    ['nombre', 'tel', 'email', 'ciudad', 'provincia'].forEach(function (n) {
      var el = wiz.querySelector('[name="' + n + '"]');
      if (el && estado[n]) el.value = estado[n];
    });
    var c = wiz.querySelector('[name="consent"]');
    if (c) c.checked = !!estado.consent;
  }

  /** La licencia es por comercio: 2 locales = 2 licencias. */
  function cantLocales() {
    return estado.locales === '3 o más' ? 3 : parseInt(estado.locales, 10) || 1;
  }

  function resumenTexto() {
    var n = cantLocales();
    var l = [
      'Hola! Quiero DASHBOX 👋', '',
      '• Programa: DASHBOX completo — ' + pesos(PRECIO_PROGRAMA * n) + ' (pago único' +
        (n > 1 ? ', ' + n + ' locales' : '') + ')',
      '• Dashboard en la nube: ' + (estado.nube ? 'Sí — ' + pesos(PRECIO_NUBE) + '/mes' : 'No por ahora'),
      '• Rubro: ' + estado.rubro,
      '• Locales: ' + estado.locales,
      '• Para cuándo: ' + estado.cuando,
      '', 'Mis datos:',
      '• Nombre: ' + estado.nombre,
      '• WhatsApp: ' + estado.tel
    ];
    if (estado.email) l.push('• Email: ' + estado.email);
    l.push('• Ciudad: ' + estado.ciudad + ', ' + estado.provincia);
    return l.join('\n');
  }

  function pintarResumen() {
    var filas = [
      ['Programa', 'DASHBOX completo'],
      ['Nube', estado.nube ? 'Sí, la sumo' : 'No por ahora'],
      ['Negocio', estado.rubro + ' · ' + estado.locales + (estado.locales === '1' ? ' local' : ' locales')],
      ['Cuándo', estado.cuando],
      ['Nombre', estado.nombre],
      ['WhatsApp', estado.tel],
      ['Dónde', estado.ciudad + ', ' + estado.provincia]
    ];
    if (estado.email) filas.splice(6, 0, ['Email', estado.email]);
    wiz.querySelector('#wiz-dl').innerHTML = filas.map(function (f) {
      return '<dt>' + f[0] + '</dt><dd>' + f[1].replace(/</g, '&lt;') + '</dd>';
    }).join('');
    var n = cantLocales();
    var total = pesos(PRECIO_PROGRAMA * n) + ' <small>pago único' +
      (n > 1 ? ' (' + n + ' locales)' : '') + '</small>';
    if (estado.nube) total += '<small>+ ' + pesos(PRECIO_NUBE) + '/mes de dashboard</small>';
    wiz.querySelector('#wiz-total').innerHTML = total;
  }

  function conversion() {
    if (typeof window.gtag !== 'function') return;
    var n = cantLocales();
    try {
      window.gtag('event', 'generate_lead', { currency: 'ARS', value: PRECIO_PROGRAMA * n });
      if (CONVERSION_SEND_TO) {
        window.gtag('event', 'conversion', {
          send_to: CONVERSION_SEND_TO, currency: 'ARS', value: PRECIO_PROGRAMA * n
        });
      }
    } catch (e) { /* que un error de medición nunca frene el lead */ }
  }

  // ── validación ───────────────────────────────────────────────────────────
  function error(p, msg) {
    var el = wiz.querySelector('[data-err="' + p + '"]');
    if (el) el.textContent = msg || '';
    if (msg) live.textContent = msg;
  }

  function validarPaso2() {
    if (!estado.rubro || !estado.locales || !estado.cuando) {
      error(2, 'Elegí una opción en las tres preguntas.'); return false;
    }
    error(2, ''); return true;
  }

  function validarPaso3() {
    var campos = {
      nombre: wiz.querySelector('[name="nombre"]'),
      tel: wiz.querySelector('[name="tel"]'),
      email: wiz.querySelector('[name="email"]'),
      provincia: wiz.querySelector('[name="provincia"]'),
      ciudad: wiz.querySelector('[name="ciudad"]')
    };
    for (var k in campos) campos[k].classList.remove('bad');

    var falta = null;
    if (campos.nombre.value.trim().length < 3) falta = ['nombre', 'Escribí tu nombre y apellido.'];
    else if (campos.tel.value.replace(/\D/g, '').length < 8) falta = ['tel', 'Revisá el número de WhatsApp.'];
    else if (campos.email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campos.email.value))
      falta = ['email', 'Ese email no parece válido.'];
    else if (!campos.provincia.value) falta = ['provincia', 'Elegí tu provincia.'];
    else if (campos.ciudad.value.trim().length < 2) falta = ['ciudad', 'Escribí tu ciudad.'];

    if (falta) {
      campos[falta[0]].classList.add('bad');
      campos[falta[0]].focus();
      error(3, falta[1]);
      return false;
    }
    if (!wiz.querySelector('[name="consent"]').checked) {
      error(3, 'Necesitamos tu OK para contactarte.'); return false;
    }
    estado.nombre = campos.nombre.value.trim();
    estado.tel = campos.tel.value.trim();
    estado.email = campos.email.value.trim();
    estado.provincia = campos.provincia.value;
    estado.ciudad = campos.ciudad.value.trim();
    estado.consent = true;
    guardar();
    error(3, '');
    return true;
  }

  // ── eventos ──────────────────────────────────────────────────────────────
  // CTA de las tarjetas: interceptamos el link a WhatsApp.
  document.addEventListener('click', function (e) {
    var cta = e.target.closest('[data-wiz]');
    if (!cta) return;
    e.preventDefault();
    abrir(cta.dataset.wiz === 'nube');
  });

  wiz.addEventListener('click', function (e) {
    var t = e.target;

    var opt = t.closest('[data-nube]');
    if (opt) { estado.nube = opt.dataset.nube === '1'; guardar(); mostrar(2); return; }

    var chip = t.closest('.chip-b');
    if (chip) {
      estado[chip.dataset.campo] = chip.dataset.val;
      guardar(); pintarChips(); error(2, ''); return;
    }

    var next = t.closest('[data-next]');
    if (next) {
      var n = +next.dataset.next;
      if (n === 3 && !validarPaso2()) return;
      if (n === 4 && !validarPaso3()) return;
      mostrar(n); return;
    }

    if (t.closest('.wiz-back')) { mostrar(Math.max(1, paso - 1), true); return; }

    if (t.closest('[data-cancelar]')) { e.preventDefault(); cerrar(); return; }

    if (t.closest('#wiz-send')) {
      var url = 'https://wa.me/' + WA + '?text=' + encodeURIComponent(resumenTexto());
      conversion();
      wiz.querySelector('#wiz-again').href = url;
      window.open(url, '_blank', 'noopener');
      mostrar(5);
      return;
    }
  });

  // Enter en los campos avanza en vez de recargar
  wiz.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    if (e.target.tagName === 'INPUT') {
      e.preventDefault();
      var b = wiz.querySelector('.wiz-slide.on [data-next]');
      if (b) b.click();
    }
  });
})();
