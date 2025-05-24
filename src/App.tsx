import {
  PiArrowUpRight,
  PiExport,
  PiImage,
  PiPlus,
  PiPolygon,
  PiArrowCounterClockwise,
  PiArrowClockwise,
} from 'react-icons/pi';
import './App.css';
import Button from './components/atoms/Button';
import Annotation from './components/molecules/Annotation';
import { Layer, Stage, Image, Line, Circle, Arrow } from 'react-konva';
import { useState, useRef, useReducer, useEffect } from 'react';
import useImage from 'use-image';
import type { KonvaEventObject } from 'konva/lib/Node';
import { annotationReducer } from './stores/annotationStore';

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
  const stageRef = useRef(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImage] = useImage(imageUrl);
  const [polygonPosition, setPolygonPosition] = useState({ x: 0, y: 0 });
  const [annotations, dispatch] = useReducer(annotationReducer, []);
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, number[]>>({});

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

  const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
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

    // Don't allow drawing if no annotation is active
    if (draggedPointIndex !== null || isDraggingShape || !annotations.some((ann) => ann.isActive)) return;

    const stage = e.target.getStage();
    const point = stage?.getPointerPosition();

    if (stage && point) {
      const activeAnnotation = annotations.find((ann) => ann.isActive);
      if (!activeAnnotation) return;

      if (activeAnnotation.type === 'DIRECTIONAL') {
        // For directional annotations, limit to 2 points
        if (points.length >= 4) return;
      } else {
        // For polygon annotations, check if we're clicking near the first point to close
        if (points.length >= 4) {
          const firstPoint = { x: points[0], y: points[1] };
          const distance = Math.sqrt(Math.pow(point.x - firstPoint.x, 2) + Math.pow(point.y - firstPoint.y, 2));
          if (distance < 10) {
            setIsDrawing(false);
            return;
          }
        }
      }

      const newPoints = [...points, point.x, point.y];
      setPoints(newPoints);
      addToHistory(newPoints);
      setIsDrawing(true);

      // If we've added 2 points for a directional annotation, stop drawing
      if (activeAnnotation.type === 'DIRECTIONAL' && newPoints.length === 4) {
        setIsDrawing(false);
      }
    }
  };

  const handleExportPNG = () => {
    console.debug('Exporting PNG');
  };

  const handlePointDragStart = (index: number) => {
    setDraggedPointIndex(index);
  };

  const handlePointDragMove = (index: number, e: KonvaEventObject<DragEvent>) => {
    const newPoints = [...points];
    newPoints[index * 2] = e.target.x();
    newPoints[index * 2 + 1] = e.target.y();
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
    const coordinates = [];
    for (let i = 0; i < points.length; i += 2) {
      coordinates.push([points[i], points[i + 1]]);
    }
    console.log('Polygon coordinates:', coordinates);
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

  useEffect(() => {
    console.log(annotations);
  }, [annotations]);

  return (
    <div className="grid grid-cols-12">
      <div className="col-span-3 min-h-screen border-r border-gray-200 p-4">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between gap-2">
            <h1 className="text-lg font-bold">Annotations</h1>
            <Button variant="success" onClick={handleAddAnnotation}>
              <PiPlus />
              Add <span className="sr-only">annotation</span>
            </Button>
          </div>
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

      <div className="col-span-9 p-4">
        <div className="mb-4 flex justify-between">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="imageUpload"
            />
            <Button variant="default" onClick={handleUploadClick}>
              <PiImage /> {fileName ? 'Change Image' : 'Upload Image'}
            </Button>
            {fileName && <span className="text-sm text-gray-600">{fileName}</span>}
          </div>

          <div className="flex gap-1">
            <Button variant="default" onClick={handleExportPNG} disabled={points.length === 0}>
              <PiImage /> Export as PNG
            </Button>
            <Button variant="default" onClick={handleExportCoordinates} disabled={points.length === 0}>
              <PiExport /> Export coordinates
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-4 flex justify-between gap-2">
          <div className="flex">
            <Button
              variant="default"
              isGrouped
              groupPosition="first"
              onClick={() => handleToolSelect('directional')}
              isSelected={currentTool === 'directional'}
            >
              <PiArrowUpRight />
            </Button>
            <Button
              variant="default"
              isGrouped
              groupPosition="last"
              onClick={() => handleToolSelect('polygon')}
              isSelected={currentTool === 'polygon'}
            >
              <PiPolygon />
            </Button>
          </div>
          <div className="flex gap-1">
            <Button variant="default" onClick={handleUndo} disabled={historyIndex <= 0}>
              <PiArrowCounterClockwise /> Undo
            </Button>
            <Button variant="default" onClick={handleRedo} disabled={historyIndex >= history.length - 1}>
              <PiArrowClockwise /> Redo
            </Button>
            <Button
              variant="success"
              onClick={handleSaveAnnotation}
              disabled={points.length === 0 || !annotations.some((ann) => ann.isActive)}
            >
              Save Annotation
            </Button>
          </div>
        </div>

        <Stage width={800} height={600} onClick={handleStageClick} ref={stageRef} className="border border-gray-200">
          <Layer>
            {uploadedImage && <Image image={uploadedImage} width={800} height={600} fit="contain" />}

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
                        strokeWidth={2}
                        fill="#00FF00"
                        pointerLength={10}
                        pointerWidth={10}
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
                      strokeWidth={2}
                      closed={true}
                      fill="rgba(0,255,0,0.25)"
                      data-annotation-id={annotation.id}
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
                        strokeWidth={2}
                        fill="#0000ff"
                        pointerLength={10}
                        pointerWidth={10}
                        draggable={!isDrawing}
                        x={polygonPosition.x}
                        y={polygonPosition.y}
                        onDragStart={handleShapeDragStart}
                        onDragMove={handleShapeDragMove}
                        onDragEnd={handleShapeDragEnd}
                      />
                    ) : (
                      <Line
                        points={points}
                        stroke="#0000ff"
                        strokeWidth={2}
                        closed={!isDrawing}
                        fill={!isDrawing ? 'rgba(0,0,0,0.1)' : undefined}
                        draggable={!isDrawing}
                        x={polygonPosition.x}
                        y={polygonPosition.y}
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
                            radius={4}
                            fill="#000000"
                            stroke="#ffffff"
                            strokeWidth={1}
                            draggable={!isDrawing}
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
      </div>
    </div>
  );
}

export default App;
