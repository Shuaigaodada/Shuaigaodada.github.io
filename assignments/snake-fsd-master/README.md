# Snake

Classic Snake Game

**Table of Contents**

- [Part 1 - HTML & CSS](#part-1---html--css)
  - [TODO 1: Add the initial HTML elements](#todo-1-add-the-initial-html-elements)
  - [TODO 2: Add CSS](#todo-2-add-css)
  - [TODO 3: Add JavaScript](#todo-3-add-javascript)
- [Part 2 - Modeling Data & jQuery](#part-2---modeling-data--jquery)
  - [TODO 4: Modeling the Snake and Apple with Arrays and Objects](#todo-4-modeling-the-snake-and-apple-with-arrays-and-objects)
  - [TODO 5: The `update` Function](#todo-5-the-update-function)
- [Part 3 - Completing the Game's Logic](#part-3---completing-the-games-logic)
  - [TODO 6: Change the snake's direction](#todo-6-change-the-snakes-direction)
  - [TODO 7: Make the head move](#todo-7-make-the-head-move)
  - [TODO 8: Check for collisions with the wall](#todo-8-check-for-collisions-with-the-wall)
  - [TODO 9: Check for collisions with the apple](#todo-9-check-for-collisions-with-the-apple)
  - [TODO 10: Handle Apple Collisions](#todo-10-handle-apple-collisions)
  - [TODO 11: Move the body](#todo-11-move-the-body)
  - [TODO 12: Check for snake collisions with itself](#todo-12-check-for-snake-collisions-with-itself)
  - [TODO 13: Make sure our Apple is placed only in available positions](#todo-13-make-sure-our-apple-is-placed-only-in-available-positions)

## Learning Objectives

- Build an app from start to finish including writing HTML, CSS, and JavaScript
- Manipulate HTML elements using the jQuery JavaScript library
- Use keyboard inputs
- Organize code using Functions

## Push Reminder

To push to GitHub, enter the following commands in bash:

```
git add -A
git commit -m "saving data shapes"
git push
```

# Part 1 - HTML & CSS

## Learning Objectives

- Learn how the various files in a program are linked together in an index.html file
- Use jQuery to dynamically create HTML elements and modify their properties
- Practice using Objects and Arrays to model game components
- Learn about keyboard inputs
- Learn about Asynchronous function calls
- Learn how to organize code in a program

## TODO 1: Add the initial HTML elements

This Snake program is simple. It only has a few visual components:

- The board
- The score display
- The high score display
- The snake
- The apple

**Which of these components are static and which will be dynamic?**

For now, we can set up the stationary elements first. When we get to the
JavaScript portion of this project we'll deal with the snake and apple.

- **1a)** Between the `<body> </body>` tags add the following elements:
  - A `<div></div>` element with an `id = "board"` attribute
  - An `<h1></h1>` element with an `id = "score"` attribute
  - Another `<h1></h1>` element with an `id = "highScore"` attribute

```html
<div id="board"></div>
<h1 id="score">Score: 0</h1>
<h1 id="highScore">High Score: 0</h1>
```

**Save your code and run the `index.html` file (or start your server, or refresh your running application page if it is already running).**

At this point your screen should be blank except for the score and the high score.

<hr>

<br>
<br>
<br>
<br>

  <h3 align="center"><b>CHECK YOUR LIVE SERVER</b></h3>
  <p align="center"><b>Do you see a score and high score appearing?</b></p>
  <p align="center"><b>DO NOT MOVE FORWARD UNTIL BOTH SCORES ARE DISPLAYED</b></p>

<br>
<br>
<br>
<br>

## TODO 2: Add CSS

> **READ:** Open up the file `index.css`. Here, you'll find that we've already defined some CSS rules for the various components of the game. But why is our page unstyled?
>
> Since our server is only running the `index.html` file, it doesn't have access to the `index.css` file by default - we need to link it!

- **2a)** Inside the `<head>` element, add the following HTML:

  ```html
  <link rel="stylesheet" type="text/css" href="index.css" />
  ```

**Save your code and run the `index.html` file (or start your server, or refresh your running application page if it is already running).**

Now, we can see the board as a square with a border! Feel free to modify this CSS to suit your own style, but be careful if you change the width or height of anything as that may cause problems later.

<hr>

<br>
<br>
<br>
<br>

  <h3 align="center"><b>CHECK YOUR LIVE SERVER</b></h3>
  <p align="center"><b>Do you see the board appearing with a border?</b></p>
  <p align="center"><b>DO NOT MOVE FORWARD UNTIL YOU SEE THE BOARD WITH A BORDER</b></p>

<br>
<br>
<br>
<br>

## TODO 3: Add JavaScript

Now that our CSS has been linked to our HTML, we need to do the same to add JavaScript. To connect our `index.js` file, we have to use the `<script>` tag.

- **3a)** At the bottom of the `index.html` file, _below_ the `<body></body>` tags and above the closing `</html>` tag, add the following HTML:

  ```html
  <script src="index.js"></script>
  ```

Why are we not adding this tag in the `<head>`?

> **READ:** When the browser loads our `index.html` file, it starts at the top of the file and works its way down. When it gets to an externally loaded file, it must first read through that entire file before moving on to the next line in our HTML.
>
> This becomes a problem if our JavaScript file relies on manipulating _existing_ HTML content on the page. If those elements have not yet been loaded in yet, our JavaScript file will throw some errors. As such, we need to load _this_ JavaScript in after our HTML

**Save your code and run the `index.html` file (or start your server, or refresh your running application page if it is already running).**

### jQuery

If you open up the console, you will notice that we have some errors. This is because our `index.js` file uses jQuery which we haven't loaded into the `index.html` file yet.

- **3b)** The jQuery code has been downloaded for you in the file `jQuery.min.js`. Back in the `<head>` element, add the following HTML:

  ```html
  <script src="jquery.min.js"></script>
  ```

Technically, this tag can be added anywhere _above_ the `index.js` file. However it is best practice to load in external scripts in the `<head>` aside from the `index.js` file.

**Save your code and run the `index.html` file (or start your server, or refresh your running application page if it is already running).**

If you open the console you shouldn't see any errors now relating to jQuery (the `$` symbol).

<hr>

<br>
<br>
<br>
<br>

  <h3 align="center"><b>CHECK YOUR LIVE SERVER AND OPEN THE CONSOLE</b></h3>
  <p align="center"><b>Do you see any jQuery errors (the $ symbol)?</b></p>
  <p align="center"><b>DO NOT MOVE FORWARD IF YOU SEE JQUERY ERRORS</b></p>

<br>
<br>
<br>
<br>

# Part 2 - Modeling Data & jQuery

## TODO 4: Modeling the Snake and Apple with Arrays and Objects

The first step in designing a piece of software is deciding on how to model the various components of the program.

At the top of the `index.js` file is a setup section. All variables that your program will need should be declared there. By declaring them at the top of the program, we can easily see what data will be important to keep track of for the code to follow.

- **4a)** Declare `snake` and `apple` variables as empty Objects in the `index.js` file just below the `"Game Variables"` comment. Also declare a `score` variable and give it the initial value of `0` at this same location.

### TODO 4-1) **The Apple**

Modeling the Apple is quite easy. It will need the following properties:

- `apple.element`: A reference to the HTML element that represents the Apple.
- `apple.row`: A reference to the row where the Apple currently exists.
- `apple.column`: A reference to the column where the Apple currently exists.

The `apple.element` Object will be needed in order to make any modifications to the Apple's HTML element using **jQuery**. The `apple.row` and `apple.column` properties will be useful for determining when the Snake collides with the Apple.

> - **4b)** Let's go ahead and create the apple right now. To do so, do the following two tasks:
>
>   **1.** Copy the below function into your program down in the helper functions section. The `makeApple()` function already exists, so you just need to fill in the code block for the function:
>
>   ```js
>   /* Create an HTML element for the apple using jQuery. Then find a random
>    * position on the board that is not occupied and position the apple there.
>    */
>   function makeApple() {
>     // make the apple jQuery Object and append it to the board
>     apple.element = $("<div>").addClass("apple").appendTo(board);
>
>     // get a random available row/column on the board
>     var randomPosition = getRandomAvailablePosition();
>
>     // initialize the row/column properties on the Apple Object
>     apple.row = randomPosition.row;
>     apple.column = randomPosition.column;
>
>     // position the apple on the screen
>     repositionSquare(apple);
>   }
>   ```
>
>   If you take a look at the definition of the `makeApple` function you'll see that it finds a random position for the apple by calling the function `getRandomAvailablePosition()`. We'll get to that much later.
>
>   **2.** Up in the `init()` function at TODO 4b-2, call the `makeApple()` function.

<hr>

<br>
<br>
<br>
<br>

  <h3 align="center"><b>CHECK YOUR LIVE SERVER</b></h3>
  <p align="center"><b>Do you see a red square appearing on your board?</b></p>
  <p align="center"><b>DO NOT MOVE FORWARD UNTIL YOU SEE THE RED SQUARE</b></p>

<br>
<br>
<br>
<br>

### TODO 4-2) **The Snake and `snakeSquares`**

Modeling the snake will be a bit trickier. Since the snake occupies multiple rows and columns, we will need multiple Objects to represent each part of the Snake.

<br>
<h3 align="center">PLEASE CLICK THE ARROW BELOW AND READ HOW THE SNAKE IS MODELED</h3>
<br>

> <details> <summary> CLICK TO READ about the Snake's data </summary>
>
> We can refer to each part of the snake as a `snakeSquare` Object which will have the following properties:
>
> - `snakeSquare.element`: A reference to the HTML element that represents a part of the snake.
> - `snakeSquare.row`: A reference to the row where the `snakeSquare` currently exists.
> - `snakeSquare.column`: A reference to the column where the `snakeSquare` currently exists.
> - `snakeSquare.direction`: A reference to the direction that this particular `snakeSquare` is currently moving in.
>
> Because the Snake is made up of multiple `snakeSquares` that are in a particular order, we can model the Snake's body as an Array. It will also be useful to have a quick reference for the head and tail of the snake.
>
> This data will be stored in the `snake` Object:
>
> - `snake.body`: An Array containing all `snakeSquare` Objects.
> - `snake.head`: Reference to the jQuery `snakeSquare` Object at the head of the snake. Duplicate of `snake.body[0]`
> - `snake.tail`: Reference to the jQuery `snakeSquare` Object at the end of the snake. Duplicate of `snake.body[snake.body.length - 1]`
>
> Most of this will be handled automatically, but first you'll have to create and call the functions that do that.
>
> </details>

<br>
<br>

> - **4c)** Let's initialize the snake for the beginning of the program. To do so, do the following two tasks:
>
>   **1.** Copy the below function into your program down in the helper functions section. The `makeSnakeSquare()` function already exists, so you just need to fill in the code block for the function:
>
>   ```js
>   function makeSnakeSquare(row, column) {
>     // initialize a new snakeSquare Object
>     var snakeSquare = {};
>
>     // make the snakeSquare.element Object and append it to the board
>     snakeSquare.element = $("<div>").addClass("snake").appendTo(board);
>
>     // initialize the row and column properties on the snakeSquare Object
>     snakeSquare.row = row;
>     snakeSquare.column = column;
>
>     // set the position of the snake on the screen
>     repositionSquare(snakeSquare);
>
>     // if this is the head, add the snake-head id
>     if (snake.body.length === 0) {
>       snakeSquare.element.attr("id", "snake-head");
>     }
>
>     // add snakeSquare to the end of the body Array and set it as the new tail
>     snake.body.push(snakeSquare);
>     snake.tail = snakeSquare;
>   }
>   ```
>
>   **IMPORTANT:** Take note of two lines in particular:
>
>   - `snakeSquare.element = $('<div>').addClass('snake').appendTo(board);` creates a new `<div>` element using jQuery and adds it to the board. Notice how we have `$(<div>)` written instead of `$(div)`. This is an important distinction to make, as the `<>` tells jQuery to create a new element entirely.
>   - `repositionSquare(snakeSquare)` calls an already existing helper function; the function is located directly below the `makeSnakeSquare()` function, and its job is to basically draw the new squae at the correct location on your screen.
>
>   **2.** Put the following lines of code in the `init()` function at the TODO 4c-2 location:
>
>   ```js
>   // initialize the snake's body as an empty Array
>   snake.body = [];
>
>   // make the first snakeSquare and set it as the head
>   makeSnakeSquare(10, 10);
>   snake.head = snake.body[0];
>   ```

<hr>

<br>
<br>
<br>
<br>

  <h3 align="center"><b>CHECK YOUR LIVE SERVER</b></h3>
  <p align="center"><b>Do you see a green square appearing on your board?</b></p>
  <p align="center"><b>DO NOT MOVE FORWARD UNTIL YOU SEE THE GREEN SQUARE</b></p>

<br>
<br>
<br>
<br>

## TODO 5: The update function

Most videogames are essentially animations that are interactive. Animation can be easily achieved by rapidly making changes to the appearance of the visual components on our screen.

One common method for doing this is by using a function called `setInterval()`. Let's go ahead and make use of that function, then we'll talk about what it's doing.

- **5a)** Copy the following code into your `init()` function at the TODO 5a prompt:

  ```javascript
  // start update interval
  updateInterval = setInterval(update, 100);
  ```

  In this case, the function `setInterval()` works by calling the `update()` function every `100` milliseconds (10 frames / second). Each time the function is called we will modify the appearance of our game. (See https://www.w3schools.com/jsref/met_win_setinterval.asp)

Next, we need to make sure that the `update()` function actually has something to do. Otherwise it doesn't matter how often the `setInterval()` function calls `update()`, because nothing will happen if the `update()` function is empty.

- **5b)** Copy the body of the `update()` function into your program. The `update()` function already exists, so find it and fill in its code block.

  ```js
  function update() {
    moveSnake();

    if (hasHitWall() || hasCollidedWithSnake()) {
      endGame();
    }

    if (hasCollidedWithApple()) {
      handleAppleCollision();
    }
  }
  ```

  On each tick of the timer we move the snake. We'll check if it has collided
  with the wall, itself, or the apple.

  If it collides with the Apple, handle that collision (this includes lengthening the snake, adding a new apple, and increasing the score).

  If it collides with itself or the wall, end the game.

  As you can see, we are using a lot of functions to write out the logic. This
  is a strategy to make the main logic of the program readable. We'll have to work on those functions in later TODOs.

<br>
<h3 align="center">YOU DO NOT NEED TO OPEN LIVE SERVER FOR THIS TODO</h3>
<br>

# Part 3 - Completing the Game's Logic

## TODO 6: Change the snake's direction

### Step 1) A Lesson on How Keyboard Input Works

Every game provides some way for the user to have control. In this game, we will be using the keyboard to control our snake.

The following code is already provided for you in the _Setup_ section of the program, so you don't need to write it yourself:

> ```javascript
> $("body").on("keydown", handleKeyDown);
> ```

- **6a)** Find the `handleKeyDown` function in the _Helper Functions_ section towards the bottom. Then, plug the following two lines of code into the function's body:

  ```js
  activeKey = event.which;
  console.log(activeKey);
  ```

  What this code will do is save the key that has been pressed for processing later (in the `activeKey` variable), and it also prints the pressed key so that you can see in the console if the event is working.

### Step 2) Changing the Snake's Direction Based on Keyboard Input

With the `activeKey` variable saving the last pressed key, we can use that information to move our snake.

Find the definition of the Function `checkForNewDirection` and you'll see the comment for `// TODO 6b`. We've started a solution for this function for you. You should see this code:

```js
if (activeKey === KEY.LEFT) {
  snake.head.direction = "left";
}

// console.log(snake.head.direction);
```

**Uncomment the `console.log()`, save your code and refresh your game. Then open the console**

Right now, if you were to press the left arrow you would see the direction `"left"` printed to the console over and over again. This is because this function is called every time the `moveSnake()` function is called which is called 10 times per second by the `update` function. Now, we need to add the logic to handle the other three directions.

- **6b)** Using the `activeKey` variable and the `KEY` Object (located in the "Constant Variables" section near the top of your program), program `snake.head.direction` to change according to the arrow key that is currently being pressed.

  When you are finished, save your code, refresh your game and try pressing the arrow keys. Make sure that all four directions work!

<hr>

<br>
<br>
<br>
<br>

  <h3 align="center"><b>CHECK YOUR LIVE SERVER AND OPEN THE CONSOLE</b></h3>
  <p align="center"><b>Do you see all four direction printing to the console?</b></p>
  <p align="center"><b>If so, then comment out the console.log line.</b></p>
  <p align="center"><b>DO NOT MOVE FORWARD UNTIL YOU SEE ALL FOUR DIRECTIONS PRINTING AND HAVE SUBSEQUENTLY COMMENTED OUT THE CONSOLE.LOG</b></p>

<br>
<br>
<br>
<br>

## TODO 7: Make the head move

Now that we can control the direction our Snake _should_ move in, we can actually start moving the snake. Find `// TODO 7` in the `moveSnake` function definition.

On each call to `update`, `moveSnake()` will be called. After the `checkForNewDirection()` function is called (which you just programmed in TODO 6), `snake.head.direction` will either be `"left"`, `"right"`, `"down"`, or `"down"`. Now, we will need to move the snake exactly 1 square in the direction that it is facing.

- **7a)** Below `// TODO 7` add these lines of code:

```js
if (snake.head.direction === "left") {
  snake.head.column = snake.head.column - 1;
}
repositionSquare(snake.head);
```

> **READ:** The `repositionSquare` function accepts a `snakeSquare` Object and positions it on the screen according to that `snakeSquare`'s `.row` and `.column` properties. So, before we can reposition the square, we need to change either the row or column it currently is in! If we subtract `1` from the _current_ `snake.head.column` value, our snake will move `1` square to the left. \*This works for one direction, but we need to do more work to handle the other directions.\*\*

- **7b)** Add three more conditional statements to determine the snake head's next row and column position based on its current row, column, and direction; you need to handle the `"right"`, `"up"`, and `"down"` directions.\*\*

> **HINT:** The top row in the board is row `0` and row numbers increase as you move down. The left-most column in the board is column `0` and column numbers increase as you move to the right.

<hr>

<br>
<br>
<br>
<br>

  <h3 align="center"><b>CHECK YOUR LIVE SERVER</b></h3>
  <p align="center"><b>Does your snake move in all four directions?</b></p>
  <p align="center"><b>DO NOT MOVE FORWARD UNTIL YOUR SNAKE CAN MOVE IN ALL FOUR DIRECTIONS</b></p>

<br>
<br>
<br>
<br>

## TODO 8: Check for collisions with the wall

Now that our snake can move freely, we need to put some constraints on it. We don't want our snake to leave the confines of the board (sorry snake).

The next step in our game's `update` logic is to check if the snake has either collided with the walls or with itself. Let's start with the walls.

Find the function `hasHitWall()`.

> - **8a)** Program the function to return `true` if the snake's head has collided with any of the four walls of the board and `false` otherwise.
>
>   Use the following pieces of data to determine if the snake's head has collided with one of the walls.
>
> ```js
> ROWS; // the total number of ROWS in the board
> COLUMNS; // the total number of COLUMNS in the board
> snake.head.row; // the current row of snake.head
> snake.head.column; // the current column of snake.head
> ```

> **IMPORTANT:** Test your snake's movement before moving on. It should be able to get right up against all four walls, but not go past them without dying. If it can't reach the walls, or if it can go outside of the walls, then **adjust your conditions so that it can go anywhere within the box but nowhere outside of it. If you changed any width or height at any point, you may need to consult with your instructor.**

<hr>

<br>
<br>
<br>
<br>

  <h3 align="center"><b>CHECK YOUR LIVE SERVER</b></h3>
  <p align="center"><b>Does your snake die when it hits the walls?</b></p>
  <p align="center"><b>DO NOT MOVE FORWARD UNTIL YOUR SNAKE DIES WHEN IT HITS THE WALLS</b></p>

<br>
<br>
<br>
<br>

## TODO 9: Check for collisions with the apple

Now that our `apple` has been added to the board, we need the snake to actually eat it!

Within the `update` function we can see the logic for doing this:

```javascript
if (hasCollidedWithApple()) {
  handleAppleCollision();
}
```

If the snake `hasCollidedWithApple` then we can `handleAppleCollision`. Makes sense! Let's start with detecting collisions with the apple.

Find the definition for the function `hasCollidedWithApple()`.

> - **9a)** Make the function return `true` if the snake's head has collided with the apple and `false` otherwise.
>
>   Use the following pieces of data to determine if the snake's head has collided with the apple.
>
> ```js
> apple.row; // the current row of the apple
> apple.column; // the current column of the apple
> snake.head.row; // the current row of snake.head
> snake.head.column; // the current column of snake.head
> ```

**Save your code, refresh your game, and observe the changes!** If you did this
step properly then your snake should be able to eat the Apple.

<hr>

<br>
<br>
<br>
<br>

  <h3 align="center"><b>CHECK YOUR LIVE SERVER</b></h3>
  <p align="center"><b>The apple should disappear and reappear, and your score should increase. THE SNAKE SHOULD NOT GET LONGER YET</b></p>
  <p align="center"><b>Do you see this behavior when the snake collides with the apple?</b></p>
  <p align="center"><b>DO NOT MOVE FORWARD UNTIL YOUR SNAKE CAN EAT THE APPLE</b></p>

<br>
<br>
<br>
<br>

### TODO 10: Handle Apple Collisions

You may notice that our apple eating behavior isn't perfect. Find the function
`handleAppleCollision`. At this point, the apple and score are updated because the top of this function has the following logic:

```js
// increase the score and update the score DOM element
score++;
scoreElement.text("Score: " + score);

// Remove existing Apple and create a new one
apple.remove();
makeApple();
```

However, the bottom only has the following code at this point:

```js
var row = 0;
var column = 0;

// code to determine the row and column of the snakeSquare to add to the snake

makeSnakeSquare(row, column);
```

As we can see, right now we are creating a new snakeSquare at position (0, 0). It is your job to fix this.

- **10a)** determine the `row` and `column` where the next snakeSquare should be placed so that it is added on to the tail of the snake

  Use the `snake.tail.direction` with conditional statements to decide which way the tail is moving. Then, use `snake.tail.row`, and `snake.tail.column` (plus an offset of 1 depending on the snake's direction) to determine the correct row and column of the new piece.

> **HINT:** If the snake's tail is moving right, the next snakeSquare should be one column to the left. If the column is moving up, the next snakeSquare should be one row below. Use this logic to figure out the location of the new piece for all four directions that the snake might be moving.

> **NOTE:** Completing this TODO will not make your snake grow properly. It will simply create each new snakeSquare behind the snake's tail, but they won't follow it yet. Complete the next TODO to make your snake properly grow.

<hr>

<br>
<br>
<br>
<br>

  <h3 align="center"><b>CHECK YOUR LIVE SERVER</b></h3>
  <p align="center"><b>Does your snake leave a square behind it when it eats the apple? The top corner doesn't count, and it will only be leaving behind one new square</b></p>
  <p align="center"><b>DO NOT MOVE FORWARD UNTIL YOUR SNAKE LEAVES BEHIND A NEW SQUARE THAT IS NOT AT THE TOP LEFT CORNER</b></p>

<br>
<br>
<br>
<br>

## TODO 11: Move the body

Find the function definition for `moveSnake()`.

Our program is still not working properly. When our snake eats an apple, a new snakeSquare is added to the board in the correct location. However, each new snakeSquare does not follow the snake!

- **11a)** Add this code below the comment for `TODO: 11`:

```javascript
for ( /* code to loop through the indexes of the snake.body Array*/ ) {
    var snakeSquare = "???";

    var nextSnakeSquare = "???";
    var nextRow = "???";
    var nextColumn = "???";
    var nextDirection = "???";

    snakeSquare.direction = nextDirection;
    snakeSquare.row = nextRow;
    snakeSquare.column = nextColumn;
    repositionSquare(snakeSquare);
}
```

<hr>

**READ:** In order for the snake to follow the head, each snakeSquare must learn the position and direction of the snakeSquare that is in front of it. Since we want to apply this same logic to every snakeSquare in the `snake.body` Array, iteration using a `for` loop will be very helpful!

- **11b)** Reposition each snakeSquare in the `snake.body` Array and update the direction for each snakeSquare.

