import Phaser from 'phaser';
import { COLORS, FONT, FONT_FAMILY, HEX } from '../ui/theme';
import { makeButton, type Button } from '../ui/Button';
import { BuildPanel, type BuildSelection, PANEL_TOP } from '../ui/BuildPanel';
import { HeroPanel, HERO_PANEL_TOP, type HeroCommand } from '../ui/HeroPanel';
import { HeroBuilder } from '../ui/HeroBuilder';
import { ArrivalPrompt, ARRIVAL_TOP, ARRIVAL_BOTTOM } from '../ui/ArrivalPrompt';
import { getStructure } from '../data/structures';
import { type Attributes } from '../data/attributes';
import {
  clearObstacle,
  type FortressState,
  getCell,
  inBounds,
  levelUp,
  placeStructure,
  removeStructure,
  structureBuildProgress,
} from '../systems/grid';
import { generateTerrain, isClearable, terrainAt, type TerrainType } from '../systems/terrain';
import { loadOrCreateFortress, saveFortress } from '../systems/save';
import { createStarterRoster, type Hero, makePlayerHero, promote } from '../systems/hero';
import {
  commandAssist,
  commandGather,
  commandGuard,
  commandMove,
  type GatherNode,
  rehydratePath,
  tickWorld,
} from '../systems/task';
import { createRecruitState, tickRecruit, acceptArrival, rejectArrival } from '../systems/recruit';
import { type HeroWorld, loadHeroes, saveHeroes } from '../systems/heroSave';
import { isWalkable } from '../systems/pathfind';
import { TerrainRenderer } from './fortress/TerrainRenderer';
import { MapCamera } from './fortress/MapCamera';
import { HeroSprite } from './fortress/HeroSprite';
import { BaseScene } from './BaseScene';

/** On-screen size of a map cell (matches the 64px source tiles, 1:1). */
const CELL = 64;
/** Movement past this (design px) turns a press into a pan, not a tap. */
const DRAG_THRESHOLD = 12;
/** A press longer than this isn't a tap. */
const TAP_MAX_MS = 350;
/** UI bands (design px): taps here are UI, never map taps. */
const HEADER_BOTTOM = 150;
const FOOTER_TOP = 1080;
/** Fixed simulation step (ms) — the deterministic world tick runs at 10 Hz. */
const STEP_MS = 100;
/** Resource cost to create a freeform hero. */
const HERO_COST = 40;
/** Resources auto-saved at most this often (sim ms) while heroes work. */
const SAVE_INTERVAL_MS = 4000;
/** Pawn radius in pixels. */
const HERO_RADIUS = 22;

type Gesture = 'none' | 'pending' | 'pan' | 'pinch' | 'ui';

/**
 * Fortress build mode. A large, procedurally-generated terrain map the player
 * pans and zooms; they open the build panel, place a unique stronghold, clear
 * obstacles, and build level-gated defenses. The map renders on the main camera
 * (pannable/zoomable); a fixed UI camera keeps the HUD in place.
 */
export class FortressScene extends BaseScene {
  private state!: FortressState;
  private terrain!: TerrainType[];
  private selection: BuildSelection = { mode: 'none' };

  private mapLayer!: Phaser.GameObjects.Container;
  private uiLayer!: Phaser.GameObjects.Container;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private terrainView!: TerrainRenderer;
  private mapCam!: MapCamera;

  private structGfx!: Phaser.GameObjects.Graphics;
  private gridGfx!: Phaser.GameObjects.Graphics;
  private sprites: Phaser.GameObjects.Image[] = [];
  private labels: Phaser.GameObjects.Text[] = [];

  private buildPanel!: BuildPanel;
  private hudText!: Phaser.GameObjects.Text;

  // Hero/garrison layer.
  private heroWorld!: HeroWorld;
  private heroSprites = new Map<string, HeroSprite>();
  private heroPanel!: HeroPanel;
  private heroBuilder!: HeroBuilder;
  private arrivalPrompt!: ArrivalPrompt;
  private footerButtons: Button[] = [];
  private selectedHeroId: string | null = null;
  private simClock = 0;
  private acc = 0;
  private lastSaveClock = 0;
  private completedCount = -1;

  private gesture: Gesture = 'none';
  private downX = 0;
  private downY = 0;
  private downTime = 0;
  private pinchPrevDist = 0;

  constructor() {
    super('Fortress');
  }

