// This is a small program. There are only two sections. This first section is what runs
// as soon as the page loads.
$(document).ready(function () {
  render($("#display"), image);
  $("#apply").on("click", applyAndRender);
  $("#reset").on("click", resetAndRender);
});

/////////////////////////////////////////////////////////
//////// event handler functions are below here /////////
/////////////////////////////////////////////////////////

// this function resets the image to its original value; do not change this function
function resetAndRender() {
  reset();
  render($("#display"), image);
}

// this function applies the filters to the image and is where you should call
// all of your apply functions
function applyAndRender() {
  // Multiple TODOs: Call your apply function(s) here
  applyFilter(reddify);
  applyFilterNoBackground(decreaseBlue);
  applyFilterNoBackground(increaseGreenByBlue);

  // do not change the below line of code
  render($("#display"), image);
}

/////////////////////////////////////////////////////////
// "apply" and "filter" functions should go below here //
/////////////////////////////////////////////////////////

// TODO 1, 2 & 4: Create the applyFilter function here
function applyFilter(filterFunction) {
  for (var row = 0; row < image.length; row++) {
    for (var col = 0; col < image[row].length; col++) {
      var rgbString = image[row][col];
      var rgbNumbers = rgbStringToArray(rgbString);
      filterFunction(rgbNumbers);
      rgbString = rgbArrayToString(rgbNumbers);
      image[row][col] = rgbString;
    }
  }
}

// TODO 7: Create the applyFilterNoBackground function
function applyFilterNoBackground(filterFunction) {
  var backgroundColor = image[0][0];
  for (var row = 0; row < image.length; row++) {
    for (var col = 0; col < image[row].length; col++) {
      var rgbString = image[row][col];
      if (rgbString !== backgroundColor) {
        var rgbNumbers = rgbStringToArray(rgbString);
        filterFunction(rgbNumbers);
        rgbString = rgbArrayToString(rgbNumbers);
        image[row][col] = rgbString;
      }
    }
  }
}

// TODO 5: Create the keepInBounds function
function keepInBounds(value) {
  return Math.max(0, Math.min(255, value));
}

// TODO 3: Create reddify function
function reddify(rgbNumbers) {
  rgbNumbers[RED] = 200;
}

// TODO 6: Create more filter functions
function decreaseBlue(rgbNumbers) {
  rgbNumbers[BLUE] = keepInBounds(rgbNumbers[BLUE] - 50);
}

function increaseGreenByBlue(rgbNumbers) {
  rgbNumbers[GREEN] = keepInBounds(rgbNumbers[GREEN] + rgbNumbers[BLUE]);
}

// CHALLENGE code goes below here