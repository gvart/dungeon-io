/**
 * Test-only shims that let Phaser boot under jsdom (HEADLESS renderer).
 *
 * Import this module *before* importing Phaser, since Phaser runs canvas
 * feature-detection at module-init time. It provides: a no-op 2D canvas context,
 * synchronous Image `load`, and a requestAnimationFrame polyfill — none of which
 * jsdom implements, and all of which Phaser needs to finish booting.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

function make2d(): any {
  return new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'measureText')
          return (s: string) => ({
            width: String(s).length * 8,
            actualBoundingBoxAscent: 8,
            actualBoundingBoxDescent: 2,
          });
        if (prop === 'getImageData')
          return (_x: number, _y: number, w = 1, h = 1) => ({
            data: new Uint8ClampedArray(Math.max(1, w * h) * 4),
            width: w,
            height: h,
          });
        if (prop === 'createImageData')
          return (w = 1, h = 1) => ({
            data: new Uint8ClampedArray(w * h * 4),
            width: w,
            height: h,
          });
        if (
          prop === 'createLinearGradient' ||
          prop === 'createRadialGradient' ||
          prop === 'createPattern'
        )
          return () => ({ addColorStop() {} });
        return () => {};
      },
      set() {
        return true;
      },
    }
  );
}

(HTMLCanvasElement.prototype as any).getContext = function (type: string) {
  return type === 'webgl' || type === 'experimental-webgl' ? null : make2d();
};

// jsdom never fires `load` for Image src (incl. base64 data URIs), which stalls
// Phaser's TextureManager boot (it waits for the default textures).
{
  const proto = (globalThis as any).HTMLImageElement?.prototype;
  if (proto) {
    Object.defineProperty(proto, 'src', {
      configurable: true,
      set(this: any, value: string) {
        this._src = value;
        Object.defineProperty(this, 'width', { configurable: true, value: 1 });
        Object.defineProperty(this, 'height', { configurable: true, value: 1 });
        setTimeout(() => {
          this.dispatchEvent?.(new Event('load'));
          if (typeof this.onload === 'function') this.onload(new Event('load'));
        }, 0);
      },
      get(this: any) {
        return this._src;
      },
    });
  }
}

// jsdom has no requestAnimationFrame; Phaser's game loop needs it to step scenes.
if (typeof window.requestAnimationFrame !== 'function') {
  (window as any).requestAnimationFrame = (cb: FrameRequestCallback) =>
    setTimeout(() => cb(Date.now()), 16) as unknown as number;
  (window as any).cancelAnimationFrame = (id: number) => clearTimeout(id);
}
