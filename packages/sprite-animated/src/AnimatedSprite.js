import { Texture } from '@pixi/core';
import { Sprite } from '@pixi/sprite';
import { Ticker, UPDATE_PRIORITY } from '@pixi/ticker';

/**
 * An AnimatedSprite is a simple way to display an animation depicted by a list of textures.
 *
 * ```js
 * let alienImages = ["image_sequence_01.png","image_sequence_02.png","image_sequence_03.png","image_sequence_04.png"];
 * let textureArray = [];
 *
 * for (let i=0; i < 4; i++)
 * {
 *      let texture = PIXI.Texture.from(alienImages[i]);
 *      textureArray.push(texture);
 * };
 *
 * let animatedSprite = new PIXI.AnimatedSprite(textureArray);
 * ```
 *
 * The more efficient and simpler way to create an animated sprite is using a {@link PIXI.Spritesheet}
 * containing the animation definitions:
 *
 * ```js
 * PIXI.Loader.shared.add("assets/spritesheet.json").load(setup);
 *
 * function setup() {
 *   let sheet = PIXI.Loader.shared.resources["assets/spritesheet.json"].spritesheet;
 *   animatedSprite = new PIXI.AnimatedSprite(sheet.animations["image_sequence"]);
 *   ...
 * }
 * ```
 *
 * @class
 * @extends PIXI.Sprite
 * @memberof PIXI
 */
export default class AnimatedSprite extends Sprite
{
    /**
     * @param {PIXI.Texture[]|PIXI.AnimatedSprite.FrameObject[]} textures - An array of {@link PIXI.Texture} or frame
     *  objects that make up the animation.
     * @param {boolean} [autoUpdate=true] - Whether to use PIXI.Ticker.shared to auto update animation time.
     */
    constructor(textures, autoUpdate)
    {
        super(textures[0] instanceof Texture ? textures[0] : textures[0].texture);

        /**
         * @type {PIXI.Texture[]}
         * @private
         */
        this._textures = null;

        /**
         * @type {number[]}
         * @private
         */
        this._durations = null;

        this.textures = textures;

        /**
         * `true` uses PIXI.Ticker.shared to auto update animation time.
         * @type {boolean}
         * @default true
         * @private
         */
        this._autoUpdate = autoUpdate !== false;

        /**
         * The speed that the AnimatedSprite will play at. Higher is faster, lower is slower.
         *
         * @member {number}
         * @default 1
         */
        this.animationSpeed = 1;

        /**
         * Whether or not the animate sprite repeats after playing.
         *
         * @member {boolean}
         * @default true
         */
        this.loop = true;

        /**
         * Update anchor to [Texture's defaultAnchor]{@link PIXI.Texture#defaultAnchor} when frame changes.
         *
         * Useful with [sprite sheet animations]{@link PIXI.Spritesheet#animations} created with tools.
         * Changing anchor for each frame allows to pin sprite origin to certain moving feature
         * of the frame (e.g. left foot).
         *
         * Note: Enabling this will override any previously set `anchor` on each frame change.
         *
         * @member {boolean}
         * @default false
         */
        this.updateAnchor = false;

        /**
         * Function to call when an AnimatedSprite finishes playing.
         *
         * @member {Function}
         */
        this.onComplete = null;

        /**
         * Function to call when an AnimatedSprite changes which texture is being rendered.
         *
         * @member {Function}
         */
        this.onFrameChange = null;

        /**
         * Function to call when `loop` is true, and an AnimatedSprite is played and loops around to start again.
         *
         * @member {Function}
         */
        this.onLoop = null;

        /**
         * Elapsed time since animation has been started, used internally to display current texture.
         *
         * @member {number}
         * @private
         */
        this._currentTime = 0;

        /**
         * Indicates if the AnimatedSprite is currently playing.
         *
         * @member {boolean}
         * @readonly
         */
        this.playing = false;
    }

    /**
     * Stops the AnimatedSprite.
     *
     */
    stop()
    {
        if (!this.playing)
        {
            return;
        }

        this.playing = false;
        if (this._autoUpdate)
        {
            Ticker.shared.remove(this.update, this);
        }
    }

    /**
     * Plays the AnimatedSprite.
     *
     */
    play()
    {
        if (this.playing)
        {
            return;
        }

        this.playing = true;
        if (this._autoUpdate)
        {
            Ticker.shared.add(this.update, this, UPDATE_PRIORITY.HIGH);
        }
    }

    /**
     * Stops the AnimatedSprite and goes to a specific frame.
     *
     * @param {number} frameNumber - Frame index to stop at.
     */
    gotoAndStop(frameNumber)
    {
        this.stop();

        const previousFrame = this.currentFrame;

        this._currentTime = frameNumber;

        if (previousFrame !== this.currentFrame)
        {
            this.updateTexture();
        }
    }

    /**
     * Goes to a specific frame and begins playing the AnimatedSprite.
     *
     * @param {number} frameNumber - Frame index to start at.
     */
    gotoAndPlay(frameNumber)
    {
        const previousFrame = this.currentFrame;

        this._currentTime = frameNumber;

        if (previousFrame !== this.currentFrame)
        {
            this.updateTexture();
        }

        this.play();
    }