> **Hint 1:** The `for` loop will need to be set up in a particular way to make sure that each snakeSquare can follow the snake that comes before it without any data being prematurely overwritten. It may be beneficial to loop backwards. **TO REITERATE: Whether your loop iterates from front-to-back or back-to-front is a _critical_ consideration for this step.**

> **Hint 2:** Remember that the snake's head is the first entry in `snake.body` so make sure that your loop doesn't include index `0`!

> **HINT 3:** After making the basis your loop, think through how this process will work. How can you access each `snakeSquare` in the `snake.body` Array? How do you think we can use the index of each `snakeSquare` to figure out what the `nextSnakeSquare` should be?

<hr>

<br>
<br>
<br>
<br>

  <h3 align="center"><b>CHECK YOUR LIVE SERVER</b></h3>
  <p align="center"><b>Does the body now follow the snake properly?</b></p>
  <p align="center"><b>DO NOT MOVE FORWARD UNTIL YOUR SNAKE'S BODY FOLLOWS THE HEAD PROPERLY</b></p>

<br>
<br>
<br>
<br>

## TODO 12: Check for snake collisions with itself

After eating a few apples your snake will be long enough to potentially run into its own body! Try doing this and you'll notice that your snake will just breeze right through. This is not what you want.

According to our logic in the `update()` function, when this happens, the game is supposed to end! We need to fill out the `hasCollidedWithSnake()` function so that it properly detects this collision.

