"use strict";

const previewOverlayCanvas = document.getElementById("previewOverlayCanvas");
const previewCanvas = document.getElementById("previewCanvas");
const backgroundCanvas = document.getElementById("backgroundCanvas");

const mapOverlayCanvas = document.getElementById("mapOverlayCanvas");
const mapVectorCanvas = document.getElementById("mapVectorCanvas");
const mapCanvas = document.getElementById("mapCanvas");

const refOverlayCanvas = document.getElementById("refOverlayCanvas");
const refCanvas = document.getElementById("refCanvas");

const mapFile = document.getElementById("mapFile");
const refFile = document.getElementById("refFile");
const bakFile = document.getElementById("backgroundFile");

const previewStack = document.getElementById("previewStack");
const refStack = document.getElementById("refStack");
const mapStack = document.getElementById("mapStack");

const newButton = document.getElementById("newMapButton");
const createXSize = document.getElementById("createXSize");
const createYSize = document.getElementById("createYSize");

const unequalWarning = document.getElementById("unequalWarning");
const closeWarning = document.getElementById("closeWarning");

const exportButton = document.getElementById("exportButton");

const bakOpacity = document.getElementById("backgroundOpacity");
const preOpacity = document.getElementById("previewOpacity");

const forward = document.getElementById("forward");
const reverse = document.getElementById("reverse");
const paint = document.getElementById("paint");
const mask = document.getElementById("mask");

const selectControls = document.getElementById("selectControls");
const fromX = document.getElementById("fromX");
const fromY = document.getElementById("fromY");
const toX = document.getElementById("toX");
const toY = document.getElementById("toY");
const fromGroup = document.getElementById("fromGroup");
const toGroup = document.getElementById("toGroup");

const paintControls = document.getElementById("paintControls");
const moveX = document.getElementById("moveX");
const moveY = document.getElementById("moveY");
const dirClearButton = document.getElementById("dirClearButton");

const maskControls = document.getElementById("maskControls");
const drawRadio = document.getElementById("drawRadio");
const clearRadio = document.getElementById("clearRadio");

var bakData = null;
var refData = null;
var mapData = null;

var pixelSizeX = 1;
var pixelSizeY = 1;

var editMode = 0;
var editStep = 0;

var fromXCoord = null;
var fromYCoord = null;

var toXCoord = null;
var toYCoord = null;

var paintDeltaX = null;
var paintDeltaY = null;

var painting = false;

resizeCanvases();

forward.addEventListener("change", () => setForwardMode());
reverse.addEventListener("change", () => setReverseMode());
paint.addEventListener("change", () => setPaintMode());
mask.addEventListener("change", () => setMaskMode());

previewCanvas.addEventListener("mousemove", (e) => handleHighlight(e));
previewCanvas.addEventListener("mouseleave", () => {
  clearOverlays();
  painting = false;
});

mapCanvas.addEventListener("mousemove", (e) => handleHighlight(e));
mapCanvas.addEventListener("mouseleave", () => {
  clearOverlays();
  painting = false;
});

refCanvas.addEventListener("mousemove", (e) => handleHighlight(e));
refCanvas.addEventListener("mouseleave", () => {
  clearOverlays();
  painting = false;
});

previewCanvas.addEventListener("mousedown", (e) => handleClick(e));
refCanvas.addEventListener("mousedown", (e) => handleClick(e));
mapCanvas.addEventListener("mousedown", (e) => handleClick(e));

document.addEventListener("mouseup", () => {
  painting = false;
});

window.addEventListener("resize", resizeCanvases);

mapFile.addEventListener(
  "change",
  (e) => handleDataUpload(e, setMapData),
  false
);
refFile.addEventListener(
  "change",
  (e) => handleDataUpload(e, setRefData),
  false
);
bakFile.addEventListener(
  "change",
  (e) => handleDataUpload(e, setBakData),
  false
);

closeWarning.addEventListener("click", () => hideSizeWarning());
exportButton.addEventListener("click", () => exportDispMap());

dirClearButton.addEventListener("click", () => {
  moveX.value = 0;
  moveY.value = 0;
});

