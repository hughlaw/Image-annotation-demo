import {
  PiArrowUpRight,
  PiExport,
  PiImage,
  PiPlus,
  PiPolygon,
  PiArrowCounterClockwise,
  PiArrowClockwise,
  PiUpload,
} from 'react-icons/pi';
import './App.css';
import Button from './components/atoms/Button';
import Annotation from './components/molecules/Annotation';
import { Layer, Stage, Image, Line, Circle, Arrow } from 'react-konva';
import { useState, useRef, useReducer, useEffect } from 'react';
import useImage from 'use-image';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Stage as StageType } from 'konva/lib/Stage';
import { annotationReducer } from './stores/annotationStore';
import Alert from './components/atoms/Alert';

type Tool = 'directional' | 'polygon';

function App() {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [points, setPoints] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<Tool>('directional');
  const [draggedPointIndex, setDraggedPointIndex] = useState<number | null>(null);
  const [isDraggingShape, setIsDraggingShape] = useState(false);
  const [history, setHistory] = useState<number[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const stageRef = useRef<StageType>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImage] = useImage(imageUrl);
  const [polygonPosition, setPolygonPosition] = useState({ x: 0, y: 0 });
  const [annotations, dispatch] = useReducer(annotationReducer, []);
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, number[]>>({});
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });
  const [isTouching, setIsTouching] = useState(false);
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 });

  const addToHistory = (newPoints: number[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newPoints);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setFileName(file.name);
      setPoints([]);
      setHistory([[]]);
      setHistoryIndex(0);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
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

      if (activeAnnotation.type === 'DIRECTIONAL') {
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
      if (activeAnnotation.type === 'DIRECTIONAL' && newPoints.length === 4) {
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
      isClosed: annotation.isClosed,
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

  const handleToolSelect = (tool: Tool) => {
    setCurrentTool(tool);
    // Update the active annotation's type if one is selected
    const activeAnnotation = annotations.find((ann) => ann.isActive);
    if (activeAnnotation) {
      dispatch({
        type: 'UPDATE_ANNOTATION_TYPE',
        payload: { id: activeAnnotation.id, type: tool === 'directional' ? 'DIRECTIONAL' : 'POLYGON' },
      });
    }
    if (tool === 'polygon') {
      setPoints([]);
      addToHistory([]);
      setIsDrawing(true);
    } else {
      setPoints([]);
      addToHistory([]);
      setIsDrawing(true);
    }
  };

  const handleAddAnnotation = () => {
    const name = `Annotation ${annotations.length + 1}`;
    const id = crypto.randomUUID();

    // Reset all states first
    setPoints([]);
    setIsDrawing(true);
    addToHistory([]);
    setPolygonPosition({ x: 0, y: 0 });

    // Then create the new annotation
    dispatch({
      type: 'ADD_ANNOTATION',
      payload: {
        id,
        name,
        annotationType: currentTool === 'directional' ? 'DIRECTIONAL' : 'POLYGON',
      },
    });
    dispatch({ type: 'SET_ACTIVE_ANNOTATION', payload: { id } });
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

  const handleSaveAnnotation = () => {
    if (points.length > 0) {
      const activeAnnotation = annotations.find((ann) => ann.isActive);
      if (activeAnnotation) {
        dispatch({
          type: 'UPDATE_ANNOTATION_POINTS',
          payload: {
            id: activeAnnotation.id,
            points: [...points],
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

  // useEffect(() => {
  //   console.log(annotations);
  // }, [annotations]);

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

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12">
      <div className="w-full border-b border-gray-200 p-4 lg:col-span-3 lg:border-r lg:border-b-0">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between gap-2">
            <h1 className="text-lg font-bold">Annotations</h1>
            <Button variant="success" onClick={handleAddAnnotation} disabled={!imageUrl}>
              <PiPlus />
              Add <span className="sr-only">annotation</span>
            </Button>
          </div>
          {!imageUrl && (
            <Alert variant="info" title="No image uploaded">
              <p>Upload an image to start annotating</p>
              <Button variant="info" className="mt-2" onClick={handleUploadClick}>
                <PiUpload />
                Upload image
              </Button>
            </Alert>
          )}
          {imageUrl && annotations.length === 0 && (
            <Alert variant="info" title="No annotations">
              <p>Add an annotation to the image to get started</p>
              <Button variant="success" className="mt-2" onClick={handleAddAnnotation}>
                <PiPlus />
                Add annotation
              </Button>
            </Alert>
          )}
          {annotations.map((annotation) => (
            <Annotation
              dispatch={dispatch}
              key={annotation.id}
              id={annotation.id}
              name={annotation.name}
              type={annotation.type}
              points={annotation.points}
              isActive={annotation.isActive}
              isClosed={annotation.isClosed}
              onClick={() => handleAnnotationClick(annotation.id)}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 lg:col-span-9">
        <div className="mb-4 flex flex-wrap justify-between gap-2">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="imageUpload"
            />
            <Button variant={imageUrl ? 'default' : 'info'} onClick={handleUploadClick}>
              {imageUrl ? <PiImage /> : <PiUpload />} {fileName ? 'Change Image' : 'Upload Image'}
            </Button>
            {fileName && <span className="text-sm text-gray-600">{fileName}</span>}
          </div>

          <div className="flex flex-wrap gap-1">
            <Button variant="default" onClick={handleExportPNG} disabled={annotations.length === 0 || !imageUrl}>
              <PiImage /> Export as PNG
            </Button>
            <Button
              variant="default"
              onClick={handleExportCoordinates}
              disabled={annotations.length === 0 || !imageUrl}
            >
              <PiExport /> Export coordinates
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap justify-between gap-2">
          <div className="flex">
            <Button
              variant="default"
              isGrouped
              groupPosition="first"
              onClick={() => handleToolSelect('directional')}
              isSelected={currentTool === 'directional'}
              disabled={!imageUrl}
            >
              <PiArrowUpRight />
            </Button>
            <Button
              variant="default"
              isGrouped
              groupPosition="last"
              onClick={() => handleToolSelect('polygon')}
              isSelected={currentTool === 'polygon'}
              disabled={!imageUrl}
            >
              <PiPolygon />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            <Button variant="default" onClick={handleUndo} disabled={historyIndex <= 0 || !imageUrl}>
              <PiArrowCounterClockwise /> Undo
            </Button>
            <Button variant="default" onClick={handleRedo} disabled={historyIndex >= history.length - 1 || !imageUrl}>
              <PiArrowClockwise /> Redo
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
                            strokeWidth={2 / scale}
                            fill="#00FF00"
                            pointerLength={10 / scale}
                            pointerWidth={10 / scale}
                            data-annotation-id={annotation.id}
                            draggable
                            onDragStart={handleShapeDragStart}
                            onDragMove={handleShapeDragMove}
                            onDragEnd={handleShapeDragEnd}
                          />
                        );
                      }

                      return (
                        <Line
                          key={annotation.id}
                          points={annotation.points}
                          stroke="#00FF00"
                          strokeWidth={2 / scale}
                          closed={true}
                          fill="rgba(0,255,0,0.25)"
                          data-annotation-id={annotation.id}
                          draggable
                          onDragStart={handleShapeDragStart}
                          onDragMove={handleShapeDragMove}
                          onDragEnd={handleShapeDragEnd}
                        />
                      );
                    })
                  : // Show only the active annotation's points
                    points.length > 0 && (
                      <>
                        {annotations.find((ann) => ann.isActive)?.type === 'DIRECTIONAL' ? (
                          <Arrow
                            points={points}
                            stroke="#0000ff"
                            strokeWidth={2 / scale}
                            fill="#0000ff"
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
                            stroke="#0000ff"
                            strokeWidth={2 / scale}
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
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