Find the `hasCollidedWithSnake()` function.

- **12a)** Make this function return `true` if the `snake.head` has overlapped with **_any_** snakeSquare in `snake.body`.

  What data will you need to use to solve this problem?

  > **Hint:** Remember that the snake's head is the first entry in `snake.body` so make sure that you aren't comparing `snake.head` with `snake.body[0]`!

<hr>

<br>
<br>
<br>
<br>

  <h3 align="center"><b>CHECK YOUR LIVE SERVER</b></h3>
  <p align="center"><b>Does your game end when the snake runs into itself?</b></p>
  <p align="center"><b>DO NOT MOVE FORWARD UNTIL YOUR GAME ENDS WHEN THE SNAKE RUNS INTO ITSELF</b></p>

<br>
<br>
<br>
<br>

## TODO 13: Make sure our Apple is placed only in available positions

The final problem is to make sure that when our apple is regenerated, it is positioned in a square on our screen that is actually available, and not accidentally on top of a piece of snake.

Find the function `getRandomAvailablePosition()`.

Currently, this is its logic:

```js
var spaceIsAvailable;
var randomPosition = {};

while (!spaceIsAvailable) {
  randomPosition.column = Math.floor(Math.random() * COLUMNS);
  randomPosition.row = Math.floor(Math.random() * ROWS);
  spaceIsAvailable = true;
}

return randomPosition;
```

