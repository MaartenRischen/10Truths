import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage();
const r = await p.evaluate(() => {
  const c = document.createElement('canvas'); const gl = c.getContext('webgl2');
  if (!gl) return 'no webgl2';
  return JSON.stringify({
    samples: gl.getParameter(gl.MAX_SAMPLES),
    fragUniformVec: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
    vertUniformVec: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
    tex: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    cbf: !!gl.getExtension('EXT_color_buffer_float'),
    cbhf: !!gl.getExtension('EXT_color_buffer_half_float'),
    flin: !!gl.getExtension('OES_texture_float_linear'),
    exts: gl.getSupportedExtensions().join(',')
  });
});
console.log(r); await b.close();