  create(): void {
    this.state = loadOrCreateFortress();
    this.terrain = generateTerrain(this.state.seed, this.state.cols, this.state.rows);

    // Layers: map (pannable) and UI (fixed). Gate each by camera so neither
    // double-renders. Setting cameraFilter on the root containers gates the
    // whole subtree, including children added later (sprites, flashes, panel).
    this.mapLayer = this.add.container(0, 0);
    this.uiLayer = this.add.container(0, 0);
    this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.mapLayer.cameraFilter |= this.uiCamera.id;
    this.uiLayer.cameraFilter |= this.cameras.main.id;

    this.extraCameras.push(this.uiCamera);
    this.enter();

    const mapW = this.state.cols * CELL;
    const mapH = this.state.rows * CELL;

    this.terrainView = new TerrainRenderer(
      this,
      this.mapLayer,
      this.terrain,
      this.state.cols,
      this.state.rows,
      CELL,
      this.state.cleared
    );

    this.structGfx = this.add.graphics().setDepth(10);
    this.mapLayer.add(this.structGfx);
    this.gridGfx = this.add.graphics().setDepth(20).setVisible(false);
    this.mapLayer.add(this.gridGfx);
    this.drawGridLines(mapW, mapH);
    this.redrawStructures();

    this.initHeroWorld();
    this.createHeroSprites();

    this.mapCam = new MapCamera(this.cameras.main, mapW, mapH);
    this.wireInput();
    this.buildUi();
    this.updateHud();
    this.syncHeroes();
  }

  // --- Hero world ---------------------------------------------------------

  /** Load the saved roster or build a fresh one (starter roster + gather nodes). */
  private initHeroWorld(): void {
    const loaded = loadHeroes();
    if (loaded) {
      this.heroWorld = loaded;
      // Paths aren't persisted — recompute them for any in-progress task.
      for (const hero of this.heroWorld.heroes) {
        rehydratePath(this.state, this.terrain, hero);
      }
      return;
    }
    const heroes = createStarterRoster(this.state.seed);
    this.placeStarterHeroes(heroes);
    this.heroWorld = {
      heroes,
      recruit: createRecruitState(this.state.seed),
      nodes: this.seedGatherNodes(),
    };
    saveHeroes(this.heroWorld);
  }