**READ:** Notice that `spaceIsAvailable` needs to be `false` for the while loop to run, and part of what the loop does is set it to be `true` every time. As such, the program makes a single guess for where to put the apple and calls it a day.

You won't want to change that, but you'll need to use conditionals to set the value to `false` if the apple ends up on top of the snake, as that will make the loop try placing the apple again.

- **13a)** Modify the code block in the `while` loop so that if the randomly generated position is occupied by any part of the snake's body, it loops again.

  > **HINT 1:** You need to make sure that the apple doesn't appear on _any_ piece of your snake. How did you check for collisions between the head and the body? A similar approach would be fitting here, but with two differences.
  >
  > 1.  You should be comparing the `randomPosition` to the snake pieces instead of the head.
  > 2.  This check _should_ check the entire snake and not ignore the head.

  > **HINT 2:** If the first hint wasn't enough, you need to use iteration _within_ the `while` loop. You are more than allowed to put a `for` loop inside of a `while` loop if you want to, and you can put a conditional statement inside of that as well if needed.

<br>
<br>

  <h3 align="center"><b>CHECK WITH YOUR INSTRUCTOR UPON COMPLETING THIS STEP</b></h3>
  <p align="center"><b>It is very difficult to test this TODO without setting up the game with a large snake beforehand, or else playing for a long time. As such, let your instructor check your code for errors before concluding the project</b></p>

<br>
<br>

# Submit Your Work

Submit your work regularly. Because these files are already being tracked by your GitHub repo, you can skip the "git add" step. Instead, enter the following commands:

> git commit -a -m "finished snake game"
> git push

Congratulations on finishing the Snake game! You've built a fully functional game from scratch using HTML, CSS, and JavaScript. You've also learned how to use jQuery to manipulate HTML elements and how to organize your code using functions.
