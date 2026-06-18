import Phaser from 'phaser';
import { COLORS, FONT, FONT_FAMILY, HEX } from './theme';
import { makeButton } from './Button';
import { type Hero, heroStats } from '../systems/hero';

export interface ArrivalPromptConfig {
  onAccept: () => void;
  onReject: () => void;
}

/** Screen band (design px) the prompt occupies while visible. */
export const ARRIVAL_TOP = 150;
export const ARRIVAL_BOTTOM = 470;
const PANEL_X = 40;

/**
 * A banner shown when a wandering recruit arrives. Summarizes the candidate and
 * offers Accept / Reject. The third option — Attack — is deferred to Phase 4
 * (combat), so it is shown disabled to telegraph the upcoming feature.
 */
export class ArrivalPrompt {
  readonly root: Phaser.GameObjects.Container;
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly statsText: Phaser.GameObjects.Text;
  private opened = false;

  constructor(scene: Phaser.Scene, cfg: ArrivalPromptConfig) {
    this.root = scene.add.container(0, 0).setVisible(false).setDepth(40);

    const w = scene.scale.width;
    const pw = w - PANEL_X * 2;
    const bg = scene.add.graphics();
    bg.fillStyle(HEX.panel, 0.98);
    bg.lineStyle(2, HEX.gold, 1);
    bg.fillRoundedRect(PANEL_X, ARRIVAL_TOP, pw, ARRIVAL_BOTTOM - ARRIVAL_TOP, 18);
    bg.strokeRoundedRect(PANEL_X, ARRIVAL_TOP, pw, ARRIVAL_BOTTOM - ARRIVAL_TOP, 18);
    this.root.add(bg);

    this.root.add(
      scene.add
        .text(w / 2, ARRIVAL_TOP + 28, 'A hero approaches!', {
          fontFamily: FONT_FAMILY,
          fontSize: FONT.body,
          color: COLORS.gold,
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
    );
    this.nameText = scene.add
      .text(w / 2, ARRIVAL_TOP + 70, '', {
        fontFamily: FONT_FAMILY,
        fontSize: FONT.body,
        color: COLORS.text,
      })
      .setOrigin(0.5);
    this.statsText = scene.add
      .text(w / 2, ARRIVAL_TOP + 110, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '16px',
        color: COLORS.muted,
        align: 'center',
        lineSpacing: 4,
      })
      .setOrigin(0.5);
    this.root.add([this.nameText, this.statsText]);

    const btnY = ARRIVAL_BOTTOM - 50;
    this.root.add(
      makeButton(scene, {
        x: w / 2 - 200,
        y: btnY,
        label: 'Accept',
        variant: 'primary',
        width: 200,
        height: 76,
        onClick: () => cfg.onAccept(),
      })
    );
    this.root.add(
      makeButton(scene, {
        x: w / 2,
        y: btnY,
        label: 'Reject',
        variant: 'secondary',
        width: 200,
        height: 76,
        onClick: () => cfg.onReject(),
      })
    );
    // Attack is deferred to Phase 4 combat — shown disabled.
    const attack = makeButton(scene, {
      x: w / 2 + 200,
      y: btnY,
      label: 'Attack',
      variant: 'secondary',
      width: 200,
      height: 76,
      onClick: () => {},
    });
    attack.setAlpha(0.4);
    this.root.add(attack);
  }

  isOpen(): boolean {
    return this.opened;
  }

  show(hero: Hero): void {
    const s = heroStats(hero);
    const stars = hero.stars > 0 ? ' ' + '★'.repeat(hero.stars) : '';
    this.nameText.setText(`${hero.name}   Lv ${hero.level}${stars}`);
    this.statsText.setText(
      `HP ${Math.round(s.hp)}   ATK ${Math.round(s.attack)}   Crit ${Math.round(s.critPct)}%\n` +
        `STR ${hero.attributes.str}  AGI ${hero.attributes.agi}  ` +
        `INT ${hero.attributes.int}  VIT ${hero.attributes.vit}`
    );
    this.opened = true;
    this.root.setVisible(true);
  }

  hide(): void {
    this.opened = false;
    this.root.setVisible(false);
  }
}