  /** Nearest walkable, unoccupied cell to the map center (spiral outward). */
  private spiralFreeCell(isOccupied: (col: number, row: number) => boolean): {
    col: number;
    row: number;
  } {
    const cx = Math.floor(this.state.cols / 2);
    const cy = Math.floor(this.state.rows / 2);
    const max = this.state.cols + this.state.rows;
    for (let radius = 0; radius <= max; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (Math.abs(dx) + Math.abs(dy) !== radius) continue;
          const col = cx + dx;
          const row = cy + dy;
          if (!isWalkable(this.state, this.terrain, col, row)) continue;
          if (isOccupied(col, row)) continue;
          return { col, row };
        }
      }
    }
    return { col: cx, row: cy };
  }

  /** Place starter heroes on distinct walkable cells near the map center. */
  private placeStarterHeroes(heroes: Hero[]): void {
    const taken = new Set<string>();
    for (const hero of heroes) {
      const { col, row } = this.spiralFreeCell((c, r) => taken.has(`${c},${r}`));
      hero.col = col;
      hero.row = row;
      taken.add(`${col},${row}`);
    }
  }

  /** Seed a handful of gather nodes from the terrain's trees and rocks. */
  private seedGatherNodes(): GatherNode[] {
    const nodes: GatherNode[] = [];
    for (let row = 0; row < this.state.rows && nodes.length < 12; row++) {
      for (let col = 0; col < this.state.cols && nodes.length < 12; col++) {
        const type = terrainAt(this.terrain, this.state.cols, col, row);
        if (isClearable(type)) nodes.push({ col, row, remaining: 4 });
      }
    }
    return nodes;
  }

  private createHeroSprites(): void {
    for (const hero of this.heroWorld.heroes) {
      const sprite = new HeroSprite(this, hero, HERO_RADIUS);
      this.mapLayer.add(sprite);
      this.heroSprites.set(hero.id, sprite);
    }
  }

  // --- Rendering ----------------------------------------------------------

  private cellCenter(col: number, row: number): { x: number; y: number } {
    return { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 };
  }

  private drawGridLines(mapW: number, mapH: number): void {
    this.gridGfx.clear();
    this.gridGfx.lineStyle(1, HEX.gridLine, 0.5);
    for (let c = 0; c <= this.state.cols; c++) {
      this.gridGfx.lineBetween(c * CELL, 0, c * CELL, mapH);
    }
    for (let r = 0; r <= this.state.rows; r++) {
      this.gridGfx.lineBetween(0, r * CELL, mapW, r * CELL);
    }
  }

  private redrawStructures(): void {
    this.structGfx.clear();
    this.labels.forEach((t) => t.destroy());
    this.labels = [];
    this.sprites.forEach((s) => s.destroy());
    this.sprites = [];

    const pad = 5;
    const size = CELL - pad * 2;
    for (let row = 0; row < this.state.rows; row++) {
      for (let col = 0; col < this.state.cols; col++) {
        const cell = getCell(this.state, col, row);
        if (!cell) continue;
        const def = getStructure(cell.structureId);
        if (!def) continue;
        const { x, y } = this.cellCenter(col, row);
        const isHold = def.category === 'stronghold';
        // Construction sites render dimmed until complete.
        const building = structureBuildProgress(cell) < 1;
        const alpha = building ? 0.5 : 1;

        if (def.texKey && this.textures.exists(def.texKey)) {
          const sprite = this.add
            .image(x, y, def.texKey)
            .setOrigin(0.5)
            .setDepth(10)
            .setAlpha(alpha);
          if (def.category === 'wall') {
            sprite.setDisplaySize(CELL, CELL);
          } else {
            sprite.setScale(Math.min(size / sprite.width, size / sprite.height));
          }
          this.mapLayer.add(sprite);
          this.sprites.push(sprite);
          continue;
        }

        this.structGfx.fillStyle(def.fillColor, (isHold ? 1 : 0.92) * alpha);
        this.structGfx.lineStyle(isHold ? 3 : 2, isHold ? HEX.gold : HEX.panelBorder, 1);
        this.structGfx.fillRoundedRect(x - size / 2, y - size / 2, size, size, 8);
        this.structGfx.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 8);

        const label = this.add
          .text(x, y, isHold ? 'HOLD' : def.name, {
            fontFamily: FONT_FAMILY,
            fontSize: '13px',
            color: isHold ? COLORS.bg : COLORS.text,
            fontStyle: isHold ? 'bold' : 'normal',
          })
          .setOrigin(0.5)
          .setDepth(10);
        this.mapLayer.add(label);
        this.labels.push(label);
      }
    }
  }

  private flashInvalid(col: number, row: number): void {
    const { x, y } = this.cellCenter(col, row);
    const g = this.add.graphics().setDepth(30);
    this.mapLayer.add(g);
    g.fillStyle(HEX.invalid, 0.5);
    g.fillRoundedRect(x - CELL / 2 + 3, y - CELL / 2 + 3, CELL - 6, CELL - 6, 6);
    this.tweens.add({ targets: g, alpha: 0, duration: 280, onComplete: () => g.destroy() });
  }

  // --- Simulation tick ----------------------------------------------------

  update(_t: number, dt: number): void {
    if (!this.heroWorld) return;
    this.acc += dt;
    let stepped = false;
    while (this.acc >= STEP_MS) {
      this.acc -= STEP_MS;
      this.simClock += STEP_MS;
      tickWorld({
        state: this.state,
        terrain: this.terrain,
        heroes: this.heroWorld.heroes,
        nodes: this.heroWorld.nodes,
        dtMs: STEP_MS,
      });
      tickRecruit(this.heroWorld.recruit, this.state, this.simClock);
      stepped = true;
    }
    if (!stepped) return;

    this.syncHeroes();
    this.refreshArrival();
    this.updateHud();
    if (this.heroPanel.isOpen()) this.heroPanel.refresh();

    // Redraw structures only when a build site completes (avoid per-step churn).
    const completed = this.state.cells.reduce(
      (n, c) => (c && c.build === undefined ? n + 1 : n),
      0
    );
    if (completed !== this.completedCount) {
      this.completedCount = completed;
      this.redrawStructures();
    }

    if (this.simClock - this.lastSaveClock >= SAVE_INTERVAL_MS) {
      this.lastSaveClock = this.simClock;
      saveHeroes(this.heroWorld);
      saveFortress(this.state);
    }
  }

  // --- Heroes -------------------------------------------------------------

  /** Position every pawn (interpolated along its path) and refresh selection. */
  private syncHeroes(): void {
    for (const hero of this.heroWorld.heroes) {
      const sprite = this.heroSprites.get(hero.id);
      if (!sprite) continue;
      let { x, y } = this.cellCenter(hero.col, hero.row);
      const t = hero.task;
      if (t.path && t.path.length > 1 && t.stepFrac) {
        const next = t.path[1];
        const nc = next % this.state.cols;
        const nr = Math.floor(next / this.state.cols);
        x += (nc - hero.col) * CELL * t.stepFrac;
        y += (nr - hero.row) * CELL * t.stepFrac;
      }
      sprite.sync(x, y, hero, hero.id === this.selectedHeroId);
    }
  }

  private refreshArrival(): void {
    const pending = this.heroWorld.recruit.pending;
    if (pending && !this.arrivalPrompt.isOpen()) {
      this.arrivalPrompt.show(pending.hero);
    } else if (!pending && this.arrivalPrompt.isOpen()) {
      this.arrivalPrompt.hide();
    }
  }

  private selectedHero(): Hero | null {
    return this.heroWorld.heroes.find((h) => h.id === this.selectedHeroId) ?? null;
  }

  private heroAt(col: number, row: number): Hero | null {
    return this.heroWorld.heroes.find((h) => h.col === col && h.row === row) ?? null;
  }

  private selectHero(hero: Hero): void {
    this.selectedHeroId = hero.id;
    this.heroPanel.open(hero);
    this.syncHeroes();
  }

  private deselectHero(): void {
    this.selectedHeroId = null;
    this.heroPanel.close();
    this.syncHeroes();
  }

  private issueCommand(cmd: HeroCommand, col: number, row: number): void {
    const hero = this.selectedHero();
    if (!hero) return;
    let ok = false;
    if (cmd === 'move') {
      ok = commandMove(this.state, this.terrain, hero, col, row);
    } else if (cmd === 'guard') {
      ok = commandGuard(this.state, this.terrain, hero, col, row);
    } else if (cmd === 'assist') {
      ok = commandAssist(this.state, this.terrain, hero, col, row);
    } else if (cmd === 'gather') {
      const node = this.heroWorld.nodes.find((n) => n.col === col && n.row === row);
      if (node) ok = commandGather(this.state, this.terrain, hero, node);
    }
    if (ok) {
      this.heroPanel.clearArmed();
      this.heroPanel.refresh();
      this.syncHeroes();
      saveHeroes(this.heroWorld);
    } else {
      this.flashInvalid(col, row);
    }
  }

  private createHero(name: string, attr: Attributes): void {
    if (this.state.resources < HERO_COST) return;
    const id = `hero-${Date.now().toString(36)}-${this.heroWorld.heroes.length}`;
    const { col, row } = this.spiralFreeCell((c, r) =>
      this.heroWorld.heroes.some((h) => h.col === c && h.row === r)
    );
    const hero = makePlayerHero(id, name, attr, col, row);
    this.state.resources -= HERO_COST;
    this.heroWorld.heroes.push(hero);
    const sprite = new HeroSprite(this, hero, HERO_RADIUS);
    this.mapLayer.add(sprite);
    this.heroSprites.set(hero.id, sprite);
    this.heroBuilder.close();
    this.updateHud();
    this.syncHeroes();
    saveHeroes(this.heroWorld);
    saveFortress(this.state);
  }

  // --- UI -----------------------------------------------------------------

  private buildUi(): void {
    this.uiLayer.add(this.heading('Fortress', 60));
    this.hudText = this.add
      .text(this.cx, 116, '', { fontFamily: FONT_FAMILY, fontSize: FONT.body, color: COLORS.text })
      .setOrigin(0.5);
    this.uiLayer.add(this.hudText);

    this.buildPanel = new BuildPanel(this, {
      onChange: (sel) => {
        this.selection = sel;
      },
      onLevelUp: () => this.handleLevelUp(),
    });
    this.uiLayer.add(this.buildPanel.root);

    this.heroPanel = new HeroPanel(this, {
      onCommand: () => {
        // Arming a command closes the build panel so the next tap aims it.
        if (this.buildPanel.isOpen()) this.toggleBuild();
      },
      onPromote: () => this.handlePromote(),
      onClose: () => this.deselectHero(),
    });
    this.uiLayer.add(this.heroPanel.root);

    this.heroBuilder = new HeroBuilder(this, {
      cost: HERO_COST,
      onConfirm: (name, attr) => this.createHero(name, attr),
      onCancel: () => this.heroBuilder.close(),
    });
    this.uiLayer.add(this.heroBuilder.root);

    this.arrivalPrompt = new ArrivalPrompt(this, {
      onAccept: () => this.handleAcceptArrival(),
      onReject: () => this.handleRejectArrival(),
    });
    this.uiLayer.add(this.arrivalPrompt.root);

    const build = makeButton(this, {
      x: this.cx - 175,
      y: 1120,
      label: 'Build',
      variant: 'primary',
      width: 330,
      height: 84,
      onClick: () => this.guardUi(() => this.toggleBuild()),
    });
    const newHero = makeButton(this, {
      x: this.cx + 175,
      y: 1120,
      label: 'New Hero',
      variant: 'primary',
      width: 330,
      height: 84,
      onClick: () => this.guardUi(() => this.openHeroBuilder()),
    });
    const back = makeButton(this, {
      x: this.cx - 175,
      y: 1210,
      label: 'Back',
      variant: 'secondary',
      width: 330,
      height: 84,
      onClick: () => this.guardUi(() => this.goTo('MainMenu')),
    });
    const dungeon = makeButton(this, {
      x: this.cx + 175,
      y: 1210,
      label: 'Enter Dungeon',
      variant: 'primary',
      width: 330,
      height: 84,
      onClick: () => this.guardUi(() => this.goTo('Dungeon')),
    });
    this.footerButtons = [build, newHero, back, dungeon];
    this.uiLayer.add(this.footerButtons);
  }

  /** Ignore footer taps while the modal hero builder is open. */
  private guardUi(action: () => void): void {
    if (this.heroBuilder.isOpen()) return;
    action();
  }

  private openHeroBuilder(): void {
    if (this.buildPanel.isOpen()) this.toggleBuild();
    this.deselectHero();
    this.heroBuilder.setAffordable(this.state.resources >= HERO_COST);
    this.heroBuilder.open();
  }

  private toggleBuild(): void {
    this.deselectHero();
    this.buildPanel.toggle();
    if (!this.buildPanel.isOpen()) this.selection = { mode: 'none' };
    this.gridGfx.setVisible(this.buildPanel.isOpen());
  }

  private handlePromote(): void {
    const hero = this.selectedHero();
    if (hero && promote(hero)) {
      this.heroPanel.refresh();
      this.syncHeroes();
      saveHeroes(this.heroWorld);
    }
  }

  private handleAcceptArrival(): void {
    const hero = acceptArrival(this.heroWorld.recruit);
    if (!hero) return;
    const { col, row } = this.spiralFreeCell((c, r) =>
      this.heroWorld.heroes.some((h) => h.col === c && h.row === r)
    );
    hero.col = col;
    hero.row = row;
    this.heroWorld.heroes.push(hero);
    const sprite = new HeroSprite(this, hero, HERO_RADIUS);
    this.mapLayer.add(sprite);
    this.heroSprites.set(hero.id, sprite);
    this.arrivalPrompt.hide();
    this.syncHeroes();
    saveHeroes(this.heroWorld);
  }

  private handleRejectArrival(): void {
    rejectArrival(this.heroWorld.recruit);
    this.arrivalPrompt.hide();
    saveHeroes(this.heroWorld);
  }

  private updateHud(): void {
    this.hudText.setText(`Resources: ${this.state.resources}    Level: ${this.state.level}`);
    this.buildPanel.setLevel(this.state.level);
    this.buildPanel.setResources(this.state.resources);
  }

  private handleLevelUp(): void {
    if (levelUp(this.state)) {
      saveFortress(this.state);
      this.updateHud();
    }
  }

  // --- Input / gestures ---------------------------------------------------

  private wireInput(): void {
    this.input.addPointer(2);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointerDown(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onPointerMove(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onPointerUp(p));
    this.input.on('wheel', (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      this.mapCam.zoomBy(dy > 0 ? 0.9 : 1.1, p.x, p.y);
    });
  }

  private isPointerOverUI(p: Phaser.Input.Pointer): boolean {
    if (this.heroBuilder.isOpen()) return true; // full-screen modal
    if (p.y < HEADER_BOTTOM || p.y > FOOTER_TOP) return true;
    if (this.buildPanel.isOpen() && p.y >= PANEL_TOP) return true;
    if (this.heroPanel.isOpen() && p.y >= HERO_PANEL_TOP) return true;
    if (this.arrivalPrompt.isOpen() && p.y >= ARRIVAL_TOP && p.y <= ARRIVAL_BOTTOM) return true;
    return false;
  }

  private twoDown(): boolean {
    return this.input.pointer1.isDown && this.input.pointer2.isDown;
  }

  private onPointerDown(p: Phaser.Input.Pointer): void {
    if (this.twoDown()) {
      this.gesture = 'pinch';
      this.pinchPrevDist = this.pointerDistance();
      return;
    }
    if (this.isPointerOverUI(p)) {
      this.gesture = 'ui';
      return;
    }
    this.gesture = 'pending';
    this.downX = p.x;
    this.downY = p.y;
    this.downTime = this.time.now;
  }

  private onPointerMove(p: Phaser.Input.Pointer): void {
    if (this.gesture === 'ui') return;
    if (this.twoDown()) {
      this.gesture = 'pinch';
      const d = this.pointerDistance();
      if (this.pinchPrevDist > 0) {
        const midX = (this.input.pointer1.x + this.input.pointer2.x) / 2;
        const midY = (this.input.pointer1.y + this.input.pointer2.y) / 2;
        this.mapCam.zoomBy(d / this.pinchPrevDist, midX, midY);
      }
      this.pinchPrevDist = d;
      return;
    }
    if (this.gesture === 'pinch') return;
    if (this.gesture === 'pending') {
      if (Phaser.Math.Distance.Between(p.x, p.y, this.downX, this.downY) > DRAG_THRESHOLD) {
        this.gesture = 'pan';
      }
    }
    if (this.gesture === 'pan') {
      this.mapCam.panBy(p.x - p.prevPosition.x, p.y - p.prevPosition.y);
    }
  }

  private onPointerUp(p: Phaser.Input.Pointer): void {
    const stillDown = this.input.pointer1.isDown || this.input.pointer2.isDown;
    if (this.gesture === 'pinch') {
      this.pinchPrevDist = 0;
      if (!stillDown) this.gesture = 'none';
      return;
    }
    if (this.gesture === 'pan' || this.gesture === 'ui') {
      if (!stillDown) this.gesture = 'none';
      return;
    }
    if (this.gesture === 'pending') {
      const moved = Phaser.Math.Distance.Between(p.x, p.y, this.downX, this.downY);
      if (this.time.now - this.downTime < TAP_MAX_MS && moved < DRAG_THRESHOLD) {
        this.handleMapTap(p);
      }
      this.gesture = 'none';
    }
  }

  private pointerDistance(): number {
    return Phaser.Math.Distance.Between(
      this.input.pointer1.x,
      this.input.pointer1.y,
      this.input.pointer2.x,
      this.input.pointer2.y
    );
  }

  private handleMapTap(p: Phaser.Input.Pointer): void {
    const wp = this.cameras.main.getWorldPoint(p.x, p.y);
    const col = Math.floor(wp.x / CELL);
    const row = Math.floor(wp.y / CELL);
    if (!inBounds(this.state, col, row)) return;

    // Build mode: a tool is armed in the build panel.
    if (this.selection.mode !== 'none') {
      let changed = false;
      if (this.selection.mode === 'build') {
        changed = placeStructure(this.state, this.terrain, col, row, this.selection.defId);
        if (changed) this.completedCount = -1; // force a structure redraw next tick
      } else if (this.selection.mode === 'clear') {
        changed = clearObstacle(this.state, this.terrain, col, row);
        if (changed) this.terrainView.eraseCell(col, row);
      } else if (this.selection.mode === 'remove') {
        changed = removeStructure(this.state, col, row);
      }
      if (changed) {
        this.redrawStructures();
        this.updateHud();
        saveFortress(this.state);
      } else {
        this.flashInvalid(col, row);
      }
      return;
    }

    // While the build panel is open (no tool armed), leave the map alone.
    if (this.buildPanel.isOpen()) return;

    // Hero mode: aim an armed command, else select/deselect a pawn.
    const armed = this.heroPanel.armedCommand();
    if (armed && this.selectedHero()) {
      this.issueCommand(armed, col, row);
      return;
    }
    const hero = this.heroAt(col, row);
    if (hero) this.selectHero(hero);
    else this.deselectHero();
  }
}
