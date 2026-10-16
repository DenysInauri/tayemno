import { useState, useRef, useCallback } from "react";
import { Loader } from "@mantine/core";

import { Text } from "../../../ui/Text";
import { Stack } from "../../../ui/Stack";
import classes from "./index.module.css";

interface IProps {
  url: string;
  fileName: string;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 5;
const ZOOM_STEP = 0.1;

export const ImageViewer = ({ url, fileName }: IProps) => {
  const [loaded, setLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });

  const resetTransform = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setScale((prev) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta)));
    },
    [],
  );

  const handleDoubleClick = useCallback(() => {
    if (scale !== 1) {
      resetTransform();
    } else {
      setScale(2);
    }
  }, [scale, resetTransform]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (scale <= 1) return;
      isDragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY };
      translateStart.current = { ...translate };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [scale, translate],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setTranslate({
        x: translateStart.current.x + dx,
        y: translateStart.current.y + dy,
      });
    },
    [],
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  if (imgError) {
    return (
      <Stack align="center" justify="center" className={classes.centered}>
        <Text c="dimmed">Failed to load image</Text>
      </Stack>
    );
  }

  return (
    <div
      className={classes.viewer}
      style={{
        cursor: scale > 1 ? (isDragging.current ? "grabbing" : "grab") : "default",
      }}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {!loaded && !imgError && <Loader />}
      <img
        src={url}
        alt={fileName}
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={() => setImgError(true)}
        onDoubleClick={handleDoubleClick}
        className={classes.image}
        style={{
          transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
          display: loaded ? "block" : "none",
        }}
      />
    </div>
  );
};
