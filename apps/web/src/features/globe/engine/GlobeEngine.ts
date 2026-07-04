/**
 * GlobeEngine — la Terre d'ATLAS, dessinée à l'encre de lumière (ADR-001).
 * Three.js vanille (pas de R3F) : contrôle total de la chorégraphie.
 *
 * Composition de la scène :
 *  - étoiles (Points), poussière d'échelle
 *  - corps de nuit (sphère sombre, silhouette)
 *  - côtes lumineuses (LineSegments, tracé progressif + boost du Méridien)
 *  - atmosphère (fresnel additive sur sphère retournée)
 *
 * Timeline (mode full ≈ 8,4 s, skippable ; short ≈ 3,6 s ; reduced = statique) :
 *  éveil → tracé des côtes → passage du Méridien → installation (France face
 *  caméra) → menu (orbite lente + parallaxe pointeur).
 */
import * as THREE from 'three'

import { buildCoastlines } from '@/features/globe/engine/coastlines'
import { CINEMA } from '@/features/globe/engine/timeline'
import type { CinemaMode, GlobePhase } from '@/features/globe/engine/timeline'

const BEAM = new THREE.Color('#7aa2ff')

/** Caméra : la France face caméra en fin d'installation (θ = 90° − λ). */
const THETA_FRANCE = THREE.MathUtils.degToRad(90 - 2.35)
const PHI_FRANCE = THREE.MathUtils.degToRad(90 - 46.6)
const MENU_DISTANCE = 2.9

/** Rampe [a,b] → [0,1] avec lissage. */
function ramp(t: number, a: number, b: number): number {
  return THREE.MathUtils.smoothstep(t, a, b)
}

export class GlobeEngine {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private clock = new THREE.Clock()
  private frameId = 0

  private coastMaterial: THREE.ShaderMaterial
  private atmosphereMaterial: THREE.ShaderMaterial

  private phase: GlobePhase = 'cinema'
  private mode: CinemaMode = 'full'
  private cinemaTime = 0
  private menuTheta = THETA_FRANCE
  private onMenuEnter: (() => void) | null = null

