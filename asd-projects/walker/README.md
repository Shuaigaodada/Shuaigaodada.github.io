# Box Walker

Bouncing Box, but you control the box, and it doesn't bounce!

**Table of Contents**

- [Overview](#Overview)
  - [Learning Objectives](#learning-objectives)
  - [Project Grading](#project-grading)
- [Lesson Steps](#lesson-steps)
  - [TODO 1: Understand the Template and Change the Box](#todo-1-understand-the-template-and-change-the-box)
  - [TODO 2: Register Keyboard Inputs](#todo-2-register-keyboard-inputs)
  - [TODO 3: React to Specific Keycodes](#todo-3-react-to-specific-keycodes)
  - [TODO 4: Declare `walker` Variable](#todo-4-declare-walker-variable)
  - [TODO 5: Declare Some Helper Functions](#todo-5-declare-some-helper-functions)
  - [TODO 6: Update `speedX` and `speedY` with the Keyboard](#todo-6-update-speedX-and-speedY-with-the-keyboard)
  - [TODO 7: Reset `speedX` and `speedY` on `"keyup"`](#todo-7-reset-speedx-and-speedy-on-keyup)
  - [TODO 8: Implement Borders`](#todo-8-implement-borders)
  - [Challenge Ideas](#challenge-ideas)
  - [Submit Your Work](#submit-your-work)

# Overview

<img src="img/walker-demo.gif">

In this project we will be building a simple program that allows us to control the movement of a box with the arrow keys. As a challenge, try limiting the movement of the "walker" to the boundaries of the board. Then, add a second "walker" and turn the program into a game of tag!

## Learning Objectives

- Become familiar with the template repository
- Apply lesson on detecting keyboard inputs
- Make connections to the Bouncing Box program and recognize patterns
- Continue to practice using jQuery

## Push Reminder

To push to GitHub, enter the following commands in bash:

```
git add -A
git commit -m "saving walker"
git push
```

## Project Grading

### Best Practices (25 points)

1. All code in proper sections (setup, core, helpers, etc.) - 5 points
2. Use comments to describe setup and functions - 10 points
3. Use helper functions to separate concerns - 10 points

**NOTE:** Incomplete programs will receive partial credit based on the number of TODOs completed with the above best practices in place.

### Program Progress (75 points)

- TODO 1 - 5 points
- TODO 2 - 10 points
- TODO 3 - 10 points
- TODO 4 - 10 points
- TODO 5 - 10 points
- TODO 6 - 10 points
- TODO 7 - 10 points
- TODO 8 - 10 points
- Challenge 1 - 5 points (bonus)
- Challenge 2 - 5 points (bonus)
- Challenge 3 - 10 points (bonus)
  **NOTE:** the bonus will not give you a score of over 100 should you earn that many points, but these challenges will help you out much later if you can do them.

# Lesson Steps

## TODO 1: Understand the Template and Change the Box

Let's begin by going through the existing code of the template and making a few minor changes

<hr>

### **File 1: The `index.html` file**

The body only has 2 elements: the `#board` and a single `#gameItem`. It should look like this:

```HTML
<body>
<div id='board'>
    <div id='gameItem'></div>
</div>
</body>
```

This produces a basic game board with a single game item on the board. If you need/want to add more, then you will need to place them on the board.

All elements will have unique `id` attributes, which means that you can select them using the appropriate CSS selectors whenever using jQuery or CSS.

- **1a)** Change the `id` of `'gameItem'` to be `'walker'`

> **NOTE:** When you do this, the box will no longer display. This will be remedied in the next step.

<hr>

### **File 2: The `index.css` file**

The games we will build this semester will all use 2D graphics since we are limiting ourselves to HTML and CSS. Most of the shapes can be easily drawn as rectangles using the `width` and `height` properties.

> Notice the values for the `position` properties set for the `#board` and the `#gameItem`. The parent element (`#board`) has the `position: relative` property while the child element (`#gameItem`) has the `position: absolute` property. This combo means that the child element can be placed anywhere inside the parent element by manipulating the `left` and `top` properties.
>
> - `left` is the x-coordinate, or distance from the left
> - `top` is the y-coordinate, or distance from the top

Finally: Be aware that rectangles can be made into circles by adding a `border-radius` property.

- **1b)** Change the id selector `#gameItem` to `#walker` so that it matches the HTML

- **1c)** Add a `border-radius` property to the `#walker`. To make it a perfect circle, set the `border-radius` to the same value as the `width` and `height`. **You do not need to make it a perfect circle, but you do need at least a small bit of curvature.**

<hr>

### **File 3: The `index.js` file**

Look at the code written under each header. Remember:

- Setup: variable declarations, any one-off statements needed to start the program
- Core Logic: The main logic driving the program. Should delegate work to helper functions.
- Helper Functions: functions that help implement the core logic.

<hr>

<br>
<br>
<br>
<br>

  <h3 align="center"><b>CHECK YOUR LIVE SERVER. RIGHT CLICK ON THE SHAPE ON THE TOP LEFT AND CLICK INSPECT</b></h3>
  <p align="center"><b>Do you see that it has the id of "walker"? Is the shape a circle?</b></p>
  <p align="center"><b>DO NOT MOVE FORWARD UNLESS YOU HAVE A CIRCLE WITH THE ID OF "walker"</b></p>

<br>
<br>
<br>
<br>

## TODO 2: Register Keyboard Inputs

**FIND:**
Open the `index.js` file.

Our first task is to make our game register `"keydown"` events and respond to them. We'll keep the response simple for now until we know that our code is working.

In the SETUP section, find where the event handler's are registered (`$(document).on('eventType', handleEvent)`.

**CODE:**

- **2a)** Modify the code such that, instead of calling `handleEvent`, it calls a different function: `handleKeyDown`.
- **2b)** Make sure that it is called in response to `"keydown"` events.
- **2c)** Find the event handler function `handleEvent` and change its name to `handleKeyDown`. Inside, add a `console.log()` statement to its `{code block}` that prints the keycode of the key pressed:

Together, these components will look like this:

```js
// SETUP...
$(document).on('keydown', handleKeyDown);

// CORE LOGIC...
function handleKeyDown(event) {
  console.log(???);
}
```

> > **HINT:** How do you know _which_ key was pressed from the given `event` object? Check out <a href=https://keycode.info/>keycode.info</a> for help!

<hr>

> **TESTING:** Save your code and open with live server. Open the console, then press keys to make sure that the events are properly being registered.
>
> <img src='img/keycode-console.png'>

<hr>

<br>
<br>
<br>
<br>

  <h3 align="center"><b>CHECK YOUR LIVE SERVER AND THE CONSOLE</b></h3>
  <p align="center"><b>Do you see the keys being printed when they are pressed?</b></p>
  <p align="center"><b>DO NOT MOVE FORWARD UNLESS YOU SEE THE KEYS BEING PRINTED IN THE CONSOLE</b></p>

<br>
<br>
<br>
<br>

## TODO 3: React to Specific Keycodes

Now that we know our `"keydown"` events are being handled, let's figure out exactly _which_ keys are being pressed.

- **3a)** Declare a new _constant variable_ `KEY` in the SETUP section and assign an Object to it. The object should map the following keys: `"LEFT"`, `"UP"`, `"RIGHT"`, `"DOWN"`, to their respective keycodes. For example, the keycode for the _Enter_ key is `13`:

  Example:

  ```js
  var KEY = {
    ENTER: 13,
  };
  ```

- **3b)** Now, modify your `handleKeyDown` function such that it can react differently to our target keys. For example, if I wanted to print out `"enter pressed"` when the _Enter_ key is pressed, I could write:

  ```js
  function handleKeyDown(event) {
    if (event.which === KEY.ENTER) {
      console.log("enter pressed");
    }
  }
  ```

  Modify this function such that it can print out `"left pressed"` when the left arrow is pressed. Do the same for the other three arrow keys.

> **TESTING:** Save your code and refresh your application in the other window. Test it to make sure that the right messages are being printed to the console.

<hr>

<br>
<br>
<br>
<br>

  <h3 align="center"><b>CHECK YOUR LIVE SERVER AND THE CONSOLE</b></h3>
  <p align="center"><b>Do you see the directions being printed when the keys are pressed?</b></p>
  <p align="center"><b>DO NOT MOVE FORWARD UNLESS YOU SEE THE DIRECTIONS BEING PRINTED IN THE CONSOLE</b></p>

<br>
<br>
<br>
<br>

## TODO 4: Declare `walker` Variable

Now that we can determine which keys are being pressed, we can move on to the problem of moving the `walker` game item.

This is actually a problem we've already solved in **Bouncing Box**. To move the box, we needed the following data:

```js
var positionX = 0; // the x-coordinate location for the box
var speedX = 0; // the speed for the box along the x-axis
```

> NOTE: The above code was for _Bouncing Box_, not for Walker, but the idea is similar.
>
> For this project, we want to be able to move along the x-axis _AND_ the y-axis.

**FIND:**
Because this involves variable declarations global to the project, it should go up in the SETUP section.

**CODE:**

- **4a)** Declare a variable for the `walker` game item (feel free to name the variable `walker` as well). This variable will need to store an object such that we can monitor and control the following information:

  - the x-coordinate location
  - the y-coordinate location
  - the speed along the x-axis
  - the speed along the y-axis
    <br>
    <br>

- **4b)** Initialize each of the four properties of this object to hold the value `0`

<br>
<h3 align="center">YOU DO NOT NEED TO OPEN LIVE SERVER FOR THIS TODO</h3>
<br>

## TODO 5: Declare Some Helper Functions

**READ:**
Now that we have our data tracking in place, we need to use that data to actually move the `walker` game item on each `update`. This is a problem solved in Bouncing Box.

> > **REMINDER:** The below code snippets are taken directly from _Bouncing Box_ and are not the exact code that you should use here. They are merely _examples_ of how to solve a similar but simpler problem.
>
> To reposition the box in Bouncing Box we wrote:
>
> ```js
> positionX += speedX; // update the position of the box along the x-axis
> ```
>
> And to redraw the box in the new x-location we wrote:
>
> ```js
> $("#box").css("left", positionX); // draw the box in the new location, positionX pixels away from the "left"
> ```

**CODE:**

- **5a)** In the HELPER FUNCTIONS section, declare two new functions called `repositionGameItem()` and `redrawGameItem()`.
- **5b)** Reference the code above to complete these two functions such that they can reposition and redraw the GameItem to move along the x-axis AND the y-axis.
- **5c)** Call each function on each `newFrame`.

