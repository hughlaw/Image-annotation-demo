import { PiArrowClockwise, PiArrowCounterClockwise, PiArrowUpRight, PiInfo, PiPolygon } from 'react-icons/pi';

import { PiExport } from 'react-icons/pi';

import { PiImage, PiUpload } from 'react-icons/pi';
import Button from '../atoms/Button';
import { Arrow, Circle, Image, Layer, Line, Stage } from 'react-konva';
import { useCallback, useEffect, useRef, useState, type Dispatch } from 'react';
import type { Stage as StageType } from 'konva/lib/Stage';
import type { Annotation, AnnotationAction } from '../../stores/annotationStore';
import useImage from 'use-image';
import type { KonvaEventObject } from 'konva/lib/Node';

const STROKE_WIDTH = 4;

interface EditorProps {
  annotations: Annotation[];
  dispatch: Dispatch<AnnotationAction>;
  imageUrl: string;
  fileName: string;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadClick: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  currentTool: Tool;
  onToolSelect: (tool: Tool) => void;
}

type Tool = 'directional' | 'polygon';

export default function Editor({
  annotations,
  dispatch,
  imageUrl,
  fileName,
  onImageUpload,
  onUploadClick,
  fileInputRef,
  currentTool,
  onToolSelect,
}: EditorProps) {
  // REF DECLARATIONS
  const stageRef = useRef<StageType>(null);

  // STATE DECLARATIONS
  const [points, setPoints] = useState<number[]>([]);
  const [history, setHistory] = useState<number[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [uploadedImage] = useImage(imageUrl);
  const [isTouching, setIsTouching] = useState(false);
  const [draggedPointIndex, setDraggedPointIndex] = useState<number | null>(null);
  const [isDraggingShape, setIsDraggingShape] = useState(false);
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 });
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, number[]>>({});
  const [polygonPosition, setPolygonPosition] = useState({ x: 0, y: 0 });
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });

  const canChangeTool = !annotations.some((ann) => ann.isActive && ann.points.length > 0);

  // Add resize handler
  useEffect(() => {
    const handleResize = () => {
      const container = document.querySelector('.stage-container');
      if (container && originalSize.width > 0) {
        const { width } = container.getBoundingClientRect();
        // Calculate height based on image's aspect ratio
        const aspectRatio = originalSize.height / originalSize.width;
        const height = width * aspectRatio;
        setStageSize({ width, height });

        // Calculate scale factor based on original size
        const scaleFactor = width / originalSize.width;
        setScale(scaleFactor);
      }
    };

    handleResize(); // Initial size
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [originalSize.width, originalSize.height]);

  // Update original size when image is loaded
  useEffect(() => {
    if (uploadedImage) {
      setOriginalSize({
        width: uploadedImage.width,
        height: uploadedImage.height,
      });
    }
  }, [uploadedImage]);

  const addToHistory = useCallback(
    (newPoints: number[]) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newPoints);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    },
    [history, historyIndex]
  );

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setPoints(history[newIndex]);
      setIsDrawing(history[newIndex].length > 0);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setPoints(history[newIndex]);
      setIsDrawing(history[newIndex].length > 0);
    }
  };

  const handleStageClick = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    // If we clicked on a polygon or directional line, make it active
    if (e.target !== e.target.getStage()) {
      const clickedAnnotation = annotations.find(
        (ann) =>
          ann.points.length > 0 &&
          (e.target.getClassName() === 'Line' || e.target.getClassName() === 'Arrow') &&
          e.target.getAttr('data-annotation-id') === ann.id
      );
      if (clickedAnnotation) {
        handleAnnotationClick(clickedAnnotation.id);
        return;
      }
    }

    // Don't allow drawing if no annotation is active or if we're dragging
    if (draggedPointIndex !== null || isDraggingShape || !annotations.some((ann) => ann.isActive) || isTouching) return;

    const stage = e.target.getStage();
    const point = stage?.getPointerPosition();

    if (stage && point) {
      const activeAnnotation = annotations.find((ann) => ann.isActive);
      if (!activeAnnotation) return;

      // Scale the point coordinates back to original size
      const scaledPoint = {
        x: point.x / scale,
        y: point.y / scale,
      };

      if (currentTool === 'directional') {
        // For directional annotations, limit to 2 points
        if (points.length >= 4) return;
      } else {
        // For polygon annotations, check if we're clicking near the first point to close
        if (points.length >= 4) {
          const firstPoint = { x: points[0], y: points[1] };
          const distance = Math.sqrt(
            Math.pow(scaledPoint.x - firstPoint.x, 2) + Math.pow(scaledPoint.y - firstPoint.y, 2)
          );
          if (distance < 10 / scale) {
            setIsDrawing(false);
            return;
          }
        }
      }

      const newPoints = [...points, scaledPoint.x, scaledPoint.y];
      setPoints(newPoints);
      addToHistory(newPoints);
      setIsDrawing(true);

      // If we've added 2 points for a directional annotation, stop drawing
      if (currentTool === 'directional' && newPoints.length === 4) {
        setIsDrawing(false);
      }
    }
  };

  const handleTouchStart = (e: KonvaEventObject<TouchEvent>) => {
    setIsTouching(true);

    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    setTouchStartPos({ x: pos.x, y: pos.y });

    // First check if we're trying to close the polygon
    const activeAnnotation = annotations.find((ann) => ann.isActive);
    if (activeAnnotation?.type === 'POLYGON' && points.length >= 4) {
      const firstPoint = { x: points[0], y: points[1] };
      const scaledPoint = {
        x: pos.x / scale,
        y: pos.y / scale,
      };
      const distance = Math.sqrt(Math.pow(scaledPoint.x - firstPoint.x, 2) + Math.pow(scaledPoint.y - firstPoint.y, 2));
      if (distance < 10 / scale) {
        setIsDrawing(false);
        return;
      }
    }

    // Then check if we're touching a point
    const target = e.target;
    if (target.getClassName() === 'Circle') {
      const pointIndex = target.getAttr('data-point-index');
      if (pointIndex !== undefined) {
        handlePointDragStart(parseInt(pointIndex));
        return;
      }
    }

    // Then check if we're touching a shape
    if (target.getClassName() === 'Line' || target.getClassName() === 'Arrow') {
      const annotationId = target.getAttr('data-annotation-id');
      if (annotationId) {
        const annotation = annotations.find((ann) => ann.id === annotationId);

        if (annotation) {
          handleAnnotationClick(annotation.id);
          handleShapeDragStart();
          return;
        }
      }
    }

    // Finally, handle new point creation if we're not dragging
    if (!isDraggingShape && draggedPointIndex === null) {
      handleStageClick(e);
    }
  };

  const handleTouchMove = (e: KonvaEventObject<TouchEvent>) => {
    if (!isTouching) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // If we're dragging a point
    if (draggedPointIndex !== null) {
      const newPoints = [...points];
      newPoints[draggedPointIndex * 2] = pos.x / scale;
      newPoints[draggedPointIndex * 2 + 1] = pos.y / scale;
      setPoints(newPoints);

      // Store unsaved changes
      const activeAnnotation = annotations.find((ann) => ann.isActive);
      if (activeAnnotation) {
        setUnsavedChanges((prev) => ({
          ...prev,
          [activeAnnotation.id]: newPoints,
        }));
      }
      return;
    }

    // If we're dragging a shape
    if (isDraggingShape) {
      const dx = pos.x - touchStartPos.x;
      const dy = pos.y - touchStartPos.y;
      setPolygonPosition({
        x: polygonPosition.x + dx / scale,
        y: polygonPosition.y + dy / scale,
      });
      setTouchStartPos({ x: pos.x, y: pos.y });
    }
  };

  const handleTouchEnd = () => {
    setIsTouching(false);

    if (isDraggingShape) {
      handleShapeDragEnd();
    }
    if (draggedPointIndex !== null) {
      handlePointDragEnd();
    }
  };

  const handlePointDragStart = (index: number) => {
    setDraggedPointIndex(index);
  };

  const handlePointDragMove = (index: number, e: KonvaEventObject<DragEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    const newPoints = [...points];
    // Get the pointer position relative to the stage
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;

    // Scale the coordinates back to original size
    newPoints[index * 2] = pointerPos.x / scale;
    newPoints[index * 2 + 1] = pointerPos.y / scale;
    setPoints(newPoints);

    // Store unsaved changes
    const activeAnnotation = annotations.find((ann) => ann.isActive);
    if (activeAnnotation) {
      setUnsavedChanges((prev) => ({
        ...prev,
        [activeAnnotation.id]: newPoints,
      }));
    }
  };

  const handlePointDragEnd = () => {
    if (draggedPointIndex !== null) {
      // Add the final position to history when drag ends
      addToHistory(points);
    }
    setDraggedPointIndex(null);
  };

  const handleShapeDragStart = () => {
    setIsDraggingShape(true);
  };

  const handleShapeDragMove = (e: KonvaEventObject<DragEvent>) => {
    setPolygonPosition({ x: e.target.x(), y: e.target.y() });
  };

  const handleShapeDragEnd = () => {
    setIsDraggingShape(false);
    const { x, y } = polygonPosition;
    // Apply the offset to all points
    const newPoints = points.map((point, i) => (i % 2 === 0 ? point + x : point + y));
    setPoints(newPoints);
    setPolygonPosition({ x: 0, y: 0 });
    // Add the final position to history when shape drag ends
    addToHistory(newPoints);

    // Store unsaved changes
    const activeAnnotation = annotations.find((ann) => ann.isActive);
    if (activeAnnotation) {
      setUnsavedChanges((prev) => ({
        ...prev,
        [activeAnnotation.id]: newPoints,
      }));
    }
  };

  const handlePointContextMenu = (index: number, e: KonvaEventObject<MouseEvent>) => {
    e.evt.preventDefault(); // Prevent default context menu

    // Don't remove points if we only have 3 points (minimum for a polygon)
    if (points.length <= 6) return;

    const newPoints = [...points];
    // Remove the point's x and y coordinates
    newPoints.splice(index * 2, 2);
    setPoints(newPoints);
    addToHistory(newPoints);

    // If we removed the last point, we're back to drawing mode
    if (index === points.length / 2 - 1) {
      setIsDrawing(true);
    }
  };

  const handleAnnotationClick = (id: string) => {
    dispatch({ type: 'SET_ACTIVE_ANNOTATION', payload: { id } });
    // Load the points of the selected annotation, either from unsaved changes or original points
    const selectedAnnotation = annotations.find((ann) => ann.id === id);
    if (selectedAnnotation) {
      const pointsToLoad = unsavedChanges[id] || selectedAnnotation.points;
      setPoints(pointsToLoad);
      setIsDrawing(false);
      addToHistory(pointsToLoad);
    } else {
      setPoints([]);
      setIsDrawing(true);
      addToHistory([]);
    }
  };

  const handleCancelEdit = () => {
    const activeAnnotation = annotations.find((ann) => ann.isActive);
    if (activeAnnotation) {
      // Restore original points from the annotation
      setPoints(activeAnnotation.points);
      setIsDrawing(false);
      // Reset history with the original points
      setHistory([activeAnnotation.points]);
      setHistoryIndex(0);
      // Clear any unsaved changes for this annotation
      setUnsavedChanges((prev) => {
        const newChanges = { ...prev };
        delete newChanges[activeAnnotation.id];
        return newChanges;
      });
    }
    // Clear active annotation
    dispatch({ type: 'SET_ACTIVE_ANNOTATION', payload: { id: '' } });
  };

  const handleSaveAnnotation = () => {
    if (points.length > 0) {
      const activeAnnotation = annotations.find((ann) => ann.isActive);
      if (activeAnnotation) {
        // Determine if the annotation is complete based on type and points
        const isComplete =
          activeAnnotation.type === 'DIRECTIONAL'
            ? points.length >= 2 // Directional needs at least 1 point (2 coordinates)
            : points.length >= 6; // Polygon needs at least 3 points (6 coordinates)

        dispatch({
          type: 'UPDATE_ANNOTATION_POINTS',
          payload: {
            id: activeAnnotation.id,
            points: [...points],
            isComplete,
          },
        });
        // Reset the current drawing state
        setPoints([]);
        setIsDrawing(false);
        addToHistory([]);
        // Clear active annotation
        dispatch({ type: 'SET_ACTIVE_ANNOTATION', payload: { id: '' } });
      }
    }
  };

  const downloadURI = (uri: string, name: string) => {
    const link = document.createElement('a');
    link.download = name;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPNG = () => {
    const uri = stageRef.current?.toDataURL();
    if (!uri) return;
    // Remove extension from filename before adding new one
    const baseFileName = fileName.replace(/\.[^/.]+$/, '');
    downloadURI(uri, `${baseFileName}-with-annotations.png`);
  };

  const handleExportCoordinates = () => {
    // Convert points to cartesian coordinates (-100 to 100)
    const convertToCartesian = (points: number[]) => {
      const cartesianPoints = [];
      for (let i = 0; i < points.length; i += 2) {
        const x = (points[i] / originalSize.width) * 200 - 100;
        const y = -((points[i + 1] / originalSize.height) * 200) + 100; // Flip Y axis
        cartesianPoints.push([x, y]);
      }
      return cartesianPoints;
    };

    // Create export data with all annotations
    const exportData = annotations.map((annotation) => ({
      id: annotation.id,
      name: annotation.name,
      type: annotation.type,
      points: convertToCartesian(annotation.points),
      isComplete: annotation.isComplete,
    }));

    // Create and download JSON file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // Remove extension from filename before adding new one
    const baseFileName = fileName.replace(/\.[^/.]+$/, '');
    link.download = `${baseFileName}-annotations.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // When the selected annotation is changed, load the points
  useEffect(() => {
    const activeAnnotation = annotations.find((ann) => ann.isActive);
    if (activeAnnotation) {
      const pointsToLoad = unsavedChanges[activeAnnotation.id] || activeAnnotation.points;
      setPoints(pointsToLoad);
      setIsDrawing(false);
      // Reset history with just the current points
      setHistory([pointsToLoad]);
      setHistoryIndex(0);
    } else {
      setPoints([]);
      setIsDrawing(true);
      // Reset history with empty points
      setHistory([[]]);
      setHistoryIndex(0);
    }
  }, [annotations, unsavedChanges]);

  return (
    <>
      <div className="mb-4 flex flex-wrap justify-between gap-2">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onImageUpload}
            className="hidden"
            id="imageUpload"
          />
          <Button variant={imageUrl ? 'default' : 'info'} onClick={onUploadClick}>
            {imageUrl ? <PiImage /> : <PiUpload />} {fileName ? 'Change Image' : 'Upload Image'}
          </Button>
          {fileName && <span className="text-sm text-gray-600">{fileName}</span>}
        </div>

        <div className="flex flex-wrap gap-1">
          <Button variant="default" onClick={handleExportPNG} disabled={annotations.length === 0 || !imageUrl}>
            <PiImage /> Export as PNG
          </Button>
          <Button variant="default" onClick={handleExportCoordinates} disabled={annotations.length === 0 || !imageUrl}>
            <PiExport /> Export coordinates
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap justify-between gap-2">
        <div className="flex gap-2">
          <div className="flex">
            <Button
              variant="default"
              isGrouped
              groupPosition="first"
              onClick={() => onToolSelect('directional')}
              isSelected={currentTool === 'directional'}
              disabled={!imageUrl || (!canChangeTool && currentTool !== 'directional')}
            >
              <PiArrowUpRight />
            </Button>
            <Button
              variant="default"
              isGrouped
              groupPosition="last"
              onClick={() => onToolSelect('polygon')}
              isSelected={currentTool === 'polygon'}
              disabled={!imageUrl || (!canChangeTool && currentTool !== 'polygon')}
            >
              <PiPolygon />
            </Button>
          </div>
          <div className="flex gap-1">
            <Button variant="default" onClick={handleUndo} disabled={historyIndex <= 0 || !imageUrl}>
              <PiArrowCounterClockwise /> Undo
            </Button>
            <Button variant="default" onClick={handleRedo} disabled={historyIndex >= history.length - 1 || !imageUrl}>
              <PiArrowClockwise /> Redo
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button
            variant="default"
            onClick={handleCancelEdit}
            disabled={!imageUrl || !annotations.some((ann) => ann.isActive)}
          >
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleSaveAnnotation}
            disabled={points.length === 0 || !annotations.some((ann) => ann.isActive) || !imageUrl}
          >
            Save Annotation
          </Button>
        </div>
      </div>

      <div className="stage-container w-full">
        {uploadedImage && (
          <>
            <div className="mb-2 flex items-center gap-1 text-gray-500">
              <PiInfo />
              <p className="text-sm">
                {annotations.some((ann) => ann.isActive) && <p>Click to add points. Right click to remove a point.</p>}
                {!annotations.length && <p>Create an annotation to get started.</p>}
                {annotations.length && !annotations.some((ann) => ann.isActive) && <p>Select an annotation to edit.</p>}
              </p>
            </div>
            <Stage
              width={stageSize.width}
              height={stageSize.height}
              onClick={handleStageClick}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              ref={stageRef}
              className="border border-gray-200"
              scale={{ x: scale, y: scale }}
            >
              <Layer>
                <Image image={uploadedImage} width={originalSize.width} height={originalSize.height} fit="contain" />

                {/* Show all annotations when none are active, or only the active annotation */}
                {!annotations.some((ann) => ann.isActive)
                  ? // Show all annotations when none are active
                    annotations.map((annotation) => {
                      if (annotation.points.length === 0) return null;

                      if (annotation.type === 'DIRECTIONAL') {
                        return (
                          <Arrow
                            key={annotation.id}
                            points={annotation.points}
                            stroke="#00FF00"
                            strokeWidth={STROKE_WIDTH / scale}
                            fill="#00FF00"
                            pointerLength={10 / scale}
                            pointerWidth={10 / scale}
                            data-annotation-id={annotation.id}
                            draggable={false}
                          />
                        );
                      }

                      return (
                        <Line
                          key={annotation.id}
                          points={annotation.points}
                          stroke="#00FF00"
                          strokeWidth={STROKE_WIDTH / scale}
                          closed={true}
                          fill="rgba(0,255,0,0.25)"
                          data-annotation-id={annotation.id}
                          draggable={false}
                        />
                      );
                    })
                  : // Show only the active annotation's points
                    points.length > 0 && (
                      <>
                        {annotations.find((ann) => ann.isActive)?.type === 'DIRECTIONAL' ? (
                          <Arrow
                            points={points}
                            stroke="#00ffff"
                            strokeWidth={STROKE_WIDTH / scale}
                            fill="#00ffff"
                            pointerLength={10 / scale}
                            pointerWidth={10 / scale}
                            draggable={!isDrawing}
                            x={polygonPosition.x}
                            y={polygonPosition.y}
                            data-annotation-id={annotations.find((ann) => ann.isActive)?.id}
                            onDragStart={handleShapeDragStart}
                            onDragMove={handleShapeDragMove}
                            onDragEnd={handleShapeDragEnd}
                          />
                        ) : (
                          <Line
                            points={points}
                            stroke="#00ffff"
                            strokeWidth={STROKE_WIDTH / scale}
                            closed={!isDrawing}
                            fill={!isDrawing ? 'rgba(0,0,0,0.1)' : undefined}
                            draggable={!isDrawing}
                            x={polygonPosition.x}
                            y={polygonPosition.y}
                            data-annotation-id={annotations.find((ann) => ann.isActive)?.id}
                            onDragStart={handleShapeDragStart}
                            onDragMove={handleShapeDragMove}
                            onDragEnd={handleShapeDragEnd}
                          />
                        )}
                        {/* Draw points */}
                        {points.map((point, i) => {
                          if (i % 2 === 0) {
                            const pointIndex = i / 2;
                            return (
                              <Circle
                                key={i}
                                x={point + polygonPosition.x}
                                y={points[i + 1] + polygonPosition.y}
                                radius={4 / scale}
                                fill="#000000"
                                stroke="#ffffff"
                                strokeWidth={1 / scale}
                                draggable={!isDrawing}
                                data-point-index={pointIndex}
                                onDragStart={() => handlePointDragStart(pointIndex)}
                                onDragMove={(e) => handlePointDragMove(pointIndex, e)}
                                onDragEnd={handlePointDragEnd}
                                onContextMenu={(e) => handlePointContextMenu(pointIndex, e)}
                              />
                            );
                          }
                          return null;
                        })}
                      </>
                    )}
              </Layer>
            </Stage>
          </>
        )}
      </div>
    </>
  );
}
