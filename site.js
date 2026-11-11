const clips = document.querySelectorAll(".clip");
const reel = document.querySelector("#reel");
const reelStage = document.querySelector("#reel-stage");
const reelPreview = document.querySelector("#reel-preview");
const reelPoster = reelPreview.querySelector("img");
const reelTitle = document.querySelector("#reel-title");
const reelFile = document.querySelector("#reel-file");
const reelStatus = document.querySelector("#reel-status");
const playbackUnavailable = "Não foi possível reproduzir aqui. Para assistir, use “Ver no YouTube”.";
let activeClip = document.querySelector(".clip[aria-pressed='true']");
let youtubeApi;
let youtubePlayer;
let youtubeRequest = 0;

const aboutReel = document.querySelector("#about-reel");
const aboutPlay = document.querySelector("#about-play");
aboutReel.controls = false;
aboutPlay.hidden = false;
aboutPlay.addEventListener("click", () => {
  aboutReel.controls = true;
  aboutPlay.hidden = true;
  aboutReel.focus();
  aboutReel.play().catch(() => {
    // Os controles nativos permitem tentar reproduzir novamente.
  });
});

for (const video of [aboutReel, reel]) {
  video.addEventListener("contextmenu", (event) => event.preventDefault());
}

function loadYouTube() {
  if (!youtubeApi) {
    youtubeApi = new Promise((resolve, reject) => {
      window.onYouTubeIframeAPIReady = () => resolve(window.YT);
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.addEventListener("error", () => {
        script.remove();
        youtubeApi = undefined;
        reject(new Error("O player do YouTube não carregou."));
      }, { once: true });
      document.head.append(script);
    });
  }
  return youtubeApi;
}

function closeYouTube() {
  youtubePlayer?.destroy();
  youtubePlayer = undefined;
  reelStage.querySelector("iframe")?.remove();
}

function showYouTubeFallback(message) {
  closeYouTube();
  reelPreview.hidden = false;
  reelStatus.textContent = message;
}

async function playYouTube(clip) {
  if (window.location.protocol === "file:") {
    reelStatus.textContent = "Abra a versão publicada do site para usar o player nesta página.";
    return;
  }

  const videoId = clip.dataset.youtube;
  const request = ++youtubeRequest;
  reelStatus.textContent = "Carregando o player do YouTube…";
  try {
    const { Player } = await loadYouTube();
    if (request !== youtubeRequest) return;

    const params = new URLSearchParams({
      enablejsapi: "1",
      origin: window.location.origin,
      autoplay: "1",
      playsinline: "1"
    });
    if (clip.dataset.start) params.set("start", clip.dataset.start);

    const frame = document.createElement("iframe");
    frame.id = "reel-youtube";
    frame.title = reelTitle.textContent;
    frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    frame.allowFullscreen = true;
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.src = "https://www.youtube.com/embed/" + videoId + "?" + params;
    reelPreview.hidden = true;
    reelStage.append(frame);
    youtubePlayer = new Player(frame, {
      events: {
        onReady() {
          if (request === youtubeRequest && youtubePlayer) reelStatus.textContent = "";
        },
        onError({ data }) {
          if (request !== youtubeRequest) return;
          const message = data === 101 || data === 150
            ? `O YouTube recusou a reprodução aqui (erro ${data}). Para assistir, use “Ver no YouTube”.`
            : playbackUnavailable;
          showYouTubeFallback(message);
        }
      }
    });
  } catch {
    if (request === youtubeRequest) {
      showYouTubeFallback(playbackUnavailable);
    }
  }
}

reelPreview.addEventListener("click", () => playYouTube(activeClip));

for (const clip of clips) {
  clip.addEventListener("click", () => {
    activeClip = clip;
    youtubeRequest++;
    closeYouTube();
    for (const item of clips) item.setAttribute("aria-pressed", String(item === clip));

    const title = clip.querySelector("strong").textContent;
    const poster = clip.querySelector("img").getAttribute("src");
    reelTitle.textContent = title;
    reelStatus.textContent = "";

    if (clip.dataset.youtube) {
      reel.pause();
      reel.hidden = true;
      reelPoster.src = poster;
      reelPreview.setAttribute("aria-label", "Reproduzir " + title);
      reelPreview.hidden = false;
      const watchUrl = new URL("https://www.youtube.com/watch");
      watchUrl.searchParams.set("v", clip.dataset.youtube);
      if (clip.dataset.start) watchUrl.searchParams.set("t", clip.dataset.start + "s");
      reelFile.href = watchUrl.href;
      reelFile.hidden = false;
      reelStage.scrollIntoView({ block: "nearest", behavior: "instant" });
      playYouTube(clip);
      return;
    }

    reelPreview.hidden = true;
    reel.hidden = false;
    reel.setAttribute("aria-label", title);
    const file = "./media/" + clip.dataset.file;
    reelFile.hidden = true;
    if (reel.getAttribute("src") !== file) {
      reel.poster = poster;
      reel.src = file;
    }
    reelStage.scrollIntoView({ block: "nearest", behavior: "instant" });
    if (reel.ended) reel.currentTime = 0;
    reel.play().catch(() => {
      // The native controls and direct link remain available.
    });
  });
}

const form = document.querySelector("#quote-form");
const format = form.elements.formato;
const whatsappNumber = "5562985382930";

for (const link of document.querySelectorAll("[data-format]")) {
  link.addEventListener("click", () => {
    format.value = link.dataset.format;
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const fields = new FormData(form);
  const organizer = fields.get("organizador").trim();
  const game = fields.get("jogo").trim();
  const schedule = fields.get("agenda").trim();
  const details = fields.get("detalhes").trim();
  if (!organizer || !game) {
    const field = organizer ? form.elements.jogo : form.elements.organizador;
    field.value = "";
    field.reportValidity();
    return;
  }

  const message = [
    "Olá, Master! Gostaria de consultar um orçamento para narração.",
    "",
    "Organização: " + organizer,
    "Formato: " + fields.get("formato"),
    "Jogo ou simulador: " + game,
    "Data e horário: " + (schedule || "A definir"),
    ...(details ? ["Detalhes: " + details] : []),
    "",
    "Você pode me passar a disponibilidade e o valor?"
  ].join("\n");
  window.location.assign("https://wa.me/" + whatsappNumber + "?text=" + encodeURIComponent(message));
});