  /** Parallaxe pointeur (cible et valeur lissée), en radians. */
  private pointerTarget = new THREE.Vector2(0, 0)
  private pointerSmoothed = new THREE.Vector2(0, 0)

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
    this.renderer.setClearColor(new THREE.Color('#08090b'), 1)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)

    this.buildStars()
    this.buildBody()
    this.coastMaterial = this.buildCoasts()
    this.atmosphereMaterial = this.buildAtmosphere()

    this.resize()
    window.addEventListener('resize', this.resize)
    window.addEventListener('pointermove', this.onPointerMove, { passive: true })

    this.renderer.setAnimationLoop(this.update)
  }

  // ── Construction de la scène ──────────────────────────────────

  private buildStars(): void {
    const count = 900
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const dir = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
      ).normalize()
      const r = 30 + Math.random() * 20
      positions[i * 3] = dir.x * r
      positions[i * 3 + 1] = dir.y * r
      positions[i * 3 + 2] = dir.z * r
      sizes[i] = 0.4 + Math.random() * 1.4
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        attribute float aSize;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (140.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.05, d) * 0.55;
          gl_FragColor = vec4(vec3(0.86, 0.88, 0.94), a);
        }`,
    })
    this.scene.add(new THREE.Points(geometry, material))
  }

  private buildBody(): void {
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(1, 96, 96),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#0b0e15') }),
    )
    this.scene.add(body)
  }

  private buildCoasts(): THREE.ShaderMaterial {
    const { geometry } = buildCoastlines(1.002)
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uDraw: { value: 0 },
        uSweep: { value: 10 }, // longitude du Méridien ; 10 = inactif
        uColor: { value: BEAM },
      },
      vertexShader: /* glsl */ `
        attribute float aProgress;
        attribute float aOffset;
        varying float vProgress;
        varying float vOffset;
        varying vec3 vPos;
        void main() {
          vProgress = aProgress;
          vOffset = aOffset;
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uDraw;
        uniform float uSweep;
        uniform vec3 uColor;
        varying float vProgress;
        varying float vOffset;
        varying vec3 vPos;

        void main() {
          // Tracé progressif : chaque anneau s'écrit dans sa fenêtre temporelle.
          float ringDraw = clamp((uDraw - vOffset * 0.55) / 0.45, 0.0, 1.0);
          float drawn = 1.0 - smoothstep(ringDraw - 0.015, ringDraw, vProgress);
          if (drawn <= 0.001) discard;

          // La plume : surbrillance à la tête du tracé.
          float pen = exp(-abs(vProgress - ringDraw) * 90.0) * step(0.001, 1.0 - ringDraw);

          // Le Méridien : bande de lumière qui balaie en longitude.
          float lambda = atan(-vPos.z, vPos.x);
          float d = abs(mod(lambda - uSweep + 3.14159, 6.28318) - 3.14159);
          float sweep = exp(-pow(d / 0.42, 2.0)) * 1.6;

          float intensity = 0.5 + pen * 2.2 + sweep;
          gl_FragColor = vec4(uColor * intensity, drawn * 0.85);
        }`,
    })
    this.scene.add(new THREE.LineSegments(geometry, material))
    return material
  }

  private buildAtmosphere(): THREE.ShaderMaterial {
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      uniforms: {
        uSweep: { value: 10 },
        uColor: { value: BEAM },
        uBoost: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uSweep;
        uniform vec3 uColor;
        uniform float uBoost;
        varying vec3 vNormal;
        varying vec3 vPos;
        void main() {
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, -1.0))), 3.0);
          float lambda = atan(-vPos.z, vPos.x);
          float d = abs(mod(lambda - uSweep + 3.14159, 6.28318) - 3.14159);
          float sweep = exp(-pow(d / 0.6, 2.0));
          float a = fresnel * (0.35 + uBoost * 0.5 + sweep * 0.9);
          gl_FragColor = vec4(uColor, a);
        }`,
    })
    const shell = new THREE.Mesh(new THREE.SphereGeometry(1.04, 96, 96), material)
    this.scene.add(shell)
    return material
  }

  // ── Cycle de vie ──────────────────────────────────────────────

  start(mode: CinemaMode, onMenuEnter: () => void): void {
    this.mode = mode
    this.onMenuEnter = onMenuEnter
    this.cinemaTime = 0
    if (mode === 'reduced') {
      this.enterMenu()
      return
    }
    if (mode === 'short') {
      // Les côtes sont déjà écrites : on rejoue seulement le Méridien.
      this.coastMaterial.uniforms['uDraw']!.value = 1
    }
    this.phase = 'cinema'
  }

  /** Saute à l'état final (clic/touche pendant la cinématique). */
  skip(): void {
    if (this.phase === 'cinema') this.enterMenu()
  }

  private enterMenu(): void {
    this.phase = 'menu'
    this.coastMaterial.uniforms['uDraw']!.value = 1
    this.coastMaterial.uniforms['uSweep']!.value = 10
    this.atmosphereMaterial.uniforms['uSweep']!.value = 10
    this.atmosphereMaterial.uniforms['uBoost']!.value = 1
    this.menuTheta = THETA_FRANCE
    this.onMenuEnter?.()
    this.onMenuEnter = null
  }

  private onPointerMove = (e: PointerEvent): void => {
    this.pointerTarget.set(
      (e.clientX / window.innerWidth - 0.5) * 0.06,
      (e.clientY / window.innerHeight - 0.5) * 0.04,
    )
  }

  private resize = (): void => {
    const { innerWidth: w, innerHeight: h } = window
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  private setCameraSpherical(distance: number, theta: number, phi: number): void {
    this.camera.position.setFromSphericalCoords(distance, phi, theta)
    this.camera.lookAt(0, 0, 0)
  }

  private update = (): void => {
    const dt = Math.min(this.clock.getDelta(), 0.05)
    this.pointerSmoothed.lerp(this.pointerTarget, 1 - Math.exp(-dt * 5))

    if (this.phase === 'cinema') {
      this.cinemaTime += dt
      const t = this.mode === 'short' ? this.cinemaTime + CINEMA.sweepStart - 0.3 : this.cinemaTime

      // Tracé des côtes
      this.coastMaterial.uniforms['uDraw']!.value = ramp(t, CINEMA.drawStart, CINEMA.drawEnd)

      // Passage du Méridien : une traversée complète ouest → est
      const sweepT = ramp(t, CINEMA.sweepStart, CINEMA.sweepEnd)
      const sweepActive = t >= CINEMA.sweepStart && t <= CINEMA.sweepEnd
      const sweepLambda = sweepActive ? -Math.PI + sweepT * 2 * Math.PI : 10
      this.coastMaterial.uniforms['uSweep']!.value = sweepLambda
      this.atmosphereMaterial.uniforms['uSweep']!.value = sweepLambda
      this.atmosphereMaterial.uniforms['uBoost']!.value = ramp(
        t,
        CINEMA.sweepStart,
        CINEMA.settleEnd,
      )

      // Caméra : approche depuis l'Atlantique, plongée douce, installation
      const approach = ramp(t, 0, CINEMA.settleEnd)
      const distance = THREE.MathUtils.lerp(6.4, MENU_DISTANCE, approach)
      const theta = THETA_FRANCE - (1 - approach) * 0.85 + this.pointerSmoothed.x
      const phi =
        THREE.MathUtils.lerp(Math.PI / 2, PHI_FRANCE, ramp(t, 1.2, CINEMA.settleEnd)) +
        this.pointerSmoothed.y
      this.setCameraSpherical(distance, theta, phi)

      if (t >= CINEMA.settleEnd) this.enterMenu()
    } else {
      // Menu : orbite contemplative (≈ 1,15°/s) + parallaxe pointeur
      this.menuTheta += dt * 0.02
      this.setCameraSpherical(
        MENU_DISTANCE,
        this.menuTheta + this.pointerSmoothed.x,
        PHI_FRANCE + this.pointerSmoothed.y,
      )
    }

    this.renderer.render(this.scene, this.camera)
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null)
    cancelAnimationFrame(this.frameId)
    window.removeEventListener('resize', this.resize)
    window.removeEventListener('pointermove', this.onPointerMove)
    this.scene.traverse((obj) => {
      if (
        obj instanceof THREE.Mesh ||
        obj instanceof THREE.LineSegments ||
        obj instanceof THREE.Points
      ) {
        obj.geometry.dispose()
        const material = obj.material as THREE.Material | THREE.Material[]
        if (Array.isArray(material)) material.forEach((m) => m.dispose())
        else material.dispose()
      }
    })
    this.renderer.dispose()
  }
}
