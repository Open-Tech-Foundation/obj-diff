// Interactive canvas word globe: fibonacci-sphere labels over a shaded ball
// with drag-to-rotate, scroll-to-zoom, and hover glow. Converted to AFW's
// lifecycle: onMount owns the pointer/rAF wiring and an observer on the
// wrapper, onResize re-measures on every layout change (a one-shot measurement
// at connect time can run before styles apply and stick at 0×0), and
// onMediaQuery parks the idle spin for reduced-motion users.

export default function WordGlobe() {
  let wrap = $ref();
  let canvas = $ref();
  let reduced = $state(false);
  let measure = null;

  onMediaQuery("(prefers-reduced-motion: reduce)", (matches) => {
    reduced = matches;
  });

  onResize(() => {
    if (measure) measure();
  });

  onMount(() => {
    if (!wrap || !canvas) return;

    const ctx = canvas.getContext("2d");

    const labels = [
      "Map", "Set", "Date", "BigInt",
      "TypedArray", "Cycles", "Sparse arrays", "Temporal"
    ];

    const points = labels.map((name, i) => {
      const y = 1 - (i / (labels.length - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const angle = i * Math.PI * (3 - Math.sqrt(5));

      return {
        name,
        x: Math.cos(angle) * radius,
        y,
        z: Math.sin(angle) * radius
      };
    });

    let rotationX = -0.25;
    let rotationY = 0;
    let velocityX = 0;
    let velocityY = 0;
    let zoom = 1;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let hovered = null;
    let width = 0;
    let height = 0;
    let radius = 0;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const rect = wrap.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      radius = Math.min(width, height) * 0.37;

      canvas.width = width * DPR;
      canvas.height = height * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    measure = resize;

    function rotate(p) {
      let x = p.x;
      let y = p.y;
      let z = p.z;

      const cy = Math.cos(rotationY);
      const sy = Math.sin(rotationY);

      [x, z] = [x * cy + z * sy, -x * sy + z * cy];

      const cx = Math.cos(rotationX);
      const sx = Math.sin(rotationX);

      [y, z] = [y * cx - z * sx, y * sx + z * cx];

      return { x, y, z };
    }

    function project(p) {
      const scale = 3 / (3 - p.z * 0.55);
      return {
        x: width / 2 + p.x * radius * zoom * scale,
        y: height / 2 - p.y * radius * zoom * scale,
        z: p.z,
        scale
      };
    }

    function drawCurve(getPoint, segments) {
      ctx.beginPath();

      for (let i = 0; i <= segments; i++) {
        const t = i / segments * Math.PI * 2;
        const p = project(rotate(getPoint(t)));

        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }

      ctx.stroke();
    }

    function drawSphere() {
      const rings = 12;
      const segments = 100;

      ctx.strokeStyle = "rgba(105, 111, 137, 0.14)";
      ctx.lineWidth = 0.8;

      // Latitude and longitude lines
      for (let i = 1; i < rings; i++) {
        const lat = -Math.PI / 2 + i * Math.PI / rings;
        drawCurve(t => ({
          x: Math.cos(lat) * Math.cos(t),
          y: Math.sin(lat),
          z: Math.cos(lat) * Math.sin(t)
        }), segments);
      }

      for (let i = 0; i < 8; i++) {
        const lon = i * Math.PI / 8;
        drawCurve(t => ({
          x: Math.cos(t) * Math.cos(lon),
          y: Math.sin(t),
          z: -Math.cos(t) * Math.sin(lon)
        }), segments);
      }
    }

    function render() {
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const r = radius * zoom;

      // Soft ambient shadow
      const shadow = ctx.createRadialGradient(
        cx, cy + r * 0.8, 2,
        cx, cy + r * 0.8, r * 0.7
      );

      shadow.addColorStop(0, "rgba(48, 53, 80, 0.13)");
      shadow.addColorStop(1, "rgba(48, 53, 80, 0)");

      ctx.fillStyle = shadow;
      ctx.beginPath();
      ctx.ellipse(cx, cy + r * 0.8, r * 0.85, r * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sphere body
      const gradient = ctx.createRadialGradient(
        cx - r * 0.35, cy - r * 0.42, 2,
        cx + r * 0.2, cy + r * 0.2, r * 1.5
      );

      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(0.65, "#f0f1f5");
      gradient.addColorStop(1, "#dfe2e9");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      drawSphere();
      ctx.restore();

      // Outer rim
      ctx.strokeStyle = "rgba(111, 116, 139, 0.16)";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // Sort points from back to front
      const projected = points.map(point => ({
        ...project(rotate(point)),
        name: point.name
      })).sort((a, b) => a.z - b.z);

      hovered = null;

      for (const p of projected) {
        if (p.z < -0.08) continue;

        const isHover = pointer.x &&
          Math.hypot(pointer.x - p.x, pointer.y - p.y) < 32 * p.scale;

        if (isHover) hovered = p.name;

        const alpha = Math.max(0.35, 0.55 + p.z * 0.45);
        const fontSize = 11 * p.scale;

        ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
        const textWidth = ctx.measureText(p.name).width;
        const paddingX = 10 * p.scale;
        const paddingY = 6 * p.scale;
        const w = textWidth + paddingX * 2;
        const h = fontSize + paddingY * 2;

        ctx.save();
        ctx.translate(p.x, p.y);

        ctx.shadowColor = isHover
          ? "rgba(102, 56, 220, 0.4)"
          : "rgba(40, 35, 70, 0.16)";

        ctx.shadowBlur = isHover ? 18 : 8;
        ctx.shadowOffsetY = 3;

        ctx.fillStyle = isHover ? "#5b27df" : "#7539ec";

        const x = -w / 2;
        const y = -h / 2;

        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 12 * p.scale);
        ctx.fill();

        ctx.shadowColor = "transparent";
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.name, 0, 0);

        ctx.restore();
      }

      wrap.style.cursor = dragging
        ? "grabbing"
        : hovered ? "pointer" : "grab";
    }

    const pointer = { x: 0, y: 0 };

    let raf = 0;
    function animate() {
      if (!dragging) {
        rotationY += velocityY || (reduced ? 0 : 0.0015);
        rotationX += velocityX;

        velocityX *= 0.95;
        velocityY *= 0.95;

        if (Math.abs(velocityX) < 0.0001) velocityX = 0;
        if (Math.abs(velocityY) < 0.0001) velocityY = 0;
      }

      render();
      raf = requestAnimationFrame(animate);
    }

    function onPointerDown(e) {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      velocityX = 0;
      velocityY = 0;
      wrap.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e) {
      const rect = wrap.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;

      if (!dragging) return;

      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;

      velocityY = dx * 0.004;
      velocityX = dy * 0.004;

      rotationY += velocityY;
      rotationX += velocityX;

      lastX = e.clientX;
      lastY = e.clientY;
    }

    function stopDrag() {
      dragging = false;
    }

    function onPointerLeave() {
      if (!dragging) {
        pointer.x = 0;
        pointer.y = 0;
      }
    }

    function onWheel(e) {
      e.preventDefault();
      zoom = Math.max(0.75, Math.min(1.5, zoom - e.deltaY * 0.001));
    }

    const observer = new ResizeObserver(resize);
    observer.observe(wrap);

    window.addEventListener("resize", resize);
    wrap.addEventListener("pointerdown", onPointerDown);
    wrap.addEventListener("pointermove", onPointerMove);
    wrap.addEventListener("pointerup", stopDrag);
    wrap.addEventListener("pointercancel", stopDrag);
    wrap.addEventListener("pointerleave", onPointerLeave);
    wrap.addEventListener("wheel", onWheel, { passive: false });

    resize();
    animate();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      wrap.removeEventListener("pointerdown", onPointerDown);
      wrap.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("pointerup", stopDrag);
      wrap.removeEventListener("pointercancel", stopDrag);
      wrap.removeEventListener("pointerleave", onPointerLeave);
      wrap.removeEventListener("wheel", onWheel);
      measure = null;
    };
  });

  return (
    <div class="word-globe-block">
      <div class="word-globe" ref={wrap}>
        <canvas
          ref={canvas}
          aria-label="Interactive 3D globe of supported JavaScript values. Drag to rotate and scroll to zoom."
        />
      </div>
    </div>
  );
}
