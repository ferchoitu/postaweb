/* Medición común a todas las páginas.

   Todo sale como evento al dataLayer y GTM decide a quién avisarle (Google
   Ads, GA4, Meta). Así una conversión nueva se arma en Tag Manager sin tocar
   el sitio. Los eventos de la web:

   - whatsapp_click     clic en cualquier link a wa.me (este archivo)
   - whatsapp_lead      el cotizador terminado (wizard.js) o "Seguir por
                        WhatsApp" en /comprar, con valor y si quiere facturación
   - ver_precios        clic hacia /comprar (este archivo)

   Un link con data-medicion="propia" manda su propio evento y acá no se cuenta.

   Un error de medición nunca puede frenar un clic: todo va en try/catch. */
(function () {
  window.dataLayer = window.dataLayer || [];

  function rubro() {
    var p = location.pathname.replace(/^\/|\.html$/g, '');
    return p || 'inicio';
  }

  document.addEventListener('click', function (e) {
    try {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || a.getAttribute('data-medicion') === 'propia') return;
      var href = a.getAttribute('href') || '';
      var texto = (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
      if (href.indexOf('wa.me/') !== -1) {
        window.dataLayer.push({ event: 'whatsapp_click', pagina: rubro(), boton: texto });
      } else if (/^\/comprar(\?|$)/.test(href)) {
        window.dataLayer.push({
          event: 'ver_precios', pagina: rubro(), boton: texto,
          producto: href.indexOf('producto=gastro') !== -1 ? 'gastro' : 'dashbox'
        });
      }
    } catch (err) { /* nada */ }
  }, true);
})();