**HINT 1:** Use the `"top"` CSS property to draw the box `y` pixels from the `"top"`

**HINT 2:** Check what the id of the GameItem is for your jQuery statements.

**HINT 3:** Keep in mind that you have an object storing your data this time. There are no "positionX", "speedX", ect. variables, so you will need to use the properties of your object.

<br>
<h3 align="center">YOU DO NOT NEED TO OPEN LIVE SERVER FOR THIS TODO</h3>
<br>

## TODO 6: Update `speedX` and `speedY` with the Keyboard

**READ:**
The box isn't moving yet because we initialized the `speedX` and `speedY` properties to `0`. As long as `speedX` is `0`, the `walker` game item will not move along the x-axis. The same goes for `speedY` and the y-axis.

When we press a key, we want the `walker` game item to move in that direction which we can accomplish by, for example, setting the `speedX` propery to some positive number when the right arrow is pressed and setting to a negative value when the left arrow is pressed. Then, on the following `newFrame`, the position of the `walker` game item will be recalculated based on the the code we wrote in TODO 4.

**CODE:**

- **6a)** Modify your `handleKeyDown` function such that when the `KEY.LEFT` key is pressed, the `speedX` property is set to `-5`:

```js
if (event.which === KEY.LEFT) {
  walker.speedX = -5;
}
```

