import { useEffect, useRef, useState, type Dispatch } from 'react';
import { PiCheck, PiCircleNotch, PiExclamationMark, PiPencil, PiTrash } from 'react-icons/pi';
import type { Annotation, AnnotationAction } from '../../stores/annotationStore';
import Button from '../atoms/Button';

interface AnnotationProps extends Annotation {
  onClick?: () => void;
  dispatch: Dispatch<AnnotationAction>;
}

export default function Annotation({ name, id, type, isActive, isComplete, onClick, dispatch }: AnnotationProps) {
  const [isEditing, setIsEditing] = useState(true);
  const [_name, setTempName] = useState(name);
  const [isSaving, setIsSaving] = useState(false);
  const deleteModal = useRef<HTMLDialogElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);

  const handleOnClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const onCancelEdit = () => {
    setIsEditing(false);
    setTempName(name);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    setIsEditing(false);
    const isValid = e.currentTarget.reportValidity();
    if (!isValid) {
      setIsSaving(false);
      return;
    }
    const newName = nameInput.current?.value;
    if (!newName) {
      setIsSaving(false);
      return;
    }
    setTempName(newName);

    // simulate an API call to save this value
    const savePromise = new Promise((resolve) => {
      setTimeout(() => {
        dispatch({ type: 'UPDATE_ANNOTATION_NAME', payload: { id, name: newName } });
        resolve(true);
      }, 400);
    });
    await savePromise;
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the parent click handler
    setIsEditing(true);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the parent click handler
    // dispatch({ type: 'REMOVE_ANNOTATION', payload: { id } });
    deleteModal.current?.showModal();
  };

  useEffect(() => {
    if (isEditing && nameInput.current) {
      nameInput.current.focus();
      nameInput.current.select();
    }
  }, [isEditing]);

  return (
    <div
      className={`flex flex-col gap-2 rounded-md border ${
        isActive ? 'border-gray-200' : 'border-transparent hover:border-gray-200'
      }`}
    >
      {/* Annotation item */}
      <div
        className={`flex items-center gap-2 rounded-t-md p-2 hover:cursor-pointer hover:bg-gray-100 ${isActive ? '!bg-blue-100' : ''} ${
          isEditing ? 'border-b border-gray-200 bg-gray-100' : ''
        }`}
        onClick={handleOnClick}
      >
        <div className="flex w-full flex-col">
          <div className="flex gap-2">
            {isComplete ? (
              <div className="flex items-center gap-1 rounded bg-green-100 p-2 text-green-500">
                <PiCheck className="h-5 w-5" />
              </div>
            ) : (
              <div className="flex items-center gap-1 rounded bg-red-100 p-2 text-red-500">
                <PiExclamationMark className="h-5 w-5" />
              </div>
            )}
            <div className="flex w-full items-center justify-between">
              <div className="flex flex-col">
                <p className="text-sm font-semibold">{name}</p>
                <div className="flex gap-1">
                  <span className="text-xs text-gray-500">{type === 'POLYGON' ? 'Operational Area' : 'Direction'}</span>
                  {isSaving && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <PiCircleNotch className="animate-spin" /> Saving
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                {!isEditing && (
                  <Button
                    variant="link"
                    size="xs"
                    onClick={handleEditClick}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <PiPencil className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="link-error"
                  size="xs"
                  onClick={handleDeleteClick}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <PiTrash className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* EDITING INPUTS */}
      {isEditing && (
        <form className="flex flex-col gap-2 px-2 pb-4" onSubmit={onSubmit}>
          <div className={`rounded-lg p-2 ${isComplete ? 'bg-green-100' : 'bg-red-100'}`}>
            <p className="flex items-center gap-1 text-sm font-semibold">
              {isComplete ? (
                <PiCheck className="h-5 w-5 text-green-500" />
              ) : (
                <PiExclamationMark className="h-5 w-5 text-red-500" />
              )}
              {isComplete ? 'Annotation complete' : 'Annotation incomplete'}
            </p>
          </div>
          <div className="flex justify-between gap-1">
            <label htmlFor="name" className="sr-only">
              Annotation name
            </label>
            <input
              data-1p-ignore // prevent 1password from filling this input
              data-lpignore // prevent lastpass from filling this input
              type="text"
              id="name"
              value={_name}
              onChange={(e) => setTempName(e.target.value)}
              className="w-full rounded border border-gray-300 p-2 text-sm"
              required
              ref={nameInput}
            />
            <div className="flex gap-1">
              <Button type="submit" variant="link-success" size="xs" disabled={isSaving}>
                Save
              </Button>
              <Button type="button" variant="link-error" size="xs" onClick={onCancelEdit} disabled={isSaving}>
                Cancel
              </Button>
            </div>
          </div>
        </form>
      )}

      <dialog
        ref={deleteModal}
        className="mx-auto mt-4 rounded-md border border-gray-200 p-4 shadow-md transition-all duration-300 backdrop:bg-black/40 backdrop:backdrop-blur-[2px]"
      >
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Delete {name}?</h2>
          <p className="text-sm text-gray-500">Are you sure you want to delete this annotation?</p>
          <div className="flex justify-between gap-2">
            <Button
              variant="default"
              onClick={() => {
                deleteModal.current?.close();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="error"
              onClick={() => {
                dispatch({ type: 'REMOVE_ANNOTATION', payload: { id } });
                deleteModal.current?.close();
              }}
            >
              I'm sure, delete it
            </Button>
          </div>
        </div>
      </dialog>
      {/* EO Annotation item */}
    </div>
  );
}
