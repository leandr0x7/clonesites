
(function () {
  "use strict";
  if (window.WF && window.WF.__ready) return;   // não monta duas vezes

  /* ==========================================================
     >>> CONFIGURAÇÃO — mexa somente aqui <<<
     ========================================================== */
  var CONFIG = {
    /* --- vídeo --- */
    videoElementId: "panda-21c6760a-e173-466b-b1d3-1525cadb38fc",

    /* Quando o botão aparece:
       "embed"  → quem decide é o próprio Embed, pelo botão configurado
                  no painel do Panda (RECOMENDADO — é o seu caso hoje)
       "tempo"  → aos X segundos de vídeo, controlado por este código
       "sempre" → aparece já no carregamento (use para testar tudo)   */
    modoExibicao: "embed",
    tempoSegundos: 60,

    /* --- textos do formulário --- */
    tituloForm:      "Garanta seu ingresso",
    subtituloForm:   "Preencha os dados abaixo para liberar seu acesso ao checkout.",
    textoBotaoForm:  "IR PARA O CHECKOUT",

    /* --- ActiveCampaign ---
       O envio é uma navegação real para o proc.php: quem redireciona a
       pessoa depois do cadastro é o PRÓPRIO ActiveCampaign, conforme a
       ação configurada no formulário 57. Por isso não há link de checkout
       aqui. (Se um dia quiser controlar o destino por aqui, veja o
       comentário em enviarParaActiveCampaign, mais abaixo.)             */
    contaActiveCampaign: "kacio",   // https://kacio.activehosted.com
    formId:              "57",
    metodo:              "POST",

    /* IDs dos campos personalizados de UTM (deixe "" para ignorar) */
    campoUtmSource:   "7",
    campoUtmCampaign: "8",
    campoUtmContent:  "10",
    campoUtmMedium:   "11",
    campoUtmTerm:     "9",

    emailObrigatorio: true,
    telefoneObrigatorio: true,

    debug: true   // deixe true enquanto testa — loga tudo no console
  };
  /* ========================================================== */

  function log() {
    if (!CONFIG.debug) return;
    console.log.apply(console, ["[WF]"].concat([].slice.call(arguments)));
  }

  var PHONE_RULES = {
    "+55":{min:10,max:11},"+351":{min:9,max:9},"+353":{min:9,max:9},"+1":{min:10,max:10},
    "+44":{min:10,max:10},"+33":{min:9,max:9},"+49":{min:10,max:11},"+34":{min:9,max:9},
    "+39":{min:9,max:10},"+61":{min:9,max:9},"+81":{min:10,max:10},"+86":{min:11,max:11},
    "+91":{min:10,max:10},"+7":{min:10,max:10},"+27":{min:9,max:9},"+82":{min:9,max:10},
    "+90":{min:10,max:10},"+966":{min:9,max:9},"+972":{min:9,max:9},"+47":{min:8,max:8},
    "+46":{min:7,max:13},"+45":{min:8,max:8},"+41":{min:9,max:9},"+31":{min:9,max:9},
    "+32":{min:9,max:9},"+63":{min:10,max:10},"+62":{min:9,max:12},"+84":{min:9,max:10},
    "+66":{min:9,max:9},"+60":{min:9,max:10},"+380":{min:9,max:9},"+48":{min:9,max:9},
    "+595":{min:9,max:9},"+258":{min:9,max:9},"+54":{min:10,max:12}
  };

  var PAISES = [
    ["+55","🇧🇷"],["+351","🇵🇹"],["+353","🇮🇪"],["+1","🇺🇸"],["+44","🇬🇧"],["+33","🇫🇷"],
    ["+49","🇩🇪"],["+34","🇪🇸"],["+39","🇮🇹"],["+61","🇦🇺"],["+81","🇯🇵"],["+86","🇨🇳"],
    ["+91","🇮🇳"],["+7","🇷🇺"],["+27","🇿🇦"],["+82","🇰🇷"],["+90","🇹🇷"],["+966","🇸🇦"],
    ["+972","🇮🇱"],["+47","🇳🇴"],["+46","🇸🇪"],["+45","🇩🇰"],["+41","🇨🇭"],["+31","🇳🇱"],
    ["+32","🇧🇪"],["+63","🇵🇭"],["+62","🇮🇩"],["+84","🇻🇳"],["+66","🇹🇭"],["+60","🇲🇾"],
    ["+380","🇺🇦"],["+48","🇵🇱"],["+595","🇵🇾"],["+258","🇲🇿"],["+54","🇦🇷"]
  ];

  var UTM_KEYS = ["utm_source","utm_campaign","utm_content","utm_medium","utm_term"];
  var utms = {}, enviando = false, lastFocus = null;

  /* ==========================================================
     UTMs — estamos no documento principal, leitura direta
     ========================================================== */
  function refreshUtms() {
    var params = new URLSearchParams(window.location.search);
    var out = {}, achou = false;
    UTM_KEYS.forEach(function (k) {
      var v = params.get(k) || "";
      out[k] = v; if (v) achou = true;
    });
    if (achou) {
      utms = out;
      try { sessionStorage.setItem("wf_utms", JSON.stringify(out)); } catch (e) {}
      return;
    }
    if (!Object.keys(utms).length) {
      var stored = null;
      try { stored = JSON.parse(sessionStorage.getItem("wf_utms") || "null"); } catch (e) {}
      utms = stored || { utm_source:"",utm_campaign:"",utm_content:"",utm_medium:"",utm_term:"" };
    }
  }
  refreshUtms();
  setInterval(refreshUtms, 1000);   // o Framer troca de rota sem recarregar

  /* ==========================================================
     OVERLAY DO FORMULÁRIO
     ========================================================== */
  var overlay = document.createElement("div");
  overlay.className = "wf-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.innerHTML =
    '<div class="wf-modal">' +
      '<button type="button" class="wf-close" aria-label="Fechar">&times;</button>' +
      '<h2 class="wf-title"></h2>' +
      '<p class="wf-sub"></p>' +
      '<form class="wf-form" novalidate>' +
        '<div class="wf-field">' +
          '<input type="email" class="wf-email" placeholder="Seu melhor e-mail" autocomplete="email" inputmode="email" />' +
        '</div>' +
        '<p class="wf-error wf-email-error">Informe um e-mail válido.</p>' +
        '<div class="wf-field">' +
          '<select class="wf-country" aria-label="Código do país">' +
            PAISES.map(function (p) { return '<option value="'+p[0]+'">'+p[1]+" "+p[0]+"</option>"; }).join("") +
          '</select>' +
          '<input type="tel" class="wf-phone" placeholder="WhatsApp (11) 98765-4321" autocomplete="tel" inputmode="numeric" />' +
        '</div>' +
        '<p class="wf-error wf-phone-error">Informe um WhatsApp válido com DDD.</p>' +
        '<button type="submit" class="wf-submit"></button>' +
      '</form>' +
      '<p class="wf-legal">Seus dados estão seguros. Usamos apenas para enviar o acesso e o suporte da compra.</p>' +
    '</div>';
  document.body.appendChild(overlay);

  var q = function (sel) { return overlay.querySelector(sel); };
  var form = q(".wf-form"), emailEl = q(".wf-email"), phoneEl = q(".wf-phone");
  var countryEl = q(".wf-country"), submitEl = q(".wf-submit");
  var emailErr = q(".wf-email-error"), phoneErr = q(".wf-phone-error");

  q(".wf-title").textContent = CONFIG.tituloForm;
  q(".wf-sub").textContent   = CONFIG.subtituloForm;
  submitEl.textContent       = CONFIG.textoBotaoForm;

  function open() {
    lastFocus = document.activeElement;
    overlay.classList.add("is-open");
    document.documentElement.style.overflow = "hidden";
    setTimeout(function () { emailEl.focus(); }, 180);
    log("overlay aberto");
  }
  function close() {
    overlay.classList.remove("is-open");
    document.documentElement.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  q(".wf-close").addEventListener("click", close);
  overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) close(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlay.classList.contains("is-open")) close();
  });
  document.addEventListener("click", function (e) {
    var alvo = e.target.closest ? e.target.closest("[data-wf-open]") : null;
    if (alvo) { e.preventDefault(); open(); }
  });

  /* ==========================================================
     PONTE COM O EMBED DO BOTÃO (Parte 2)
     ========================================================== */
  var botoes = [];        // janelas dos embeds de botão registrados
  var revelado = false;
  var secoesLiberadas = false;

  /* Libera as seções escondidas pela Parte 0 (o <style> do <head>).
     Basta marcar o <html>: o CSS de lá cuida do resto, inclusive do fade. */
  function liberarSecoes(motivo) {
    if (secoesLiberadas) return;
    secoesLiberadas = true;
    document.documentElement.classList.add("wf-liberado");
    log("seções liberadas —", motivo);
  }

  function mandarRevelar(win) {
    try { win.postMessage({ type: "wf_reveal" }, "*"); } catch (e) {}
  }

  function revelarBotao(motivo) {
    if (revelado) return;
    revelado = true;
    liberarSecoes(motivo);
    log("revelando o botão —", motivo);
    botoes.forEach(mandarRevelar);
    // rede de segurança: avisa todos os iframes da página
    [].slice.call(document.querySelectorAll("iframe")).forEach(function (f) {
      if (f.contentWindow) mandarRevelar(f.contentWindow);
    });
  }

  window.addEventListener("message", function (e) {
    var d = e.data;
    if (!d || typeof d !== "object") return;

    if (d.type === "wf_button_ready") {
      if (e.source && botoes.indexOf(e.source) === -1) botoes.push(e.source);
      log("embed do botão registrado");
      if (revelado && e.source) mandarRevelar(e.source);   // registrou depois da hora
      return;
    }
    if (d.type === "wf_open_form") { open(); return; }

    // o Embed avisou que o botão apareceu → libera as seções da página
    if (d.type === "wf_revealed") { liberarSecoes("aviso do embed"); return; }
  });

  /* Trava de segurança: se em 10s nenhum Embed de botão se registrar, é
     porque ele não está na página (foi removido, deu erro, bloqueador).
     Nesse caso libera as seções — melhor mostrar a página inteira do que
     deixar o visitante preso numa página cortada pela metade. */
  setTimeout(function () {
    if (!botoes.length) liberarSecoes("nenhum Embed de botão respondeu em 10s");
  }, 10000);

  /* ==========================================================
     ACOMPANHA O TEMPO DO VÍDEO
     ========================================================== */
  if (CONFIG.modoExibicao === "sempre") {
    revelarBotao("modo sempre");
  } else if (CONFIG.modoExibicao === "embed") {
    log("modo embed: quem revela o botão é o próprio Embed, no tempo configurado no painel do Panda");
  } else {
    var tempoPorEvento = null;   // tempo vindo da API (autoritativo)
    var tempoRelogio = 0;        // contador de segurança
    var tocando = false;
    var relogio = null;

    function checar(t) {
      if (t == null) return;
      if (t >= CONFIG.tempoSegundos) revelarBotao("tempo do vídeo = " + Math.round(t) + "s");
    }

    function extrairTempo(d) {
      if (!d) return null;
      if (typeof d === "string") {
        if (d.charAt(0) !== "{") return null;
        try { d = JSON.parse(d); } catch (e) { return null; }
      }
      if (typeof d !== "object") return null;
      var chaves = ["currentTime","current_time","time","seconds","position"];
      for (var i = 0; i < chaves.length; i++) {
        var v = d[chaves[i]];
        if (typeof v === "number" && isFinite(v)) return v;
        if (typeof v === "string" && v !== "" && isFinite(Number(v))) return Number(v);
      }
      return null;
    }

    function tratarEvento(d) {
      var t = extrairTempo(d);
      if (t != null) {
        tempoPorEvento = t;
        checar(t);
        return;
      }
      // sem tempo no evento: usa play/pause + relógio como aproximação
      var txt = "";
      try { txt = typeof d === "string" ? d : JSON.stringify(d); } catch (e) { return; }
      if (/play/i.test(txt) && !/display|player_/i.test(txt)) iniciarRelogio();
      if (/pause|ended|stop/i.test(txt)) pararRelogio();
    }

    function iniciarRelogio() {
      if (tocando) return;
      tocando = true;
      relogio = setInterval(function () {
        tempoRelogio += 1;
        if (tempoPorEvento == null) checar(tempoRelogio);   // só se a API não estiver dando tempo
      }, 1000);
      log("relógio de segurança iniciado (play detectado)");
    }
    function pararRelogio() {
      tocando = false;
      if (relogio) { clearInterval(relogio); relogio = null; }
    }

    // caminho A: API oficial do Panda
    if (!document.querySelector('script[src^="https://player.pandavideo.com.br/api.v2.js"]')) {
      var s = document.createElement("script");
      s.src = "https://player.pandavideo.com.br/api.v2.js";
      s.async = true;
      document.head.appendChild(s);
    }
    window.pandascripttag = window.pandascripttag || [];
    window.pandascripttag.push(function () {
      try {
        var p = new PandaPlayer(CONFIG.videoElementId, {
          onReady: function () { log("onReady do player disparou"); },
          onEvent: function (evt) { tratarEvento(evt); }
        });
        try { p.onEvent = function (evt) { tratarEvento(evt); }; } catch (e) {}
        window.__wfPlayer = p;
        log("PandaPlayer instanciado em #" + CONFIG.videoElementId);
      } catch (e) {
        log("erro ao instanciar o PandaPlayer:", e);
      }
    });

    // caminho B: escuta bruta das mensagens do player (rede de segurança)
    window.addEventListener("message", function (e) {
      if (!/pandavideo/.test(String(e.origin))) return;
      tratarEvento(e.data);
    });

    // diagnóstico
    setTimeout(function () {
      if (revelado) return;
      if (!document.getElementById(CONFIG.videoElementId))
        log("PROBLEMA: não achei o iframe #" + CONFIG.videoElementId + " no documento principal");
      else if (typeof window.PandaPlayer !== "function")
        log("PROBLEMA: api.v2.js não carregou (rede ou bloqueador)");
      else
        log("player ok — aguardando chegar em " + CONFIG.tempoSegundos + "s",
            "| tempo por evento:", tempoPorEvento, "| relógio:", tempoRelogio);
    }, 25000);
  }

  /* ==========================================================
     VALIDAÇÃO
     ========================================================== */
  function maskBR(d) {
    if (d.length <= 2) return d.length ? "(" + d : "";
    if (d.length <= 6) return "(" + d.slice(0,2) + ") " + d.slice(2);
    if (d.length <= 10) return "(" + d.slice(0,2) + ") " + d.slice(2,6) + "-" + d.slice(6);
    return "(" + d.slice(0,2) + ") " + d.slice(2,7) + "-" + d.slice(7,11);
  }
  function currentRule() { return PHONE_RULES[countryEl.value] || { min:10, max:15 }; }

  phoneEl.addEventListener("input", function () {
    var rule = currentRule();
    var d = phoneEl.value.replace(/\D/g, "").slice(0, rule.max);
    phoneEl.value = (countryEl.value === "+55") ? maskBR(d) : d;
    phoneErr.classList.remove("is-visible");
  });
  countryEl.addEventListener("change", function () {
    phoneEl.value = "";
    phoneErr.classList.remove("is-visible");
  });
  emailEl.addEventListener("input", function () { emailErr.classList.remove("is-visible"); });

  function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  /* ==========================================================
     ENVIO
     ========================================================== */
  function hiddenInput(n, v) {
    var i = document.createElement("input");
    i.type = "hidden"; i.name = n; i.value = v;
    return i;
  }

  function enviarParaActiveCampaign(email, fullPhone) {
    var f = document.createElement("form");
    f.method = CONFIG.metodo;
    f.action = "https://" + CONFIG.contaActiveCampaign + ".activehosted.com/proc.php";
    /* target "_self" = navegação real. A página sai daqui e vai para o
       proc.php, que grava o contato e devolve o redirecionamento
       configurado no formulário do ActiveCampaign.

       Se um dia quiser que o redirecionamento seja controlado por aqui:
       crie um <iframe name="wf_ac_target"> oculto, troque para
       f.target = "wf_ac_target", acrescente hiddenInput("jsonp","true")
       e faça window.location.href = <seu link> logo depois do submit.  */
    f.target = "_self";
    f.style.display = "none";

    f.appendChild(hiddenInput("u", CONFIG.formId));
    f.appendChild(hiddenInput("f", CONFIG.formId));
    f.appendChild(hiddenInput("act", "sub"));
    if (email)     f.appendChild(hiddenInput("email", email));
    if (fullPhone) f.appendChild(hiddenInput("phone", fullPhone));

    [[CONFIG.campoUtmSource,   utms.utm_source],
     [CONFIG.campoUtmCampaign, utms.utm_campaign],
     [CONFIG.campoUtmContent,  utms.utm_content],
     [CONFIG.campoUtmMedium,   utms.utm_medium],
     [CONFIG.campoUtmTerm,     utms.utm_term]
    ].forEach(function (par) {
      if (par[0] && par[1]) f.appendChild(hiddenInput("field[" + par[0] + "]", par[1]));
    });

    document.body.appendChild(f);
    log("enviando ao ActiveCampaign", { email: email, phone: fullPhone, utms: utms });
    f.submit();   // a partir daqui a página navega para o proc.php
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (enviando) return;

    var email = emailEl.value.trim();
    var digits = phoneEl.value.replace(/\D/g, "");
    var rule = currentRule();
    var ok = true;

    if ((CONFIG.emailObrigatorio || email) && !isValidEmail(email)) {
      emailErr.classList.add("is-visible"); ok = false;
    }
    if ((CONFIG.telefoneObrigatorio || digits) && digits.length < rule.min) {
      phoneErr.classList.add("is-visible"); ok = false;
    }
    if (!ok) return;

    enviando = true;
    submitEl.disabled = true;
    submitEl.textContent = "Enviando...";

    refreshUtms();
    var fullPhone = digits ? (countryEl.value + digits) : "";

    // evento para o GTM que já existe na página (GTM-TJJ7WGSH)
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: "wf_lead", email: email, phone: fullPhone, utms: utms });
    } catch (err) {}

    // pequeno respiro para o GTM disparar antes de a página sair
    setTimeout(function () {
      try {
        enviarParaActiveCampaign(email, fullPhone);
      } catch (err) {
        log("erro no envio:", err);
        enviando = false;
        submitEl.disabled = false;
        submitEl.textContent = CONFIG.textoBotaoForm;
        return;
      }
      // se a navegação não acontecer (bloqueio, offline), devolve o botão
      setTimeout(function () {
        enviando = false;
        submitEl.disabled = false;
        submitEl.textContent = CONFIG.textoBotaoForm;
      }, 8000);
    }, 250);
  });

  window.WF = {
    open: open,
    close: close,
    revelar: function () { revelarBotao("manual"); },
    liberar: function () { liberarSecoes("manual"); },
    __ready: true
  };
  log("Parte 1 carregada. WF.open() abre o formulário, WF.revelar() força o botão, WF.liberar() mostra as seções.");
})();
