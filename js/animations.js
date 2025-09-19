document.addEventListener("DOMContentLoaded", async function () {
  // Typewriter animation (API-driven if available)
  const defaultTitle = "Müasir Texnologiyanı Depod ilə əldə et";
  const titleEl = document.getElementById("typewriter-title");
  const subtitleEl = document.querySelector(".hero-subtitle");

  async function loadHeroTexts() {
    try {
      if (window.API && typeof window.API.getHomeSettings === "function") {
        const hs = await window.API.getHomeSettings();
        return {
          title: (hs && hs.home_hero_title) || "",
          subtitle: (hs && hs.home_hero_subtitle) || "",
        };
      }
    } catch (_) {}
    return { title: "", subtitle: "" };
  }

  let { title, subtitle } = await loadHeroTexts();
  const text = (title && title.trim()) || defaultTitle;

  // Clear existing content before typing
  if (titleEl) titleEl.textContent = "";
  // Update subtitle immediately if provided
  if (subtitleEl && subtitle && subtitle.trim()) {
    subtitleEl.textContent = subtitle.trim();
  }

  let i = 0;
  function typeWriter() {
    if (!titleEl) return;
    if (i < text.length) {
      titleEl.textContent += text.charAt(i);
      i++;
      setTimeout(typeWriter, 60);
    }
  }
  typeWriter();

  // Hero image slider animation
  const sliderImages = [
    "image/material/earphone/png/peak-black.png",
    "image/material/earphone/png/peak-black-tips.png",
    "image/material/earphone/png/peak-beige.png",
    "image/material/earphone/png/peak-beige-tips.png",
  ];
  let sliderIndex = 0;
  const sliderImgEl = document.getElementById("hero-slider-img");
  function changeSliderImage() {
    // Animate out (move down and fade out)
    sliderImgEl.style.transform = "translateY(-40px)";
    sliderImgEl.style.opacity = "0";
    setTimeout(() => {
      sliderIndex = (sliderIndex + 1) % sliderImages.length;
      sliderImgEl.src = sliderImages[sliderIndex];
      // Animate in (move from up to normal and fade in)
      sliderImgEl.style.transform = "translateY(40px)";
      setTimeout(() => {
        sliderImgEl.style.transform = "translateY(0)";
        sliderImgEl.style.opacity = "1";
      }, 50);
    }, 700);
  }
  setInterval(changeSliderImage, 4000);
});
