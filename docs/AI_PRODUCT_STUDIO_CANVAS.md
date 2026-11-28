# Phase 3A — local artwork and analysis copy

Web-only browser module: src/lib/productStudioCanvas.web.ts. No remote fetch, external image API, model download, upload or catalog write. Local Blob JPEG/PNG/WebP files (15 MiB, decoded 8192 max side and 20 MP) become a separate analysis PNG, max 1024 side and 5 MiB, using Canvas in sRGB. Original Blob is untouched. MIME signatures checked before browser decode, actual decoded dimensions checked afterwards; this is not a pre-decode decompression-bomb defense. Use trusted local admin files only. Test actual browser exports against the restricted server PNG sanitizer before release.

Three branded artwork templates, square 1080x1080 or portrait 1080x1350. Aspect ratio preserved without cropping; text requires explicit admin review, unknown/unconfirmed fitment omitted. Text measurement refuses overflow rather than hiding content. Transparent cutout support is only a rendering input; background removal/segmentation is NOT implemented here. Standard photo mode keeps its original background in a styled frame. No changes to product UI or native bundles at this stage because no screen imports this module yet.

Unit tests cover pure layout and browser contract with a simulated Canvas/bitmap runtime. They do not prove visual quality or browser compatibility. Next: real browser tests, actual admin UI and approved fitment flow, local segmentation evaluation with license/performance benchmark, manual fallback, existing ImgBB limits, and live staging Gemini test. No deployment or costs introduced.

Browser references: https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap and https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob.
