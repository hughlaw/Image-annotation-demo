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
import { Layer, Stage, Image, Line, Circle } from 'react-konva';
import { useState, useRef } from 'react';
import useImage from 'use-image';
import type { KonvaEventObject } from 'konva/lib/Node';

type Tool = 'select' | 'polygon';

function App() {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [points, setPoints] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<Tool>('select');
  const [draggedPointIndex, setDraggedPointIndex] = useState<number | null>(null);
  const [isDraggingShape, setIsDraggingShape] = useState(false);
  const [history, setHistory] = useState<number[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const stageRef = useRef(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImage] = useImage(imageUrl);
  const [polygonPosition, setPolygonPosition] = useState({ x: 0, y: 0 });

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
    if (currentTool !== 'polygon' || draggedPointIndex !== null || isDraggingShape) return;

    const stage = e.target.getStage();
    const point = stage?.getPointerPosition();

    if (stage && point) {
      // Check if we're clicking near the first point to close the polygon
      if (points.length >= 4) {
        // At least 2 points (4 coordinates)
        const firstPoint = { x: points[0], y: points[1] };
        const distance = Math.sqrt(Math.pow(point.x - firstPoint.x, 2) + Math.pow(point.y - firstPoint.y, 2));

        if (distance < 10) {
          // If within 10 pixels of first point
          setIsDrawing(false);
          return;
        }
      }

      const newPoints = [...points, point.x, point.y];
      setPoints(newPoints);
      addToHistory(newPoints);
      setIsDrawing(true);
    }
  };

  const handlePointDragStart = (index: number) => {
    setDraggedPointIndex(index);
  };

  const handlePointDragMove = (index: number, e: KonvaEventObject<DragEvent>) => {
    const newPoints = [...points];
    newPoints[index * 2] = e.target.x();
    newPoints[index * 2 + 1] = e.target.y();
    setPoints(newPoints);
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

  const handleShapeDragEnd = (e: KonvaEventObject<DragEvent>) => {
    setIsDraggingShape(false);
    const { x, y } = polygonPosition;
    // Apply the offset to all points
    const newPoints = points.map((point, i) => (i % 2 === 0 ? point + x : point + y));
    setPoints(newPoints);
    setPolygonPosition({ x: 0, y: 0 });
    addToHistory(newPoints);
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
    if (tool === 'polygon') {
      setPoints([]);
      addToHistory([]);
      setIsDrawing(true);
    } else {
      setIsDrawing(false);
    }
  };

  return (
    <div className="grid grid-cols-12">
      <div className="col-span-3 min-h-screen border-r border-gray-200 p-4">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between gap-2">
            <h1 className="text-lg font-bold">Annotations</h1>
            <Button variant="success">
              <PiPlus />
              Add <span className="sr-only">annotation</span>
            </Button>
          </div>

          <Annotation />
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
            <Button variant="info" onClick={handleUploadClick}>
              <PiImage /> {fileName ? 'Change Image' : 'Upload Image'}
            </Button>
            {fileName && <span className="text-sm text-gray-600">{fileName}</span>}
          </div>

          <div className="flex gap-1">
            <Button variant="info" onClick={handleUndo} disabled={historyIndex <= 0}>
              <PiArrowCounterClockwise /> Undo
            </Button>
            <Button variant="info" onClick={handleRedo} disabled={historyIndex >= history.length - 1}>
              <PiArrowClockwise /> Redo
            </Button>
            <Button variant="info" onClick={handleExportCoordinates} disabled={points.length === 0}>
              <PiExport /> Export coordinates
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-4 flex gap-2">
          <button
            className={`rounded-sm border p-2 ${currentTool === 'select' ? 'border-blue-200 bg-blue-100' : 'border-gray-200 bg-gray-100'}`}
            onClick={() => handleToolSelect('select')}
          >
            <PiArrowUpRight />
          </button>
          <button
            className={`rounded-sm border p-2 ${currentTool === 'polygon' ? 'border-blue-200 bg-blue-100' : 'border-gray-200 bg-gray-100'}`}
            onClick={() => handleToolSelect('polygon')}
          >
            <PiPolygon />
          </button>
        </div>

        <Stage width={800} height={600} onClick={handleStageClick} ref={stageRef} className="border border-gray-200">
          <Layer>
            {uploadedImage && <Image image={uploadedImage} width={800} height={600} fit="contain" />}
            {points.length > 0 && (
              <>
                <Line
                  points={points}
                  stroke="#000000"
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
                        draggable
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