- **6b)** Do the same for the other 3 arrow keys.

> **Question: Why does the box only move diagonally after your press the keys? Take a moment to think about it if you aren't sure. Understanding this can really help you with understanding game mechanics in general**

<hr>

<br>
<br>
<br>
<br>

  <h3 align="center"><b>CHECK YOUR LIVE SERVER AND TEST EACH DIRECTION. REFRESH THE PAGE BETWEEN EACH TEST TO STOP THE DIAGONAL MOVEMENT</b></h3>
  <p align="center"><b>Do you see the walker moving in the appropriate direction? Again, diagonal movment will occur if you don't refresh the page after pressing a key</b></p>
  <p align="center"><b>DO NOT MOVE FORWARD UNLESS YOU SEE THE WALKER MOVING IN THE DIRECTION OF THE ARROW KEYS</b></p>

<br>
<br>
<br>
<br>

## TODO 7: Reset `speedX` and `speedY` on `"keyup"`

**READ:**

We now have motion! However, the `walker` game item doesn't stop moving once we set it off. We need some way to stop it from moving.

Ideally, the `walker` game item would stop moving once we release the arrow key. This `"keyup"` event can be listened for in the same way that the `"keydown"` event can be listened for.

**CODE:**

- **7a)** Similar to the code that you've already written in TODO 5, set up your program to listen for `"keyup"` events and set the `speedX` and `speedY` properties to `0` whenever the arrow keys are released. This will involve both creating the `handleKeyUp` event handler function and registering it.

