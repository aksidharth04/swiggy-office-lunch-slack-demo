import React from 'react';
import {Composition} from 'remotion';
import {SwiggyOfficeLunchDemo, VIDEO_DURATION_FRAMES, VIDEO_FPS, VIDEO_HEIGHT, VIDEO_WIDTH} from './swiggy-office-lunch-demo.jsx';

export const RemotionRoot = () => {
  return (
    <Composition
      id="SwiggyOfficeLunchDemo"
      component={SwiggyOfficeLunchDemo}
      durationInFrames={VIDEO_DURATION_FRAMES}
      fps={VIDEO_FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
    />
  );
};