bakOpacity.addEventListener("input", (e) => {
  var opacity = e.target.value / 100;
  backgroundCanvas.style.opacity = opacity;
});

preOpacity.addEventListener("input", (e) => {
  var opacity = e.target.value / 100;
  previewCanvas.style.opacity = opacity;
});

newButton.addEventListener("click", () => {
  var mapWidth = parseInt(createXSize.value);
  var mapHeight = parseInt(createYSize.value);

  if (mapWidth && mapWidth > 0 && mapHeight && mapHeight > 0) {
    var tempData = new ImageData(mapWidth, mapHeight);
    for (var i = 0; i < tempData.data.length; i += 4) {
      tempData.data[i] = 128;
      tempData.data[i + 1] = 128;
      tempData.data[i + 2] = 0;
      tempData.data[i + 3] = 255;
    }
    setMapData(tempData);
    mapFile.value = "";
    validateSizes();
  }
});

function handleClick(e) {
  var x = e.offsetX;
  var y = e.offsetY;
  var scaledX = Math.floor(x / pixelSizeX);
  var scaledY = Math.floor(y / pixelSizeY);

  if (editMode == 0) {
    if (editStep == 0) {
      setFromCoords(scaledX, scaledY);
      editStep = 1;
      fromGroup.className = "";
      toGroup.className = "pico-background-violet-600";

      setToCoords();
    } else if (editStep == 1) {
      setToCoords(scaledX, scaledY);
      editStep = 0;
      fromGroup.className = "pico-background-violet-600";
      toGroup.className = "";

      var deltaX = fromXCoord - toXCoord;
      var deltaY = fromYCoord - toYCoord;

      setPixelDisplacement(toXCoord, toYCoord, deltaX, deltaY);

      setFromCoords();
      setToCoords();
    }
  }
  if (editMode == 1) {
    if (editStep == 0) {
      setToCoords(scaledX, scaledY);
      editStep = 1;
      toGroup.className = "";
      fromGroup.className = "pico-background-violet-600";

      setFromCoords();
    } else if (editStep == 1) {
      setFromCoords(scaledX, scaledY);
      editStep = 0;
      toGroup.className = "pico-background-violet-600";
      fromGroup.className = "";

      var deltaX = fromXCoord - toXCoord;
      var deltaY = fromYCoord - toYCoord;

      setPixelDisplacement(toXCoord, toYCoord, deltaX, deltaY);

      setFromCoords();
      setToCoords();
    }
  }
  if (editMode == 2) {
    painting = true;
    var deltaX = parseInt(moveX.value);
    var deltaY = parseInt(moveY.value);

    setPixelDisplacement(scaledX, scaledY, deltaX, deltaY);
  }
  if (editMode == 3) {
    painting = true;
    var masked = clearRadio.checked;
    console.log(masked);

    setPixelMask(scaledX, scaledY, masked);
  }
  drawAllControls(x, y);
}

function setPixelDisplacement(pixelX, pixelY, deltaX, deltaY) {
  var index = 4 * (pixelX + mapData.width * pixelY);

  mapData.data[index] = 128 + deltaX;
  mapData.data[index + 1] = 128 + deltaY;
  mapData.data[index + 2] = deltaX == 0 && deltaY == 0 ? 0 : 64;
  mapData.data[index + 3] = 255;
  setCanvasImageData(mapCanvas, mapData);
  updatePreview();
  drawVectorField();
}

function setPixelMask(pixelX, pixelY, masked) {
  var index = 4 * (pixelX + mapData.width * pixelY);
  mapData.data[index + 3] = 255 * !masked;
  if (!masked) {
    if (mapData.data[index] == 0) {
      mapData.data[index] = 128;
    }
    if (mapData.data[index + 1] == 0) {
      mapData.data[index + 1] = 128;
    }
  }
  setCanvasImageData(mapCanvas, mapData);
  updatePreview();
  drawVectorField();
}