<hr>

<br>
<br>
<br>
<br>

  <h3 align="center"><b>CHECK YOUR LIVE SERVER AND TEST EACH DIRECTION</b></h3>
  <p align="center"><b>Do you see the walker stopping when you release the arrow keys?</b></p>
  <p align="center"><b>DO NOT MOVE FORWARD UNLESS YOU SEE THE WALKER STOPPING WHEN YOU RELEASE THE ARROW KEYS</b></p>

<br>
<br>
<br>
<br>

## TODO 8: Implement Borders

Your final task is to make sure that the walker object does not leave the board area.

**CODE:**

- **8a)** Make a helper function called `wallCollision()`. In this function, use conditionals to prevent the walker object from leaving the board. You may use `$("#board").width()` and `$("#board").height()` to get the x coordinate of the right wall and the y coordinate of the bottom wall, respctively. You may hardcode the coordinates of the left and top walls as `0`.

**HINT:** Do not reverse the speed if there is a collision, as this will make your object bounce. Instead, simply subtract the speed from its current position.

- **8b)** Call your `wallCollision()` function from your `newFrame()` function. You will want to call it after `repositionGameItem()` but before `redrawGameItem()`.

<hr>

<br>
<br>
<br>
<br>

  <h3 align="center"><b>CHECK YOUR LIVE SERVER AND TEST EACH DIRECTION</b></h3>
  <p align="center"><b>Do you see the walker stopping when it reaches the edge of the board?</b></p>
  <p align="center"><b>DO NOT MOVE FORWARD UNLESS YOU SEE THE WALKER STOPPING WHEN IT REACHES THE EDGE OF THE BOARD</b></p>

<br>
<br>
<br>
<br>

# Challenge Ideas:

Do these if you have time. They are not required, but it will help you out if you know how to do them.

## Add a second player that can be controlled with WASD

What will you need to add to the setup area? What will you need to add to the core logic? What new helper functions will you need?

## Make the player(s) change color when clicked on

If you want the colors to be random, you can produce a random color with the following code:

```js
var randomColor = "#000000".replace(/0/g, function () {
  return (~~(Math.random() * 16)).toString(16);
});
```

There are other, less cryptic ways to produce random numbers, but if you just want a random color, this will work. However, you may use other methods of changing colors as well.

## Detect when the two players collide to make a "tag" game.

After the two players collide, make the player who is "it" turn red and move each player to the opposite corners of the screen. Try making the "it" player have a slightly slower speed so that the other player can escape more easily (and maybe make the board bigger).

# Submit Your Work

Submit your work regularly. Because these files are already being tracked by your GitHub repo, you can skip the "git add" step. Instead, enter the following commands:

> git commit -a -m "saving walker"
>
> git push

Congratulations on completing Walker!
