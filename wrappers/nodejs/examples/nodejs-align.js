#!/usr/bin/env node

// Copyright (c) 2017 Intel Corporation. All rights reserved.
// Use of this source code is governed by an Apache 2.0 license
// that can be found in the LICENSE file.

'use strict';

const rs2 = require('../index.js');
const glfwModule = require('./glfw-window.js');
const GLFWWindow = glfwModule.GLFWWindow;
const Rect = glfwModule.Rect;
const Texture = glfwModule.Texture;

function tryGetDepthScale(dev) {
  const sensors = dev.querySensors();
  for (let i = 0; i < sensors.length; i++) {
    if (sensors[i] instanceof rs2.DepthSensor) {
      return sensors[i].depthScale;
    }
  }
  return undefined;
}

function removeBackground(otherFrame, depthFrame, depthScale, clippingDist) {
  let depthData = depthFrame.getData();
  let otherData = otherFrame.getData();
  const width = otherFrame.width;
  const height = otherFrame.height;
  const otherBpp = otherFrame.bytesPerPixel;

  for (let y = 0; y < height; y++) {
    let depthPixelIndex = y * width;
    for (let x = 0; x < width; x++, ++depthPixelIndex) {
      let pixelDistance = depthScale * depthData[depthPixelIndex];
      if (pixelDistance <= 0 || pixelDistance > clippingDist) {
        let offset = depthPixelIndex * otherBpp;

        // Set pixel to background color
        for (let i = 0; i < otherBpp; i++) {
          otherData[offset+i] = 0x99;
        }
      }
    }
  }
}

// Open a GLFW window
const win = new GLFWWindow(1280, 720, 'Node.js Align Example');

const colorizer = new rs2.Colorizer();
const renderer = new Texture();
const align = new rs2.Align(rs2.stream.STREAM_COLOR);
const pipe = new rs2.Pipeline();
const profile = pipe.start();

const depthScale = tryGetDepthScale(profile.getDevice());
if (depthScale === undefined) {
  console.error('Device does not have a depth sensor');
  process.exit(1);
}

let depthClippingDistance = 1.0;
console.log('Press Up/Down to change the depth clipping distance.');

win.setKeyCallback((key, scancode, action, modes) => {
  if (action != 0) return;

  if (key === 265) {
    // Pressed: Up arrow key
    depthClippingDistance += 0.1;
    if (depthClippingDistance > 6.0) {
      depthClippingDistance = 6.0;
    }
  } else if (key === 264) {
    // Pressed: Down arrow key
    depthClippingDistance -= 0.1;
    if (depthClippingDistance < 0) {
      depthClippingDistance = 0;
    }
  }
  console.log('Depth clipping distance:', depthClippingDistance.toFixed(3));
});

while (!win.shouldWindowClose()) {
  const rawFrameSet = pipe.waitForFrames();
  if (!rawFrameSet) continue;

  const frameset = align.process(rawFrameSet);
  if (!frameset) {
    rawFrameSet.destroy();
    continue;
  }

  let colorFrame = frameset.colorFrame;
  let alignedDepthFrame = frameset.depthFrame;

  if (!alignedDepthFrame || !colorFrame) {
    if (alignedDepthFrame) alignedDepthFrame.destroy();

    if (colorFrame) colorFrame.destroy();
    rawFrameSet.destroy();
    frameset.destroy();
    continue;
  }

  removeBackground(colorFrame, alignedDepthFrame, depthScale,
      depthClippingDistance);
  let w = win.width;
  let h = win.height;

  let alteredColorFrameRect = new Rect(0, 0, w, h);
  alteredColorFrameRect = alteredColorFrameRect.adjustRatio({
      x: colorFrame.width,
      y: colorFrame.height});
  renderer.render(colorFrame, alteredColorFrameRect);

  let pipStream = new Rect(0, 0, w / 5, h / 5);
  pipStream = pipStream.adjustRatio({
      x: alignedDepthFrame.width,
      y: alignedDepthFrame.height});
  pipStream.x = alteredColorFrameRect.x + alteredColorFrameRect.w -
      pipStream.w - (Math.max(w, h) / 25);
  pipStream.y = alteredColorFrameRect.y + alteredColorFrameRect.h -
      pipStream.h - (Math.max(w, h) / 25);

  let colorizedDepth = colorizer.colorize(alignedDepthFrame);

  win.beginPaint();
  renderer.upload(colorizedDepth);
  renderer.show(pipStream);
  win.endPaint();

  alignedDepthFrame.destroy();
  colorFrame.destroy();
  colorizedDepth.destroy();
  rawFrameSet.destroy();
  frameset.destroy();
}

pipe.stop();
pipe.destroy();
align.destroy();

win.destroy();
rs2.cleanup();
