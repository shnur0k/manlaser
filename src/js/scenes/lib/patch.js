import { NOISE } from './glsl.js';

/**
 * Встраивает свой GLSL в стандартный PBR-материал Three.js (MeshStandard/MeshPhysical),
 * чтобы сохранить честное освещение и отражения, но управлять цветом/шероховатостью/свечением шейдером.
 *
 * opts.uniforms   — { name: { value } }
 * opts.varyings   — объявления varying (общие для вершинного и фрагментного шейдера)
 * opts.vertex     — код после #include <begin_vertex> (доступны position, transformed)
 * opts.fragmentHead — объявления/функции фрагментного шейдера
 * opts.color      — код после <map_fragment>: можно менять diffuseColor
 * opts.roughness / opts.metalness — код после соответствующих чанков (roughnessFactor / metalnessFactor)
 * opts.normal     — код после <normal_fragment_begin> (переменная normal в видовых координатах)
 * opts.emissive   — код после <emissivemap_fragment> (totalEmissiveRadiance)
 * opts.alpha      — код перед <alphatest_fragment> (можно discard)
 */
export function patchMaterial(material, opts) {
  const { uniforms = {}, varyings = '', vertex = '', fragmentHead = '', octaves = 4, key = 'ml' } = opts;
  material.userData.uniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    const uniformDecl = Object.entries(uniforms)
      .map(([name, u]) => `uniform ${glslType(u.value)} ${name};`)
      .join('\n');

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${uniformDecl}\n${varyings}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${vertex}`);

    let fs = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>\n#define ML_OCTAVES ${octaves}\n${uniformDecl}\n${varyings}\n${NOISE}\n${fragmentHead}`,
    );
    if (opts.color) fs = fs.replace('#include <map_fragment>', `#include <map_fragment>\n${opts.color}`);
    if (opts.alpha) fs = fs.replace('#include <alphatest_fragment>', `${opts.alpha}\n#include <alphatest_fragment>`);
    if (opts.roughness) fs = fs.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${opts.roughness}`);
    if (opts.metalness) fs = fs.replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\n${opts.metalness}`);
    if (opts.normal) fs = fs.replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>\n${opts.normal}`);
    if (opts.emissive) fs = fs.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${opts.emissive}`);
    shader.fragmentShader = fs;
  };
  material.customProgramCacheKey = () => `${key}-${octaves}`;
  material.needsUpdate = true;
  return material;
}

function glslType(v) {
  if (typeof v === 'number') return 'float';
  if (typeof v === 'boolean') return 'bool';
  if (v?.isVector2) return 'vec2';
  if (v?.isVector3) return 'vec3';
  if (v?.isVector4) return 'vec4';
  if (v?.isColor) return 'vec3';
  if (v?.isMatrix4) return 'mat4';
  if (v?.isTexture) return 'sampler2D';
  throw new Error('Неизвестный тип uniform');
}
