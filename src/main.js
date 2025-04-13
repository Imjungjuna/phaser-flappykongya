import "./style.css";
import Phaser from "phaser";

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

const config = {
  type: Phaser.AUTO,
  // width: isMobile ? window.innerWidth : window.innerWidth > 288 ? 288 : window.innerWidth,
  // height: isMobile ? window.innerHeight : window.innerHeight > 512 ? 512 : window.innerHeight,
  scale: {
    mode: Phaser.Scale.FIT, // 화면 비율 유지하면서 꽉 차게
    width: 288,
    height: 512,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: { preload, create, update },
};

let game = new Phaser.Game(config);

/**
 * Preload function loads assets before game start && is called before create function
 * @returns {void}
 */
function preload() {
  this.load.image("background", "/assets/backgrounds/background_night.png");
  this.load.image("bird1", "/assets/objects/bird_yellow_1.png");
  this.load.image("bird2", "/assets/objects/bird_yellow_2.png");
  this.load.image("bird3", "/assets/objects/bird_yellow_3.png");
  this.load.image("scoreBoard", "/assets/objects/score.png");
  this.load.image("base", "/assets/backgrounds/ground.png");
  this.load.image("gameOver", "/assets/backgrounds/label_game_over.png");
  this.load.image("piller", "/assets/backgrounds/pipe_red_bottom.png");
  this.load.image("startGame", "./assets/backgrounds/ready.png"); //message -> ready
  this.load.image("resume", "/assets/backgrounds/button_resume.png");
  this.load.image("playButton", "/assets/backgrounds/button_play_normal.png");
  this.load.audio("score", "assets/music/point.wav");
  this.load.audio("hit", "assets/music/hit.wav");
  this.load.audio("wing", "assets/music/wing.wav");
  this.load.audio("die", "assets/music/die.wav");
}

let background;
let bird;
let birdFrame = 0;
let birdFrames = ["bird1", "bird2", "bird3"];
let base;
let gameStarted = false;
let gameOver = false;
let scoreText;
let score = 0;
let point;
let hit;
let wing;
let die;
let birdJumpHeight = 2.5;
const totalTime = 50000; // 50초
let elapsedTime = 0;

//value changing by time
let pillarInterval = 3000;
let pillarVelocity = 120;
let backgroundSpeed = 0.3;

let jumpStartTime = 0;
let isJumping = false;
const jumpMaxHoldTime = 500;

/**
 * Create function sets up the game scene && is called after preload function
 * creates game objects, sets up physics, and initializes game state
 * @returns {void}
 * @param {Phaser.Scene} this - The current scene instance
 * @param {Phaser.Game} game - The current game instance
 * @param {Phaser.GameConfig} config - The game configuration object
 * @param {Phaser.GameObjects} gameObjects - The game objects in the scene
 * @param {Phaser.Physics} physics - The physics engine used in the game
 * @param {Phaser.Input} input - The input manager for handling user input
 * @param {Phaser.Loader} loader - The loader for loading assets
 * @param {Phaser.Time} time - The time manager for handling game time
 * @param {Phaser.Cameras} cameras - The camera manager for handling game cameras
 * @param {Phaser.Scale} scale - The scale manager for handling game scaling
 * @param {Phaser.Display} display - The display manager for handling game display
 * @param {Phaser.Renderer} renderer - The renderer for rendering game graphics
 * @param {Phaser.GameObjects} gameObjects - The game objects in the scene
 * @param {Phaser.GameConfig} gameConfig - The game configuration object
 * @param {Phaser.Game} game - The current game instance
 * @param {Phaser.GameObjects} gameObjects - The game objects in the scene
 * @param {Phaser.Physics} physics - The physics engine used in the game
 * @param {Phaser.Input} input - The input manager for handling user input
 * @param {Phaser.Loader} loader - The loader for loading assets
 * @param {Phaser.Time} time - The time manager for handling game time
 * @param {Phaser.Cameras} cameras - The camera manager for handling game cameras
 */
function create() {
  gameStarted = false;

  // Add sound effects
  point = this.sound.add("score");
  hit = this.sound.add("hit");
  wing = this.sound.add("wing");
  die = this.sound.add("die");

  // Ensure background is added first
  background = this.add.tileSprite(0, 0, game.config.width, game.config.height, "background");
  background.setScale(2); // Scale background to fit screen

  // Show start game image
  let startGameImage = this.add.image(game.config.width / 2, game.config.height / 2, "startGame");
  startGameImage.setOrigin(0.5, 0.5);
  startGameImage.setScale(1.3);
  startGameImage.setInteractive();

  const startGame = () => {
    if (gameStarted) return; // Prevent multiple triggers

    startGameImage.destroy(); // Remove start game image
    gameStarted = true; // Set gameStarted to true
    bird.setActive(true).setVisible(true); // Show && activate bird
    bird.setVelocityY(0); // Reset bird velocity

    scoreText = this.add.text(game.config.width / 2, 30, "0", {
      fontFamily: "PressStart2P",
      fontSize: "40px",
      fontStyle: "bold", // 굵게!
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2, // 테두리 줘서 더 선명하게
    });
    scoreText.setOrigin(0.5, 0.5);
    scoreText.setDepth(1);

    this.time.addEvent({
      delay: pillarInterval,
      callback: () => {
        if (!gameOver) {
          createPiller();
        }
      },
      loop: true,
    });
  };

  startGameImage.on("pointerdown", startGame);
  const spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  this.input.keyboard.on("keydown-SPACE", () => {
    if (!gameStarted) {
      startGame();
    }
  });

  let baseImage = this.textures.get("base");
  let baseHeight = baseImage.getSourceImage().height;
  base = this.add.tileSprite(
    game.config.width / 2,
    game.config.height - baseHeight / 2,
    game.config.width,
    baseHeight,
    "base"
  );
  this.physics.add.existing(base, true);
  base.setDepth(1);

  bird = this.physics.add.sprite(game.config.width / 2, game.config.height / 2, birdFrames[0]);
  bird.setVisible(false); // Hide bird initially
  bird.setCollideWorldBounds(true);

  const createPiller = () => {
    let gap = Phaser.Math.Between(130, 160); // Gap between top and bottom pillars
    let pillerHeight = Phaser.Math.Between(50, 290);

    // Create bottom pillar
    let bottomPiller = this.physics.add.sprite(game.config.width * 2, game.config.height - base.height, "piller");
    bottomPiller.displayHeight = pillerHeight;
    bottomPiller.setOrigin(0.5, 1);
    bottomPiller.body.setVelocityX(-pillarVelocity);

    // Create top pillar
    let topPiller = this.physics.add.sprite(game.config.width * 2, 0, "piller");
    topPiller.setFlipY(true); // Reverse image of upper pillar
    topPiller.displayHeight = game.config.height - pillerHeight - gap - base.height;
    topPiller.setOrigin(0.5, 0);
    topPiller.body.setVelocityX(-pillarVelocity);

    // Destroy pillars out of bounds
    const destroyPiller = (piller) => {
      if (piller.x + piller.width / 2 < 0) {
        piller.destroy();
      }
    };

    bottomPiller.body.onWorldBounds = true;
    topPiller.body.onWorldBounds = true;
    this.physics.world.on("worldbounds", (body) => {
      if (body.gameObject === bottomPiller) {
        destroyPiller(bottomPiller);
      }
      if (body.gameObject === topPiller) {
        destroyPiller(topPiller);
      }
    });

    // Add collision detection between bird and both pillars
    this.physics.add.collider(bird, bottomPiller, () => {
      handleCollision();
    });
    this.physics.add.collider(bird, topPiller, () => {
      handleCollision();
    });
  };

  const handleCollision = () => {
    gameOver = true; // Set gameOver to true
    hit.play(); // Play hit sound
    die.play(); // Play die sound
    bird.setTint(0xff0000); // Change bird color to red
    bird.setVelocity(0, 0); // Stop bird movement
    this.physics.pause(); // Pause the physics engine
    background.tilePositionX = 0; // Stop background movement
    base.tilePositionX = 0; // Stop base movement
    elapsedTime = 0;

    scoreText.setVisible(false); // Hide the score text

    // Display the scoreBoard
    let scoreBoard = this.add.image(game.config.width / 2, game.config.height / 2, "scoreBoard");
    scoreBoard.setOrigin(0.5, 0.5);
    scoreBoard.setScale(1);

    // Display the gameOver image on top of the scoreBoard
    let gameOverImage = this.add.image(game.config.width / 2, game.config.height / 2 - 150, "gameOver");
    gameOverImage.setOrigin(0.5, 0.5);
    gameOverImage.setScale(2);

    // Display the final score on the scoreBoard
    this.add
      .text(game.config.width / 2, game.config.height / 2 + 10, `${score}`, {
        fontSize: "42px",
        color: "#ffffff",
        fontFamily: "Fantasy",
      })
      .setOrigin(0.5, 0.5);

    let resumeButton = this.add.image(game.config.width / 2, game.config.height / 2 + 70, "resume");
    resumeButton.setOrigin(0.5, 0.5);
    resumeButton.setScale(3);
    resumeButton.setInteractive();
    this.input.keyboard.on("keydown-SPACE", () => {
      resumeGame();
    });
    resumeButton.on("pointerdown", () => {
      resumeGame();
    });
  };

  // Add collision detection between bird and base
  this.physics.add.collider(bird, base, () => {
    handleCollision();
  });

  // Add collision detection for bird hitting the upper boundary of the canvas
  bird.body.onWorldBounds = true;
  this.physics.world.on("worldbounds", (body) => {
    if (body.gameObject === bird && bird.y <= 0) {
      handleCollision();
    }
  });

  const resumeGame = () => {
    gameOver = false; // Reset gameOver to false
    score = 0; // Reset score to 0
    bird.clearTint(); // Remove tint from bird
    bird.setActive(false).setVisible(false); // Hide and deactivate the bird
    this.scene.restart(); // Restart the scene
  };
}

function update(time, delta) {
  if (gameOver || !gameStarted) {
    return; // Skip update if game is over
  }

  if (elapsedTime < totalTime) {
    elapsedTime += delta;

    const t = Phaser.Math.Clamp(elapsedTime / totalTime, 0, 1); // 0~1 사이의 값으로 정규화

    // 선형 보간 (lerp)
    pillarInterval = Phaser.Math.Linear(3000, 1500, t);
    pillarVelocity = Phaser.Math.Linear(120, 190, t);
    backgroundSpeed = Phaser.Math.Linear(0.3, 0.8, t);
  }

  // Update background and base position
  background.tilePositionX += backgroundSpeed;
  base.tilePositionX += backgroundSpeed;

  if (bird.active) {
    // Apply gravity-like effect when no input is given
    bird.setVelocityY(bird.body.velocity.y + 15);

    let baseTop = game.config.height - base.height;
    if (bird.y + bird.height / 2 > baseTop) {
      bird.y = baseTop - bird.height / 2;
      bird.setVelocityY(0); // Stop bird movement when it hits the ground
    }

    const spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    if (spaceKey.isDown || this.input.activePointer.isDown) {
      // isJumping = true;
      // jumpStartTime = time;
      wing.play({
        detune: Phaser.Math.Between(-30, 30),
        volume: Phaser.Math.FloatBetween(0.9, 1.0),
      });
      bird.y -= birdJumpHeight;
      bird.setVelocityY(-180); // Apply upward velocity on space or click
    }

    birdFrame += 0.1;
    if (birdFrame >= birdFrames.length) {
      birdFrame = 0;
    }
    bird.setTexture(birdFrames[Math.floor(birdFrame)]);

    // Check for pairs of pillars that bird has passed
    this.physics.world.colliders.getActive().forEach((collider) => {
      if (collider.object1 === bird && collider.object2.texture.key === "piller") {
        let piller = collider.object2;
        if (piller.x + piller.width / 2 < bird.x - bird.width / 2 && !piller.scored) {
          piller.scored = true; // Mark pillar as scored

          // Check if both top and bottom pillars of the pair are scored
          let pairedPiller = this.physics.world.colliders
            .getActive()
            .find(
              (otherCollider) =>
                otherCollider.object2 !== piller &&
                otherCollider.object2.texture.key === "piller" &&
                Math.abs(otherCollider.object2.x - piller.x) < 10
            );

          if (pairedPiller && !pairedPiller.object2.scored) {
            pairedPiller.object2.scored = true; // Mark paired pillar as scored
            point.play({
              detune: Phaser.Math.Between(-20, 30),
            }); // Play score sound
            score += 1; // Increment score
            scoreText.setText(score.toString()); // Update score text
          }
        }
      }
    });
  }
}
