import "./style.css";
import Phaser, { Physics } from "phaser";

const config = {
  type: Phaser.AUTO,
  width: 288,
  height: 512,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
};

const game = new Phaser.Game(config);
let background;
let birdFrame = 0;
let birdFrames = ["bird_1", "bird_2", "bird_3"];
let bird;
let birdDirection = 1;
let base;

function preload() {
  this.load.image("background", "assets/background.png");
  this.load.image("bird_1", "assets/redbird-downflap.png");
  this.load.image("bird_2", "assets/redbird-midflap.png");
  this.load.image("bird_3", "assets/redbird-upflap.png");
  this.load.image("base", "assets/base.png");
  this.load.image("piller", "assets/pipe-red.png");
  this.load.image("startGame", "assets/start-game.png");
}

function create() {
  // this.add.image(400, 300, "background");
  background = this.add.tileSprite(
    0,
    0,
    game.config.width,
    game.config.height,
    "background"
  );
  // background.setScale(2); //I did it.
  background.setOrigin(0, 0);

  bird = this.add.sprite(
    game.config.width / 2,
    game.config.height / 2,
    "bird_1"
  );

  let startGameImage = this.add.image(
    game.config.width / 2,
    game.config.height / 2,
    "startGame"
  );
  startGameImage.setOrigin(0.5, 0.5);
  startGameImage.setInteractive();
  startGameImage.on("pointerdown", function (pointer) {
    startGameImage.destroy();
  });

  this.input.on("pointerdown", function (pointer) {
    bird.y -= 50;
    birdDirection = -1;
  });

  let baseImage = this.textures.get("base");
  let baseHeight = baseImage.getSourceImage().height;
  base = this.add.tileSprite(
    game.config.width / 2,
    game.config.height,
    game.config.width,
    baseHeight,
    "base"
  );

  this.physics.add.existing(base, true);
  base.setDepth(1);

  const createPiller = () => {
    let pillerHeight = Phaser.Math.Between(100, 400);
    let piller = this.add.sprite(
      game.config.width,
      game.config.height,
      "piller"
    );
    piller.displayHeight = pillerHeight;
    piller.setOrigin(0.5, 1);

    this.physics.add.existing(piller);
    piller.body.setVelocityX(-200);

    piller.body.onWorldBounds = true;
    piller.body.world.on("worldbounds", function (body) {
      if (body.gameObject === piller) {
        piller.destroy();
      }
    });
  };

  this.time.addEvent({
    delay: 2000,
    callback: createPiller,
    loop: true,
  });
}

function update() {
  background.tilePositionX += 0.5;

  bird.y += 2;
  if (bird.y + bird.height / 2 > game.config.height - base.height / 2) {
    bird.y = game.config.height - base.height / 2 - bird.height / 2;
  }

  const spaceKey = this.input.keyboard.addKey(
    Phaser.Input.Keyboard.KeyCodes.SPACE
  );
  if (spaceKey.isDown) {
    bird.y -= 4;
    birdDirection = -1;
  } else {
    birdDirection = 1;
  }

  bird.y += birdDirection * 1;
  if (bird.y >= 350 || bird.y <= 250) {
    birdDirection *= -1;
  }
  birdFrame += 0.1;
  if (birdFrame >= birdFrames.length) {
    birdFrame = 0;
  }

  bird.setTexture(birdFrames[Math.floor(birdFrame)]);
}
