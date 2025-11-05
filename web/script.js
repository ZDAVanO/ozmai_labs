(() => {

  const img1Input = document.getElementById('img1Input');
  const img2Input = document.getElementById('img2Input');

  const img1Preview = document.getElementById('img1Preview');
  const img2Preview = document.getElementById('img2Preview');
  const img1Placeholder = document.getElementById('img1Placeholder');
  const img2Placeholder = document.getElementById('img2Placeholder');

  const autoComputeSwitch = document.getElementById('autoComputeSwitch');

  const img1Info = document.getElementById('img1Info');
  const img2Info = document.getElementById('img2Info');
  const img2ResizedInfo = document.getElementById('img2ResizedInfo');

  const resultCanvas = document.getElementById('resultCanvas');
  const resultPlaceholder = document.getElementById('resultPlaceholder');
  const resultInfo = document.getElementById('resultInfo');
  const diffInfo = document.getElementById('diffInfo');
  const img2ResizedCanvas = document.getElementById('img2ResizedCanvas');

  const thresholdPercentRadio = document.getElementById('thresholdPercent');
  const thresholdIntensityRadio = document.getElementById('thresholdIntensity');
  const thresholdLabel = document.getElementById('thresholdLabel');
  const thresholdSlider = document.getElementById('thresholdSlider');
  const thresholdValue = document.getElementById('thresholdValue');
  const computedIntensity = document.getElementById('computedIntensity');

  const computeBtn = document.getElementById('computeBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const formatSelect = document.getElementById('formatSelect');
  const pixelateSwitch = document.getElementById('pixelateSwitch');

  // Modal elements
  const fullscreenModal = document.getElementById('fullscreenModal');
  const fullscreenModalContent = document.getElementById('fullscreenModalContent');

  // Internal state
  let img1Data = null; // { w, h, imageData }
  let img2Data = null; // { w, h, imageData }
  let img2ResizedData = null; // { w, h, imageData }

  // Max Euclidean distance in RGB
  const maxDist = Math.sqrt(255 ** 2 + 255 ** 2 + 255 ** 2);


  // show image/canvas in fullscreen modal
  function showInFullscreenModal(element, title = '') {
    fullscreenModalContent.innerHTML = '';
    let clone;
    if (element.tagName === 'IMG') {
      clone = document.createElement('img');
      clone.src = element.src;
      clone.style.maxWidth = '100%';
      clone.style.maxHeight = '80vh';
      clone.style.objectFit = 'contain';
      clone.className = 'img-fluid';
    } else if (element.tagName === 'CANVAS') {
      clone = document.createElement('canvas');
      clone.width = element.width;
      clone.height = element.height;
      clone.style.maxWidth = '100%';
      clone.style.maxHeight = '80vh';
      clone.style.objectFit = 'contain';
      // Copy canvas content
      const ctx = clone.getContext('2d');
      ctx.drawImage(element, 0, 0);
    }
    if (clone) fullscreenModalContent.appendChild(clone);
    // Set title
    const modalTitle = document.getElementById('fullscreenModalLabel');
    if (modalTitle) modalTitle.textContent = title || 'Full Screen Preview';
    // Show modal
    const modal = new bootstrap.Modal(fullscreenModal);
    modal.show();
  }
  // Add click handlers for preview images and result canvas
  img1Preview.addEventListener('click', function () {
    if (img1Preview.src && img1Preview.style.display !== 'none') {
      showInFullscreenModal(img1Preview, 'Image 1');
    }
  });
  img2Preview.addEventListener('click', function () {
    if (img2Preview.src && img2Preview.style.display !== 'none') {
      showInFullscreenModal(img2Preview, 'Image 2');
    }
  });
  resultCanvas.addEventListener('click', function () {
    if (resultCanvas.width && resultCanvas.height && resultCanvas.style.display !== 'none') {
      showInFullscreenModal(resultCanvas, 'Result');
    }
  });
  img2ResizedCanvas.addEventListener('click', function () {
    if (img2ResizedCanvas.width && img2ResizedCanvas.height && img2ResizedCanvas.style.display !== 'none') {
      showInFullscreenModal(img2ResizedCanvas, 'Image 2 (Resized)');
    }
  });


  // Set initial threshold slider for Percent mode
  function setThresholdUIForPercent() {
    thresholdLabel.textContent = 'Threshold (%)';
    thresholdSlider.min = '0';
    thresholdSlider.max = '100';
    thresholdSlider.step = '0.1';
    thresholdSlider.value = '50.0';
    thresholdValue.textContent = '50.0';
    computedIntensity.textContent = `Computed intensity threshold: ${(parseFloat(thresholdSlider.value) * maxDist / 100).toFixed(2)}`;
  }

  // Set threshold slider for Intensity mode
  function setThresholdUIForIntensity() {
    thresholdLabel.textContent = 'Threshold (intensity)';
    thresholdSlider.min = '0';
    thresholdSlider.max = maxDist.toString();
    thresholdSlider.step = '0.01';
    thresholdSlider.value = (maxDist / 2).toString();
    thresholdValue.textContent = thresholdSlider.value;
    computedIntensity.textContent = `Computed intensity threshold: ${parseFloat(thresholdSlider.value).toFixed(2)}`;
  }

  function getThresholdIntensityValue() {
    if (thresholdPercentRadio.checked) {
      const percent = parseFloat(thresholdSlider.value);
      return percent * maxDist / 100.0;
    } else {
      return parseFloat(thresholdSlider.value);
    }
  }

  function updateThresholdDisplay() {
    thresholdValue.textContent = thresholdSlider.value;
    const intensity = getThresholdIntensityValue();
    computedIntensity.textContent = `Computed intensity threshold: ${intensity.toFixed(2)}`;
  }

  thresholdPercentRadio.addEventListener('change', () => {
    if (thresholdPercentRadio.checked) {
      setThresholdUIForPercent();
      updateThresholdDisplay();
      autoComputeIfReady();
    }
  });
  thresholdIntensityRadio.addEventListener('change', () => {
    if (thresholdIntensityRadio.checked) {
      setThresholdUIForIntensity();
      updateThresholdDisplay();
      autoComputeIfReady();
    }
  });

  thresholdSlider.addEventListener('input', () => {
    updateThresholdDisplay();
    autoComputeIfReady();
  });


  // MARK: loadImageFile()
  // Utility: load image file into Image bitmap and draw to canvas to get ImageData
  function loadImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          resolve({ w: canvas.width, h: canvas.height, imageData, imgElement: img });
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }


  // MARK: resizeNNImageData()
  // Nearest-neighbor resize for RGBA ImageData, returning new ImageData
  function resizeNNImageData(srcImageData, origW, origH, newW, newH) {
    const src = srcImageData.data;
    const out = new ImageData(newW, newH);
    const dst = out.data;
    const channels = 4; // RGBA

    const t0 = performance.now();
    for (let y = 0; y < newH; y++) {
      const origY = Math.floor((y * origH) / newH);
      for (let x = 0; x < newW; x++) {
        const origX = Math.floor((x * origW) / newW);
        const srcIdx = (origY * origW + origX) * channels;
        const dstIdx = (y * newW + x) * channels;
        dst[dstIdx + 0] = src[srcIdx + 0];
        dst[dstIdx + 1] = src[srcIdx + 1];
        dst[dstIdx + 2] = src[srcIdx + 2];
        dst[dstIdx + 3] = src[srcIdx + 3]; // preserve alpha
      }
    }
    const ms = performance.now() - t0;
    return { imageData: out, ms };
  }

  // MARK: diffImagesImageData()
  function diffImagesImageData(img1, img2, w, h, thresholdIntensity) {
    const p1 = img1.data;
    const p2 = img2.data;
    const out = new ImageData(w, h);
    const po = out.data;
    const thr2 = thresholdIntensity * thresholdIntensity;

    const t0 = performance.now();
    // iterate per pixel
    for (let i = 0; i < w * h; i++) {
      const idx = i * 4;
      const r1 = p1[idx + 0], g1 = p1[idx + 1], b1 = p1[idx + 2];
      const r2 = p2[idx + 0], g2 = p2[idx + 1], b2 = p2[idx + 2];

      const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
      const dist2 = dr * dr + dg * dg + db * db;

      if (dist2 > thr2) {
        const sum1 = r1 + g1 + b1;
        const sum2 = r2 + g2 + b2;
        if (sum1 > sum2) {
          po[idx + 0] = 255; po[idx + 1] = 0;   po[idx + 2] = 0;   po[idx + 3] = 255;
        } else {
          po[idx + 0] = 0;   po[idx + 1] = 0;   po[idx + 2] = 255; po[idx + 3] = 255;
        }
      } else {
        po[idx + 0] = r1; po[idx + 1] = g1; po[idx + 2] = b1; po[idx + 3] = 255;
      }
    }
    const ms = performance.now() - t0;
    return { imageData: out, ms };
  }

  function showResultPlaceholder(show) {
    if (show) {
      resultCanvas.style.display = 'none';
      resultPlaceholder.style.display = '';
    } else {
      resultCanvas.style.display = '';
      resultPlaceholder.style.display = 'none';
    }
  }

  function drawResultToCanvas(canvas, imageData) {
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    showResultPlaceholder(false);
  }


  // MARK: autoComputeIfReady()
  // compute and draw result if ready and auto-compute is enabled
  function autoComputeIfReady() {
    // Only run when auto-compute is enabled
    if (!autoComputeSwitch.checked) return;

    if (!(img1Data && img2Data)) {
      showResultPlaceholder(true);
      return;
    }
    const w = img1Data.w;
    const h = img1Data.h;

    // Choose image2 buffer (resized if needed)
    const img2Buf = (img2ResizedData && img2ResizedData.w === w && img2ResizedData.h === h)
      ? img2ResizedData
      : img2Data;

    // If still mismatched, resize on the fly
    let img2ImageData = img2Buf.imageData;
    let resizeMs = 0;
    if (img2Buf.w !== w || img2Buf.h !== h) {
      console.log('Auto-resizing image 2 on the fly');
      const r = resizeNNImageData(img2Buf.imageData, img2Buf.w, img2Buf.h, w, h);
      img2ImageData = r.imageData;
      resizeMs = r.ms;
    }

    const thresholdIntensity = getThresholdIntensityValue();
    const { imageData, ms } = diffImagesImageData(img1Data.imageData, img2ImageData, w, h, thresholdIntensity);
    

    drawResultToCanvas(resultCanvas, imageData);
    resultInfo.textContent = `Result (${w}x${h})`;
    diffInfo.textContent = `diff_images took ${ms.toFixed(3)} ms`;
    
    downloadBtn.disabled = false;
  }

  function enableComputeIfReady() {
    computeBtn.disabled = !(img1Data && img2Data);
      if (img1Data && img2Data) autoComputeIfReady();
  }

  function showImgPlaceholder(imgPreview, placeholder, show) {
    if (show) {
      imgPreview.style.display = 'none';
      placeholder.style.display = '';
    } else {
      imgPreview.style.display = '';
      placeholder.style.display = 'none';
    }
  }

  // On load, show placeholders
  showImgPlaceholder(img1Preview, img1Placeholder, true);
  showImgPlaceholder(img2Preview, img2Placeholder, true);

  // On load, show result placeholder
  showResultPlaceholder(true);

  // MARK: img1Input
  // Handle image 1 input
  img1Input.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const t0 = performance.now();
    try {
      const result = await loadImageFile(file);
      const ms = performance.now() - t0;
      img1Data = { w: result.w, h: result.h, imageData: result.imageData };
      img1Preview.src = result.imgElement.src;
      showImgPlaceholder(img1Preview, img1Placeholder, false);
      img1Info.textContent = `Image 1 (${result.w}x${result.h})`;

        // if image2 is already loaded, check if we need to prepare a resized variant
        if (img2Data) {
          if (img2Data.w !== img1Data.w || img2Data.h !== img1Data.h) {
            const { imageData, ms } = resizeNNImageData(img2Data.imageData, img2Data.w, img2Data.h, img1Data.w, img1Data.h);
            img2ResizedData = { w: img1Data.w, h: img1Data.h, imageData };
            img2ResizedCanvas.style.display = '';
            drawResultToCanvas(img2ResizedCanvas, imageData);
            img2ResizedInfo.style.display = '';
            img2ResizedInfo.textContent = `Image 2 (resized to ${img1Data.w}x${img1Data.h}, resizeNNImageData: ${ms.toFixed(3)} ms)`;
          } else {
            img2ResizedData = null;
            img2ResizedCanvas.style.display = 'none';
            img2ResizedInfo.style.display = 'none';
          }
        }

      enableComputeIfReady();
      autoComputeIfReady();

    } catch (err) {
      console.error(err);
      alert('Failed to load image 1');
      showImgPlaceholder(img1Preview, img1Placeholder, true);
    }
  });

  // MARK: img2Input
  // Handle image 2 input
  img2Input.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await loadImageFile(file);
      img2Data = { w: result.w, h: result.h, imageData: result.imageData };
      img2Preview.src = result.imgElement.src;
      showImgPlaceholder(img2Preview, img2Placeholder, false);
      img2Info.textContent = `Image 2 (${result.w}x${result.h})`;

      // If dimensions differ from image1, prepare a nearest-neighbor resized variant to match image1
      if (img1Data && (img2Data.w !== img1Data.w || img2Data.h !== img1Data.h)) {
        const { imageData, ms } = resizeNNImageData(img2Data.imageData, img2Data.w, img2Data.h, img1Data.w, img1Data.h);
        img2ResizedData = { w: img1Data.w, h: img1Data.h, imageData };
        // Show the resized canvas
        img2ResizedCanvas.style.display = '';
        drawResultToCanvas(img2ResizedCanvas, imageData);

        img2ResizedInfo.style.display = '';
        img2ResizedInfo.textContent = `Image 2 (resized to ${img1Data.w}x${img1Data.h}, resizeNNImageData: ${ms.toFixed(3)} ms)`;
      } else {
        img2ResizedData = null;
        img2ResizedCanvas.style.display = 'none';
        img2ResizedInfo.style.display = 'none';
      }

      enableComputeIfReady();
      autoComputeIfReady();

    } catch (err) {
      console.error(err);
      alert('Failed to load image 2');
      showImgPlaceholder(img2Preview, img2Placeholder, true);
    }
  });








  

  // MARK: computeBtn
  computeBtn.addEventListener('click', () => {
    if (!(img1Data && img2Data)) {
      showResultPlaceholder(true);
      return;
    }

    const w = img1Data.w;
    const h = img1Data.h;

    // Choose image2 buffer (resized if needed)
    const img2Buf = (img2ResizedData && img2ResizedData.w === w && img2ResizedData.h === h)
      ? img2ResizedData
      : img2Data;

    // If still mismatched, resize on the fly
    let img2ImageData = img2Buf.imageData;
    let resizeMs = 0;
    if (img2Buf.w !== w || img2Buf.h !== h) {
      const r = resizeNNImageData(img2Buf.imageData, img2Buf.w, img2Buf.h, w, h);
      img2ImageData = r.imageData;
      resizeMs = r.ms;
    }

    const thresholdIntensity = getThresholdIntensityValue();
    const { imageData, ms } = diffImagesImageData(img1Data.imageData, img2ImageData, w, h, thresholdIntensity);


    // Draw result only to the Row view canvas
    drawResultToCanvas(resultCanvas, imageData);
    resultInfo.textContent = `Result (${w}x${h})`;
    diffInfo.textContent = `diff_images took ${ms.toFixed(3)} ms`;

    // Enable download
    downloadBtn.disabled = false;
  });


  // MARK: Download result
  downloadBtn.addEventListener('click', () => {
    const canvas = resultCanvas;
    if (!canvas.width || !canvas.height) return;
    const format = formatSelect.value;
    let mimeType = 'image/png';
    let ext = 'png';
    if (format === 'jpg') {
      mimeType = 'image/jpeg';
      ext = 'jpg';
    } else if (format === 'bmp') {
      mimeType = 'image/bmp';
      ext = 'bmp';
    }
    if (format === 'bmp') {
      // BMP is not supported by toBlob in most browsers, fallback to dataURL
      const dataUrl = canvas.toDataURL('image/bmp');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `diff_result.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `diff_result.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }, mimeType);
    }
  });



  // Initialize UI
  setThresholdUIForPercent();
  updateThresholdDisplay();


  // Toggle pixelation class and persist preference
  if (pixelateSwitch) {
    pixelateSwitch.addEventListener('change', () => {
      if (pixelateSwitch.checked) {
        document.documentElement.classList.add('pixelated');
      } else {
        document.documentElement.classList.remove('pixelated');
      }
    });
  }


  // When the auto-compute switch is toggled ON, try to compute immediately.
  autoComputeSwitch.addEventListener('change', () => {
    if (autoComputeSwitch.checked) {
      autoComputeIfReady();
    }
  });


})();
