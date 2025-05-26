import { useReducer, useRef, useState, type RefObject } from 'react';
import { PiPlus, PiUpload } from 'react-icons/pi';
import './App.css';
import Alert from './components/atoms/Alert';
import Button from './components/atoms/Button';
import Annotation from './components/molecules/Annotation';
import Editor from './components/molecules/Editor';
import { annotationReducer } from './stores/annotationStore';

type Tool = 'directional' | 'polygon';

function App() {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [currentTool, setCurrentTool] = useState<Tool>('directional');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [annotations, dispatch] = useReducer(annotationReducer, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setFileName(file.name);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
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
  };

  const handleAddAnnotation = () => {
    const name = `Annotation ${annotations.length + 1}`;
    const id = crypto.randomUUID();

    // Create the new annotation
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
  };

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
        <Editor
          annotations={annotations}
          dispatch={dispatch}
          imageUrl={imageUrl}
          fileName={fileName}
          onImageUpload={handleImageUpload}
          onUploadClick={handleUploadClick}
          fileInputRef={fileInputRef as RefObject<HTMLInputElement>}
          currentTool={currentTool}
          onToolSelect={handleToolSelect}
        />
      </div>
    </div>
  );
}

export default App;
