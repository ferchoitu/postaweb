/* Medición común a todas las páginas.

   Todo sale como evento al dataLayer y GTM decide a quién avisarle (Google
   Ads, GA4, Meta). Así una conversión nueva se arma en Tag Manager sin tocar
   el sitio. Los eventos de la web:

   - whatsapp_click     clic en cualquier link a wa.me (este archivo)
   - whatsapp_lead      el cotizador terminado que abre WhatsApp (wizard.js)
   - ver_precios        clic hacia /comprar (este archivo)
   - pago_iniciado      el botón de pagar en /comprar
   - compra_confirmada  /gracias, recién con el pago verificado contra MP

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
      if (!a) return;
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