function setForwardMode() {
  editMode = 0;
  editStep = 0;
  selectControls.style.display = "";
  paintControls.style.display = "none";
  maskControls.style.display = "none";

  fromGroup.className = "pico-background-violet-600";
  toGroup.className = "";

  setFromCoords();
  setToCoords();
}

function setReverseMode() {
  editMode = 1;
  editStep = 0;
  selectControls.style.display = "";
  paintControls.style.display = "none";
  maskControls.style.display = "none";

  fromGroup.className = "";
  toGroup.className = "pico-background-violet-600";

  setFromCoords();
  setToCoords();
}

function setPaintMode() {
  editMode = 2;
  editStep = 0;
  selectControls.style.display = "none";
  paintControls.style.display = "";
  maskControls.style.display = "none";
}

function setMaskMode() {
  editMode = 3;
  editStep = 0;
  selectControls.style.display = "none";
  paintControls.style.display = "none";
  maskControls.style.display = "";
}

function setFromCoords(x, y) {
  if (x != null && y != null) {
    fromXCoord = x;
    fromYCoord = y;
    fromX.value = fromXCoord;
    fromY.value = fromYCoord;
  } else {
    fromXCoord = null;
    fromYCoord = null;
    fromX.value = "";
    fromY.value = "";
  }
}

function setToCoords(x, y) {
  if (x != null && y != null) {
    toXCoord = x;
    toYCoord = y;
    toX.value = toXCoord;
    toY.value = toYCoord;
  } else {
    toXCoord = null;
    toYCoord = null;
    toX.value = "";
    toY.value = "";
  }
}

async function exportDispMap() {
  if (!mapData) return;

  const canvas = document.createElement("canvas");
  canvas.width = mapData.width;
  canvas.height = mapData.height;
  canvas.getContext("2d").putImageData(mapData, 0, 0);
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );

  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: "displacement.png",
        types: [
          { description: "PNG image", accept: { "image/png": [".png"] } },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
    } catch (err) {
      if (err.name !== "AbortError") throw err; // user hit Cancel, not a real error
    }
  } else {
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: "displacement.png",
    });
    a.click();
    URL.revokeObjectURL(url);
  }
}

function displaceImageData(inputImageData, mapImageData) {
  if (
    inputImageData.width != mapImageData.width ||
    inputImageData.height != mapImageData.height
  ) {
    return inputImageData;
  }
  var w = mapImageData.width;
  var h = mapImageData.height;
  const outputImageData = new ImageData(w, h);
  const outData = outputImageData.data;

  const inData = inputImageData.data;
  const displacementData = mapImageData.data;

  for (var i = 0; i < outData.length; i += 4) {
    const pixel = i / 4;
    const x = pixel % w;
    const y = Math.floor(pixel / w);

    const xDisp = displacementData[i] - 128;
    const yDisp = displacementData[i + 1] - 128;
    const mask = displacementData[i + 3];

    const newX = x + xDisp;
    const newY = y + yDisp;

    if (newX < 0 || newX >= w || newY < 0 || newY >= h) {
      outData[i] = outData[i + 1] = outData[i + 2] = outData[i + 3] = 0;
    } else {
      var displacedIndex = 4 * (newX + w * newY);
      outData[i] = inData[displacedIndex];
      outData[i + 1] = inData[displacedIndex + 1];
      outData[i + 2] = inData[displacedIndex + 2];
      outData[i + 3] = Math.min(mask, inData[displacedIndex + 3]);
    }
  }
  return outputImageData;
}