    /**
     * Updates the object transform for rendering.
     *
     * @private
     * @param {number} deltaTime - Time since last tick.
     */
    update(deltaTime)
    {
        const elapsed = this.animationSpeed * deltaTime;
        const previousFrame = this.currentFrame;

        if (this._durations !== null)
        {
            let lag = this._currentTime % 1 * this._durations[this.currentFrame];

            lag += elapsed / 60 * 1000;

            while (lag < 0)
            {
                this._currentTime--;
                lag += this._durations[this.currentFrame];
            }

            const sign = Math.sign(this.animationSpeed * deltaTime);

            this._currentTime = Math.floor(this._currentTime);

            while (lag >= this._durations[this.currentFrame])
            {
                lag -= this._durations[this.currentFrame] * sign;
                this._currentTime += sign;
            }

            this._currentTime += lag / this._durations[this.currentFrame];
        }
        else
        {
            this._currentTime += elapsed;
        }

        if (this._currentTime < 0 && !this.loop)
        {
            this.gotoAndStop(0);

            if (this.onComplete)
            {
                this.onComplete();
            }
        }
        else if (this._currentTime >= this._textures.length && !this.loop)
        {
            this.gotoAndStop(this._textures.length - 1);

            if (this.onComplete)
            {
                this.onComplete();
            }
        }
        else if (previousFrame !== this.currentFrame)
        {
            if (this.loop && this.onLoop)
            {
                if (this.animationSpeed > 0 && this.currentFrame < previousFrame)
                {
                    this.onLoop();
                }
                else if (this.animationSpeed < 0 && this.currentFrame > previousFrame)
                {
                    this.onLoop();
                }
            }

            this.updateTexture();
        }
    }

    /**
     * Updates the displayed texture to match the current frame index.
     *
     * @private
     */
    updateTexture()
    {
        this._texture = this._textures[this.currentFrame];
        this._textureID = -1;
        this._textureTrimmedID = -1;
        this.cachedTint = 0xFFFFFF;
        this.uvs = this._texture._uvs.uvsFloat32;

        if (this.updateAnchor)
        {
            this._anchor.copy(this._texture.defaultAnchor);
        }

        if (this.onFrameChange)
        {
            this.onFrameChange(this.currentFrame);
        }
    }

    /**
     * Stops the AnimatedSprite and destroys it.
     *
     * @param {object|boolean} [options] - Options parameter. A boolean will act as if all options
     *  have been set to that value.
     * @param {boolean} [options.children=false] - If set to true, all the children will have their destroy
     *      method called as well. 'options' will be passed on to those calls.
     * @param {boolean} [options.texture=false] - Should it destroy the current texture of the sprite as well.
     * @param {boolean} [options.baseTexture=false] - Should it destroy the base texture of the sprite as well.
     */
    destroy(options)
    {
        this.stop();
        super.destroy(options);

        this.onComplete = null;
        this.onFrameChange = null;
        this.onLoop = null;
    }

    /**
     * A short hand way of creating an AnimatedSprite from an array of frame ids.
     *
     * @static
     * @param {string[]} frames - The array of frames ids the AnimatedSprite will use as its texture frames.
     * @return {AnimatedSprite} The new animated sprite with the specified frames.
     */
    static fromFrames(frames)
    {
        const textures = [];

        for (let i = 0; i < frames.length; ++i)
        {
            textures.push(Texture.from(frames[i]));
        }

        return new AnimatedSprite(textures);
    }

    /**
     * A short hand way of creating an AnimatedSprite from an array of image ids.
     *
     * @static
     * @param {string[]} images - The array of image urls the AnimatedSprite will use as its texture frames.
     * @return {AnimatedSprite} The new animate sprite with the specified images as frames.
     */
    static fromImages(images)
    {
        const textures = [];

        for (let i = 0; i < images.length; ++i)
        {
            textures.push(Texture.from(images[i]));
        }

        return new AnimatedSprite(textures);
    }

    /**
     * The total number of frames in the AnimatedSprite. This is the same as number of textures
     * assigned to the AnimatedSprite.
     *
     * @readonly
     * @member {number}
     * @default 0
     */
    get totalFrames()
    {
        return this._textures.length;
    }

    /**
     * The array of textures used for this AnimatedSprite.
     *
     * @member {PIXI.Texture[]}
     */
    get textures()
    {
        return this._textures;
    }

    set textures(value) // eslint-disable-line require-jsdoc
    {
        if (value[0] instanceof Texture)
        {
            this._textures = value;
            this._durations = null;
        }
        else
        {
            this._textures = [];
            this._durations = [];

            for (let i = 0; i < value.length; i++)
            {
                this._textures.push(value[i].texture);
                this._durations.push(value[i].time);
            }
        }
        this.gotoAndStop(0);
        this.updateTexture();
    }

    /**
    * The AnimatedSprites current frame index.
    *
    * @member {number}
    * @readonly
    */
    get currentFrame()
    {
        let currentFrame = Math.floor(this._currentTime) % this._textures.length;

        if (currentFrame < 0)
        {
            currentFrame += this._textures.length;
        }

        return currentFrame;
    }
}

/**
 * @memberof PIXI.AnimatedSprite
 * @typedef {object} FrameObject
 * @type {object}
 * @property {PIXI.Texture} texture - The {@link PIXI.Texture} of the frame
 * @property {number} time - the duration of the frame in ms
 */
