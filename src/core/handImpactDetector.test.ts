import {
  createHandImpactDetector,
  type NormalizedBox,
  type PoseFrame,
  type PoseLandmark,
} from './handImpactDetector';

const FRAME_WIDTH = 1000;
const FRAME_HEIGHT = 2000;
const DT_MS = 33;
const SCALE_PX = 200;

const BAG_BOX: NormalizedBox = {
  x: 0.35,
  y: 0.4,
  width: 0.3,
  height: 0.3,
};

function landmark(x: number, y: number, visibility = 1): PoseLandmark {
  return { x, y, visibility };
}

function frameAt(
  tMs: number,
  leftWrist: PoseLandmark,
  rightWrist: PoseLandmark = landmark(0.55, 0.35),
): PoseFrame {
  const landmarks = Array.from({ length: 33 }, () => landmark(0.5, 0.5));
  landmarks[11] = landmark(0.4, 0.3);
  landmarks[12] = landmark(0.6, 0.3);
  landmarks[15] = leftWrist;
  landmarks[16] = rightWrist;
  return {
    landmarks,
    frameWidth: FRAME_WIDTH,
    frameHeight: FRAME_HEIGHT,
    tMs,
  };
}

function movePx(speedShouldersPerSec: number): number {
  return speedShouldersPerSec * (DT_MS / 1000) * SCALE_PX;
}

function collectCandidates(frames: PoseFrame[]): { timestampMs: number; hand: string }[] {
  const events: { timestampMs: number; hand: string }[] = [];
  const detector = createHandImpactDetector({}, (event) => {
    events.push(event);
  });
  detector.setBagBox(BAG_BOX);
  for (const frame of frames) {
    detector.processFrame(frame);
  }
  return events;
}

function punchTrajectory(wristX: number, startYPx: number): PoseFrame[] {
  const speeds = [2, 5, 10, 0];
  let yPx = startYPx;
  const frames: PoseFrame[] = [frameAt(0, landmark(wristX, startYPx / FRAME_HEIGHT))];
  speeds.forEach((speed, index) => {
    yPx += movePx(speed);
    frames.push(
      frameAt((index + 1) * DT_MS, landmark(wristX, yPx / FRAME_HEIGHT)),
    );
  });
  return frames;
}

test('a punch that stops inside the box gives 1 candidate', () => {
  const events = collectCandidates(punchTrajectory(0.5, 800));
  expect(events).toHaveLength(1);
  expect(events[0]?.hand).toBe('left');
});

test('a punch that stops far from the box gives 0 candidates', () => {
  expect(collectCandidates(punchTrajectory(0.05, 800))).toHaveLength(0);
});

test('a slow hand wave gives 0 candidates', () => {
  const frames: PoseFrame[] = [];
  let xPx = 500;
  const yNorm = 0.5;
  const wave = [1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.2, 0];
  frames.push(frameAt(0, landmark(xPx / FRAME_WIDTH, yNorm)));
  wave.forEach((speed, index) => {
    const direction = index % 2 === 0 ? 1 : -1;
    xPx += direction * movePx(speed);
    frames.push(
      frameAt((index + 1) * DT_MS, landmark(xPx / FRAME_WIDTH, yNorm)),
    );
  });
  expect(collectCandidates(frames)).toHaveLength(0);
});