function handleDataUpload(e, callback) {
  if (!e.target.files.length) return;
  var reader = new FileReader();
  reader.onload = function (event) {
    var img = new Image();
    img.onload = function () {
      const { naturalWidth: width, naturalHeight: height } = img;
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      callback(ctx.getImageData(0, 0, width, height));
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(e.target.files[0]);
}

function setMapData(data) {
  mapData = data;
  setCanvasImageData(mapCanvas, mapData);
  updatePreview();
  drawVectorField();
  validateSizes();
}

function setRefData(data) {
  refData = data;
  setCanvasImageData(refCanvas, refData);
  updatePreview();
  validateSizes();
}

function setBakData(data) {
  bakData = data;
  setCanvasImageData(backgroundCanvas, bakData);
  validateSizes();
}

function updatePreview() {
  if (refData && mapData) {
    setCanvasImageData(previewCanvas, displaceImageData(refData, mapData));
  } else if (refData) {
    setCanvasImageData(previewCanvas, refData);
  }
}

function validateSizes() {
  if (mapData && refData) {
    if (mapData.width != refData.width || mapData.height != refData.height) {
      showSizeWarning();
      return;
    }
  }
  if (mapData && bakData) {
    if (mapData.width != bakData.width || mapData.height != bakData.height) {
      showSizeWarning();
      return;
    }
  }
  if (bakData && refData) {
    if (bakData.width != refData.width || bakData.height != refData.height) {
      showSizeWarning();
      return;
    }
  }
  hideSizeWarning();
}

function showSizeWarning() {
  unequalWarning.style.visibility = "visible";
  if (mapData) {
    document.getElementById(
      "mapWarn"
    ).textContent = `Displacement width:${mapData.width}, height:${mapData.height}`;
  } else {
    document.getElementById("mapWarn").textContent = "";
  }
  if (refData) {
    document.getElementById(
      "refWarn"
    ).textContent = `Reference width:${refData.width}, height:${refData.height}`;
  } else {
    document.getElementById("refWarn").textContent = "";
  }
  if (bakData) {
    document.getElementById(
      "bakWarn"
    ).textContent = `Background width:${bakData.width}, height:${bakData.height}`;
  } else {
    document.getElementById("bakWarn").textContent = "";
  }
}

function hideSizeWarning() {
  unequalWarning.style.visibility = "hidden";
}

function setCanvasImageData(canvas, imageData) {
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d");
  ctx.putImageData(imageData, 0, 0);
  resizeCanvases();
}

function resizeCanvases() {
  var pixelCanvasWidth = previewCanvas.clientWidth;
  var pixelCanvasHeight = previewCanvas.clientHeight;

  previewOverlayCanvas.width = pixelCanvasWidth;
  previewOverlayCanvas.height = pixelCanvasHeight;

  var backgroundCanvasWidth = backgroundCanvas.clientWidth;
  var backgroundCanvasHeight = backgroundCanvas.clientHeight;

  previewStack.style.aspectRatio = Math.min(
    pixelCanvasWidth / pixelCanvasHeight,
    backgroundCanvasWidth / backgroundCanvasHeight
  );

  var mapCanvasWidth = mapCanvas.clientWidth;
  var mapCanvasHeight = mapCanvas.clientHeight;

  mapOverlayCanvas.width = mapCanvasWidth;
  mapOverlayCanvas.height = mapCanvasHeight;
  
  mapVectorCanvas.width = mapCanvasWidth;
  mapVectorCanvas.height = mapCanvasHeight;

  drawVectorField();

  mapStack.style.aspectRatio = mapCanvasWidth / mapCanvasHeight;

  var refCanvasWidth = refCanvas.clientWidth;
  var refCanvasHeight = refCanvas.clientHeight;

  refOverlayCanvas.width = refCanvasWidth;
  refOverlayCanvas.height = refCanvasHeight;

  refStack.style.aspectRatio = refCanvasWidth / refCanvasHeight;

  pixelSizeX = mapCanvasWidth / mapCanvas.width;
  pixelSizeY = mapCanvasHeight / mapCanvas.height;
}

function handleHighlight(e) {
  var x = e.offsetX;
  var y = e.offsetY;

  var scaledX = Math.floor(x / pixelSizeX);
  var scaledY = Math.floor(y / pixelSizeY);

  if (editMode == 2 && painting) {
    var deltaX = parseInt(moveX.value);
    var deltaY = parseInt(moveY.value);

    setPixelDisplacement(scaledX, scaledY, deltaX, deltaY);
  }

  if (editMode == 3 && painting) {
    var masked = clearRadio.checked;

    setPixelMask(scaledX, scaledY, masked);
  }

  if (editMode == 0) {
    if (editStep == 0) {
      setFromCoords(scaledX, scaledY);
    } else if (editStep == 1) {
      setToCoords(scaledX, scaledY);
    }
  }
  if (editMode == 1) {
    if (editStep == 0) {
      setToCoords(scaledX, scaledY);
    } else if (editStep == 1) {
      setFromCoords(scaledX, scaledY);
    }
  }

  drawAllControls(x, y);
}

function drawAllControls(mouseX, mouseY) {
  drawControlsPreview(mouseX, mouseY);
  drawControlsReference(mouseX, mouseY);
  drawControlsMap(mouseX, mouseY);
}

function drawControlsPreview(mouseX, mouseY) {
  drawCursor(previewOverlayCanvas, mouseX, mouseY);
  if (editMode == 1) {
    if (editStep == 1) {
      drawPixelHighlight(
        previewOverlayCanvas,
        toXCoord,
        toYCoord,
        "lightblue",
        "darkblue"
      );
      drawArrowOnCanvas(
        previewOverlayCanvas,
        mouseX,
        mouseY,
        (toXCoord + 0.5) * pixelSizeX,
        (toYCoord + 0.5) * pixelSizeY
      );
    }
  }

  if (editMode == 0) {
    if (editStep == 1) {
      drawArrowOnCanvas(
        previewOverlayCanvas,
        (fromXCoord + 0.5) * pixelSizeX,
        (fromYCoord + 0.5) * pixelSizeY,
        mouseX,
        mouseY
      );
    }
  }

  if (editMode == 2) {
    var deltaX = parseInt(moveX.value);
    var deltaY = parseInt(moveY.value);

    if (deltaX != 0 || deltaY != 0) {
      var pixelMouseX = Math.floor(mouseX / pixelSizeX);
      var pixelMouseY = Math.floor(mouseY / pixelSizeY);

      drawArrowOnCanvas(
        previewOverlayCanvas,
        (pixelMouseX + deltaX + 0.5) * pixelSizeX,
        (pixelMouseY + deltaY + 0.5) * pixelSizeY,
        (pixelMouseX + 0.5) * pixelSizeX,
        (pixelMouseY + 0.5) * pixelSizeY
      );
      drawPixelHighlight(
        previewOverlayCanvas,
        pixelMouseX + deltaX,
        pixelMouseY + deltaY,
        "lightblue",
        "darkblue"
      );
    }
  }
}

function drawControlsReference(mouseX, mouseY) {
  drawCursor(refOverlayCanvas, mouseX, mouseY);
  if (editMode == 0) {
    if (editStep == 1) {
      drawPixelHighlight(
        refOverlayCanvas,
        fromXCoord,
        fromYCoord,
        "lightblue",
        "darkblue"
      );
      drawArrowOnCanvas(
        refOverlayCanvas,
        (fromXCoord + 0.5) * pixelSizeX,
        (fromYCoord + 0.5) * pixelSizeY,
        mouseX,
        mouseY
      );
    }
  }

  if (editMode == 1) {
    if (editStep == 1) {
      drawArrowOnCanvas(
        refOverlayCanvas,
        mouseX,
        mouseY,
        (toXCoord + 0.5) * pixelSizeX,
        (toYCoord + 0.5) * pixelSizeY
      );
    }
  }

  if (editMode == 2) {
    var deltaX = parseInt(moveX.value);
    var deltaY = parseInt(moveY.value);

    if (deltaX != 0 || deltaY != 0) {
      var pixelMouseX = Math.floor(mouseX / pixelSizeX);
      var pixelMouseY = Math.floor(mouseY / pixelSizeY);

      drawArrowOnCanvas(
        refOverlayCanvas,
        (pixelMouseX + deltaX + 0.5) * pixelSizeX,
        (pixelMouseY + deltaY + 0.5) * pixelSizeY,
        (pixelMouseX + 0.5) * pixelSizeX,
        (pixelMouseY + 0.5) * pixelSizeY
      );
      drawPixelHighlight(
        refOverlayCanvas,
        pixelMouseX + deltaX,
        pixelMouseY + deltaY,
        "lightblue",
        "darkblue"
      );
    }
  }
}

function drawControlsMap(mouseX, mouseY) {
  drawCursor(mapOverlayCanvas, mouseX, mouseY);
}

function drawVectorField() {
  if (!mapData) {
    return;
  }
  clearCanvas(mapVectorCanvas)

  var w = mapData.width;
  var h = mapData.height;

  for (var i = 0; i < mapData.data.length; i += 4) {
    if (mapData.data[i + 3] == 0) {
      continue;
    }

    const pixel = i / 4;
    const x = pixel % w;
    const y = Math.floor(pixel / w);

    const xDisp = mapData.data[i] - 128;
    const yDisp = mapData.data[i + 1] - 128;

    const newX = x + xDisp;
    const newY = y + yDisp;

    drawArrowOnCanvas(
      mapVectorCanvas,
      (newX + 0.5) * pixelSizeX,
      (newY + 0.5) * pixelSizeY,
      (x + 0.5) * pixelSizeX,
      (y + 0.5) * pixelSizeY,
      2,
      1
    );
  }
}

function drawCursor(canvas, mouseX, mouseY) {
  clearCanvas(canvas);
  drawCrosshairsOnCanvas(canvas, mouseX, mouseY, 1);
  var pixelX = Math.floor(mouseX / pixelSizeX);
  var pixelY = Math.floor(mouseY / pixelSizeY);
  drawPixelHighlight(canvas, pixelX, pixelY);
}

function clearOverlays() {
  clearCanvas(previewOverlayCanvas);
  clearCanvas(mapOverlayCanvas);
  clearCanvas(refOverlayCanvas);
}

function clearCanvas(canvas) {
  var ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawPixelHighlight(
  canvas,
  pixelX,
  pixelY,
  color1 = "black",
  color2 = "white"
) {
  drawSelectBoxOnCanvas(
    canvas,
    pixelX * pixelSizeX,
    pixelY * pixelSizeY,
    pixelSizeX,
    pixelSizeY,
    1,
    color1,
    color2
  );
}

function drawSelectBoxOnCanvas(
  canvas,
  x,
  y,
  w,
  h,
  linewidth,
  color1 = "black",
  color2 = "white"
) {
  var ctx = canvas.getContext("2d");
  ctx.save();
  ctx.strokeStyle = color1;
  ctx.lineWidth = linewidth;
  ctx.strokeRect(x, y, w, h);
  ctx.strokeStyle = color2;
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = linewidth;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

function drawCrosshairsOnCanvas(canvas, x, y, linewidth) {
  var ctx = canvas.getContext("2d");
  ctx.save();
  ctx.strokeStyle = "black";
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, canvas.height);
  ctx.moveTo(0, y);
  ctx.lineTo(canvas.width, y);
  ctx.lineWidth = linewidth;
  ctx.stroke();
  ctx.restore();
}

function drawArrowOnCanvas(
  canvas,
  originX,
  originY,
  endX,
  endY,
  arrowSize = 5,
  arrowMargin = 3
) {
  var length = Math.sqrt(
    (endX - originX) * (endX - originX) + (endY - originY) * (endY - originY)
  );
  var unitX = (endX - originX) / length;
  var unitY = (endY - originY) / length;

  var ctx = canvas.getContext("2d");
  ctx.save();
  ctx.strokeStyle = "black";
  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.lineTo(
    endX - unitX * (arrowSize + arrowMargin),
    endY - unitY * (arrowSize + arrowMargin)
  );
  ctx.lineTo(
    endX - unitX * (arrowSize + arrowMargin) - unitY * arrowSize,
    endY - unitY * (arrowSize + arrowMargin) + unitX * arrowSize
  );
  ctx.lineTo(endX - unitX * arrowMargin, endY - unitY * arrowMargin);
  ctx.lineTo(
    endX - unitX * (arrowSize + arrowMargin) + unitY * arrowSize,
    endY - unitY * (arrowSize + arrowMargin) - unitX * arrowSize
  );
  ctx.lineTo(
    endX - unitX * (arrowSize + arrowMargin),
    endY - unitY * (arrowSize + arrowMargin)
  );
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}
