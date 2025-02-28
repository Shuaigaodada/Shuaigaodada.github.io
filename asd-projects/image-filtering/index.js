// This is a small program. There are only two sections. This first section is what runs
// as soon as the page loads.
$(document).ready(function () {
  // Render the initial image
  render($("#display"), image);
  // Set up event handlers for the apply and reset buttons
  $("#apply").on("click", applyAndRender);
  $("#reset").on("click", resetAndRender);
});

/////////////////////////////////////////////////////////
//////// event handler functions are below here /////////
/////////////////////////////////////////////////////////

// This function resets the image to its original value; do not change this function
function resetAndRender() {
  reset(); // Reset the image to its original state
  render($("#display"), image); // Render the reset image
}

// This function applies the filters to the image and is where you should call
// all of your apply functions
function applyAndRender() {
  // Multiple TODOs: Call your apply function(s) here
  applyFilter(reddify); // Apply the reddify filter to the entire image
  applyFilterNoBackground(decreaseBlue); // Apply the decreaseBlue filter to the image, excluding the background
  applyFilterNoBackground(increaseGreenByBlue); // Apply the increaseGreenByBlue filter to the image, excluding the background

  // Do not change the below line of code
  render($("#display"), image); // Render the filtered image
}

/////////////////////////////////////////////////////////
// "apply" and "filter" functions should go below here //
/////////////////////////////////////////////////////////

// TODO 1, 2 & 4: Create the applyFilter function here
function applyFilter(filterFunction) {
  // Loop through each pixel in the image
  for (var row = 0; row < image.length; row++) {
    for (var col = 0; col < image[row].length; col++) {
      var rgbString = image[row][col]; // Get the RGB string of the current pixel
      var rgbNumbers = rgbStringToArray(rgbString); // Convert the RGB string to an array of numbers
      filterFunction(rgbNumbers); // Apply the filter function to the RGB numbers
      rgbString = rgbArrayToString(rgbNumbers); // Convert the RGB numbers back to a string
      image[row][col] = rgbString; // Update the pixel with the new RGB string
    }
  }
}

// TODO 7: Create the applyFilterNoBackground function
function applyFilterNoBackground(filterFunction) {
  var backgroundColor = image[0][0]; // Get the background color (assumed to be the color of the top-left pixel)
  // Loop through each pixel in the image
  for (var row = 0; row < image.length; row++) {
    for (var col = 0; col < image[row].length; col++) {
      var rgbString = image[row][col]; // Get the RGB string of the current pixel
      if (rgbString !== backgroundColor) { // Check if the current pixel is not the background color
        var rgbNumbers = rgbStringToArray(rgbString); // Convert the RGB string to an array of numbers
        filterFunction(rgbNumbers); // Apply the filter function to the RGB numbers
        rgbString = rgbArrayToString(rgbNumbers); // Convert the RGB numbers back to a string
        image[row][col] = rgbString; // Update the pixel with the new RGB string
      }
    }
  }
}

// TODO 5: Create the keepInBounds function
function keepInBounds(value) {
  // Ensure the value is within the range [0, 255]
  return Math.max(0, Math.min(255, value));
}

// TODO 3: Create reddify function
function reddify(rgbNumbers) {
  rgbNumbers[RED] = 200; // Set the red component to 200
}

// TODO 6: Create more filter functions
function decreaseBlue(rgbNumbers) {
  rgbNumbers[BLUE] = keepInBounds(rgbNumbers[BLUE] - 50); // Decrease the blue component by 50, ensuring it stays within bounds
}

function increaseGreenByBlue(rgbNumbers) {
  rgbNumbers[GREEN] = keepInBounds(rgbNumbers[GREEN] + rgbNumbers[BLUE]); // Increase the green component by the value of the blue component, ensuring it stays within bounds
}

// CHALLENGE code goes below here